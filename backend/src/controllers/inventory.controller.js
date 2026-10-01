import { inventoryService } from '../services/inventory.service.js';
import { asyncHandler } from '../utils/ApiError.js';
import { ok, created, noContent } from '../utils/response.js';

export const inventoryController = {
  listIngredients: asyncHandler(async (_req, res) =>
    ok(res, await inventoryService.listIngredients())),
  createIngredient: asyncHandler(async (req, res) =>
    created(res, await inventoryService.createIngredient(req.body))),
  updateIngredient: asyncHandler(async (req, res) =>
    ok(res, await inventoryService.updateIngredient(req.params.id, req.body))),
  deleteIngredient: asyncHandler(async (req, res) => {
    await inventoryService.deleteIngredient(req.params.id);
    noContent(res);
  }),
  createMovement: asyncHandler(async (req, res) =>
    created(res, await inventoryService.createMovement(req.body, req.user.id))),
  prepList: asyncHandler(async (req, res) => {
    const date = new Date(req.query.date || Date.now());
    ok(res, await inventoryService.prepList(date));
  })
};
