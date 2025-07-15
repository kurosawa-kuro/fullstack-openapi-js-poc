import { 
  registerRequestSchema, 
  loginRequestSchema,
  authResponseSchema,
  currentUserResponseSchema,
  changePasswordRequestSchema,
  forgotPasswordRequestSchema,
  resetPasswordRequestSchema,
  refreshTokenRequestSchema
} from '../../../shared/schemas/auth.js';

/**
 * 認証コントローラークラス
 * 認証関連のHTTPリクエストハンドリングを行う
 */
export class AuthController {
  constructor(authService) {
    this.authService = authService;
    
    // メソッドバインディング（Express ルーターで使用するため）
    this.register = this.register.bind(this);
    this.login = this.login.bind(this);
    this.logout = this.logout.bind(this);
    this.getCurrentUser = this.getCurrentUser.bind(this);
  }

  /**
   * ユーザー登録
   * POST /auth/register
   */
  async register(req, res) {
    try {
      // リクエストボディバリデーション
      const validatedData = registerRequestSchema.parse(req.body);
      
      // ユーザー登録処理
      const result = await this.authService.register(validatedData);
      
      // レスポンスバリデーション
      const validatedResponse = authResponseSchema.parse({ data: result });
      
      // 成功レスポンス
      res.status(201).json({
        success: true,
        ...validatedResponse
      });
      
    } catch (error) {
      this._handleError(error, res);
    }
  }

  /**
   * ユーザーログイン
   * POST /auth/login
   */
  async login(req, res) {
    try {
      // リクエストボディバリデーション
      const validatedData = loginRequestSchema.parse(req.body);
      
      // ログイン処理
      const result = await this.authService.login(validatedData);
      
      // レスポンスバリデーション
      const validatedResponse = authResponseSchema.parse({ data: result });
      
      // 成功レスポンス
      res.status(200).json({
        success: true,
        ...validatedResponse
      });
      
    } catch (error) {
      this._handleError(error, res);
    }
  }

  /**
   * ユーザーログアウト
   * POST /auth/logout
   */
  async logout(req, res) {
    try {
      // 認証ミドルウェアでトークンが検証済み
      const token = req.token;
      
      // ログアウト処理
      const result = await this.authService.logout(token);
      
      // 成功レスポンス
      res.status(200).json({
        success: true,
        ...result
      });
      
    } catch (error) {
      this._handleError(error, res);
    }
  }

  /**
   * 現在のユーザー情報取得
   * GET /auth/me
   */
  async getCurrentUser(req, res) {
    try {
      // 認証ミドルウェアでユーザー情報が設定済み
      const user = req.user;
      
      // レスポンスバリデーション
      const validatedResponse = currentUserResponseSchema.parse({ data: user });
      
      // 成功レスポンス
      res.status(200).json({
        success: true,
        ...validatedResponse
      });
      
    } catch (error) {
      this._handleError(error, res);
    }
  }

  /**
   * パスワード変更
   * PUT /auth/password
   */
  async changePassword(req, res) {
    try {
      // 認証ミドルウェアでユーザー情報が設定済み
      const userId = req.user.id;
      
      // リクエストボディバリデーション
      const validatedData = changePasswordRequestSchema.parse(req.body);
      
      // パスワード変更処理
      const result = await this.authService.changePassword(userId, validatedData);
      
      // 成功レスポンス
      res.status(200).json({
        success: true,
        data: result
      });
      
    } catch (error) {
      this._handleError(error, res);
    }
  }

  /**
   * パスワードリセット要求
   * POST /auth/forgot-password
   */
  async forgotPassword(req, res) {
    try {
      // リクエストボディバリデーション
      const validatedData = forgotPasswordRequestSchema.parse(req.body);
      
      // パスワードリセット要求処理
      const result = await this.authService.forgotPassword(validatedData);
      
      // 成功レスポンス
      res.status(200).json({
        success: true,
        data: result
      });
      
    } catch (error) {
      this._handleError(error, res);
    }
  }

  /**
   * パスワードリセット実行
   * POST /auth/reset-password
   */
  async resetPassword(req, res) {
    try {
      // リクエストボディバリデーション
      const validatedData = resetPasswordRequestSchema.parse(req.body);
      
      // パスワードリセット実行処理
      const result = await this.authService.resetPassword(validatedData);
      
      // 成功レスポンス
      res.status(200).json({
        success: true,
        data: result
      });
      
    } catch (error) {
      this._handleError(error, res);
    }
  }

  /**
   * トークンリフレッシュ
   * POST /auth/refresh
   */
  async refreshToken(req, res) {
    try {
      // リクエストボディバリデーション
      const validatedData = refreshTokenRequestSchema.parse(req.body);
      
      // トークンリフレッシュ処理
      const result = await this.authService.refreshAccessToken(validatedData.refresh_token);
      
      // レスポンスバリデーション
      const validatedResponse = authResponseSchema.parse({ data: result });
      
      // 成功レスポンス
      res.status(200).json({
        success: true,
        ...validatedResponse
      });
      
    } catch (error) {
      this._handleError(error, res);
    }
  }

  /**
   * エラーハンドリング
   * @private
   */
  _handleError(error, res) {
    // Zod バリデーションエラー
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '入力データが不正です',
          details: error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
          timestamp: new Date().toISOString()
        }
      });
    }

    // 認証・認可エラー
    if (error.status && error.code) {
      return res.status(error.status).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }

    // 予期しないエラー
    console.error('Unexpected error in AuthController:', error);
    
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'サーバー内部でエラーが発生しました',
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * ヘルスチェック用メソッド
   * 認証サービスの状態確認
   */
  async healthCheck(req, res) {
    try {
      // 基本的な設定チェック
      const config = this.authService.jwtUtils?.getConfig() || {};
      
      res.status(200).json({
        success: true,
        data: {
          service: 'AuthController',
          status: 'healthy',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          config: {
            jwtExpiresIn: config.jwtExpiresIn || 3600,
            bcryptRounds: config.bcryptRounds || 12
          }
        }
      });
    } catch (error) {
      console.error('HealthCheck error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'HEALTH_CHECK_FAILED',
          message: 'ヘルスチェックに失敗しました',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
}

/**
 * 認証コントローラーファクトリ関数
 * Express ルーターで使用する際の簡易化
 */
export function createAuthController(authService) {
  return new AuthController(authService);
}

/**
 * 認証コントローラーのインスタンスメソッドを個別にエクスポート
 * 関数型のルーティング定義で使用
 */
export function createAuthHandlers(authService) {
  const controller = new AuthController(authService);
  
  return {
    register: controller.register,
    login: controller.login,
    logout: controller.logout,
    getCurrentUser: controller.getCurrentUser,
    changePassword: controller.changePassword,
    forgotPassword: controller.forgotPassword,
    resetPassword: controller.resetPassword,
    refreshToken: controller.refreshToken,
    healthCheck: controller.healthCheck
  };
}