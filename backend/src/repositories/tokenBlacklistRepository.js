import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { AppError } from '../utils/errors.js';
import { config } from '../config/index.js';
import crypto from 'crypto';

/**
 * Token Blacklist Repository
 * トークンブラックリストのデータアクセス層
 * 非同期パターンに統一し、エラーハンドリングを標準化
 */
class TokenBlacklistRepository {
  constructor() {
    const adapter = new JSONFile(config.database.path);
    this.db = new Low(adapter, { tokenBlacklist: [] });
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
          this.db.data = { tokenBlacklist: [] };
          await this.db.write();
        }
        if (!this.db.data.tokenBlacklist) {
          this.db.data.tokenBlacklist = [];
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
   * トークンのハッシュを生成
   * @param {string} token - JWTトークン
   * @returns {string} SHA256ハッシュ
   */
  generateTokenHash(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * トークンをブラックリストに追加
   * @param {string} token - JWTトークン
   * @param {string} reason - ブラックリスト追加理由
   * @param {number} expiresAt - トークンの有効期限（Unix timestamp）
   * @returns {Promise<Object>} ブラックリストエントリ
   */
  async addToBlacklist(token, reason = 'logout', expiresAt = null) {
    try {
      if (!token) {
        throw new AppError('Token is required', 400, 'INVALID_TOKEN');
      }

      const data = await this._safeRead();
      const tokenBlacklist = data.tokenBlacklist || [];
      
      // トークンのハッシュを生成（プライバシー保護）
      const tokenHash = this.generateTokenHash(token);
      
      // 既にブラックリストにある場合はスキップ
      const existing = tokenBlacklist.find(entry => entry.tokenHash === tokenHash);
      if (existing) {
        return existing;
      }

      // 有効期限が指定されていない場合は24時間後に設定
      const defaultExpiresAt = expiresAt || (Math.floor(Date.now() / 1000) + (24 * 60 * 60));

      const blacklistEntry = {
        id: Date.now(), // 簡易ID生成
        tokenHash,
        reason,
        createdAt: new Date().toISOString(),
        expiresAt: defaultExpiresAt
      };

      tokenBlacklist.push(blacklistEntry);
      this.db.data.tokenBlacklist = tokenBlacklist;
      await this._safeWrite();

      return blacklistEntry;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to add token to blacklist', 500, 'TOKEN_BLACKLIST_ADD_ERROR', { 
        reason,
        originalError: error.message 
      });
    }
  }

  /**
   * トークンがブラックリストにあるかチェック
   * @param {string} token - JWTトークン
   * @returns {Promise<boolean>} ブラックリストにあるかどうか
   */
  async isBlacklisted(token) {
    try {
      if (!token) {
        return false;
      }

      const data = await this._safeRead();
      const tokenBlacklist = data.tokenBlacklist || [];
      
      const tokenHash = this.generateTokenHash(token);
      const now = Math.floor(Date.now() / 1000);
      
      // ハッシュが一致し、まだ有効期限内のエントリを検索
      const blacklistEntry = tokenBlacklist.find(entry => 
        entry.tokenHash === tokenHash && entry.expiresAt > now
      );

      return !!blacklistEntry;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to check token blacklist', 500, 'TOKEN_BLACKLIST_CHECK_ERROR', { 
        originalError: error.message 
      });
    }
  }

  /**
   * ブラックリストエントリを取得
   * @param {string} token - JWTトークン
   * @returns {Promise<Object|null>} ブラックリストエントリまたはnull
   */
  async findBlacklistEntry(token) {
    try {
      if (!token) {
        return null;
      }

      const data = await this._safeRead();
      const tokenBlacklist = data.tokenBlacklist || [];
      
      const tokenHash = this.generateTokenHash(token);
      const now = Math.floor(Date.now() / 1000);
      
      const blacklistEntry = tokenBlacklist.find(entry => 
        entry.tokenHash === tokenHash && entry.expiresAt > now
      );

      return blacklistEntry || null;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to find blacklist entry', 500, 'TOKEN_BLACKLIST_FIND_ERROR', { 
        originalError: error.message 
      });
    }
  }

  /**
   * トークンをブラックリストから削除
   * @param {string} token - JWTトークン
   * @returns {Promise<boolean>} 削除成功の可否
   */
  async removeFromBlacklist(token) {
    try {
      if (!token) {
        return false;
      }

      const data = await this._safeRead();
      const tokenBlacklist = data.tokenBlacklist || [];
      
      const tokenHash = this.generateTokenHash(token);
      const index = tokenBlacklist.findIndex(entry => entry.tokenHash === tokenHash);
      
      if (index === -1) {
        return false;
      }

      tokenBlacklist.splice(index, 1);
      this.db.data.tokenBlacklist = tokenBlacklist;
      await this._safeWrite();

      return true;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to remove token from blacklist', 500, 'TOKEN_BLACKLIST_REMOVE_ERROR', { 
        originalError: error.message 
      });
    }
  }

  /**
   * 期限切れブラックリストエントリをクリーンアップ
   * @returns {Promise<number>} 削除されたエントリ数
   */
  async cleanupExpired() {
    try {
      const data = await this._safeRead();
      const tokenBlacklist = data.tokenBlacklist || [];
      
      const now = Math.floor(Date.now() / 1000);
      const validEntries = tokenBlacklist.filter(entry => entry.expiresAt > now);
      
      const deletedCount = tokenBlacklist.length - validEntries.length;
      
      if (deletedCount > 0) {
        this.db.data.tokenBlacklist = validEntries;
        await this._safeWrite();
      }

      return deletedCount;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to cleanup expired blacklist entries', 500, 'TOKEN_BLACKLIST_CLEANUP_ERROR', { 
        originalError: error.message 
      });
    }
  }

  /**
   * 全ブラックリストエントリを取得（管理用）
   * @param {Object} options - オプション
   * @returns {Promise<Array>} ブラックリストエントリ配列
   */
  async findAll(options = {}) {
    try {
      const {
        includeExpired = false,
        limit = 100,
        offset = 0
      } = options;

      const data = await this._safeRead();
      let tokenBlacklist = data.tokenBlacklist || [];
      
      if (!includeExpired) {
        const now = Math.floor(Date.now() / 1000);
        tokenBlacklist = tokenBlacklist.filter(entry => entry.expiresAt > now);
      }

      // ソート（作成日時の降順）
      tokenBlacklist.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // ページネーション
      const paginatedEntries = tokenBlacklist.slice(offset, offset + limit);

      return {
        entries: paginatedEntries,
        total: tokenBlacklist.length,
        limit,
        offset
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to find blacklist entries', 500, 'TOKEN_BLACKLIST_FIND_ALL_ERROR', { 
        originalError: error.message 
      });
    }
  }

  /**
   * ブラックリスト統計を取得
   * @returns {Promise<Object>} 統計情報
   */
  async getStats() {
    try {
      const data = await this._safeRead();
      const tokenBlacklist = data.tokenBlacklist || [];
      
      const now = Math.floor(Date.now() / 1000);
      const validEntries = tokenBlacklist.filter(entry => entry.expiresAt > now);
      const expiredEntries = tokenBlacklist.filter(entry => entry.expiresAt <= now);
      
      // 理由別の統計
      const reasonStats = validEntries.reduce((acc, entry) => {
        acc[entry.reason] = (acc[entry.reason] || 0) + 1;
        return acc;
      }, {});

      return {
        total: tokenBlacklist.length,
        valid: validEntries.length,
        expired: expiredEntries.length,
        reasonStats
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get blacklist stats', 500, 'TOKEN_BLACKLIST_STATS_ERROR', { 
        originalError: error.message 
      });
    }
  }
}

// シングルトンインスタンス
const tokenBlacklistRepository = new TokenBlacklistRepository();

export default tokenBlacklistRepository;