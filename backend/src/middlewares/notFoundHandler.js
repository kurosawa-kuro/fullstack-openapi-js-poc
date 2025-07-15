/**
 * 404 Not Found Handler Middleware
 * DRY原則に基づいた統一的な404エラーハンドリング
 */

/**
 * 404エラーレスポンスを生成
 * @param {string} code - エラーコード
 * @param {string} message - エラーメッセージ
 * @returns {Object} 404エラーレスポンス
 */
const create404Response = (code, message) => ({
  success: false,
  error: {
    code,
    message,
    timestamp: new Date().toISOString()
  }
});

/**
 * API エンドポイント用404ハンドラー
 * @param {Object} req - Express request オブジェクト
 * @param {Object} res - Express response オブジェクト
 */
export const apiNotFoundHandler = (req, res) => {
  const response = create404Response(
    'ENDPOINT_NOT_FOUND',
    `API endpoint ${req.method} ${req.path} not found`
  );
  res.status(404).json(response);
};

/**
 * 全体的な404ハンドラー
 * @param {Object} req - Express request オブジェクト
 * @param {Object} res - Express response オブジェクト
 */
export const globalNotFoundHandler = (req, res) => {
  const response = create404Response(
    'ROUTE_NOT_FOUND',
    'The requested resource was not found'
  );
  res.status(404).json(response);
};