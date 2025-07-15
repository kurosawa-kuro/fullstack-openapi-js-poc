import express from 'express';
import { createAuthController } from '../controllers/authController.js';
import { authenticate } from '../middlewares/auth.js';

/**
 * 認証ルーター
 * 認証関連のエンドポイントを定義
 */
export function createAuthRouter(authService) {
  const router = express.Router();
  const authController = createAuthController(authService);

  // ========== 公開エンドポイント（認証不要） ==========
  
  /**
   * POST /auth/register
   * ユーザー登録
   */
  router.post('/register', authController.register);

  /**
   * POST /auth/login
   * ユーザーログイン
   */
  router.post('/login', authController.login);

  // ========== 保護されたエンドポイント（認証必要） ==========
  
  /**
   * POST /auth/logout
   * ユーザーログアウト
   */
  router.post('/logout', authenticate(authService), authController.logout);

  /**
   * GET /auth/me
   * 現在のユーザー情報取得
   */
  router.get('/me', authenticate(authService), authController.getCurrentUser);

  // ========== パスワード管理エンドポイント ==========
  
  /**
   * PUT /auth/password
   * パスワード変更（認証必要）
   */
  router.put('/password', authenticate(authService), authController.changePassword);

  /**
   * POST /auth/forgot-password
   * パスワードリセット要求（公開）
   */
  router.post('/forgot-password', authController.forgotPassword);

  /**
   * POST /auth/reset-password
   * パスワードリセット実行（公開）
   */
  router.post('/reset-password', authController.resetPassword);

  /**
   * POST /auth/refresh
   * トークンリフレッシュ（公開）
   */
  router.post('/refresh', authController.refreshToken);

  // ========== 管理・デバッグ用エンドポイント ==========
  
  /**
   * GET /auth/health
   * 認証サービスヘルスチェック
   */
  router.get('/health', authController.healthCheck);

  return router;
}

/**
 * Express ルーターファクトリ（デフォルトエクスポート）
 */
export default function createAuthRoutes(authService) {
  return createAuthRouter(authService);
}