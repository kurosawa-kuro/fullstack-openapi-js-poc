import { extractTokenFromRequest } from '../utils/jwt.js';
import { userRoleSchema } from '../../../shared/schemas/auth.js';

/**
 * 認証ミドルウェア
 * JWTトークンを検証し、リクエストにユーザー情報を追加
 */
export function authenticate(authService) {
  return async (req, res, next) => {
    try {
      // トークン抽出
      const token = extractTokenFromRequest(req);
      
      if (!token) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'MISSING_TOKEN',
            message: '認証トークンが必要です',
            timestamp: new Date().toISOString()
          }
        });
      }

      // ブラックリストチェック
      const jwtUtils = authService.jwtUtils;
      if (await jwtUtils.isTokenBlacklisted(token)) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'TOKEN_BLACKLISTED',
            message: 'このトークンは無効です',
            timestamp: new Date().toISOString()
          }
        });
      }

      // トークンからユーザー情報取得
      const user = await authService.getUserFromToken(token);
      
      // リクエストにユーザー情報とトークンを追加
      req.user = user;
      req.token = token;
      
      next();
    } catch (error) {
      // 認証エラーのハンドリング
      const status = error.status || 401;
      const code = error.code || 'AUTHENTICATION_FAILED';
      
      return res.status(status).json({
        success: false,
        error: {
          code,
          message: error.message || '認証に失敗しました',
          timestamp: new Date().toISOString()
        }
      });
    }
  };
}

/**
 * オプショナル認証ミドルウェア
 * トークンがある場合は認証、ない場合はそのまま通す
 */
export function optionalAuthenticate(authService) {
  return async (req, res, next) => {
    try {
      const token = extractTokenFromRequest(req);
      
      if (token) {
        try {
          // ブラックリストチェック
          const jwtUtils = authService.jwtUtils;
          if (!(await jwtUtils.isTokenBlacklisted(token))) {
            const user = await authService.getUserFromToken(token);
            req.user = user;
            req.token = token;
          }
        } catch (error) {
          // オプショナル認証なので、エラーがあってもそのまま通す
          // ログにエラー情報を記録する場合はここで行う
        }
      }
      
      next();
    } catch (error) {
      // 予期しないエラーは500として扱う
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'サーバー内部でエラーが発生しました',
          timestamp: new Date().toISOString()
        }
      });
    }
  };
}

/**
 * ロールベース認可ミドルウェア
 * 指定されたロールを持つユーザーのみアクセス許可
 */
export function authorize(requiredRole, authService) {
  // ロールバリデーション
  userRoleSchema.parse(requiredRole);
  
  return (req, res, next) => {
    try {
      // 認証チェック
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: '認証が必要です',
            timestamp: new Date().toISOString()
          }
        });
      }

      // 権限チェック
      if (!authService.hasRole(req.user, requiredRole)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'このリソースにアクセスする権限がありません',
            details: {
              required: requiredRole,
              userRoles: req.user.roles
            },
            timestamp: new Date().toISOString()
          }
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: '認可処理でエラーが発生しました',
          timestamp: new Date().toISOString()
        }
      });
    }
  };
}

/**
 * 複数ロール対応認可ミドルウェア
 * 指定されたロールのいずれかを持つユーザーのみアクセス許可
 */
export function authorizeAny(requiredRoles, authService) {
  // ロール配列バリデーション
  if (!Array.isArray(requiredRoles)) {
    throw new Error('requiredRoles must be an array');
  }
  
  requiredRoles.forEach(role => userRoleSchema.parse(role));
  
  return (req, res, next) => {
    try {
      // 認証チェック
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: '認証が必要です',
            timestamp: new Date().toISOString()
          }
        });
      }

      // いずれかのロールを持っているかチェック
      const hasAnyRole = requiredRoles.some(role => 
        authService.hasRole(req.user, role)
      );

      if (!hasAnyRole) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'このリソースにアクセスする権限がありません',
            details: {
              requiredAny: requiredRoles,
              userRoles: req.user.roles
            },
            timestamp: new Date().toISOString()
          }
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: '認可処理でエラーが発生しました',
          timestamp: new Date().toISOString()
        }
      });
    }
  };
}

/**
 * 自分自身のリソースアクセス認可ミドルウェア
 * ユーザーが自分自身のリソースにのみアクセス可能（管理者は除く）
 */
export function authorizeSelfOrAdmin(userIdParam = 'userId', authService) {
  return (req, res, next) => {
    try {
      // 認証チェック
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: '認証が必要です',
            timestamp: new Date().toISOString()
          }
        });
      }

      // 管理者権限チェック
      if (authService.hasRole(req.user, 'admin')) {
        return next();
      }

      // パラメータからユーザーIDを取得
      const requestedUserId = parseInt(req.params[userIdParam]);
      
      if (isNaN(requestedUserId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_USER_ID',
            message: '無効なユーザーIDです',
            timestamp: new Date().toISOString()
          }
        });
      }

      // 自分自身のリソースかチェック
      if (req.user.id !== requestedUserId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: '他のユーザーのリソースにはアクセスできません',
            timestamp: new Date().toISOString()
          }
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: '認可処理でエラーが発生しました',
          timestamp: new Date().toISOString()
        }
      });
    }
  };
}

/**
 * API キー認証ミドルウェア（管理用）
 */
export function authenticateApiKey(validApiKeys = []) {
  return (req, res, next) => {
    try {
      const apiKey = req.headers['x-api-key'] || req.query.api_key;
      
      if (!apiKey) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'MISSING_API_KEY',
            message: 'APIキーが必要です',
            timestamp: new Date().toISOString()
          }
        });
      }

      if (!validApiKeys.includes(apiKey)) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_API_KEY',
            message: '無効なAPIキーです',
            timestamp: new Date().toISOString()
          }
        });
      }

      // APIキー認証成功
      req.apiKeyAuth = true;
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'API_KEY_AUTH_ERROR',
          message: 'APIキー認証でエラーが発生しました',
          timestamp: new Date().toISOString()
        }
      });
    }
  };
}

/**
 * レート制限付き認証ミドルウェア
 * 認証失敗時の試行回数を制限
 */
export function rateLimitedAuthenticate(authService, options = {}) {
  const {
    maxAttempts = 5,
    windowMs = 15 * 60 * 1000, // 15分
    skipSuccessfulRequests = true
  } = options;

  // 簡易的なメモリベースレート制限（本番環境ではRedis等を使用）
  const attempts = new Map();

  return async (req, res, next) => {
    const clientId = req.ip || 'unknown';
    const now = Date.now();
    
    try {
      // 試行回数チェック
      const clientAttempts = attempts.get(clientId) || { count: 0, resetTime: now + windowMs };
      
      if (now > clientAttempts.resetTime) {
        // ウィンドウ期間が過ぎたらリセット
        clientAttempts.count = 0;
        clientAttempts.resetTime = now + windowMs;
      }

      if (clientAttempts.count >= maxAttempts) {
        return res.status(429).json({
          success: false,
          error: {
            code: 'TOO_MANY_ATTEMPTS',
            message: '認証試行回数が上限に達しました。しばらく待ってから再試行してください',
            retryAfter: Math.ceil((clientAttempts.resetTime - now) / 1000),
            timestamp: new Date().toISOString()
          }
        });
      }

      // 認証実行
      const token = extractTokenFromRequest(req);
      
      if (!token) {
        // 認証失敗をカウント
        clientAttempts.count++;
        attempts.set(clientId, clientAttempts);
        
        return res.status(401).json({
          success: false,
          error: {
            code: 'MISSING_TOKEN',
            message: '認証トークンが必要です',
            timestamp: new Date().toISOString()
          }
        });
      }

      // ブラックリストチェック
      const jwtUtils = authService.jwtUtils;
      if (await jwtUtils.isTokenBlacklisted(token)) {
        // 認証失敗をカウント
        clientAttempts.count++;
        attempts.set(clientId, clientAttempts);
        
        return res.status(401).json({
          success: false,
          error: {
            code: 'TOKEN_BLACKLISTED',
            message: 'このトークンは無効です',
            timestamp: new Date().toISOString()
          }
        });
      }

      const user = await authService.getUserFromToken(token);
      
      // 認証成功
      if (skipSuccessfulRequests) {
        // 成功時は試行回数をリセット
        attempts.delete(clientId);
      }
      
      req.user = user;
      req.token = token;
      
      next();
    } catch (error) {
      // 認証失敗をカウント
      const clientAttempts = attempts.get(clientId) || { count: 0, resetTime: now + windowMs };
      clientAttempts.count++;
      attempts.set(clientId, clientAttempts);
      
      const status = error.status || 401;
      const code = error.code || 'AUTHENTICATION_FAILED';
      
      return res.status(status).json({
        success: false,
        error: {
          code,
          message: error.message || '認証に失敗しました',
          timestamp: new Date().toISOString()
        }
      });
    }
  };
}