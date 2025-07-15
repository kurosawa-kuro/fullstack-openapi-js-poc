import { z } from 'zod';
import { UserSummarySchema } from './user.js';

// Base Micropost Schema (matches OpenAPI Micropost schema)
export const MicropostSchema = z.object({
  id: z.number().int().positive(),
  userId: z.number().int().positive(),
  content: z.string().min(1).max(280),
  contentLength: z.number().int().min(0).max(280),
  createdAt: z.string().datetime(),
  user: UserSummarySchema
});

// Micropost Summary Schema (for user details)
export const MicropostSummarySchema = z.object({
  id: z.number().int().positive(),
  content: z.string(),
  createdAt: z.string().datetime()
});

// Create Micropost Request Schema
export const CreateMicropostSchema = z.object({
  content: z.string().min(1, 'Content is required').max(280, 'Content must be 280 characters or less')
});

// Micropost Response Schema
export const MicropostResponseSchema = z.object({
  data: MicropostSchema
});

// Micropost List Response Schema
export const MicropostListResponseSchema = z.object({
  data: z.array(MicropostSchema),
  pagination: z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0)
  }),
  meta: z.object({
    userId: z.number().int().positive().optional(),
    userName: z.string().optional()
  }).optional()
});

// Query parameters schemas
export const MicropostQueryParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  search: z.string().max(100).optional()
});

export const UserMicropostQueryParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  since: z.string().datetime().optional(),
  until: z.string().datetime().optional()
});

export const MicropostParamsSchema = z.object({
  userId: z.coerce.number().int().positive()
});

export const MicropostIdParamsSchema = z.object({
  micropostId: z.coerce.number().int().positive()
});

// Legacy exports for backward compatibility
export const MicropostArraySchema = z.array(MicropostSchema);

export const ErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional()
});