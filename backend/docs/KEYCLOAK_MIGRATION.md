# Keycloak移行戦略ドキュメント

## 概要

このドキュメントでは、現在のローカル認証システム（lowdb + JWT）から Keycloak への移行戦略を説明します。設計では**互換性を重視**し、段階的な移行を可能にする構造を採用しています。

## 現在のアーキテクチャ

```
クライアント → Express API → LocalAuthService → lowdb
                                ↓
                            JWT Utils
                                ↓
                         パスワードハッシュ
```

## 目標アーキテクチャ

```
クライアント → Express API → KeycloakAuthService → Keycloak Server
                                ↓
                        Keycloak Admin API
                                ↓
                        OpenID Connect
```

## 互換性設計の特徴

### 1. 統一インターフェース

両方の実装が同じ `BaseAuthService` を継承し、同じメソッドシグネチャを提供：

```javascript
// 共通インターフェース
abstract class BaseAuthService {
  async register(registerData)
  async login(loginData) 
  async getUserById(userId)
  async getUserByEmail(email)
  async getUserFromToken(token)
  async logout(token)
  hasRole(user, requiredRole)
}
```

### 2. ファクトリーパターンによる切り替え

```javascript
// 現在：ローカル認証
const authService = AuthServiceFactory.create('local', {
  userRepository,
  jwtUtils
});

// 移行後：Keycloak認証
const authService = AuthServiceFactory.create('keycloak', {
  keycloakConfig
});
```

### 3. 環境変数による制御

```bash
# .env での切り替え
AUTH_PROVIDER=local     # 現在
AUTH_PROVIDER=keycloak  # 移行後

# Keycloak設定
KEYCLOAK_SERVER_URL=https://keycloak.example.com
KEYCLOAK_REALM=your-realm
KEYCLOAK_CLIENT_ID=your-client
KEYCLOAK_CLIENT_SECRET=your-secret
```

## 段階的移行プロセス

### Phase 1: 環境準備（1-2週間）

#### Keycloak サーバーセットアップ
1. **Keycloak インストール**
   ```bash
   # Docker Compose
   docker-compose up keycloak
   ```

2. **Realm 設定**
   - 新しいrealm作成
   - クライアント設定（confidential client）
   - ロール定義（user, readonly-admin, admin）

3. **既存ユーザーデータのインポート**
   ```bash
   # CSV/JSON インポート
   # または Admin API での一括作成
   ```

#### 開発環境での準備
1. **依存関係追加**
   ```bash
   npm install node-fetch  # HTTP クライアント
   ```

2. **環境変数設定**
   ```bash
   # Keycloak設定を .env に追加
   KEYCLOAK_SERVER_URL=http://localhost:8080
   KEYCLOAK_REALM=test-realm
   KEYCLOAK_CLIENT_ID=express-api
   KEYCLOAK_CLIENT_SECRET=your-secret
   ```

### Phase 2: 並行運用（2-3週間）

#### デュアル認証システム実装
```javascript
// デュアル認証サービス
class DualAuthService extends BaseAuthService {
  constructor(localService, keycloakService) {
    this.localService = localService;
    this.keycloakService = keycloakService;
    this.migrationMode = process.env.MIGRATION_MODE || 'local-primary';
  }

  async login(loginData) {
    switch (this.migrationMode) {
      case 'local-primary':
        return await this._tryLocalFirst(loginData);
      case 'keycloak-primary': 
        return await this._tryKeycloakFirst(loginData);
      case 'keycloak-only':
        return await this.keycloakService.login(loginData);
    }
  }

  async _tryLocalFirst(loginData) {
    try {
      return await this.localService.login(loginData);
    } catch (error) {
      console.log('Local auth failed, trying Keycloak...');
      return await this.keycloakService.login(loginData);
    }
  }
}
```

#### 段階的ユーザー移行
1. **既存ユーザーの Keycloak 移行**
   - 管理画面での手動移行
   - バッチ処理での自動移行

2. **新規ユーザーの Keycloak 登録**
   - 新規登録は Keycloak のみ
   - ローカルDBへの同期も並行実行

### Phase 3: 完全移行（1-2週間）

#### ローカル認証システムの段階的停止
1. **読み取り専用モード**
   ```javascript
   MIGRATION_MODE=keycloak-primary
   ```

2. **データ整合性検証**
   - ユーザーデータの一致確認
   - ロール・権限の整合性チェック

3. **完全切り替え**
   ```javascript
   AUTH_PROVIDER=keycloak
   MIGRATION_MODE=keycloak-only
   ```

## データマッピング戦略

### ユーザーデータの変換

#### ローカル → Keycloak
```javascript
// 内部形式
{
  id: 123,
  name: "田中太郎",
  email: "tanaka@example.com", 
  roles: ["user", "admin"],
  passwordHash: "$2b$12$..."
}

// Keycloak形式
{
  username: "tanaka@example.com",
  email: "tanaka@example.com",
  firstName: "太郎",
  lastName: "田中", 
  enabled: true,
  credentials: [{
    type: "password",
    value: "password",  // 初回のみ
    temporary: true
  }],
  realmRoles: ["user", "admin"]
}
```

#### Keycloak → 内部形式
```javascript
// Keycloak UserInfo
{
  sub: "12345678-1234-...",
  name: "田中太郎",
  email: "tanaka@example.com",
  realm_access: {
    roles: ["user", "offline_access"]
  }
}

// 内部形式
{
  id: "12345678-1234-...",
  name: "田中太郎", 
  email: "tanaka@example.com",
  roles: ["user"],
  createdAt: "2024-01-01T00:00:00Z",
  micropostCount: 0  // 別途計算
}
```

### ロールマッピング

| 内部ロール | Keycloak ロール | 説明 |
|-----------|---------------|------|
| `user` | `user` | 一般ユーザー |
| `readonly-admin` | `readonly-admin` | 読み取り専用管理者 |
| `admin` | `realm-admin` | 完全管理者 |

## トークン管理の変更

### 現在：自己署名JWT
```javascript
// JWT生成
const token = jwt.sign(payload, JWT_SECRET, {
  expiresIn: '1h',
  issuer: 'your-api'
});
```

### 移行後：Keycloak JWT
```javascript
// Keycloak Token取得
const response = await fetch(`${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`, {
  method: 'POST',
  body: new URLSearchParams({
    grant_type: 'password',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    username: email,
    password: password
  })
});

const { access_token, refresh_token } = await response.json();
```

## APIエンドポイントの互換性

既存のAPIエンドポイントは**完全に互換性を維持**：

```bash
# 変更なし
POST /api/v1/auth/login
POST /api/v1/auth/register  
POST /api/v1/auth/logout
GET  /api/v1/auth/me
PUT  /api/v1/auth/password
POST /api/v1/auth/refresh
```

レスポンス形式も統一：
```javascript
// 統一レスポンス形式
{
  "data": {
    "user": { /* ユーザー情報 */ },
    "tokens": {
      "access_token": "...",
      "token_type": "Bearer", 
      "expires_in": 3600,
      "refresh_token": "..."
    }
  }
}
```

## パフォーマンス考慮事項

### 1. Keycloak接続の最適化
```javascript
// 接続プールの使用
const agent = new https.Agent({
  keepAlive: true,
  maxSockets: 10
});

// レスポンスキャッシュ
const userInfoCache = new Map();
```

### 2. フォールバック戦略
```javascript
// Keycloak障害時のローカル認証フォールバック
async login(loginData) {
  try {
    return await this.keycloakService.login(loginData);
  } catch (error) {
    if (this.isKeycloakUnavailable(error)) {
      console.warn('Keycloak unavailable, falling back to local auth');
      return await this.localService.login(loginData);
    }
    throw error;
  }
}
```

## セキュリティ考慮事項

### 1. トークン検証
```javascript
// Keycloak公開鍵での検証
const jwksClient = require('jwks-rsa');
const client = jwksClient({
  jwksUri: `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/certs`
});
```

### 2. 権限管理の強化
```javascript
// Keycloak細粒度権限の活用
const permissions = await keycloak.checkPermission(token, 'resource:action');
```

## 監視・ログ戦略

### 1. 移行進捗の監視
```javascript
// メトリクス収集
const authMetrics = {
  localAuthCount: 0,
  keycloakAuthCount: 0, 
  migrationErrors: 0
};
```

### 2. 障害監視
```javascript
// Keycloak可用性監視
setInterval(async () => {
  try {
    await keycloak.healthCheck();
    metrics.keycloakAvailable = true;
  } catch (error) {
    metrics.keycloakAvailable = false;
    console.error('Keycloak health check failed:', error);
  }
}, 30000);
```

## ロールバック計画

### 緊急時の即座復旧
```bash
# 環境変数での即座切り替え
AUTH_PROVIDER=local
MIGRATION_MODE=local-primary

# アプリケーション再起動
pm2 restart app
```

### データ整合性の維持
```javascript
// 双方向同期の実装
class AuthSyncService {
  async syncUserToLocal(keycloakUser) {
    const localUser = await this.convertKeycloakToLocal(keycloakUser);
    await this.localUserRepository.upsert(localUser);
  }
  
  async syncUserToKeycloak(localUser) {
    const keycloakUser = await this.convertLocalToKeycloak(localUser);
    await this.keycloakAdmin.upsertUser(keycloakUser);
  }
}
```

## 成功指標とテスト戦略

### KPI
- 認証レスポンス時間：< 200ms
- 可用性：99.9%
- ユーザー体験：ダウンタイムゼロ移行

### テストシナリオ
1. **機能テスト**
   - 全認証フローの動作確認
   - 権限チェックの正確性

2. **パフォーマンステスト**  
   - 負荷テスト（1000 concurrent users）
   - Keycloak障害時のフォールバック

3. **セキュリティテスト**
   - トークン検証の正確性
   - 権限昇格攻撃の防止

## 結論

この移行戦略により以下を実現します：

✅ **ゼロダウンタイム移行**  
✅ **API互換性の完全維持**  
✅ **段階的リスク管理**  
✅ **即座のロールバック対応**  
✅ **Keycloak のエンタープライズ機能活用**  

移行完了後は、Keycloak の高度な機能（SSO、2FA、フェデレーション等）を活用した認証基盤の強化が可能になります。