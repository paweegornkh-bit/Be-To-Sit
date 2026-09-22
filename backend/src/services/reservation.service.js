import sanitizeHtml from 'sanitize-html';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { can } from '../middlewares/rbac.js';

const clean = (s) => s ? sanitizeHtml(s, { allowedTags: [], allowedAttributes: {} }) : null;

const INCLUDE = {
  table: { select: { tableNo: true, seats: true, zone: { select: { name: true } } } },
  user:  { select: { fullName: true, phone: true, email: true } },
  items: { include: { menuItem: { select: { name: true, imageUrl: true } } } },
  payments: { select: { id: true, status: true, amount: true, method: true, paidAt: true } }
};

export const reservationService = {
  async list({ date, status, page, limit, skip, take, user }) {
    const where = {
      ...(date   && { reserveDate: new Date(date) }),
      ...(status && { status }),
      ...(user.role === 'CUSTOMER' && { userId: user.id })
    };
    const [rows, total] = await Promise.all([
      prisma.reservation.findMany({
        where, include: INCLUDE, skip, take,
        orderBy: [{ reserveDate: 'desc' }, { timeSlot: 'asc' }]
      }),
      prisma.reservation.count({ where })
    ]);
    return { rows, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  async getById(id, user) {
    const r = await prisma.reservation.findUnique({ where: { id }, include: INCLUDE });
    if (!r) throw ApiError.notFound('ไม่พบการจองนี้');
    if (r.userId !== user.id && !can(user.role, 'reservation:read')) {
      throw ApiError.forbidden('คุณไม่มีสิทธิ์ดูการจองนี้');
    }
    return r;
  },

  async create(dto, user) {
    const date = new Date(dto.reserveDate);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (date < today) throw ApiError.badRequest('ไม่สามารถจองย้อนหลังได้');
    if ((date - today) / 86400000 > 30) throw ApiError.badRequest('จองล่วงหน้าได้ไม่เกิน 30 วัน');

    const table = await prisma.table.findUnique({ where: { id: dto.tableId } });
    if (!table) throw ApiError.notFound('ไม่พบโต๊ะที่เลือก');
    if (table.status === 'MAINTENANCE') throw ApiError.conflict('TABLE_UNAVAILABLE', 'โต๊ะนี้ปิดปรับปรุง');
    if (dto.partySize > table.seats) {
      throw ApiError.badRequest(`โต๊ะ ${table.tableNo} รองรับได้สูงสุด ${table.seats} ที่นั่ง`);
    }

    const todayCount = await prisma.reservation.count({
      where: { userId: user.id, reserveDate: date, status: { notIn: ['CANCELLED', 'NO_SHOW'] } }
    });
    if (todayCount >= 3) throw ApiError.badRequest('จองได้สูงสุด 3 รายการต่อวัน');

    let total = 0;
    let itemsData = [];
    if (dto.items.length) {
      const ids = [...new Set(dto.items.map(i => i.menuItemId))];
      const menus = await prisma.menuItem.findMany({
        where: { id: { in: ids }, isDeleted: false, isAvailable: true }
      });
      if (menus.length !== ids.length) throw ApiError.badRequest('มีเมนูที่ไม่พร้อมจำหน่าย');

      const priceMap = new Map(menus.map(m => [m.id, Number(m.price)]));
      itemsData = dto.items.map(i => {
        const price = priceMap.get(i.menuItemId);
        total += price * i.qty;
        return { menuItemId: i.menuItemId, qty: i.qty, unitPrice: price };
      });
    }
    const deposit = Math.round(total * env.depositRate * 100) / 100;

    try {
      return await prisma.reservation.create({
        data: {
          userId: user.id, tableId: dto.tableId, reserveDate: date,
          timeSlot: dto.timeSlot, partySize: dto.partySize,
          note: clean(dto.note),
          totalAmount: total, depositAmount: deposit,
          status: total > 0 ? 'PENDING' : 'CONFIRMED',
          items: { create: itemsData }
        },
        include: INCLUDE
      });
    } catch (e) {
      if (e.code === 'P2002') {
        throw ApiError.conflict('TABLE_NOT_AVAILABLE',
          'โต๊ะนี้ถูกจองแล้วในช่วงเวลาที่เลือก กรุณาเลือกโต๊ะหรือเวลาอื่น');
      }
      throw e;
    }
  },

  async updateStatus(id, status, user) {
    const r = await prisma.reservation.findUnique({ where: { id } });
    if (!r) throw ApiError.notFound('ไม่พบการจองนี้');

    const FLOW = {
      PENDING:   ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['SEATED', 'CANCELLED', 'NO_SHOW'],
      SEATED:    ['COMPLETED'],
      COMPLETED: [], CANCELLED: [], NO_SHOW: []
    };
    if (!FLOW[r.status].includes(status)) {
      throw ApiError.conflict('INVALID_TRANSITION',
        `ไม่สามารถเปลี่ยนสถานะจาก ${r.status} เป็น ${status} ได้`);
    }

    if (status === 'SEATED') await this.deductStock(id, user.id);

    return prisma.reservation.update({ where: { id }, data: { status }, include: INCLUDE });
  },

  async deductStock(reservationId, userId) {
    const items = await prisma.reservationItem.findMany({
      where: { reservationId },
      include: { menuItem: { include: { recipes: true } } }
    });

    const usage = new Map();
    for (const it of items) {
      for (const r of it.menuItem.recipes) {
        usage.set(r.ingredientId,
          (usage.get(r.ingredientId) || 0) + Number(r.qty) * it.qty);
      }
    }
    if (!usage.size) return;

    await prisma.$transaction(
      [...usage].flatMap(([ingredientId, qty]) => [
        prisma.ingredient.update({
          where: { id: ingredientId }, data: { stockQty: { decrement: qty } }
        }),
        prisma.stockMovement.create({
          data: { ingredientId, type: 'OUT', qty,
                  note: `ตัดสต็อกอัตโนมัติ: ${reservationId}`, createdById: userId }
        })
      ])
    );
  },

  async cancel(id, user) {
    const r = await prisma.reservation.findUnique({ where: { id } });
    if (!r) throw ApiError.notFound('ไม่พบการจองนี้');
    if (r.userId !== user.id && !can(user.role, 'reservation:delete')) {
      throw ApiError.forbidden('คุณไม่มีสิทธิ์ยกเลิกการจองนี้');
    }
    if (['COMPLETED', 'SEATED'].includes(r.status)) {
      throw ApiError.conflict('CANNOT_CANCEL', 'ไม่สามารถยกเลิกการจองที่ใช้บริการแล้ว');
    }
    return prisma.reservation.update({ where: { id }, data: { status: 'CANCELLED' } });
  }
};
