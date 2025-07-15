import micropostRepository from '../repositories/micropostRepository.js';

/**
 * Force reinitialize repository for testing
 * @returns {Promise<void>}
 */
export const reinitializeRepository = async () => {
  await micropostRepository.reinitialize();
};

/**
 * Micropost Service
 * マイクロポストのビジネスロジック層
 * 非同期パターンに統一
 */

/**
 * ユーザーIDでマイクロポストを取得
 * @param {number} userId - ユーザーID
 * @returns {Promise<Array>} マイクロポスト配列
 */
export const getMicropostsByUserId = async (userId) => {
  return await micropostRepository.findByUserId(userId);
};

/**
 * 新しいマイクロポストを作成
 * @param {number} userId - ユーザーID
 * @param {string} content - マイクロポスト内容
 * @returns {Promise<Object>} 作成されたマイクロポスト
 */
export const createMicropost = async (userId, content) => {
  const micropostData = {
    userId: parseInt(userId, 10),
    content: content.trim()
  };
  
  return await micropostRepository.create(micropostData);
};

/**
 * 全てのマイクロポストを取得
 * @returns {Promise<Array>} マイクロポスト配列
 */
export const getAllMicroposts = async () => {
  return await micropostRepository.findAll();
};

/**
 * IDでマイクロポストを取得
 * @param {number} id - マイクロポストID
 * @returns {Promise<Object|null>} マイクロポスト情報またはnull
 */
export const getMicropostById = async (id) => {
  return await micropostRepository.findById(id);
};

/**
 * マイクロポストを更新
 * @param {number} id - マイクロポストID
 * @param {string} content - 新しい内容
 * @returns {Promise<Object|null>} 更新されたマイクロポストまたはnull
 */
export const updateMicropost = async (id, content) => {
  const updateData = {
    content: content.trim()
  };
  
  return await micropostRepository.update(id, updateData);
};

/**
 * マイクロポストを削除
 * @param {number} id - マイクロポストID
 * @returns {Promise<boolean>} 削除成功の可否
 */
export const deleteMicropost = async (id) => {
  return await micropostRepository.delete(id);
};

/**
 * ユーザーのマイクロポスト数を取得
 * @param {number} userId - ユーザーID
 * @returns {Promise<number>} マイクロポスト数
 */
export const getMicropostCountByUserId = async (userId) => {
  return await micropostRepository.countByUserId(userId);
};

/**
 * 検索条件でマイクロポストを取得
 * @param {Object} conditions - 検索条件
 * @returns {Promise<Array>} マイクロポスト配列
 */
export const getMicropostsByConditions = async (conditions) => {
  return await micropostRepository.findByConditions(conditions);
};

/**
 * ページネーション付きでマイクロポストを取得
 * @param {Object} options - ページネーションオプション
 * @returns {Promise<Object>} ページネーション結果
 */
export const getMicropostsWithPagination = async (options) => {
  return await micropostRepository.findWithPagination(options);
};