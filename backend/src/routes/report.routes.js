import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { requirePermission } from '../middlewares/rbac.js';
import { reportController } from '../controllers/report.controller.js';

const router = Router();
const noStore = (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); };
router.get('/reports/overview', authenticate, requirePermission('report:read'), noStore, reportController.overview);
router.get('/reports/sales', authenticate, requirePermission('report:read'), noStore, reportController.sales);
router.get('/reports/top-menus', authenticate, requirePermission('report:read'), reportController.topMenus);
router.get('/reports/occupancy', authenticate, requirePermission('report:read'), reportController.occupancy);
router.get('/reports/satisfaction', authenticate, requirePermission('report:read'), reportController.satisfaction);
export default router;
