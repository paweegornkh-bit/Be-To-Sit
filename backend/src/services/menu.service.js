import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';

const assertUniqueName = async (name, id) => {
  const duplicate = await prisma.menuItem.findFirst({
    where: {
      isDeleted: false,
      name: { equals: name, mode: 'insensitive' },
      ...(id && { id: { not: id } })
    },
    select: { id: true }
  });
  if (duplicate) throw ApiError.conflict('DUPLICATE_MENU_NAME', 'มีชื่อเมนูนี้อยู่แล้ว');
};

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

  async createItem(data) {
    await assertUniqueName(data.name);
    try {
      return await prisma.menuItem.create({ data });
    } catch (error) {
      if (error.code === 'P2002') {
        throw ApiError.conflict('DUPLICATE_MENU_NAME', 'มีชื่อเมนูนี้อยู่แล้ว');
      }
      throw error;
    }
  },

  async updateItem(id, data) {
    await assertUniqueName(data.name, id);
    try {
      return await prisma.menuItem.update({ where: { id }, data });
    } catch (error) {
      if (error.code === 'P2002') {
        throw ApiError.conflict('DUPLICATE_MENU_NAME', 'มีชื่อเมนูนี้อยู่แล้ว');
      }
      throw error;
    }
  },

  deleteItem(id) {
    return prisma.menuItem.update({ where: { id }, data: { isDeleted: true } });
  }
};
