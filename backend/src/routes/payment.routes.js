import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { writeLimiter } from '../middlewares/rateLimit.js';
import { uploadPaymentSlip } from '../middlewares/upload.js';
import * as V from '../validators/index.js';
import { paymentController } from '../controllers/payment.controller.js';

const router = Router();
const noStore = (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); };

router.post('/payments', authenticate, writeLimiter, requirePermission('payment:create'),
  validate(V.paymentSchema), paymentController.create);
router.post('/payments/transfer-slip', authenticate, writeLimiter,
  requirePermission('payment:create'), uploadPaymentSlip, paymentController.submitSlip);
router.get('/payments/:id/slip', authenticate, validate(V.idParamsSchema, 'params'),
  noStore, paymentController.getSlip);
router.patch('/payments/:id/review', authenticate, requirePermission('payment:update'),
  validate(V.idParamsSchema, 'params'), validate(V.paymentReviewSchema), paymentController.review);
router.get('/payments', authenticate, requirePermission('payment:read'), noStore, paymentController.list);
router.get('/payments/:id/receipt', authenticate, requirePermission('payment:read'),
  validate(V.idParamsSchema, 'params'), paymentController.receipt);
export default router;
