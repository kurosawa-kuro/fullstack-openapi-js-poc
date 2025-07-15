import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';

// General API rate limiting
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.',
      timestamp: new Date().toISOString()
    }
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Strict rate limiting for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 auth requests per windowMs
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later.',
      timestamp: new Date().toISOString()
    }
  },
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Speed limiter to gradually slow down repeat requests
export const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 20, // allow 20 requests per 15 minutes, then...
  delayMs: () => 500, // begin adding 500ms of delay per request above 20
  maxDelayMs: 5000, // maximum delay of 5 seconds
  validate: { delayMs: false } // disable warning
});

// Create endpoint-specific limiters
export const createEndpointLimiter = (options = {}) => {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: {
      success: false,
      error: {
        code: 'ENDPOINT_RATE_LIMIT_EXCEEDED',
        message: 'Too many requests to this endpoint, please try again later.',
        timestamp: new Date().toISOString()
      }
    }
  };

  return rateLimit({ ...defaultOptions, ...options });
};