import { expenseService } from '../services/expense.service.js';
import { asyncHandler } from '../utils/ApiError.js';
import { ok, created } from '../utils/response.js';
import { auditService } from '../services/audit.service.js';

export const expenseController = {
  list: asyncHandler(async (req, res) =>
    ok(res, await expenseService.list(req.query.status))),
  create: asyncHandler(async (req, res) =>
    created(res, await expenseService.create(req.body, req.user.id))),
  approve: asyncHandler(async (req, res) => {
    const expense = await expenseService.approve(req.params.id, req.body.approve, req.user.id);
    await auditService.write({ userId: req.user.id, action: expense.status, entity: 'Expense',
                       entityId: expense.id, ip: req.ip });
    ok(res, expense);
  })
};
