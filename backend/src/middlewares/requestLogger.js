import morgan from 'morgan';
import config from '../config/index.js';

// Custom token for response body size
morgan.token('res-body-size', (req, res) => {
  return res.get('content-length') || '0';
});

// Custom token for request ID (if available)
morgan.token('request-id', (req) => {
  return req.id || 'unknown';
});

// Custom token for user ID (if available)
morgan.token('user-id', (req) => {
  return req.user?.id || 'anonymous';
});

// Development format with colors
const developmentFormat = morgan(':method :url :status :res[content-length] - :response-time ms');

// Production format with structured logging
const productionFormat = morgan((tokens, req, res) => {
  const log = {
    timestamp: new Date().toISOString(),
    method: tokens.method(req, res),
    url: tokens.url(req, res),
    status: parseInt(tokens.status(req, res)),
    contentLength: tokens.res(req, res, 'content-length') || '0',
    responseTime: parseFloat(tokens['response-time'](req, res)),
    userAgent: tokens['user-agent'](req, res),
    ip: tokens['remote-addr'](req, res),
    requestId: tokens['request-id'](req, res),
    userId: tokens['user-id'](req, res)
  };
  
  return JSON.stringify(log);
});

// Skip logging for health checks and static assets
const shouldSkip = (req, res) => {
  // Skip health checks
  if (req.url === '/health' || req.url === '/ping') {
    return true;
  }
  
  // Skip static assets in production
  if (config.isProduction && (
    req.url.startsWith('/static/') ||
    req.url.startsWith('/assets/') ||
    req.url.startsWith('/favicon.ico')
  )) {
    return true;
  }
  
  return false;
};

// Export configured morgan middleware
const requestLogger = config.isTest 
  ? (req, res, next) => next() // Skip logging in test environment
  : config.isProduction
    ? morgan(productionFormat, { skip: shouldSkip })
    : morgan(developmentFormat, { skip: shouldSkip });

export { requestLogger };
export default requestLogger;