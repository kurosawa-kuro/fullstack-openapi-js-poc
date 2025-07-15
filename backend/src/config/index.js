import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Environment validation schema
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(8000),
  
  // Database
  DB_PATH: z.string().default('./db/db.json'),
  
  // Security
  CORS_ORIGINS: z.string().optional(),
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  
  // API
  API_BASE_PATH: z.string().default('/api/v1'),
  SWAGGER_PATH: z.string().default('/api-docs'),
  
  // JWT
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  JWT_EXPIRES_IN: z.coerce.number().default(3600),
  JWT_REFRESH_EXPIRES_IN: z.coerce.number().default(604800),
  
  // Password
  BCRYPT_ROUNDS: z.coerce.number().default(12),
  
  // Email
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  FROM_EMAIL: z.string().default('noreply@example.com'),
  
  // Auth rate limiting
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  AUTH_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(5),
  
  // Keycloak (optional)
  KEYCLOAK_SERVER_URL: z.string().optional(),
  KEYCLOAK_REALM: z.string().optional(),
  KEYCLOAK_CLIENT_ID: z.string().optional(),
  KEYCLOAK_CLIENT_SECRET: z.string().optional(),
});

// Validate environment variables
const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parseResult.error.format());
  process.exit(1);
}

const env = parseResult.data;

// Application configuration
export const config = {
  env: env.NODE_ENV,
  port: env.PORT,
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  
  // Database
  database: {
    path: env.DB_PATH,
  },
  
  // Security
  security: {
    corsOrigins: env.CORS_ORIGINS ? env.CORS_ORIGINS.split(',') : null,
  },
  
  // Rate limiting
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
  },
  
  // Logging
  logging: {
    level: env.LOG_LEVEL,
  },
  
  // API
  api: {
    basePath: env.API_BASE_PATH,
    swaggerPath: env.SWAGGER_PATH,
  },
  
  // JWT
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  },
  
  // Password
  password: {
    bcryptRounds: env.BCRYPT_ROUNDS,
  },
  
  // Email
  email: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    fromEmail: env.FROM_EMAIL,
  },
  
  // Auth rate limiting
  authRateLimit: {
    windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
    maxRequests: env.AUTH_RATE_LIMIT_MAX_REQUESTS,
  },
  
  // Keycloak
  keycloak: {
    serverUrl: env.KEYCLOAK_SERVER_URL,
    realm: env.KEYCLOAK_REALM,
    clientId: env.KEYCLOAK_CLIENT_ID,
    clientSecret: env.KEYCLOAK_CLIENT_SECRET,
  },
};

export default config;