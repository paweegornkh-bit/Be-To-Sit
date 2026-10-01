import { menuService } from '../services/menu.service.js';
import { asyncHandler } from '../utils/ApiError.js';
import { ok, created, noContent, paginate } from '../utils/response.js';
import { auditService } from '../services/audit.service.js';

export const menuController = {
  listCategories: asyncHandler(async (_req, res) =>
    ok(res, await menuService.listCategories())),
  listItems: asyncHandler(async (req, res) => {
    const page = paginate(req.query);
    const result = await menuService.listItems({ ...req.query, ...page });
    ok(res, result.rows, result.meta);
  }),
  getItem: asyncHandler(async (req, res) =>
    ok(res, await menuService.getItem(req.params.id))),
  createItem: asyncHandler(async (req, res) =>
    created(res, await menuService.createItem(req.body))),
  updateItem: asyncHandler(async (req, res) =>
    ok(res, await menuService.updateItem(req.params.id, req.body))),
  deleteItem: asyncHandler(async (req, res) => {
    await menuService.deleteItem(req.params.id);
    await auditService.write({ userId: req.user.id, action: 'DELETE', entity: 'MenuItem',
                       entityId: req.params.id, ip: req.ip });
    noContent(res);
  })
};
