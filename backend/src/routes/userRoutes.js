import express from 'express';
import { getUsers, getUserById } from '../controllers/userController.js';
import { validateRequest } from '../middlewares/validation.js';
import { UserQueryParamsSchema, UserParamsSchema } from '../../../shared/schemas/user.js';

const router = express.Router();

// GET /users
router.get(
  '/',
  validateRequest({ query: UserQueryParamsSchema }),
  getUsers
);

// GET /users/:userId
router.get(
  '/:userId',
  validateRequest({ params: UserParamsSchema }),
  getUserById
);

export default router;