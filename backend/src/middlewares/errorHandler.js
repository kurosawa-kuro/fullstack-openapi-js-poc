import { AppError, normalizeError, formatErrorResponse } from '../utils/errors.js';
import config from '../config/index.js';

// セキュリティ向上: センシティブ情報のサニタイズ
const sanitizeErrorMessage = (message) => {
  if (!message || typeof message !== 'string') return 'An error occurred';
  
  // ファイルパス、環境変数、秘密鍵などを除去
  return message
    .replace(/\/[^\/\s]+\/[^\/\s]+\/[^\/\s]+/g, '[PATH_REMOVED]') // ファイルパス除去
    .replace(/password[^,}]*/gi, 'password=[REDACTED]') // パスワード除去
    .replace(/token[^,}]*/gi, 'token=[REDACTED]') // トークン除去
    .replace(/secret[^,}]*/gi, 'secret=[REDACTED]') // シークレット除去
    .replace(/key[^,}]*/gi, 'key=[REDACTED]'); // キー除去
};

const sanitizeUrl = (url) => {
  if (!url) return url;
  // クエリパラメータからセンシティブ情報を除去
  return url.replace(/([?&])(token|password|secret|key)=[^&]*/gi, '$1$2=[REDACTED]');
};

const errorHandler = (err, req, res, next) => {
  // エラーを標準化
  const normalizedError = normalizeError(err);
  
  // Log error with request context (センシティブ情報をサニタイズ)
  const errorLog = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: sanitizeUrl(req.url),
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id || null,
    requestId: req.id || null,
    error: {
      message: sanitizeErrorMessage(normalizedError.message),
      code: normalizedError.code,
      statusCode: normalizedError.statusCode,
      stack: config.isProduction ? '[REDACTED]' : normalizedError.stack,
      details: config.isProduction ? '[REDACTED]' : normalizedError.details,
      isOperational: normalizedError.isOperational
    }
  };

  // 重要度に応じたログレベル
  if (normalizedError.statusCode >= 500) {
    console.error('Server Error:', errorLog);
  } else if (normalizedError.statusCode >= 400) {
    console.warn('Client Error:', errorLog);
  } else {
    console.info('Error Info:', errorLog);
  }

  // Zod バリデーションエラーの特別処理
  if (err.name === 'ZodError') {
    const validationErrors = err.errors.map(error => ({
      path: error.path.join('.'),
      message: error.message,
      code: error.code,
      received: error.received
    }));

    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'リクエストデータが無効です',
        details: validationErrors,
        timestamp: new Date().toISOString()
      }
    });
  }

  // JWT関連エラーの特別処理
  if (['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(err.name)) {
    const jwtErrorMap = {
      'JsonWebTokenError': { code: 'INVALID_TOKEN', message: '無効なトークンです' },
      'TokenExpiredError': { code: 'TOKEN_EXPIRED', message: 'トークンの有効期限が切れています' },
      'NotBeforeError': { code: 'TOKEN_NOT_ACTIVE', message: 'トークンはまだ有効ではありません' }
    };

    const jwtError = jwtErrorMap[err.name];
    res.setHeader('WWW-Authenticate', 'Bearer error="invalid_token"');
    
    return res.status(401).json({
      success: false,
      error: {
        code: jwtError.code,
        message: jwtError.message,
        timestamp: new Date().toISOString()
      }
    });
  }

  // SyntaxError (不正なJSONなど)の特別処理
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_JSON',
        message: 'リクエストボディのJSONが無効です',
        timestamp: new Date().toISOString()
      }
    });
  }

  // レスポンス作成
  const includeStack = !config.isProduction;
  const response = formatErrorResponse(normalizedError, includeStack);

  // センシティブ情報のサニタイズ
  if (response.error.message) {
    response.error.message = config.isProduction && normalizedError.statusCode >= 500 
      ? 'サーバー内部でエラーが発生しました' 
      : sanitizeErrorMessage(response.error.message);
  }

  if (response.error.details && config.isProduction && normalizedError.statusCode >= 500) {
    delete response.error.details;
  }

  if (response.error.stack) {
    response.error.stack = sanitizeErrorMessage(response.error.stack);
  }

  // 特定のエラーコードに対するHTTPヘッダー追加
  if (normalizedError.code === 'RATE_LIMIT_EXCEEDED' && normalizedError.details?.retryAfter) {
    res.setHeader('Retry-After', normalizedError.details.retryAfter);
  }

  // ヘルスチェックエラーの特別処理
  if (req.url === '/health') {
    response.error.service = 'health-check';
  }

  res.status(normalizedError.statusCode).json(response);
};

export default errorHandler;