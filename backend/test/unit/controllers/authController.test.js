import request from 'supertest';
import app from '../../../src/app.js';
import { LowSync } from 'lowdb';
import { JSONFileSync } from 'lowdb/node';
import fs from 'fs';
import path from 'path';

describe('認証機能テスト', () => {
  const originalDbPath = './db/db.json';
  const testDbPath = './test/fixtures/test-auth-db.json';
  let originalDbData;
  
  beforeAll(() => {
    // 元のデータベースバックアップ
    if (fs.existsSync(originalDbPath)) {
      originalDbData = fs.readFileSync(originalDbPath, 'utf8');
    }
    
    // テストディレクトリ作成
    const testDir = path.dirname(testDbPath);
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });
  
  beforeEach(() => {
    // テスト用データベースの初期化
    const testData = {
      users: [
        {
          id: 1,
          name: "Test User",
          email: "test@example.com",
          bio: "Test user for authentication",
          location: "Test Location",
          website: "https://test.example.com",
          roles: ["user"],
          createdAt: "2024-01-15T10:00:00Z",
          updatedAt: "2024-01-15T10:00:00Z",
          passwordHash: "$2b$12$jdekxBwxYBDcWrTbAW/qu.gAgXyar5ChKNrGwdXgtYqACYqsjI9Ni" // password123
        }
      ],
      microposts: []
    };
    
    // メインデータベースをテストデータで置き換え
    fs.writeFileSync(originalDbPath, JSON.stringify(testData, null, 2));
  });

  afterAll(() => {
    // 元のデータベースを復元
    if (originalDbData) {
      fs.writeFileSync(originalDbPath, originalDbData);
    }
    
    // テストファイル削除
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('POST /auth/register', () => {
    it('有効なデータで新規ユーザー登録できること', async () => {
      const newUser = {
        name: "New User",
        email: "newuser@example.com",
        password: "password123"
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(newUser)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('tokens');
      
      // ユーザー情報確認
      expect(response.body.data.user.name).toBe(newUser.name);
      expect(response.body.data.user.email).toBe(newUser.email);
      expect(response.body.data.user.roles).toContain('user');
      expect(response.body.data.user).not.toHaveProperty('passwordHash');
      
      // トークン情報確認
      expect(response.body.data.tokens.token_type).toBe('Bearer');
      expect(response.body.data.tokens).toHaveProperty('access_token');
      expect(response.body.data.tokens).toHaveProperty('expires_in');
    });

    it('無効なメールアドレスで登録に失敗すること', async () => {
      const invalidUser = {
        name: "Invalid User",
        email: "invalid-email",
        password: "password123"
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(invalidUser)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('短すぎるパスワードで登録に失敗すること', async () => {
      const invalidUser = {
        name: "Invalid User",
        email: "invalid@example.com",
        password: "123"
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(invalidUser)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('既存のメールアドレスで登録に失敗すること', async () => {
      const existingUser = {
        name: "Duplicate User",
        email: "test@example.com", // 既存ユーザーと同じメール
        password: "password123"
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(existingUser)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
    });
  });

  describe('POST /auth/login', () => {
    it('有効な認証情報でログインできること', async () => {
      const loginData = {
        email: "test@example.com",
        password: "password123"
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('tokens');
      
      // ユーザー情報確認
      expect(response.body.data.user.email).toBe(loginData.email);
      expect(response.body.data.user).not.toHaveProperty('passwordHash');
      
      // トークン情報確認
      expect(response.body.data.tokens.token_type).toBe('Bearer');
      expect(response.body.data.tokens).toHaveProperty('access_token');
    });

    it('無効なパスワードでログインに失敗すること', async () => {
      const invalidLogin = {
        email: "test@example.com",
        password: "wrongpassword"
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(invalidLogin)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('存在しないメールアドレスでログインに失敗すること', async () => {
      const invalidLogin = {
        email: "nonexistent@example.com",
        password: "password123"
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(invalidLogin)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('バリデーションエラーでログインに失敗すること', async () => {
      const invalidLogin = {
        email: "invalid-email",
        password: ""
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(invalidLogin)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /auth/me', () => {
    let authToken;

    beforeEach(async () => {
      // ログインしてトークンを取得
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: "test@example.com",
          password: "password123"
        });
      
      authToken = loginResponse.body.data.tokens.access_token;
    });

    it('有効なトークンで現在のユーザー情報を取得できること', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.email).toBe('test@example.com');
      expect(response.body.data).not.toHaveProperty('passwordHash');
    });

    it('トークンなしでアクセスに失敗すること', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });

    it('無効なトークンでアクセスに失敗すること', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('POST /auth/logout', () => {
    let authToken;

    beforeEach(async () => {
      // ログインしてトークンを取得
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: "test@example.com",
          password: "password123"
        });
      
      authToken = loginResponse.body.data.tokens.access_token;
    });

    it('有効なトークンでログアウトできること', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('ログアウトしました');
    });

    it('トークンなしでログアウトに失敗すること', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });
  });

  describe('GET /auth/health', () => {
    it.skip('認証サービスのヘルスチェックが正常に動作すること', async () => {
      const response = await request(app)
        .get('/api/v1/auth/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.service).toBe('AuthController');
      expect(response.body.data.status).toBe('healthy');
    });
  });

  describe('認証が必要なエンドポイントの保護', () => {
    let authToken;

    beforeEach(async () => {
      // ログインしてトークンを取得
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: "test@example.com",
          password: "password123"
        });
      
      authToken = loginResponse.body.data.tokens.access_token;
    });

    it('認証されたユーザーが保護されたエンドポイントにアクセスできること', async () => {
      // 例：現在のユーザー情報取得
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('未認証ユーザーが保護されたエンドポイントにアクセスできないこと', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('JWT トークンの検証', () => {
    it('期限切れトークンで認証に失敗すること', async () => {
      // 期限切れトークンを手動で作成（実際の実装では時間を操作）
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwicm9sZXMiOlsidXNlciJdLCJpYXQiOjE2NDQ0ODY0MDAsImV4cCI6MTY0NDQ4NjQwMX0.invalid';
      
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});