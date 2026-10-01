import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import * as V from '../validators/index.js';
import { menuController } from '../controllers/menu.controller.js';

const router = Router();
const cachePublic = (seconds) => (_req, res, next) => {
  res.set('Cache-Control', `public, max-age=${seconds}`);
  next();
};

router.get('/menu-categories', cachePublic(3600), menuController.listCategories);
router.get('/menu-items', cachePublic(600), menuController.listItems);
router.get('/menu-items/:id', validate(V.idParamsSchema, 'params'),
  cachePublic(600), menuController.getItem);
router.post('/menu-items', authenticate, requirePermission('menu:create'),
  validate(V.menuItemSchema), menuController.createItem);
router.put('/menu-items/:id', authenticate, requirePermission('menu:update'),
  validate(V.idParamsSchema, 'params'), validate(V.menuItemSchema), menuController.updateItem);
router.delete('/menu-items/:id', authenticate, requirePermission('menu:delete'),
  validate(V.idParamsSchema, 'params'), menuController.deleteItem);
export default router;
