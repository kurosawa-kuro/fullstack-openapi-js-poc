import { createId } from '@paralleldrive/cuid2';
import crypto from 'crypto';

/**
 * セキュアなCUID2を生成
 * @param {number} length - 生成するIDの長さ
 * @returns {string} CUID2
 */
export function createCUID(length = 24) {
  return createId({ length });
}

/**
 * パスワードリセット用のセキュアなトークンを生成
 * @param {number} length - トークンの長さ（バイト数）
 * @returns {string} URLセーフなトークン
 */
export function createSecureToken(length = 32) {
  return crypto.randomBytes(length)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * ランダムな文字列を生成（英数字のみ）
 * @param {number} length - 文字列の長さ
 * @returns {string} ランダム文字列
 */
export function createRandomString(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, chars.length);
    result += chars[randomIndex];
  }
  
  return result;
}

/**
 * セッションIDを生成
 * @returns {string} セッションID
 */
export function createSessionId() {
  return createCUID(32);
}

/**
 * リクエストIDを生成（ログ追跡用）
 * @returns {string} リクエストID
 */
export function createRequestId() {
  return createCUID(16);
}