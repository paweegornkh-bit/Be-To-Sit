import { reviewService } from '../services/review.service.js';
import { asyncHandler } from '../utils/ApiError.js';
import { created } from '../utils/response.js';

export const reviewController = {
  create: asyncHandler(async (req, res) =>
    created(res, await reviewService.create(req.body, req.user.id)))
};
