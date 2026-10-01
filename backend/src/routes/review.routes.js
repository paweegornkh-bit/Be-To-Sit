import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import * as V from '../validators/index.js';
import { reviewController } from '../controllers/review.controller.js';

const router = Router();
router.post('/reviews', authenticate, validate(V.reviewSchema), reviewController.create);
export default router;
