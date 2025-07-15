import { UserRepository } from '../repositories/userRepository.js';

/**
 * User Service
 * ユーザーのビジネスロジック層
 * UserRepositoryを使用した統一的なデータアクセス
 */

// UserRepositoryインスタンス
const userRepository = new UserRepository();

/**
 * 全ユーザー取得
 * @param {Object} options - 検索オプション
 * @returns {Promise<Object>} ユーザー一覧と総数
 */
export const getUsersFromDB = async (options = {}) => {
  const result = await userRepository.findAll(options);
  return result.users; // 従来との互換性のためusersプロパティを返す
};

/**
 * IDでユーザー取得
 * @param {number} id - ユーザーID
 * @returns {Promise<Object|null>} ユーザー情報またはnull
 */
export const getUserByIdFromDB = async (id) => {
  return await userRepository.findById(id);
};

/**
 * ユーザー作成
 * @param {Object} userData - ユーザーデータ
 * @returns {Promise<Object>} 作成されたユーザー
 */
export const createUserInDB = async (userData) => {
  return await userRepository.create(userData);
};

/**
 * メールアドレスでユーザー検索
 * @param {string} email - メールアドレス
 * @returns {Promise<Object|null>} ユーザー情報またはnull
 */
export const getUserByEmail = async (email) => {
  return await userRepository.findByEmail(email);
};

/**
 * ユーザー更新
 * @param {number} id - ユーザーID
 * @param {Object} updateData - 更新データ
 * @returns {Promise<Object|null>} 更新されたユーザーまたはnull
 */
export const updateUser = async (id, updateData) => {
  return await userRepository.update(id, updateData);
};

/**
 * ユーザー削除
 * @param {number} id - ユーザーID
 * @returns {Promise<boolean>} 削除成功の可否
 */
export const deleteUser = async (id) => {
  return await userRepository.delete(id);
};

/**
 * リポジトリを再初期化（テスト用）
 * @returns {Promise<void>}
 */
export const reinitializeRepository = async () => {
  return await userRepository.reinitialize();
};