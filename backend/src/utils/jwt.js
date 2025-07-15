import jwt from 'jsonwebtoken';
import { jwtPayloadSchema, authTokensSchema, defaultAuthConfig } from '../../../shared/schemas/auth.js';

/**
 * JWT ユーティリティクラス
 * JWTトークンの生成・検証・管理を行う
 */
export class JWTUtils {
  constructor(config = {}) {
    this.config = { ...defaultAuthConfig, ...config };
    
    // JWT秘密鍵の検証
    if (!this.config.jwtSecret) {
      throw new Error('JWT secret is required');
    }
    
    if (this.config.jwtSecret.length < 32) {
      throw new Error('JWT secret must be at least 32 characters long');
    }
  }

  /**
   * JWTアクセストークンを生成
   * @param {Object} user - ユーザー情報
   * @returns {Promise<Object>} トークン情報
   */
  async generateTokens(user) {
    try {
      const now = Math.floor(Date.now() / 1000);
      const expiresIn = this.config.jwtExpiresIn;
      
      // JWTペイロード作成
      const payload = {
        sub: user.id.toString(), // Subject (ユーザーID)
        email: user.email,
        roles: user.roles,
        iat: now, // Issued At
        exp: now + expiresIn, // Expiration Time
        iss: 'api.example.com', // Issuer
        aud: 'api.example.com'  // Audience
      };

      // ペイロードバリデーション
      jwtPayloadSchema.parse(payload);

      // トークン生成
      const accessToken = jwt.sign(payload, this.config.jwtSecret, {
        algorithm: 'HS256'
      });

      // レスポンス用トークン情報
      const tokens = {
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: expiresIn
      };

      // トークン情報バリデーション
      authTokensSchema.parse(tokens);

      return tokens;
    } catch (error) {
      const jwtError = new Error('トークン生成に失敗しました');
      jwtError.code = 'TOKEN_GENERATION_FAILED';
      jwtError.originalError = error;
      throw jwtError;
    }
  }

  /**
   * JWTトークンを検証・デコード
   * @param {string} token - JWTトークン
   * @returns {Promise<Object>} デコードされたペイロード
   */
  async verifyToken(token) {
    try {
      if (!token) {
        throw new Error('Token is required');
      }

      // Bearer トークンの場合、プレフィックスを除去
      const cleanToken = token.startsWith('Bearer ') 
        ? token.slice(7) 
        : token;

      // トークン検証・デコード
      const decoded = jwt.verify(cleanToken, this.config.jwtSecret, {
        algorithms: ['HS256'],
        issuer: 'api.example.com',
        audience: 'api.example.com'
      });

      // ペイロードバリデーション
      const validatedPayload = jwtPayloadSchema.parse(decoded);

      return validatedPayload;
    } catch (error) {
      // JWT固有のエラーハンドリング
      if (error instanceof jwt.JsonWebTokenError) {
        const jwtError = new Error('無効なトークンです');
        jwtError.code = 'INVALID_TOKEN';
        jwtError.status = 401;
        throw jwtError;
      }
      
      if (error instanceof jwt.TokenExpiredError) {
        const expiredError = new Error('トークンの有効期限が切れています');
        expiredError.code = 'TOKEN_EXPIRED';
        expiredError.status = 401;
        throw expiredError;
      }
      
      if (error instanceof jwt.NotBeforeError) {
        const notBeforeError = new Error('トークンはまだ有効ではありません');
        notBeforeError.code = 'TOKEN_NOT_ACTIVE';
        notBeforeError.status = 401;
        throw notBeforeError;
      }

      // その他のエラー
      const verifyError = new Error('トークン検証に失敗しました');
      verifyError.code = 'TOKEN_VERIFICATION_FAILED';
      verifyError.status = 401;
      verifyError.originalError = error;
      throw verifyError;
    }
  }

  /**
   * トークンからユーザーIDを取得（検証なし）
   * @param {string} token - JWTトークン
   * @returns {string|null} ユーザーID
   */
  extractUserIdUnsafe(token) {
    try {
      const cleanToken = token.startsWith('Bearer ') 
        ? token.slice(7) 
        : token;
      
      const decoded = jwt.decode(cleanToken);
      return decoded?.sub || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * トークンの有効期限をチェック（検証なし）
   * @param {string} token - JWTトークン
   * @returns {boolean} 有効期限内かどうか
   */
  isTokenExpiredUnsafe(token) {
    try {
      const cleanToken = token.startsWith('Bearer ') 
        ? token.slice(7) 
        : token;
      
      const decoded = jwt.decode(cleanToken);
      if (!decoded?.exp) return true;
      
      const now = Math.floor(Date.now() / 1000);
      return decoded.exp < now;
    } catch (error) {
      return true;
    }
  }

  /**
   * リフレッシュトークンを生成
   * @param {Object} user - ユーザー情報
   * @param {string} deviceInfo - デバイス情報（オプション）
   * @returns {Promise<Object>} リフレッシュトークン情報
   */
  async generateRefreshToken(user, deviceInfo = null) {
    try {
      const refreshTokenRepository = (await import('../repositories/refreshTokenRepository.js')).default;
      return await refreshTokenRepository.create(user.id, deviceInfo);
    } catch (error) {
      const refreshError = new Error('リフレッシュトークン生成に失敗しました');
      refreshError.code = 'REFRESH_TOKEN_GENERATION_FAILED';
      refreshError.originalError = error;
      throw refreshError;
    }
  }

  /**
   * リフレッシュトークンを検証
   * @param {string} refreshToken - リフレッシュトークン
   * @returns {Promise<Object>} 検証結果
   */
  async verifyRefreshToken(refreshToken) {
    try {
      const refreshTokenRepository = (await import('../repositories/refreshTokenRepository.js')).default;
      
      const tokenData = await refreshTokenRepository.findByToken(refreshToken);
      if (!tokenData) {
        const invalidError = new Error('無効なリフレッシュトークンです');
        invalidError.code = 'INVALID_REFRESH_TOKEN';
        invalidError.status = 401;
        throw invalidError;
      }

      // 最終使用日時を更新
      await refreshTokenRepository.updateLastUsed(refreshToken);

      return tokenData;
    } catch (error) {
      if (error.code) throw error;
      
      const verifyError = new Error('リフレッシュトークン検証に失敗しました');
      verifyError.code = 'REFRESH_TOKEN_VERIFICATION_FAILED';
      verifyError.status = 401;
      verifyError.originalError = error;
      throw verifyError;
    }
  }

  /**
   * トークンをブラックリストに追加
   * @param {string} token - JWTトークン
   * @param {string} reason - ブラックリスト追加理由
   * @returns {Promise<void>}
   */
  async blacklistToken(token, reason = 'logout') {
    try {
      const tokenBlacklistRepository = (await import('../repositories/tokenBlacklistRepository.js')).default;
      
      // トークンの有効期限を取得
      let expiresAt = null;
      try {
        const decoded = jwt.decode(token.startsWith('Bearer ') ? token.slice(7) : token);
        expiresAt = decoded?.exp || null;
      } catch {
        // デコードに失敗した場合は24時間後に設定
        expiresAt = Math.floor(Date.now() / 1000) + (24 * 60 * 60);
      }

      await tokenBlacklistRepository.addToBlacklist(token, reason, expiresAt);
    } catch (error) {
      const blacklistError = new Error('トークンブラックリスト追加に失敗しました');
      blacklistError.code = 'TOKEN_BLACKLIST_FAILED';
      blacklistError.originalError = error;
      throw blacklistError;
    }
  }

  /**
   * トークンがブラックリストにあるかチェック
   * @param {string} token - JWTトークン
   * @returns {Promise<boolean>} ブラックリストにあるかどうか
   */
  async isTokenBlacklisted(token) {
    try {
      const tokenBlacklistRepository = (await import('../repositories/tokenBlacklistRepository.js')).default;
      return await tokenBlacklistRepository.isBlacklisted(token);
    } catch (error) {
      // ブラックリストチェックでエラーが発生した場合は安全側に倒してtrueを返す
      console.error('Blacklist check failed:', error);
      return true;
    }
  }

  /**
   * 設定情報を取得
   * @returns {Object} JWT設定
   */
  getConfig() {
    const { jwtSecret, ...publicConfig } = this.config;
    return publicConfig;
  }

  /**
   * トークンのデバッグ情報を取得（開発環境用）
   * @param {string} token - JWTトークン
   * @returns {Object} デバッグ情報
   */
  debugToken(token) {
    if (this.config.env === 'production') {
      throw new Error('Token debugging is not available in production');
    }

    try {
      const cleanToken = token.startsWith('Bearer ') 
        ? token.slice(7) 
        : token;
      
      const decoded = jwt.decode(cleanToken, { complete: true });
      
      return {
        header: decoded?.header,
        payload: decoded?.payload,
        isExpired: this.isTokenExpiredUnsafe(token),
        expiresAt: decoded?.payload?.exp 
          ? new Date(decoded.payload.exp * 1000).toISOString()
          : null
      };
    } catch (error) {
      return {
        error: error.message,
        isValid: false
      };
    }
  }
}

/**
 * JWT設定からJWTUtilsインスタンスを作成
 * @param {Object} config - JWT設定
 * @returns {JWTUtils} JWTUtilsインスタンス
 */
export function createJWTUtils(config = {}) {
  return new JWTUtils(config);
}

/**
 * Authorization ヘッダーからトークンを抽出
 * @param {string} authHeader - Authorization ヘッダー
 * @returns {string|null} 抽出されたトークン
 */
export function extractTokenFromAuthHeader(authHeader) {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
}

/**
 * リクエストからトークンを抽出
 * @param {Object} req - Expressリクエストオブジェクト
 * @returns {string|null} 抽出されたトークン
 */
export function extractTokenFromRequest(req) {
  // Authorization ヘッダーから抽出
  const authHeader = req.headers.authorization;
  if (authHeader) {
    return extractTokenFromAuthHeader(authHeader);
  }
  
  // セキュリティ向上: クエリパラメータからのトークン取得を削除
  // クエリパラメータはサーバーログに記録される可能性があるため削除
  
  return null;
}