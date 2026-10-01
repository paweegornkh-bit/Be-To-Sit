import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { authLimiter } from '../middlewares/rateLimit.js';
import { validate } from '../middlewares/validate.js';
import * as V from '../validators/index.js';
import { authController } from '../controllers/auth.controller.js';

const router = Router();
router.post('/auth/register', authLimiter, validate(V.registerSchema), authController.register);
router.post('/auth/login', authLimiter, validate(V.loginSchema), authController.login);
router.post('/auth/refresh', authController.refresh);
router.post('/auth/logout', authController.logout);
router.get('/auth/me', authenticate, authController.me);
export default router;
