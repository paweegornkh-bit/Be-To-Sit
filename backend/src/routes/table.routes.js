import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import * as V from '../validators/index.js';
import { tableController } from '../controllers/table.controller.js';

const router = Router();
const cachePublic = (seconds) => (_req, res, next) => {
  res.set('Cache-Control', `public, max-age=${seconds}`);
  next();
};

router.get('/zones', cachePublic(3600), tableController.listZones);
router.get('/tables', cachePublic(60), tableController.listTables);
router.patch('/tables/:id/position', authenticate, requirePermission('table:manage'),
  validate(V.idParamsSchema, 'params'), validate(V.tablePositionSchema), tableController.updatePosition);
router.patch('/tables/:id/status', authenticate, requirePermission('table:manage'),
  validate(V.idParamsSchema, 'params'), validate(V.tableStatusSchema), tableController.updateStatus);
export default router;
