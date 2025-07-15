import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { AppError } from '../utils/errors.js';
import { config } from '../config/index.js';
import crypto from 'crypto';

/**
 * Refresh Token Repository
 * リフレッシュトークンのデータアクセス層
 * 非同期パターンに統一し、エラーハンドリングを標準化
 */
class RefreshTokenRepository {
  constructor() {
    const adapter = new JSONFile(config.database.path);
    this.db = new Low(adapter, { refreshTokens: [] });
    this.initialized = false;
  }

  /**
   * データベース初期化
   * @private
   */
  async _ensureInitialized() {
    if (!this.initialized) {
      try {
        await this.db.read();
        
        // デフォルトデータがない場合の初期化
        if (!this.db.data) {
          this.db.data = { refreshTokens: [] };
          await this.db.write();
        }
        if (!this.db.data.refreshTokens) {
          this.db.data.refreshTokens = [];
          await this.db.write();
        }
        
        this.initialized = true;
      } catch (error) {
        throw new AppError('Database initialization failed', 500, 'DATABASE_ERROR', { 
          originalError: error.message 
        });
      }
    }
  }

  /**
   * データベース読み取りの安全な実行
   * @private
   */
  async _safeRead() {
    try {
      await this._ensureInitialized();
      await this.db.read();
      return this.db.data;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Database read failed', 500, 'DATABASE_READ_ERROR', { 
        originalError: error.message 
      });
    }
  }

  /**
   * データベース書き込みの安全な実行
   * @private
   */
  async _safeWrite() {
    try {
      await this.db.write();
    } catch (error) {
      throw new AppError('Database write failed', 500, 'DATABASE_WRITE_ERROR', { 
        originalError: error.message 
      });
    }
  }

  /**
   * リフレッシュトークンを生成
   * @returns {string} 生成されたリフレッシュトークン
   */
  generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * リフレッシュトークンを作成
   * @param {number} userId - ユーザーID
   * @param {string} deviceInfo - デバイス情報（オプション）
   * @returns {Promise<Object>} 作成されたリフレッシュトークン情報
   */
  async create(userId, deviceInfo = null) {
    try {
      if (!userId) {
        throw new AppError('User ID is required', 400, 'INVALID_USER_ID');
      }

      const data = await this._safeRead();
      const refreshTokens = data.refreshTokens || [];
      
      const token = this.generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30日間有効

      const refreshToken = {
        id: Date.now(), // 簡易ID生成
        token,
        userId: parseInt(userId, 10),
        deviceInfo,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        lastUsedAt: new Date().toISOString()
      };

      refreshTokens.push(refreshToken);
      this.db.data.refreshTokens = refreshTokens;
      await this._safeWrite();

      return refreshToken;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to create refresh token', 500, 'REFRESH_TOKEN_CREATE_ERROR', { 
        userId, 
        originalError: error.message 
      });
    }
  }

  /**
   * リフレッシュトークンを検索
   * @param {string} token - リフレッシュトークン
   * @returns {Promise<Object|null>} リフレッシュトークン情報またはnull
   */
  async findByToken(token) {
    try {
      const data = await this._safeRead();
      const refreshTokens = data.refreshTokens || [];
      
      const refreshToken = refreshTokens.find(rt => rt.token === token);
      
      if (!refreshToken) {
        return null;
      }

      // 有効期限チェック
      const now = new Date();
      const expiresAt = new Date(refreshToken.expiresAt);
      
      if (now > expiresAt) {
        // 期限切れトークンを削除
        await this.deleteByToken(token);
        return null;
      }

      return refreshToken;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to find refresh token', 500, 'REFRESH_TOKEN_FIND_ERROR', { 
        originalError: error.message 
      });
    }
  }

  /**
   * ユーザーのリフレッシュトークンを取得
   * @param {number} userId - ユーザーID
   * @returns {Promise<Array>} リフレッシュトークン配列
   */
  async findByUserId(userId) {
    try {
      const data = await this._safeRead();
      const refreshTokens = data.refreshTokens || [];
      
      const userTokens = refreshTokens.filter(rt => rt.userId === parseInt(userId, 10));
      
      // 有効期限切れトークンを除外
      const now = new Date();
      const validTokens = userTokens.filter(rt => {
        const expiresAt = new Date(rt.expiresAt);
        return now <= expiresAt;
      });

      return validTokens;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to find refresh tokens by user', 500, 'REFRESH_TOKEN_FIND_BY_USER_ERROR', { 
        userId, 
        originalError: error.message 
      });
    }
  }

  /**
   * リフレッシュトークンの最終使用日時を更新
   * @param {string} token - リフレッシュトークン
   * @returns {Promise<Object|null>} 更新されたリフレッシュトークン情報
   */
  async updateLastUsed(token) {
    try {
      const data = await this._safeRead();
      const refreshTokens = data.refreshTokens || [];
      
      const index = refreshTokens.findIndex(rt => rt.token === token);
      
      if (index === -1) {
        return null;
      }

      refreshTokens[index].lastUsedAt = new Date().toISOString();
      this.db.data.refreshTokens = refreshTokens;
      await this._safeWrite();

      return refreshTokens[index];
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to update refresh token last used', 500, 'REFRESH_TOKEN_UPDATE_ERROR', { 
        originalError: error.message 
      });
    }
  }

  /**
   * リフレッシュトークンを削除
   * @param {string} token - リフレッシュトークン
   * @returns {Promise<boolean>} 削除成功の可否
   */
  async deleteByToken(token) {
    try {
      const data = await this._safeRead();
      const refreshTokens = data.refreshTokens || [];
      
      const index = refreshTokens.findIndex(rt => rt.token === token);
      
      if (index === -1) {
        return false;
      }

      refreshTokens.splice(index, 1);
      this.db.data.refreshTokens = refreshTokens;
      await this._safeWrite();

      return true;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to delete refresh token', 500, 'REFRESH_TOKEN_DELETE_ERROR', { 
        originalError: error.message 
      });
    }
  }

  /**
   * ユーザーの全リフレッシュトークンを削除
   * @param {number} userId - ユーザーID
   * @returns {Promise<number>} 削除されたトークン数
   */
  async deleteByUserId(userId) {
    try {
      const data = await this._safeRead();
      const refreshTokens = data.refreshTokens || [];
      
      const userTokens = refreshTokens.filter(rt => rt.userId === parseInt(userId, 10));
      const remainingTokens = refreshTokens.filter(rt => rt.userId !== parseInt(userId, 10));
      
      this.db.data.refreshTokens = remainingTokens;
      await this._safeWrite();

      return userTokens.length;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to delete refresh tokens by user', 500, 'REFRESH_TOKEN_DELETE_BY_USER_ERROR', { 
        userId, 
        originalError: error.message 
      });
    }
  }

  /**
   * 期限切れリフレッシュトークンをクリーンアップ
   * @returns {Promise<number>} 削除されたトークン数
   */
  async cleanupExpired() {
    try {
      const data = await this._safeRead();
      const refreshTokens = data.refreshTokens || [];
      
      const now = new Date();
      const validTokens = refreshTokens.filter(rt => {
        const expiresAt = new Date(rt.expiresAt);
        return now <= expiresAt;
      });

      const deletedCount = refreshTokens.length - validTokens.length;
      
      if (deletedCount > 0) {
        this.db.data.refreshTokens = validTokens;
        await this._safeWrite();
      }

      return deletedCount;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to cleanup expired refresh tokens', 500, 'REFRESH_TOKEN_CLEANUP_ERROR', { 
        originalError: error.message 
      });
    }
  }
}

// シングルトンインスタンス
const refreshTokenRepository = new RefreshTokenRepository();

export default refreshTokenRepository;