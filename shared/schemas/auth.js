import { z } from 'zod';

// ========== 認証関連Zodスキーマ ==========

// パスワード強度チェック用の正規表現
const PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+$/;

// ユーザー登録スキーマ
export const registerRequestSchema = z.object({
  name: z.string()
    .min(1, '名前は1文字以上で入力してください')
    .max(50, '名前は50文字以下で入力してください')
    .trim(),
  
  email: z.string()
    .email('有効なメールアドレスを入力してください')
    .max(100, 'メールアドレスは100文字以下で入力してください')
    .toLowerCase()
    .trim(),
  
  password: z.string()
    .min(8, 'パスワードは8文字以上で入力してください')
    .max(100, 'パスワードは100文字以下で入力してください')
    .regex(PASSWORD_REGEX, 'パスワードは英数字を含む必要があります')
});

// ログインスキーマ
export const loginRequestSchema = z.object({
  email: z.string()
    .email('有効なメールアドレスを入力してください')
    .toLowerCase()
    .trim(),
  
  password: z.string()
    .min(1, 'パスワードを入力してください')
});

// ロール定義
export const userRoleSchema = z.enum(['user', 'readonly-admin', 'admin']);

// 認証ユーザースキーマ
export const authUserSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(50),
  email: z.string().email().max(100),
  bio: z.string().max(200).optional(),
  location: z.string().max(50).optional(),
  website: z.string().url().max(200).optional(),
  roles: z.array(userRoleSchema).default(['user']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
  micropostCount: z.number().int().min(0).default(0)
});

// トークンスキーマ
export const authTokensSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.literal('Bearer'),
  expires_in: z.number().int().positive(),
  refresh_token: z.string().min(1).optional()
});

// 認証レスポンススキーマ
export const authResponseSchema = z.object({
  data: z.object({
    user: authUserSchema,
    tokens: authTokensSchema
  })
});

// 現在のユーザー情報レスポンススキーマ
export const currentUserResponseSchema = z.object({
  data: authUserSchema
});

// JWTペイロードスキーマ（トークン検証用）
export const jwtPayloadSchema = z.object({
  sub: z.string(), // ユーザーID
  email: z.string().email(),
  roles: z.array(userRoleSchema),
  iat: z.number().int().positive(),
  exp: z.number().int().positive(),
  iss: z.string().optional(),
  aud: z.string().optional()
});

// パスワードハッシュスキーマ（内部使用）
export const passwordHashSchema = z.string().min(1);

// ユーザー作成用スキーマ（データベース保存時）
export const createUserSchema = z.object({
  name: z.string().min(1).max(50),
  email: z.string().email().max(100),
  passwordHash: passwordHashSchema,
  bio: z.string().max(200).optional(),
  location: z.string().max(50).optional(),
  website: z.string().url().max(200).optional(),
  roles: z.array(userRoleSchema).default(['user']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional()
});

// ユーザー更新用スキーマ
export const updateUserSchema = createUserSchema.partial().omit({
  email: true, // メールアドレスは変更不可
  passwordHash: true, // パスワードは別のエンドポイントで変更
  createdAt: true
}).extend({
  updatedAt: z.string().datetime()
});

// 認証設定スキーマ
export const authConfigSchema = z.object({
  jwtSecret: z.string().min(32, 'JWT secretは32文字以上である必要があります'),
  jwtExpiresIn: z.number().int().positive().default(3600), // 1時間
  bcryptRounds: z.number().int().min(10).max(15).default(12),
  maxLoginAttempts: z.number().int().positive().default(5),
  lockoutDuration: z.number().int().positive().default(15 * 60) // 15分
});

// リフレッシュトークンリクエストスキーマ
export const refreshTokenRequestSchema = z.object({
  refresh_token: z.string().min(1, 'リフレッシュトークンが必要です')
});

// トークンブラックリストエントリスキーマ
export const tokenBlacklistEntrySchema = z.object({
  id: z.number().int().positive(),
  tokenHash: z.string().min(1),
  reason: z.string().min(1).default('logout'),
  createdAt: z.string().datetime(),
  expiresAt: z.number().int().positive()
});

// パスワード変更スキーマ
export const changePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1, '現在のパスワードを入力してください'),
  newPassword: z.string()
    .min(8, 'パスワードは8文字以上で入力してください')
    .max(100, 'パスワードは100文字以下で入力してください')
    .regex(PASSWORD_REGEX, 'パスワードは英数字を含む必要があります')
});

// パスワードリセット要求スキーマ
export const forgotPasswordRequestSchema = z.object({
  email: z.string()
    .email('有効なメールアドレスを入力してください')
    .toLowerCase()
    .trim()
});

// パスワードリセット実行スキーマ
export const resetPasswordRequestSchema = z.object({
  token: z.string().min(1, 'リセットトークンが必要です'),
  newPassword: z.string()
    .min(8, 'パスワードは8文字以上で入力してください')
    .max(100, 'パスワードは100文字以下で入力してください')
    .regex(PASSWORD_REGEX, 'パスワードは英数字を含む必要があります')
});

// パスワードリセットトークンスキーマ
export const passwordResetTokenSchema = z.object({
  id: z.number().int().positive(),
  userId: z.number().int().positive(),
  token: z.string().min(1),
  expiresAt: z.number().int().positive(),
  createdAt: z.string().datetime(),
  used: z.boolean().default(false)
});

// Keycloak互換レスポンススキーマ
export const keycloakTokenResponseSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().int().positive(),
  refresh_expires_in: z.number().int().positive().optional(),
  refresh_token: z.string().min(1).optional(),
  token_type: z.literal('Bearer'),
  'not-before-policy': z.number().int().optional(),
  session_state: z.string().optional(),
  scope: z.string().optional()
});

// Keycloak互換ユーザー情報スキーマ
export const keycloakUserInfoSchema = z.object({
  sub: z.string().min(1),
  name: z.string().optional(),
  given_name: z.string().optional(),
  family_name: z.string().optional(),
  preferred_username: z.string().optional(),
  email: z.string().email().optional(),
  email_verified: z.boolean().optional(),
  realm_access: z.object({
    roles: z.array(z.string()).optional()
  }).optional(),
  resource_access: z.record(z.object({
    roles: z.array(z.string()).optional()
  })).optional()
});

// エクスポート用のデフォルト設定
export const defaultAuthConfig = {
  jwtExpiresIn: 3600, // 1時間
  bcryptRounds: 12,
  maxLoginAttempts: 5,
  lockoutDuration: 15 * 60, // 15分
  refreshTokenExpiresIn: 30 * 24 * 60 * 60, // 30日
  passwordResetTokenExpiresIn: 60 * 60, // 1時間
  passwordResetTokenLength: 32
};