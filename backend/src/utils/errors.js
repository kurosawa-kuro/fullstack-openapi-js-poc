export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null, isOperational = true) {
    super(message);
    
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden access') {
    super(message, 403, 'FORBIDDEN');
  }
}

export const createError = (message, statusCode = 500, code = 'INTERNAL_ERROR') => {
  return new AppError(message, statusCode, code);
};

// 認証関連エラー
export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed', details = null) {
    super(message, 401, 'AUTHENTICATION_ERROR', details);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Access denied', details = null) {
    super(message, 403, 'AUTHORIZATION_ERROR', details);
  }
}

export class TokenExpiredError extends AppError {
  constructor(message = 'Token has expired') {
    super(message, 401, 'TOKEN_EXPIRED');
  }
}

export class TokenBlacklistedError extends AppError {
  constructor(message = 'Token is blacklisted') {
    super(message, 401, 'TOKEN_BLACKLISTED');
  }
}

// リフレッシュトークン関連エラー
export class RefreshTokenError extends AppError {
  constructor(message = 'Invalid refresh token', details = null) {
    super(message, 401, 'REFRESH_TOKEN_ERROR', details);
  }
}

// レート制限エラー
export class RateLimitError extends AppError {
  constructor(message = 'Too many requests', retryAfter = null) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', { retryAfter });
  }
}

// データベース関連エラー
export class DatabaseError extends AppError {
  constructor(message = 'Database operation failed', operation = null, details = null) {
    super(message, 500, 'DATABASE_ERROR', { operation, ...details });
  }
}

// 外部サービス関連エラー
export class ExternalServiceError extends AppError {
  constructor(service, message = 'External service error', details = null) {
    super(message, 502, 'EXTERNAL_SERVICE_ERROR', { service, ...details });
  }
}

// タイムアウトエラー
export class TimeoutError extends AppError {
  constructor(message = 'Operation timed out', timeout = null) {
    super(message, 408, 'TIMEOUT_ERROR', { timeout });
  }
}

// エラーハンドリングヘルパー
export const handleAsyncError = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * エラーを標準的なAppErrorに変換
 * @param {Error} error - 変換対象のエラー
 * @param {string} defaultMessage - デフォルトメッセージ
 * @param {number} defaultStatusCode - デフォルトステータスコード
 * @param {string} defaultCode - デフォルトエラーコード
 * @returns {AppError} 標準化されたエラー
 */
export const normalizeError = (error, defaultMessage = 'An error occurred', defaultStatusCode = 500, defaultCode = 'INTERNAL_ERROR') => {
  if (error instanceof AppError) {
    return error;
  }

  // よく知られたエラータイプの変換
  if (error.name === 'ValidationError' || error.code === 'VALIDATION_ERROR') {
    return new ValidationError(error.message, error.details);
  }

  if (error.name === 'CastError' || error.code === 'CAST_ERROR') {
    return new ValidationError('Invalid data format', { field: error.path, value: error.value });
  }

  if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
    return new ExternalServiceError('network', 'Network connection failed', { originalError: error.message });
  }

  if (error.code === 'ETIMEDOUT') {
    return new TimeoutError('Request timed out', error.timeout);
  }

  // 未知のエラーを一般的なAppErrorに変換
  return new AppError(
    error.message || defaultMessage,
    defaultStatusCode,
    defaultCode,
    { originalError: error.message }
  );
};

/**
 * エラーレスポンス形式を統一
 * @param {AppError} error - エラーオブジェクト
 * @param {boolean} includeStack - スタックトレースを含めるか
 * @returns {Object} レスポンス形式のエラー
 */
export const formatErrorResponse = (error, includeStack = false) => {
  const response = {
    success: false,
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || 'An error occurred',
      timestamp: error.timestamp || new Date().toISOString()
    }
  };

  if (error.details) {
    response.error.details = error.details;
  }

  if (includeStack && error.stack) {
    response.error.stack = error.stack;
  }

  return response;
};