import { prisma } from '../config/prisma.js';

export const menuService = {
  listCategories() {
    return prisma.menuCategory.findMany({ orderBy: { name: 'asc' } });
  },

  async listItems({ categoryId, q, skip, take, page, limit }) {
    const where = {
      isDeleted: false,
      ...(categoryId && { categoryId }),
      ...(q && { name: { contains: q, mode: 'insensitive' } })
    };
    const [rows, total] = await Promise.all([
      prisma.menuItem.findMany({
        where, include: { category: { select: { name: true } } },
        skip, take, orderBy: { name: 'asc' }
      }),
      prisma.menuItem.count({ where })
    ]);
    return { rows, meta: { page, limit, total } };
  },

  getItem(id) {
    return prisma.menuItem.findFirstOrThrow({
      where: { id, isDeleted: false },
      include: { category: true, recipes: { include: { ingredient: true } } }
    });
  },

  createItem(data) {
    return prisma.menuItem.create({ data });
  },

  updateItem(id, data) {
    return prisma.menuItem.update({ where: { id }, data });
  },

  deleteItem(id) {
    return prisma.menuItem.update({ where: { id }, data: { isDeleted: true } });
  }
};
