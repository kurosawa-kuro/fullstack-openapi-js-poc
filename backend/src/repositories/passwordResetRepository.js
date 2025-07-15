import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import config from '../config/index.js';
import { createSecureToken } from '../utils/cuid.js';
import { 
  passwordResetTokenSchema
} from '../../../shared/schemas/auth.js';

/**
 * パスワードリセットトークン管理リポジトリ
 * パスワードリセットトークンの生成・検証・削除を管理
 */
export class PasswordResetRepository {
  constructor() {
    this.adapter = new JSONFile(config.database.path);
    this.db = new Low(this.adapter, { passwordResetTokens: [] });
    this.initialized = false;
  }

  /**
   * データベース初期化
   * @private
   */
  async _init() {
    if (!this.initialized) {
      await this.db.read();
      
      // passwordResetTokensテーブルが存在しない場合は作成
      this.db.data = this.db.data || {};
      if (!this.db.data.passwordResetTokens) {
        this.db.data.passwordResetTokens = [];
        await this.db.write();
      }
      
      this.initialized = true;
    }
  }

  /**
   * 安全なデータベース読み込み
   * @private
   */
  async _safeRead() {
    try {
      await this._init();
      await this.db.read();
      return this.db.data;
    } catch (error) {
      console.error('Database read error:', error);
      throw new Error('データベースの読み込みに失敗しました');
    }
  }

  /**
   * 安全なデータベース書き込み
   * @private
   */
  async _safeWrite() {
    try {
      await this.db.write();
    } catch (error) {
      console.error('Database write error:', error);
      throw new Error('データベースの書き込みに失敗しました');
    }
  }

  /**
   * パスワードリセットトークンを生成・保存
   * @param {number} userId - ユーザーID
   * @param {number} expiresIn - 有効期限（秒）
   * @returns {Promise<Object>} リセットトークン情報
   */
  async createResetToken(userId, expiresIn = 3600) {
    const data = await this._safeRead();
    
    // 既存の有効なトークンを無効化
    await this.invalidateUserTokens(userId);
    
    // 新しいトークン生成
    const token = createSecureToken();
    const now = Date.now();
    const expiresAt = Math.floor(now / 1000) + expiresIn;
    
    const resetToken = {
      id: data.passwordResetTokens.length + 1,
      userId,
      token,
      expiresAt,
      createdAt: new Date().toISOString(),
      used: false
    };

    // バリデーション
    const validatedToken = passwordResetTokenSchema.parse(resetToken);
    
    // データベースに保存
    data.passwordResetTokens.push(validatedToken);
    await this._safeWrite();
    
    return validatedToken;
  }

  /**
   * トークンでリセット情報を取得
   * @param {string} token - リセットトークン
   * @returns {Promise<Object|null>} リセット情報またはnull
   */
  async findByToken(token) {
    const data = await this._safeRead();
    
    const resetToken = data.passwordResetTokens.find(rt => 
      rt.token === token && 
      !rt.used && 
      rt.expiresAt > Math.floor(Date.now() / 1000)
    );
    
    return resetToken || null;
  }

  /**
   * ユーザーIDで有効なトークンを取得
   * @param {number} userId - ユーザーID
   * @returns {Promise<Array>} 有効なリセットトークン配列
   */
  async findValidTokensByUserId(userId) {
    const data = await this._safeRead();
    
    return data.passwordResetTokens.filter(rt => 
      rt.userId === userId && 
      !rt.used && 
      rt.expiresAt > Math.floor(Date.now() / 1000)
    );
  }

  /**
   * トークンを使用済みとしてマーク
   * @param {string} token - リセットトークン
   * @returns {Promise<boolean>} 成功したかどうか
   */
  async markTokenAsUsed(token) {
    const data = await this._safeRead();
    
    const resetToken = data.passwordResetTokens.find(rt => rt.token === token);
    if (!resetToken) {
      return false;
    }
    
    resetToken.used = true;
    await this._safeWrite();
    
    return true;
  }

  /**
   * ユーザーの全リセットトークンを無効化
   * @param {number} userId - ユーザーID
   * @returns {Promise<number>} 無効化されたトークン数
   */
  async invalidateUserTokens(userId) {
    const data = await this._safeRead();
    
    let invalidatedCount = 0;
    data.passwordResetTokens.forEach(rt => {
      if (rt.userId === userId && !rt.used) {
        rt.used = true;
        invalidatedCount++;
      }
    });
    
    if (invalidatedCount > 0) {
      await this._safeWrite();
    }
    
    return invalidatedCount;
  }

  /**
   * 期限切れトークンをクリーンアップ
   * @returns {Promise<number>} 削除されたトークン数
   */
  async cleanupExpiredTokens() {
    const data = await this._safeRead();
    
    const now = Math.floor(Date.now() / 1000);
    const initialCount = data.passwordResetTokens.length;
    
    data.passwordResetTokens = data.passwordResetTokens.filter(rt => 
      rt.expiresAt > now || !rt.used
    );
    
    const deletedCount = initialCount - data.passwordResetTokens.length;
    
    if (deletedCount > 0) {
      await this._safeWrite();
    }
    
    return deletedCount;
  }

  /**
   * 統計情報を取得
   * @returns {Promise<Object>} 統計情報
   */
  async getStats() {
    const data = await this._safeRead();
    const now = Math.floor(Date.now() / 1000);
    
    const stats = {
      total: data.passwordResetTokens.length,
      active: data.passwordResetTokens.filter(rt => 
        !rt.used && rt.expiresAt > now
      ).length,
      used: data.passwordResetTokens.filter(rt => rt.used).length,
      expired: data.passwordResetTokens.filter(rt => 
        !rt.used && rt.expiresAt <= now
      ).length
    };
    
    return stats;
  }

  /**
   * 全データを削除（テスト用）
   * @returns {Promise<void>}
   */
  async deleteAll() {
    const data = await this._safeRead();
    data.passwordResetTokens = [];
    await this._safeWrite();
  }
}

// デフォルトエクスポート
const passwordResetRepository = new PasswordResetRepository();
export default passwordResetRepository;