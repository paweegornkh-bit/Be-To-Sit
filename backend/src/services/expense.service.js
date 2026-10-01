import { prisma } from '../config/prisma.js';

export const expenseService = {
  list(status) {
    return prisma.expense.findMany({
      where: { ...(status && { status }) },
      include: {
        requestedBy: { select: { fullName: true } },
        approvedBy: { select: { fullName: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  },

  create({ category, amount, description }, requestedById) {
    return prisma.expense.create({
      data: { category, amount, description, requestedById }
    });
  },

  approve(id, approve, approvedById) {
    const status = approve ? 'APPROVED' : 'REJECTED';
    return prisma.expense.update({
      where: { id },
      data: { status, approvedById, approvedAt: new Date() }
    });
  }
};
