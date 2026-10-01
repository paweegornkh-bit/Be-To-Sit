import { prisma } from '../config/prisma.js';

export const tableService = {
  listZones() {
    return prisma.zone.findMany({
      include: { _count: { select: { tables: true } } }, orderBy: { name: 'asc' }
    });
  },

  async listTables({ zoneId, date, slot }) {
    const tables = await prisma.table.findMany({
      where: { ...(zoneId && { zoneId }) },
      include: { zone: { select: { name: true } } }, orderBy: { tableNo: 'asc' }
    });
    if (!date || !slot) return tables;

    const booked = await prisma.reservation.findMany({
      where: {
        reserveDate: new Date(date), timeSlot: slot,
        status: { notIn: ['CANCELLED', 'NO_SHOW'] }
      },
      select: { tableId: true }
    });
    const bookedSet = new Set(booked.map((reservation) => reservation.tableId));
    return tables.map((table) => ({
      ...table,
      isAvailable: !bookedSet.has(table.id) && table.status !== 'MAINTENANCE'
    }));
  },

  updatePosition(id, data) {
    return prisma.table.update({ where: { id }, data });
  },

  updateStatus(id, status) {
    return prisma.table.update({ where: { id }, data: { status } });
  }
};
