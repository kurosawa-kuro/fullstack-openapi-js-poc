import express from 'express';
import userRoutes from './userRoutes.js';
import micropostRoutes from './micropostRoutes.js';
import { createAuthRouter } from './auth.js';
import { getAllMicropostsController, getMicropostByIdController } from '../controllers/micropostController.js';
import { validateRequest } from '../middlewares/validation.js';
import { MicropostQueryParamsSchema, MicropostIdParamsSchema } from '../../../shared/schemas/micropost.js';
import { createEndpointLimiter } from '../middlewares/rateLimiting.js';

// 認証関連インポート
import { UserRepository } from '../repositories/userRepository.js';
import { AuthServiceFactory } from '../services/authService.js';
import { createJWTUtils } from '../utils/jwt.js';
import config from '../config/index.js';

const router = express.Router();

// 認証サービス初期化
const userRepository = new UserRepository();
const jwtUtils = createJWTUtils({
  jwtSecret: config.jwt.secret,
  jwtExpiresIn: config.jwt.expiresIn,
  env: config.env
});

const authService = AuthServiceFactory.create('local', {
  userRepository,
  jwtUtils
}, {
  jwtSecret: config.jwt.secret,
  jwtExpiresIn: config.jwt.expiresIn
});

// Rate limiter for micropost endpoints
const micropostLimiter = createEndpointLimiter({
  max: 50, // 50 requests per window for general micropost access
  message: {
    success: false,
    error: {
      code: 'MICROPOST_RATE_LIMIT_EXCEEDED',
      message: 'Too many micropost requests, please try again later.',
      timestamp: new Date().toISOString()
    }
  }
});

// Mount authentication routes
router.use('/auth', createAuthRouter(authService));

// Mount user routes
router.use('/users', userRoutes);

// Mount micropost routes (they include the /users prefix)
router.use('/users', micropostRoutes);

// Global micropost routes
// GET /microposts
router.get(
  '/microposts',
  micropostLimiter,
  validateRequest({ query: MicropostQueryParamsSchema }),
  getAllMicropostsController
);

// GET /microposts/:micropostId
router.get(
  '/microposts/:micropostId',
  micropostLimiter,
  validateRequest({ params: MicropostIdParamsSchema }),
  getMicropostByIdController
);

export default router;