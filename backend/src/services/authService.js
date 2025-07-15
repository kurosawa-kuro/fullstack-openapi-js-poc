import bcrypt from 'bcrypt';
import { 
  registerRequestSchema, 
  loginRequestSchema,
  createUserSchema,
  authUserSchema,
  defaultAuthConfig,
  changePasswordRequestSchema,
  forgotPasswordRequestSchema,
  resetPasswordRequestSchema,
  refreshTokenRequestSchema
} from '../../../shared/schemas/auth.js';
import passwordResetRepository from '../repositories/passwordResetRepository.js';
import emailService from './emailService.js';

/**
 * 認証サービスの抽象基底クラス
 * 将来的なKeycloak統合を見据えた設計
 */
export class BaseAuthService {
  constructor(config = {}) {
    this.config = { ...defaultAuthConfig, ...config };
  }

  /**
   * ユーザー登録
   * @param {Object} registerData - 登録データ
   * @returns {Promise<Object>} 登録されたユーザー情報
   */
  async register(registerData) {
    throw new Error('register() method must be implemented by subclass');
  }

  /**
   * ユーザーログイン
   * @param {Object} loginData - ログインデータ
   * @returns {Promise<Object>} 認証結果とトークン
   */
  async login(loginData) {
    throw new Error('login() method must be implemented by subclass');
  }

  /**
   * ユーザー情報取得
   * @param {string|number} userId - ユーザーID
   * @returns {Promise<Object>} ユーザー情報
   */
  async getUserById(userId) {
    throw new Error('getUserById() method must be implemented by subclass');
  }

  /**
   * メールアドレスでユーザー検索
   * @param {string} email - メールアドレス
   * @returns {Promise<Object|null>} ユーザー情報またはnull
   */
  async getUserByEmail(email) {
    throw new Error('getUserByEmail() method must be implemented by subclass');
  }

  /**
   * トークンからユーザー情報取得
   * @param {string} token - JWTトークン
   * @returns {Promise<Object>} ユーザー情報
   */
  async getUserFromToken(token) {
    throw new Error('getUserFromToken() method must be implemented by subclass');
  }

  /**
   * ログアウト処理
   * @param {string} token - JWTトークン
   * @returns {Promise<void>}
   */
  async logout(token) {
    throw new Error('logout() method must be implemented by subclass');
  }

  /**
   * ユーザーの権限チェック
   * @param {Object} user - ユーザー情報
   * @param {string} requiredRole - 必要な権限
   * @returns {boolean} 権限があるかどうか
   */
  hasRole(user, requiredRole) {
    if (!user || !user.roles) return false;
    
    // 権限の階層定義
    const roleHierarchy = {
      'user': ['user'],
      'readonly-admin': ['user', 'readonly-admin'],
      'admin': ['user', 'readonly-admin', 'admin']
    };

    return user.roles.some(userRole => 
      roleHierarchy[userRole]?.includes(requiredRole)
    );
  }

  /**
   * パスワードハッシュ化
   * @param {string} password - プレーンテキストパスワード
   * @returns {Promise<string>} ハッシュ化されたパスワード
   */
  async hashPassword(password) {
    return await bcrypt.hash(password, this.config.bcryptRounds);
  }

  /**
   * パスワード検証
   * @param {string} password - プレーンテキストパスワード
   * @param {string} hash - ハッシュ化されたパスワード
   * @returns {Promise<boolean>} パスワードが一致するかどうか
   */
  async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }
}

/**
 * lowdb + JWT実装の認証サービス
 * PoC用の実装
 */
export class LocalAuthService extends BaseAuthService {
  constructor(userRepository, jwtUtils, config = {}) {
    super(config);
    this.userRepository = userRepository;
    this.jwtUtils = jwtUtils;
  }

  /**
   * ユーザー登録
   */
  async register(registerData) {
    // バリデーション
    const validatedData = registerRequestSchema.parse(registerData);
    
    // メールアドレスの重複チェック
    const existingUser = await this.userRepository.findByEmail(validatedData.email);
    if (existingUser) {
      const error = new Error('このメールアドレスは既に使用されています');
      error.code = 'EMAIL_ALREADY_EXISTS';
      error.status = 409;
      throw error;
    }

    // パスワードハッシュ化
    const passwordHash = await this.hashPassword(validatedData.password);

    // ユーザー作成データ準備
    const userData = createUserSchema.parse({
      name: validatedData.name,
      email: validatedData.email,
      passwordHash,
      roles: ['user'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // ユーザー作成
    const createdUser = await this.userRepository.create(userData);

    // 認証用ユーザー情報に変換
    const authUser = this._toAuthUser(createdUser);

    // JWTトークン生成
    const tokens = await this.jwtUtils.generateTokens(authUser);
    
    // リフレッシュトークン生成
    const refreshToken = await this.jwtUtils.generateRefreshToken(authUser);
    tokens.refresh_token = refreshToken.token;

    return {
      user: authUser,
      tokens
    };
  }

  /**
   * ユーザーログイン
   */
  async login(loginData) {
    // バリデーション
    const validatedData = loginRequestSchema.parse(loginData);

    // ユーザー取得
    const user = await this.userRepository.findByEmail(validatedData.email);
    if (!user) {
      const error = new Error('メールアドレスまたはパスワードが正しくありません');
      error.code = 'INVALID_CREDENTIALS';
      error.status = 401;
      throw error;
    }

    // パスワード検証
    const isValidPassword = await this.verifyPassword(validatedData.password, user.passwordHash);
    if (!isValidPassword) {
      const error = new Error('メールアドレスまたはパスワードが正しくありません');
      error.code = 'INVALID_CREDENTIALS';
      error.status = 401;
      throw error;
    }

    // 認証用ユーザー情報に変換
    const authUser = this._toAuthUser(user);

    // JWTトークン生成
    const tokens = await this.jwtUtils.generateTokens(authUser);
    
    // リフレッシュトークン生成
    const refreshToken = await this.jwtUtils.generateRefreshToken(authUser);
    tokens.refresh_token = refreshToken.token;

    return {
      user: authUser,
      tokens
    };
  }

  /**
   * ユーザー情報取得
   */
  async getUserById(userId) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      const error = new Error('ユーザーが見つかりません');
      error.code = 'USER_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    return this._toAuthUser(user);
  }

  /**
   * メールアドレスでユーザー検索
   */
  async getUserByEmail(email) {
    const user = await this.userRepository.findByEmail(email);
    return user ? this._toAuthUser(user) : null;
  }

  /**
   * トークンからユーザー情報取得
   */
  async getUserFromToken(token) {
    try {
      // トークン検証・デコード
      const payload = await this.jwtUtils.verifyToken(token);
      
      // ユーザー情報取得
      const user = await this.getUserById(payload.sub);
      
      return user;
    } catch (error) {
      const authError = new Error('無効なトークンです');
      authError.code = 'INVALID_TOKEN';
      authError.status = 401;
      throw authError;
    }
  }

  /**
   * ログアウト処理
   * トークンをブラックリストに追加
   */
  async logout(token) {
    try {
      // トークンをブラックリストに追加
      await this.jwtUtils.blacklistToken(token, 'logout');
      return { success: true, message: 'ログアウトしました' };
    } catch (error) {
      // ログアウトエラーでもユーザーには成功を返す（セキュリティ上の理由）
      console.error('Logout error:', error);
      return { success: true, message: 'ログアウトしました' };
    }
  }

  /**
   * リフレッシュトークンを使ってアクセストークンを更新
   * @param {string} refreshToken - リフレッシュトークン
   * @returns {Promise<Object>} 新しいトークン情報
   */
  async refreshAccessToken(refreshToken) {
    try {
      // リフレッシュトークン検証
      const tokenData = await this.jwtUtils.verifyRefreshToken(refreshToken);
      
      // ユーザー情報取得
      const user = await this.getUserById(tokenData.userId);
      
      // 新しいアクセストークン生成
      const tokens = await this.jwtUtils.generateTokens(user);
      
      return {
        user,
        tokens
      };
    } catch (error) {
      const refreshError = new Error('リフレッシュトークンが無効です');
      refreshError.code = 'INVALID_REFRESH_TOKEN';
      refreshError.status = 401;
      throw refreshError;
    }
  }

  /**
   * ユーザーの全デバイスからログアウト
   * @param {number} userId - ユーザーID
   * @returns {Promise<Object>} ログアウト結果
   */
  async logoutAllDevices(userId) {
    try {
      const refreshTokenRepository = (await import('../repositories/refreshTokenRepository.js')).default;
      
      // ユーザーの全リフレッシュトークンを削除
      const deletedCount = await refreshTokenRepository.deleteByUserId(userId);
      
      return { 
        success: true, 
        message: `${deletedCount}台のデバイスからログアウトしました` 
      };
    } catch (error) {
      console.error('Logout all devices error:', error);
      return { 
        success: true, 
        message: '全デバイスからログアウトしました' 
      };
    }
  }

  /**
   * パスワード変更
   * @param {number} userId - ユーザーID
   * @param {Object} passwordData - パスワードデータ
   * @returns {Promise<Object>} 変更結果
   */
  async changePassword(userId, passwordData) {
    // バリデーション
    const validatedData = changePasswordRequestSchema.parse(passwordData);
    
    // ユーザー取得
    const user = await this.userRepository.findById(userId);
    if (!user) {
      const error = new Error('ユーザーが見つかりません');
      error.code = 'USER_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    // 現在のパスワード検証
    const isValidCurrentPassword = await this.verifyPassword(
      validatedData.currentPassword, 
      user.passwordHash
    );
    if (!isValidCurrentPassword) {
      const error = new Error('現在のパスワードが正しくありません');
      error.code = 'INVALID_CURRENT_PASSWORD';
      error.status = 400;
      throw error;
    }

    // 新しいパスワードハッシュ化
    const newPasswordHash = await this.hashPassword(validatedData.newPassword);

    // パスワード更新
    await this.userRepository.updatePassword(userId, newPasswordHash);

    // パスワード変更完了メール送信
    await emailService.sendPasswordChangeConfirmationEmail(user.email, user.name);

    return {
      success: true,
      message: 'パスワードが正常に変更されました'
    };
  }

  /**
   * パスワードリセット要求
   * @param {Object} requestData - リセット要求データ
   * @returns {Promise<Object>} リセット結果
   */
  async forgotPassword(requestData) {
    // バリデーション
    const validatedData = forgotPasswordRequestSchema.parse(requestData);

    // ユーザー検索
    const user = await this.userRepository.findByEmail(validatedData.email);
    if (!user) {
      // セキュリティ上の理由で、存在しないメールアドレスでも成功を返す
      return {
        success: true,
        message: 'パスワードリセットメールを送信しました（該当するアカウントが存在する場合）'
      };
    }

    // リセットトークン生成
    const resetToken = await passwordResetRepository.createResetToken(
      user.id,
      this.config.passwordResetTokenExpiresIn || 3600
    );

    // パスワードリセットメール送信
    const emailSent = await emailService.sendPasswordResetEmail(
      user.email,
      resetToken.token,
      user.name
    );

    if (!emailSent) {
      console.error('Failed to send password reset email to:', user.email);
    }

    return {
      success: true,
      message: 'パスワードリセットメールを送信しました（該当するアカウントが存在する場合）'
    };
  }

  /**
   * パスワードリセット実行
   * @param {Object} resetData - リセットデータ
   * @returns {Promise<Object>} リセット結果
   */
  async resetPassword(resetData) {
    // バリデーション
    const validatedData = resetPasswordRequestSchema.parse(resetData);

    // リセットトークン検証
    const resetToken = await passwordResetRepository.findByToken(validatedData.token);
    if (!resetToken) {
      const error = new Error('無効なリセットトークンです');
      error.code = 'INVALID_RESET_TOKEN';
      error.status = 400;
      throw error;
    }

    // ユーザー取得
    const user = await this.userRepository.findById(resetToken.userId);
    if (!user) {
      const error = new Error('ユーザーが見つかりません');
      error.code = 'USER_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    // 新しいパスワードハッシュ化
    const newPasswordHash = await this.hashPassword(validatedData.newPassword);

    // パスワード更新
    await this.userRepository.updatePassword(user.id, newPasswordHash);

    // リセットトークンを使用済みにマーク
    await passwordResetRepository.markTokenAsUsed(validatedData.token);

    // 全デバイスからログアウト（セキュリティのため）
    await this.logoutAllDevices(user.id);

    // パスワード変更完了メール送信
    await emailService.sendPasswordChangeConfirmationEmail(user.email, user.name);

    return {
      success: true,
      message: 'パスワードが正常にリセットされました'
    };
  }

  /**
   * データベースユーザーを認証用ユーザーに変換
   * @private
   */
  _toAuthUser(dbUser) {
    const { passwordHash, ...userWithoutPassword } = dbUser;
    
    // micropostCountを計算（実際の実装では別途取得）
    const micropostCount = dbUser.micropostCount || 0;

    return authUserSchema.parse({
      ...userWithoutPassword,
      micropostCount
    });
  }
}

/**
 * Keycloak実装の認証サービス（将来実装予定）
 */
export class KeycloakAuthService extends BaseAuthService {
  constructor(keycloakConfig, config = {}) {
    super(config);
    this.keycloakConfig = keycloakConfig;
    // TODO: Keycloak SDK初期化
  }

  async register(registerData) {
    // TODO: Keycloak APIを使用した登録実装
    throw new Error('Keycloak registration not implemented yet');
  }

  async login(loginData) {
    // TODO: Keycloak認証実装
    throw new Error('Keycloak authentication not implemented yet');
  }

  async getUserById(userId) {
    // TODO: Keycloak APIからユーザー情報取得
    throw new Error('Keycloak getUserById not implemented yet');
  }

  async getUserByEmail(email) {
    // TODO: Keycloak APIからユーザー検索
    throw new Error('Keycloak getUserByEmail not implemented yet');
  }

  async getUserFromToken(token) {
    // TODO: Keycloak トークン検証・ユーザー情報取得
    throw new Error('Keycloak getUserFromToken not implemented yet');
  }

  async logout(token) {
    // TODO: Keycloak ログアウト処理
    throw new Error('Keycloak logout not implemented yet');
  }
}

/**
 * 認証サービスファクトリ
 */
export class AuthServiceFactory {
  static create(type = 'local', dependencies = {}, config = {}) {
    switch (type) {
      case 'local':
        const { userRepository, jwtUtils } = dependencies;
        if (!userRepository || !jwtUtils) {
          throw new Error('LocalAuthService requires userRepository and jwtUtils');
        }
        return new LocalAuthService(userRepository, jwtUtils, config);
      
      case 'keycloak':
        const { keycloakConfig } = dependencies;
        if (!keycloakConfig) {
          throw new Error('KeycloakAuthService requires keycloakConfig');
        }
        return new KeycloakAuthService(keycloakConfig, config);
      
      default:
        throw new Error(`Unknown auth service type: ${type}`);
    }
  }
}