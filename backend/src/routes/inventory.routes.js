import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import * as V from '../validators/index.js';
import { inventoryController } from '../controllers/inventory.controller.js';

const router = Router();
router.get('/ingredients', authenticate, requirePermission('ingredient:read'), inventoryController.listIngredients);
router.post('/ingredients', authenticate, requirePermission('ingredient:create'),
  validate(V.ingredientSchema), inventoryController.createIngredient);
router.put('/ingredients/:id', authenticate, requirePermission('ingredient:update'),
  validate(V.idParamsSchema, 'params'), validate(V.ingredientSchema), inventoryController.updateIngredient);
router.delete('/ingredients/:id', authenticate, requirePermission('ingredient:delete'),
  validate(V.idParamsSchema, 'params'), inventoryController.deleteIngredient);
router.post('/stock-movements', authenticate, requirePermission('stock:create'),
  validate(V.stockMovementSchema), inventoryController.createMovement);
router.get('/prep-list', authenticate, requirePermission('stock:read'), inventoryController.prepList);
export default router;
