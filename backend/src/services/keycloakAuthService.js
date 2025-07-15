import { BaseAuthService } from './authService.js';
import {
  keycloakTokenResponseSchema,
  keycloakUserInfoSchema,
  authUserSchema,
  defaultAuthConfig
} from '../../../shared/schemas/auth.js';

/**
 * Keycloak互換認証サービス
 * 将来のKeycloak移行のためのインターフェース実装
 */
export class KeycloakAuthService extends BaseAuthService {
  constructor(keycloakConfig = {}, config = {}) {
    super(config);
    
    this.keycloakConfig = {
      // Keycloak設定
      serverUrl: keycloakConfig.serverUrl || process.env.KEYCLOAK_SERVER_URL,
      realm: keycloakConfig.realm || process.env.KEYCLOAK_REALM || 'master',
      clientId: keycloakConfig.clientId || process.env.KEYCLOAK_CLIENT_ID,
      clientSecret: keycloakConfig.clientSecret || process.env.KEYCLOAK_CLIENT_SECRET,
      
      // APIエンドポイント構築
      ...this._buildKeycloakEndpoints(keycloakConfig)
    };
    
    // HTTP クライアント（fetch使用）
    this.httpClient = this._createHttpClient();
  }

  /**
   * Keycloak APIエンドポイントを構築
   * @private
   */
  _buildKeycloakEndpoints(config) {
    const baseUrl = config.serverUrl || process.env.KEYCLOAK_SERVER_URL;
    const realm = config.realm || process.env.KEYCLOAK_REALM || 'master';
    
    if (!baseUrl) {
      console.warn('Keycloak server URL not configured');
      return {};
    }

    const realmUrl = `${baseUrl}/realms/${realm}`;
    const adminUrl = `${baseUrl}/admin/realms/${realm}`;
    
    return {
      // 認証エンドポイント
      tokenEndpoint: `${realmUrl}/protocol/openid-connect/token`,
      userInfoEndpoint: `${realmUrl}/protocol/openid-connect/userinfo`,
      logoutEndpoint: `${realmUrl}/protocol/openid-connect/logout`,
      
      // 管理APIエンドポイント
      usersEndpoint: `${adminUrl}/users`,
      rolesEndpoint: `${adminUrl}/roles`,
      
      // その他
      wellKnownEndpoint: `${realmUrl}/.well-known/openid_configuration`,
      jwksEndpoint: `${realmUrl}/protocol/openid-connect/certs`
    };
  }

  /**
   * HTTPクライアントを作成
   * @private
   */
  _createHttpClient() {
    return {
      async request(url, options = {}) {
        try {
          const response = await fetch(url, {
            headers: {
              'Content-Type': 'application/json',
              ...options.headers
            },
            ...options
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          return await response.json();
        } catch (error) {
          console.error('HTTP request failed:', error);
          throw error;
        }
      }
    };
  }

  /**
   * Keycloak管理トークンを取得
   * @private
   */
  async _getAdminToken() {
    if (!this.keycloakConfig.tokenEndpoint) {
      throw new Error('Keycloak not properly configured');
    }

    const tokenData = await this.httpClient.request(this.keycloakConfig.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.keycloakConfig.clientId,
        client_secret: this.keycloakConfig.clientSecret
      })
    });

    return tokenData.access_token;
  }

  /**
   * ユーザー登録（Keycloak Admin API使用）
   */
  async register(registerData) {
    try {
      if (!this.keycloakConfig.usersEndpoint) {
        throw new Error('Keycloak endpoints not configured');
      }

      // 管理トークン取得
      const adminToken = await this._getAdminToken();

      // Keycloak用ユーザーデータ変換
      const keycloakUser = this._convertToKeycloakUser(registerData);

      // ユーザー作成
      const response = await this.httpClient.request(this.keycloakConfig.usersEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify(keycloakUser)
      });

      // 作成されたユーザー情報取得
      const userId = this._extractUserIdFromResponse(response);
      const user = await this._getKeycloakUser(userId, adminToken);

      // 内部形式に変換
      const authUser = this._convertFromKeycloakUser(user);

      // トークン生成（直接認証）
      const tokens = await this._authenticateUser(registerData.email, registerData.password);

      return {
        user: authUser,
        tokens
      };

    } catch (error) {
      console.error('Keycloak registration error:', error);
      
      // フォールバック: ローカル実装使用
      console.warn('Falling back to local authentication implementation');
      return this._fallbackToLocal('register', registerData);
    }
  }

  /**
   * ユーザーログイン（Keycloak Token API使用）
   */
  async login(loginData) {
    try {
      if (!this.keycloakConfig.tokenEndpoint) {
        throw new Error('Keycloak endpoints not configured');
      }

      // Keycloak認証
      const tokenResponse = await this.httpClient.request(this.keycloakConfig.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'password',
          client_id: this.keycloakConfig.clientId,
          client_secret: this.keycloakConfig.clientSecret,
          username: loginData.email,
          password: loginData.password
        })
      });

      // レスポンス検証
      const validatedTokens = keycloakTokenResponseSchema.parse(tokenResponse);

      // ユーザー情報取得
      const userInfo = await this._getKeycloakUserInfo(validatedTokens.access_token);
      const authUser = this._convertFromKeycloakUserInfo(userInfo);

      // 内部形式のトークンレスポンス作成
      const tokens = this._convertToInternalTokens(validatedTokens);

      return {
        user: authUser,
        tokens
      };

    } catch (error) {
      console.error('Keycloak login error:', error);
      
      // フォールバック: ローカル実装使用
      console.warn('Falling back to local authentication implementation');
      return this._fallbackToLocal('login', loginData);
    }
  }

  /**
   * ユーザー情報取得
   */
  async getUserById(userId) {
    try {
      const adminToken = await this._getAdminToken();
      const user = await this._getKeycloakUser(userId, adminToken);
      return this._convertFromKeycloakUser(user);
    } catch (error) {
      console.error('Keycloak getUserById error:', error);
      return this._fallbackToLocal('getUserById', userId);
    }
  }

  /**
   * メールアドレスでユーザー検索
   */
  async getUserByEmail(email) {
    try {
      const adminToken = await this._getAdminToken();
      
      const users = await this.httpClient.request(
        `${this.keycloakConfig.usersEndpoint}?email=${encodeURIComponent(email)}`,
        {
          headers: {
            'Authorization': `Bearer ${adminToken}`
          }
        }
      );

      if (users.length === 0) {
        return null;
      }

      return this._convertFromKeycloakUser(users[0]);
    } catch (error) {
      console.error('Keycloak getUserByEmail error:', error);
      return this._fallbackToLocal('getUserByEmail', email);
    }
  }

  /**
   * トークンからユーザー情報取得
   */
  async getUserFromToken(token) {
    try {
      const userInfo = await this._getKeycloakUserInfo(token);
      return this._convertFromKeycloakUserInfo(userInfo);
    } catch (error) {
      console.error('Keycloak getUserFromToken error:', error);
      return this._fallbackToLocal('getUserFromToken', token);
    }
  }

  /**
   * ログアウト処理
   */
  async logout(token) {
    try {
      if (this.keycloakConfig.logoutEndpoint) {
        await this.httpClient.request(this.keycloakConfig.logoutEndpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }

      return {
        success: true,
        message: 'ログアウトしました'
      };
    } catch (error) {
      console.error('Keycloak logout error:', error);
      
      // ログアウトはエラーでも成功を返す
      return {
        success: true,
        message: 'ログアウトしました'
      };
    }
  }

  /**
   * Keycloakユーザー情報取得
   * @private
   */
  async _getKeycloakUserInfo(accessToken) {
    const userInfo = await this.httpClient.request(this.keycloakConfig.userInfoEndpoint, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    return keycloakUserInfoSchema.parse(userInfo);
  }

  /**
   * 内部ユーザーデータをKeycloak形式に変換
   * @private
   */
  _convertToKeycloakUser(userData) {
    return {
      username: userData.email,
      email: userData.email,
      firstName: userData.name.split(' ')[0] || userData.name,
      lastName: userData.name.split(' ').slice(1).join(' ') || '',
      enabled: true,
      emailVerified: false,
      credentials: [{
        type: 'password',
        value: userData.password,
        temporary: false
      }]
    };
  }

  /**
   * Keycloakユーザー情報を内部形式に変換
   * @private
   */
  _convertFromKeycloakUser(keycloakUser) {
    return authUserSchema.parse({
      id: keycloakUser.id,
      name: `${keycloakUser.firstName || ''} ${keycloakUser.lastName || ''}`.trim() || keycloakUser.username,
      email: keycloakUser.email,
      roles: this._mapKeycloakRolesToInternal(keycloakUser.roles || []),
      createdAt: new Date(keycloakUser.createdTimestamp || Date.now()).toISOString(),
      updatedAt: new Date().toISOString(),
      micropostCount: 0 // Keycloakでは管理しない
    });
  }

  /**
   * KeycloakユーザーInfoを内部形式に変換
   * @private
   */
  _convertFromKeycloakUserInfo(userInfo) {
    return authUserSchema.parse({
      id: userInfo.sub,
      name: userInfo.name || userInfo.preferred_username,
      email: userInfo.email,
      roles: this._mapKeycloakRolesToInternal(
        userInfo.realm_access?.roles || []
      ),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      micropostCount: 0
    });
  }

  /**
   * Keycloakトークンを内部形式に変換
   * @private
   */
  _convertToInternalTokens(keycloakTokens) {
    return {
      access_token: keycloakTokens.access_token,
      token_type: 'Bearer',
      expires_in: keycloakTokens.expires_in,
      refresh_token: keycloakTokens.refresh_token
    };
  }

  /**
   * Keycloakロールを内部ロールにマッピング
   * @private
   */
  _mapKeycloakRolesToInternal(keycloakRoles) {
    const roleMapping = {
      'realm-admin': 'admin',
      'admin': 'admin',
      'readonly-admin': 'readonly-admin',
      'user': 'user',
      'default-roles-realm': 'user'
    };

    const mappedRoles = keycloakRoles
      .map(role => roleMapping[role] || 'user')
      .filter((role, index, arr) => arr.indexOf(role) === index); // 重複削除

    return mappedRoles.length > 0 ? mappedRoles : ['user'];
  }

  /**
   * ローカル実装へのフォールバック
   * @private
   */
  async _fallbackToLocal(method, ...args) {
    if (!this.localAuthService) {
      // ローカル認証サービスの動的インポート
      const { LocalAuthService } = await import('./authService.js');
      
      // 依存関係の動的取得が必要
      console.warn('Local fallback requires proper dependency injection');
      throw new Error(`Fallback to local ${method} failed: dependencies not available`);
    }

    return this.localAuthService[method](...args);
  }
}

/**
 * Keycloak認証サービス設定ファクトリ
 */
export class KeycloakAuthServiceFactory {
  static create(keycloakConfig = {}, authConfig = {}) {
    const config = { ...defaultAuthConfig, ...authConfig };
    return new KeycloakAuthService(keycloakConfig, config);
  }

  /**
   * 環境変数からKeycloak設定を生成
   */
  static createFromEnv() {
    const keycloakConfig = {
      serverUrl: process.env.KEYCLOAK_SERVER_URL,
      realm: process.env.KEYCLOAK_REALM || 'master',
      clientId: process.env.KEYCLOAK_CLIENT_ID,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET
    };

    return this.create(keycloakConfig);
  }

  /**
   * 開発環境用の設定チェック
   */
  static validateConfig(keycloakConfig = {}) {
    const required = ['serverUrl', 'realm', 'clientId'];
    const missing = required.filter(key => !keycloakConfig[key]);

    if (missing.length > 0) {
      console.warn(`Keycloak configuration missing: ${missing.join(', ')}`);
      return false;
    }

    return true;
  }
}

export default KeycloakAuthService;