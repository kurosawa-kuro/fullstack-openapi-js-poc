import { z } from 'zod';

// Base User Schema (matches OpenAPI User schema)
export const UserSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(50),
  email: z.string().email().max(100),
  bio: z.string().max(200).optional(),
  location: z.string().max(50).optional(),
  website: z.string().url().max(200).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
  micropostCount: z.number().int().min(0).optional()
});

// User Summary Schema (for references in microposts)
export const UserSummarySchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  email: z.string().email()
});

// Micropost Summary Schema (for user details)
export const MicropostSummarySchema = z.object({
  id: z.number().int().positive(),
  content: z.string(),
  createdAt: z.string().datetime()
});

// User List Response Schema
export const UserListResponseSchema = z.object({
  data: z.array(UserSchema),
  pagination: z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0)
  })
});

// User Detail Response Schema (with recent microposts)
export const UserDetailResponseSchema = z.object({
  data: UserSchema.extend({
    recentMicroposts: z.array(MicropostSummarySchema).max(5).optional()
  })
});

// Query parameters schemas
export const UserQueryParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['name_asc', 'name_desc', 'created_asc', 'created_desc']).default('created_desc'),
  search: z.string().max(100).optional()
});

export const UserParamsSchema = z.object({
  userId: z.coerce.number().int().positive()
});

// Legacy export for backward compatibility
export const UserArraySchema = z.array(UserSchema);

export const ErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional()
});