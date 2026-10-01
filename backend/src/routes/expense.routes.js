import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { requirePermission, requireRole } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import * as V from '../validators/index.js';
import { expenseController } from '../controllers/expense.controller.js';

const router = Router();
router.get('/expenses', authenticate, requireRole('OWNER', 'MANAGER'), expenseController.list);
router.post('/expenses', authenticate, requirePermission('expense:create'),
  validate(V.expenseSchema), expenseController.create);
router.patch('/expenses/:id/approve', authenticate, requireRole('OWNER'),
  validate(V.idParamsSchema, 'params'), validate(V.expenseApprovalSchema), expenseController.approve);
export default router;
