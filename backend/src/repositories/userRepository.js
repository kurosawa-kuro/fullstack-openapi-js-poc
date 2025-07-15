import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import config from '../config/index.js';
import { createUserSchema, updateUserSchema } from '../../../shared/schemas/auth.js';
import { AppError } from '../utils/errors.js';

/**
 * ユーザーリポジトリ
 * lowdb を使用したユーザーデータのCRUD操作
 * 非同期パターンに統一し、エラーハンドリングを標準化
 */
export class UserRepository {
  constructor(dbPath = null) {
    // データベースファイルパス
    this.dbPath = dbPath || config.database.path;
    
    // lowdb インスタンス初期化
    const adapter = new JSONFile(this.dbPath);
    this.db = new Low(adapter, {});
    this.initialized = false;
  }

  /**
   * Force reinitialize database connection (for testing)
   * @public
   */
  async reinitialize() {
    const adapter = new JSONFile(config.database.path);
    this.db = new Low(adapter, {});
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
        
        // データベースが空の場合、初期構造を作成
        if (!this.db.data) {
          this.db.data = {
            users: [],
            microposts: []
          };
        }
        
        // users テーブルが存在しない場合作成
        if (!this.db.data.users) {
          this.db.data.users = [];
        }
        
        await this.db.write();
        this.initialized = true;
      } catch (error) {
        throw new AppError('User database initialization failed', 500, 'USER_DATABASE_ERROR', { 
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
      throw new AppError('User database read failed', 500, 'USER_DATABASE_READ_ERROR', { 
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
      throw new AppError('User database write failed', 500, 'USER_DATABASE_WRITE_ERROR', { 
        originalError: error.message 
      });
    }
  }

  /**
   * ユーザー作成
   * @param {Object} userData - ユーザーデータ
   * @returns {Promise<Object>} 作成されたユーザー
   */
  async create(userData) {
    try {
      // バリデーション
      const validatedData = createUserSchema.parse(userData);
      
      // データベース読み取り
      const data = await this._safeRead();
      const users = data.users || [];
      
      // ID生成（最大ID + 1）
      const maxId = users.length > 0 ? Math.max(...users.map(u => u.id)) : 0;
      const newId = maxId + 1;
      
      // ユーザーオブジェクト作成
      const newUser = {
        id: newId,
        ...validatedData,
        micropostCount: 0 // 初期値
      };
      
      // データベースに追加
      this.db.data.users.push(newUser);
      await this._safeWrite();
      
      return newUser;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to create user', 500, 'USER_CREATE_ERROR', { 
        userData, 
        originalError: error.message 
      });
    }
  }

  /**
   * ID でユーザー検索
   * @param {number} id - ユーザーID
   * @returns {Promise<Object|null>} ユーザーまたはnull
   */
  async findById(id) {
    try {
      const data = await this._safeRead();
      const users = data.users || [];
      
      const user = users.find(u => u.id === parseInt(id));
      
      if (user) {
        // micropostCount を動的に計算
        const microposts = data.microposts || [];
        const micropostCount = microposts.filter(m => m.userId === user.id).length;
        
        return {
          ...user,
          micropostCount
        };
      }
      
      return null;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to find user by ID', 500, 'USER_FIND_BY_ID_ERROR', { 
        userId: id, 
        originalError: error.message 
      });
    }
  }

  /**
   * メールアドレスでユーザー検索
   * @param {string} email - メールアドレス
   * @returns {Promise<Object|null>} ユーザーまたはnull
   */
  async findByEmail(email) {
    try {
      const data = await this._safeRead();
      const users = data.users || [];
      
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      
      if (user) {
        // micropostCount を動的に計算
        const microposts = data.microposts || [];
        const micropostCount = microposts.filter(m => m.userId === user.id).length;
        
        return {
          ...user,
          micropostCount
        };
      }
      
      return null;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to find user by email', 500, 'USER_FIND_BY_EMAIL_ERROR', { 
        email, 
        originalError: error.message 
      });
    }
  }

  /**
   * ユーザー更新
   * @param {number} id - ユーザーID
   * @param {Object} updateData - 更新データ
   * @returns {Promise<Object|null>} 更新されたユーザーまたはnull
   */
  async update(id, updateData) {
    try {
      // バリデーション
      const validatedData = updateUserSchema.parse(updateData);
      
      const data = await this._safeRead();
      const users = data.users || [];
      const userIndex = users.findIndex(u => u.id === parseInt(id));
      
      if (userIndex === -1) {
        return null;
      }
      
      // ユーザー更新
      this.db.data.users[userIndex] = {
        ...this.db.data.users[userIndex],
        ...validatedData
      };
      
      await this._safeWrite();
      
      return await this.findById(id);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to update user', 500, 'USER_UPDATE_ERROR', { 
        userId: id, 
        updateData, 
        originalError: error.message 
      });
    }
  }

  /**
   * ユーザー削除
   * @param {number} id - ユーザーID
   * @returns {Promise<boolean>} 削除成功かどうか
   */
  async delete(id) {
    try {
      const data = await this._safeRead();
      const users = data.users || [];
      const userIndex = users.findIndex(u => u.id === parseInt(id));
      
      if (userIndex === -1) {
        return false;
      }
      
      // ユーザー削除
      this.db.data.users.splice(userIndex, 1);
      
      // 関連するマイクロポストも削除
      const microposts = data.microposts || [];
      this.db.data.microposts = microposts.filter(m => m.userId !== parseInt(id));
      
      await this._safeWrite();
      
      return true;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to delete user', 500, 'USER_DELETE_ERROR', { 
        userId: id, 
        originalError: error.message 
      });
    }
  }

  /**
   * パスワード更新
   * @param {number} id - ユーザーID
   * @param {string} newPasswordHash - 新しいパスワードハッシュ
   * @returns {Promise<boolean>} 更新成功かどうか
   */
  async updatePassword(id, newPasswordHash) {
    try {
      const data = await this._safeRead();
      const users = data.users || [];
      const userIndex = users.findIndex(u => u.id === parseInt(id));
      
      if (userIndex === -1) {
        return false;
      }
      
      // パスワードハッシュ更新
      this.db.data.users[userIndex].passwordHash = newPasswordHash;
      this.db.data.users[userIndex].updatedAt = new Date().toISOString();
      
      await this._safeWrite();
      
      return true;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to update password', 500, 'PASSWORD_UPDATE_ERROR', { 
        userId: id, 
        originalError: error.message 
      });
    }
  }

  /**
   * 全ユーザー取得（ページネーション対応）
   * @param {Object} options - 検索オプション
   * @returns {Promise<Object>} ユーザー一覧と総数
   */
  async findAll(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sort = 'created_desc',
        search = ''
      } = options;
      
      const data = await this._safeRead();
      let users = data.users || [];
      
      // 検索フィルタ
      if (search) {
        const searchTerm = search.toLowerCase();
        users = users.filter(user => 
          user.name.toLowerCase().includes(searchTerm) ||
          user.email.toLowerCase().includes(searchTerm)
        );
      }
      
      // ソート
      users = this._sortUsers(users, sort);
      
      // micropostCount を動的に計算
      const microposts = data.microposts || [];
      users = users.map(user => ({
        ...user,
        micropostCount: microposts.filter(m => m.userId === user.id).length
      }));
      
      // ページネーション
      const total = users.length;
      const totalPages = Math.ceil(total / limit);
      const offset = (page - 1) * limit;
      const paginatedUsers = users.slice(offset, offset + limit);
      
      return {
        users: paginatedUsers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages
        }
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to find all users', 500, 'USER_FIND_ALL_ERROR', { 
        options, 
        originalError: error.message 
      });
    }
  }

  /**
   * ユーザー数取得
   * @returns {Promise<number>} ユーザー総数
   */
  async count() {
    try {
      const data = await this._safeRead();
      const users = data.users || [];
      return users.length;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to count users', 500, 'USER_COUNT_ERROR', { 
        originalError: error.message 
      });
    }
  }

  /**
   * メールアドレスの重複チェック
   * @param {string} email - メールアドレス
   * @param {number} excludeId - 除外するユーザーID（更新時用）
   * @returns {Promise<boolean>} 重複している場合true
   */
  async isEmailExists(email, excludeId = null) {
    try {
      const data = await this._safeRead();
      const users = data.users || [];
      
      return users.some(user => 
        user.email.toLowerCase() === email.toLowerCase() && 
        user.id !== excludeId
      );
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to check email existence', 500, 'USER_EMAIL_CHECK_ERROR', { 
        email, 
        excludeId, 
        originalError: error.message 
      });
    }
  }

  /**
   * ロール別ユーザー検索
   * @param {string} role - ロール名
   * @returns {Promise<Array>} 該当ユーザー一覧
   */
  async findByRole(role) {
    try {
      const data = await this._safeRead();
      const users = data.users || [];
      
      return users.filter(user => 
        user.roles && user.roles.includes(role)
      );
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to find users by role', 500, 'USER_FIND_BY_ROLE_ERROR', { 
        role, 
        originalError: error.message 
      });
    }
  }

  /**
   * 最近登録されたユーザー取得
   * @param {number} limit - 取得件数
   * @returns {Promise<Array>} 最近のユーザー一覧
   */
  async findRecent(limit = 10) {
    try {
      const data = await this._safeRead();
      const users = data.users || [];
      
      return users
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, limit);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to find recent users', 500, 'USER_FIND_RECENT_ERROR', { 
        limit, 
        originalError: error.message 
      });
    }
  }

  /**
   * ユーザーソート
   * @private
   */
  _sortUsers(users, sort) {
    switch (sort) {
      case 'name_asc':
        return users.sort((a, b) => a.name.localeCompare(b.name));
      case 'name_desc':
        return users.sort((a, b) => b.name.localeCompare(a.name));
      case 'created_asc':
        return users.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      case 'created_desc':
      default:
        return users.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  }

  /**
   * データベース状態取得（デバッグ用）
   * @returns {Promise<Object>} データベース統計情報
   */
  async getStats() {
    try {
      const data = await this._safeRead();
      const users = data.users || [];
      const microposts = data.microposts || [];
      
      return {
        totalUsers: users.length,
        totalMicroposts: microposts.length,
        usersByRole: users.reduce((acc, user) => {
          user.roles?.forEach(role => {
            acc[role] = (acc[role] || 0) + 1;
          });
          return acc;
        }, {}),
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get database stats', 500, 'USER_STATS_ERROR', { 
        originalError: error.message 
      });
    }
  }
}