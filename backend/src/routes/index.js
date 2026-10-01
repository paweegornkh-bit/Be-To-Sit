import { Router } from 'express';
import authRoutes from './auth.routes.js';
import tableRoutes from './table.routes.js';
import reservationRoutes from './reservation.routes.js';
import menuRoutes from './menu.routes.js';
import paymentRoutes from './payment.routes.js';
import inventoryRoutes from './inventory.routes.js';
import expenseRoutes from './expense.routes.js';
import reportRoutes from './report.routes.js';
import reviewRoutes from './review.routes.js';

const router = Router();
router.use(authRoutes);
router.use(tableRoutes);
router.use(reservationRoutes);
router.use(menuRoutes);
router.use(paymentRoutes);
router.use(inventoryRoutes);
router.use(expenseRoutes);
router.use(reportRoutes);
router.use(reviewRoutes);

export default router;
