import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { AppError } from '../utils/errors.js';
import { config } from '../config/index.js';

/**
 * Micropost Repository
 * lowdb を使用した マイクロポスト データアクセス層
 * 非同期パターンに統一し、エラーハンドリングを標準化
 */
class MicropostRepository {
  constructor() {
    const adapter = new JSONFile(config.database.path);
    this.db = new Low(adapter, { microposts: [] });
    this.initialized = false;
  }

  /**
   * Force reinitialize database connection (for testing)
   * @public
   */
  async reinitialize() {
    const adapter = new JSONFile(config.database.path);
    this.db = new Low(adapter, { microposts: [] });
    this.initialized = false;
    await this._ensureInitialized();
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
          this.db.data = { microposts: [] };
          await this.db.write();
        }
        if (!this.db.data.microposts) {
          this.db.data.microposts = [];
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
      return this.db.data.microposts || [];
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
   * 全てのマイクロポストを取得
   * @returns {Promise<Array>} マイクロポスト配列
   */
  async findAll() {
    return await this._safeRead();
  }

  /**
   * IDでマイクロポストを取得
   * @param {number} id - マイクロポストID
   * @returns {Promise<Object|null>} マイクロポスト情報またはnull
   */
  async findById(id) {
    try {
      const microposts = await this._safeRead();
      const micropost = microposts.find(post => post.id === parseInt(id, 10));
      return micropost || null;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to find micropost by ID', 500, 'MICROPOST_FIND_ERROR', { 
        micropostId: id, 
        originalError: error.message 
      });
    }
  }

  /**
   * ユーザーIDでマイクロポストを取得
   * @param {number} userId - ユーザーID
   * @returns {Promise<Array>} マイクロポスト配列
   */
  async findByUserId(userId) {
    try {
      const microposts = await this._safeRead();
      return microposts.filter(post => post.userId === parseInt(userId, 10));
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to find microposts by user ID', 500, 'MICROPOST_FIND_BY_USER_ERROR', { 
        userId, 
        originalError: error.message 
      });
    }
  }

  /**
   * 新しいマイクロポストを作成
   * @param {Object} micropostData - マイクロポストデータ
   * @returns {Promise<Object>} 作成されたマイクロポスト
   */
  async create(micropostData) {
    try {
      // バリデーション
      if (!micropostData || !micropostData.content || !micropostData.userId) {
        throw new AppError('Required micropost data is missing', 400, 'INVALID_MICROPOST_DATA', { 
          receivedData: micropostData 
        });
      }

      const microposts = await this._safeRead();
      
      // 新しいIDを生成
      const maxId = microposts.length > 0 ? Math.max(...microposts.map(p => p.id)) : 0;
      const newId = maxId + 1;

      const newMicropost = {
        id: newId,
        userId: parseInt(micropostData.userId, 10),
        content: micropostData.content.trim(),
        createdAt: new Date().toISOString(),
        ...micropostData
      };

      microposts.push(newMicropost);
      this.db.data.microposts = microposts;
      await this._safeWrite();

      return newMicropost;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to create micropost', 500, 'MICROPOST_CREATE_ERROR', { 
        micropostData, 
        originalError: error.message 
      });
    }
  }

  /**
   * マイクロポストを更新
   * @param {number} id - マイクロポストID
   * @param {Object} updateData - 更新データ
   * @returns {Promise<Object|null>} 更新されたマイクロポストまたはnull
   */
  async update(id, updateData) {
    try {
      const microposts = await this._safeRead();
      const index = microposts.findIndex(post => post.id === parseInt(id, 10));

      if (index === -1) {
        return null;
      }

      microposts[index] = {
        ...microposts[index],
        ...updateData,
        updatedAt: new Date().toISOString()
      };

      this.db.data.microposts = microposts;
      await this._safeWrite();

      return microposts[index];
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to update micropost', 500, 'MICROPOST_UPDATE_ERROR', { 
        micropostId: id, 
        updateData, 
        originalError: error.message 
      });
    }
  }

  /**
   * マイクロポストを削除
   * @param {number} id - マイクロポストID
   * @returns {Promise<boolean>} 削除成功の可否
   */
  async delete(id) {
    try {
      const microposts = await this._safeRead();
      const index = microposts.findIndex(post => post.id === parseInt(id, 10));

      if (index === -1) {
        return false;
      }

      microposts.splice(index, 1);
      this.db.data.microposts = microposts;
      await this._safeWrite();

      return true;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to delete micropost', 500, 'MICROPOST_DELETE_ERROR', { 
        micropostId: id, 
        originalError: error.message 
      });
    }
  }

  /**
   * ユーザーIDでマイクロポスト数を取得
   * @param {number} userId - ユーザーID
   * @returns {Promise<number>} マイクロポスト数
   */
  async countByUserId(userId) {
    try {
      const microposts = await this._safeRead();
      return microposts.filter(post => post.userId === parseInt(userId, 10)).length;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to count microposts by user ID', 500, 'MICROPOST_COUNT_ERROR', { 
        userId, 
        originalError: error.message 
      });
    }
  }

  /**
   * 検索条件でマイクロポストを取得
   * @param {Object} conditions - 検索条件
   * @returns {Promise<Array>} マイクロポスト配列
   */
  async findByConditions(conditions = {}) {
    try {
      let microposts = await this._safeRead();

      // ユーザーIDフィルタ
      if (conditions.userId) {
        microposts = microposts.filter(post => post.userId === parseInt(conditions.userId, 10));
      }

      // コンテンツ検索
      if (conditions.search) {
        const searchLower = conditions.search.toLowerCase();
        microposts = microposts.filter(post => 
          post.content.toLowerCase().includes(searchLower)
        );
      }

      // 日付範囲フィルタ
      if (conditions.since) {
        microposts = microposts.filter(post => 
          new Date(post.createdAt) >= new Date(conditions.since)
        );
      }

      if (conditions.until) {
        microposts = microposts.filter(post => 
          new Date(post.createdAt) <= new Date(conditions.until)
        );
      }

      return microposts;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to find microposts by conditions', 500, 'MICROPOST_SEARCH_ERROR', { 
        conditions, 
        originalError: error.message 
      });
    }
  }

  /**
   * ページネーション付きでマイクロポストを取得
   * @param {Object} options - ページネーションオプション
   * @returns {Promise<Object>} ページネーション結果
   */
  async findWithPagination(options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        ...conditions
      } = options;

      let microposts = await this.findByConditions(conditions);

      // ソート
      microposts.sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];
        
        if (sortBy === 'createdAt') {
          const aDate = new Date(aVal);
          const bDate = new Date(bVal);
          return sortOrder === 'desc' ? bDate - aDate : aDate - bDate;
        }
        
        if (typeof aVal === 'string') {
          return sortOrder === 'desc' ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
        }
        
        return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
      });

      // ページネーション
      const total = microposts.length;
      const totalPages = Math.ceil(total / limit);
      const offset = (page - 1) * limit;
      const paginatedMicroposts = microposts.slice(offset, offset + limit);

      return {
        data: paginatedMicroposts,
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to paginate microposts', 500, 'MICROPOST_PAGINATION_ERROR', { 
        options, 
        originalError: error.message 
      });
    }
  }
}

// シングルトンインスタンス
const micropostRepository = new MicropostRepository();

export default micropostRepository;