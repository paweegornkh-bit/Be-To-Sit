import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';

export const inventoryService = {
  listIngredients() {
    return prisma.ingredient.findMany({ orderBy: { name: 'asc' } });
  },

  createIngredient(data) {
    return prisma.ingredient.create({ data });
  },

  updateIngredient(id, data) {
    return prisma.ingredient.update({ where: { id }, data });
  },

  deleteIngredient(id) {
    return prisma.ingredient.delete({ where: { id } });
  },

  async createMovement({ ingredientId, type, qty, note }, userId) {
    const ingredient = await prisma.ingredient.findUniqueOrThrow({ where: { id: ingredientId } });
    if (type === 'OUT' && Number(ingredient.stockQty) < qty) {
      throw ApiError.conflict('INSUFFICIENT_STOCK',
        `สต็อกไม่เพียงพอ (คงเหลือ ${ingredient.stockQty} ${ingredient.unit})`);
    }
    const delta = type === 'IN' ? qty : type === 'OUT' ? -qty : qty - Number(ingredient.stockQty);
    const [movement] = await prisma.$transaction([
      prisma.stockMovement.create({
        data: { ingredientId, type, qty, note, createdById: userId }
      }),
      prisma.ingredient.update({
        where: { id: ingredientId }, data: { stockQty: { increment: delta } }
      })
    ]);
    return movement;
  },

  prepList(date) {
    return prisma.$queryRaw`
      SELECT i.name, i.unit, SUM(rc.qty * ri.qty)::float AS "requiredQty",
             i.stock_qty::float AS "stockQty"
      FROM reservations r
      JOIN reservation_items ri ON ri.reservation_id = r.id
      JOIN recipe_items rc      ON rc.menu_item_id   = ri.menu_item_id
      JOIN ingredients i        ON i.id              = rc.ingredient_id
      WHERE r.reserve_date = ${date} AND r.status IN ('CONFIRMED','PENDING')
      GROUP BY i.id, i.name, i.unit, i.stock_qty ORDER BY 3 DESC`;
  }
};
