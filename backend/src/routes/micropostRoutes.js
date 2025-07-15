import express from 'express';
import { getUserMicroposts, createUserMicropost, getAllMicropostsController, getMicropostByIdController } from '../controllers/micropostController.js';
import { validateRequest } from '../middlewares/validation.js';
import { MicropostParamsSchema, CreateMicropostSchema, UserMicropostQueryParamsSchema, MicropostQueryParamsSchema, MicropostIdParamsSchema } from '../../../shared/schemas/micropost.js';
import { createEndpointLimiter } from '../middlewares/rateLimiting.js';

const router = express.Router();

// Rate limiter for micropost endpoints
const micropostLimiter = createEndpointLimiter({
  max: 30, // 30 requests per window
  message: {
    success: false,
    error: {
      code: 'MICROPOST_RATE_LIMIT_EXCEEDED',
      message: 'Too many micropost requests, please try again later.',
      timestamp: new Date().toISOString()
    }
  }
});

// GET /users/:userId/microposts
router.get(
  '/:userId/microposts',
  micropostLimiter,
  validateRequest({ 
    params: MicropostParamsSchema,
    query: UserMicropostQueryParamsSchema
  }),
  getUserMicroposts
);

// POST /users/:userId/microposts
router.post(
  '/:userId/microposts',
  micropostLimiter,
  validateRequest({
    params: MicropostParamsSchema,
    body: CreateMicropostSchema
  }),
  createUserMicropost
);

export default router;