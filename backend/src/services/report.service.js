import { prisma } from '../config/prisma.js';

const MONTHLY_KPI = 500_000;

export const reportService = {
  async sales({ from, to }) {
    const start = new Date(from), end = new Date(to);
    end.setHours(23, 59, 59, 999);

    const daily = await prisma.$queryRaw`
      SELECT TO_CHAR(p.paid_at, 'YYYY-MM-DD')       AS day,
             SUM(p.amount)::float                    AS revenue,
             COUNT(DISTINCT r.id)::int               AS reservations,
             ROUND(AVG(r.party_size), 1)::float      AS avg_party
      FROM payments p
      JOIN reservations r ON r.id = p.reservation_id
      WHERE p.status = 'SUCCESS' AND p.paid_at BETWEEN ${start} AND ${end}
      GROUP BY 1 ORDER BY 1`;

    const byZone = await prisma.$queryRaw`
      SELECT z.name                       AS zone,
             SUM(p.amount)::float         AS revenue,
             COUNT(DISTINCT r.id)::int    AS bookings
      FROM payments p
      JOIN reservations r ON r.id = p.reservation_id
      JOIN tables t       ON t.id = r.table_id
      JOIN zones  z       ON z.id = t.zone_id
      WHERE p.status = 'SUCCESS' AND p.paid_at BETWEEN ${start} AND ${end}
      GROUP BY 1 ORDER BY 2 DESC`;

    const totalRevenue = daily.reduce((s, d) => s + d.revenue, 0);
    const totalRes = daily.reduce((s, d) => s + d.reservations, 0);
    return {
      kpi: {
        totalRevenue,
        target: MONTHLY_KPI,
        achievement: Math.round((totalRevenue / MONTHLY_KPI) * 1000) / 10,
        totalReservations: totalRes,
        avgTicket: totalRes ? Math.round(totalRevenue / totalRes) : 0
      },
      daily, byZone
    };
  },

  async topMenus(limit = 10) {
    return prisma.$queryRaw`
      SELECT m.name,
             SUM(ri.qty)::int                        AS qty,
             SUM(ri.qty * ri.unit_price)::float      AS revenue
      FROM reservation_items ri
      JOIN menu_items m   ON m.id = ri.menu_item_id
      JOIN reservations r ON r.id = ri.reservation_id
      WHERE r.status IN ('CONFIRMED','SEATED','COMPLETED')
      GROUP BY m.id, m.name ORDER BY qty DESC LIMIT ${limit}`;
  },

  async occupancy(date) {
    const d = new Date(date);
    const totalTables = await prisma.table.count();
    const booked = await prisma.reservation.count({
      where: { reserveDate: d, status: { notIn: ['CANCELLED', 'NO_SHOW'] } }
    });
    const SLOTS = 5;
    return {
      date, totalTables, booked,
      capacity: totalTables * SLOTS,
      occupancyRate: totalTables
        ? Math.round((booked / (totalTables * SLOTS)) * 1000) / 10 : 0
    };
  },

  async satisfaction({ from, to }) {
    const dist = await prisma.review.groupBy({
      by: ['rating'], _count: { rating: true },
      where: { createdAt: { gte: new Date(from), lte: new Date(to) } }
    });
    const agg = await prisma.review.aggregate({
      _avg: { rating: true }, _count: true,
      where: { createdAt: { gte: new Date(from), lte: new Date(to) } }
    });
    return {
      average: Math.round((agg._avg.rating || 0) * 100) / 100,
      totalReviews: agg._count,
      distribution: [1, 2, 3, 4, 5].map((r) => ({
        rating: r, count: dist.find((d) => d.rating === r)?._count.rating || 0
      }))
    };
  },

  async lowStockAlerts() {
    return prisma.$queryRaw`
      SELECT id, name, unit, stock_qty::float AS "stockQty",
             reorder_point::float AS "reorderPoint"
      FROM ingredients WHERE stock_qty <= reorder_point
      ORDER BY (stock_qty - reorder_point) ASC`;
  },

  async overview() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const [sales, top, occ, sat, low] = await Promise.all([
      this.sales({ from: monthStart, to: new Date() }),
      this.topMenus(10),
      this.occupancy(today),
      this.satisfaction({ from: monthStart, to: new Date() }),
      this.lowStockAlerts()
    ]);
    return { ...sales, topMenus: top, occupancy: occ, satisfaction: sat, lowStock: low };
  }
};
