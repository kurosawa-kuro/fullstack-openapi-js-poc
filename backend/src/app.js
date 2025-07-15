import express from 'express';
import compression from 'compression';
import routes from './routes/index.js';
import config from './config/index.js';
import {
  corsMiddleware,
  helmetMiddleware,
  requestLogger,
  errorHandler,
  apiLimiter,
  speedLimiter,
  openApiMiddleware,
  swaggerMiddleware,
  swaggerServe,
  apiNotFoundHandler,
  globalNotFoundHandler
} from './middlewares/index.js';


// Create Express app
const app = express();

// Trust proxy for rate limiting and IP detection
app.set('trust proxy', 1);

// Health check endpoint (before any middleware)
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.env
    }
  });
});

// Compression middleware (should be early)
app.use(compression({
  filter: (req, res) => {
    // Don't compress responses with this request header
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Fallback to standard filter function
    return compression.filter(req, res);
  }
}));

// Security middleware
app.use(helmetMiddleware);
app.use(corsMiddleware);

// Rate limiting (apply to API routes in all environments for security)
// セキュリティ向上: 開発環境でもレート制限を有効化
app.use('/api', apiLimiter);
if (config.isProduction) {
  // 本番環境では追加でspeedLimiterも適用
  app.use('/api', speedLimiter);
}

// Request logging
app.use(requestLogger);

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  strict: true
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));

// Swagger UI
app.use(config.api.swaggerPath, swaggerServe, swaggerMiddleware);

// API Routes (OpenAPI compliant) - First
app.use(config.api.basePath, routes);

// OpenAPI validation middleware (Express 5.x compatible) - After routes for validation only
// app.use(config.api.basePath, openApiMiddleware);

// 404 handler for API routes (Express 5.x compatible syntax)
app.use('/api/*catchall', apiNotFoundHandler);

// 404 handler for all other routes (Express 5.x compatible syntax)
app.use('/*catchall', globalNotFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
  
  // Force close server after 30 seconds
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 80000);
};

// Start server only if this file is run directly
let server;
if (import.meta.url === `file://${process.argv[1]}`) {
  server = app.listen(config.port, () => {
    console.log(`🚀 Server running on port ${config.port} in ${config.env} mode`);
    console.log(`📚 API documentation available at http://localhost:${config.port}${config.api.swaggerPath}`);
    console.log(`🔗 API base URL: http://localhost:${config.port}${config.api.basePath}`);
  });

  // Handle graceful shutdown
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

export default app;