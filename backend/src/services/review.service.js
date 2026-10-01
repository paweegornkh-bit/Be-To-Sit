import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';

export const reviewService = {
  async create({ reservationId, rating, comment }, userId) {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId }, select: { userId: true, status: true }
    });
    if (!reservation) throw ApiError.notFound('ไม่พบการจองนี้');
    if (reservation.userId !== userId) {
      throw ApiError.forbidden('คุณไม่มีสิทธิ์รีวิวการจองนี้');
    }
    if (reservation.status !== 'COMPLETED') {
      throw ApiError.conflict('RESERVATION_NOT_COMPLETED', 'รีวิวได้หลังใช้บริการเสร็จแล้วเท่านั้น');
    }
    return prisma.review.create({ data: { reservationId, rating, comment } });
  }
};
