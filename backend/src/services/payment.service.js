import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';

const refCode = () =>
  'PAY' + Date.now().toString(36).toUpperCase() +
  Math.random().toString(36).slice(2, 6).toUpperCase();

export const paymentService = {
  async submitSlip({ reservationId, method, slipUrl }, user) {
    const r = await prisma.reservation.findUnique({
      where: { id: reservationId }, include: { payments: true }
    });
    if (!r) throw ApiError.notFound('ไม่พบการจองนี้');
    if (r.userId !== user.id) throw ApiError.forbidden('คุณไม่มีสิทธิ์ชำระเงินรายการนี้');
    if (r.payments.some((p) => p.status === 'SUCCESS')) {
      throw ApiError.conflict('ALREADY_PAID', 'การจองนี้ชำระเงินแล้ว');
    }
    if (r.payments.some((p) => p.status === 'PENDING')) {
      throw ApiError.conflict('PAYMENT_PENDING', 'มีสลิปที่รอตรวจสอบอยู่แล้ว');
    }
    if (!slipUrl) throw ApiError.badRequest('กรุณาแนบสลิปการโอนเงิน');
    return prisma.payment.create({
      data: { reservationId, method, amount: r.depositAmount, refCode: refCode(),
              status: 'PENDING', slipUrl }
    });
  },

  async review(id, approve) {
    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) throw ApiError.notFound('ไม่พบรายการชำระเงิน');
    if (payment.status !== 'PENDING') {
      throw ApiError.conflict('PAYMENT_REVIEWED', 'รายการนี้ถูกตรวจสอบแล้ว');
    }
    return prisma.$transaction(async (tx) => {
      const status = approve ? 'SUCCESS' : 'FAILED';
      const updated = await tx.payment.update({
        where: { id }, data: { status, paidAt: approve ? new Date() : null }
      });
      if (approve) {
        await tx.reservation.update({
          where: { id: payment.reservationId }, data: { status: 'CONFIRMED' }
        });
      }
      return updated;
    });
  },

  async create({ reservationId, method }, user) {
    const r = await prisma.reservation.findUnique({
      where: { id: reservationId }, include: { payments: true }
    });
    if (!r) throw ApiError.notFound('ไม่พบการจองนี้');
    if (r.userId !== user.id && user.role === 'CUSTOMER') {
      throw ApiError.forbidden('คุณไม่มีสิทธิ์ชำระเงินรายการนี้');
    }
    if (r.payments.some((p) => p.status === 'SUCCESS')) {
      throw ApiError.conflict('ALREADY_PAID', 'การจองนี้ชำระเงินแล้ว');
    }

    const amount = Number(r.depositAmount);
    if (amount <= 0) throw ApiError.badRequest('การจองนี้ไม่ต้องชำระค่ามัดจำ');

    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: { reservationId, method, amount,
                refCode: refCode(), status: 'SUCCESS', paidAt: new Date() }
      });
      await tx.reservation.update({
        where: { id: reservationId }, data: { status: 'CONFIRMED' }
      });
      return payment;
    });
  },

  async list({ from, to, skip, take, page, limit }) {
    const where = (from && to) ? {
      createdAt: { gte: new Date(from), lte: new Date(`${to}T23:59:59`) }
    } : {};
    const [rows, total] = await Promise.all([
      prisma.payment.findMany({
        where, skip, take, orderBy: { createdAt: 'desc' },
        select: {
          id: true, reservationId: true, method: true, amount: true, refCode: true,
          slipUrl: true, status: true, paidAt: true, createdAt: true,
          reservation: { include: {
            user: { select: { fullName: true } },
            table: { select: { tableNo: true } }
          } }
        }
      }),
      prisma.payment.count({ where })
    ]);
    return { rows, meta: { page, limit, total } };
  }
};
