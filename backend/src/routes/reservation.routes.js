import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { writeLimiter } from '../middlewares/rateLimit.js';
import * as V from '../validators/index.js';
import { reservationController } from '../controllers/reservation.controller.js';

const router = Router();
const noStore = (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); };

router.get('/reservations', authenticate, noStore, reservationController.list);
router.get('/reservations/:id', authenticate, validate(V.idParamsSchema, 'params'),
  noStore, reservationController.get);
router.post('/reservations', authenticate, writeLimiter,
  requirePermission('reservation:create'), validate(V.createReservationSchema), reservationController.create);
router.put('/reservations/:id', authenticate, validate(V.idParamsSchema, 'params'),
  validate(V.createReservationSchema), reservationController.update);
router.patch('/reservations/:id/status', authenticate, requirePermission('reservation:update'),
  validate(V.idParamsSchema, 'params'), validate(V.updateReservationStatusSchema),
  reservationController.updateStatus);
router.delete('/reservations/:id', authenticate, validate(V.idParamsSchema, 'params'),
  reservationController.cancel);
export default router;
