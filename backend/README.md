# Express API with OpenAPI-driven Development

**Express 5.x 対応済み** | **JWT認証** | **OpenAPI仕様駆動開発**

PoC・技術検証フェーズにおける高速な試作開発およびOpenAPI駆動開発を実践するためのJS + Express + lowdb ベースの標準構成です。

## 🎯 プロジェクト概要

- **Express 5.x**: 最新バージョン対応済み
- **OpenAPI 3.0.3**: API仕様駆動開発
- **JWT認証**: セキュアな認証システム
- **lowdb**: 高速プロトタイピング用JSON DB
- **Zod**: 型安全なバリデーション
- **Jest**: 包括的テストスイート

## 🛠 技術スタック

### バックエンド
- **Express 5.x**: 軽量・シンプルなAPIサーバー
- **lowdb**: ファイルベースJSON DB（試作・検証用）
- **openapi-backend**: OpenAPI仕様駆動ルーティング
- **Zod**: 型安全・高可読なスキーマバリデーション

### 認証・セキュリティ
- **JWT**: JSON Web Token認証
- **bcrypt**: パスワードハッシュ化
- **helmet**: セキュリティヘッダ
- **express-rate-limit**: レート制限

### テスト・開発
- **Jest**: テストフレームワーク
- **Supertest**: API統合テスト
- **nodemon**: ホットリロード開発

## 📁 プロジェクト構造

```
project-root/
├── src/
│   ├── controllers/        # ビジネスロジック
│   ├── middlewares/        # カスタムミドルウェア
│   ├── models/            # データモデル定義
│   ├── routes/            # Express ルーター
│   ├── services/          # 外部サービス連携
│   ├── repositories/      # データアクセス層
│   ├── utils/             # ユーティリティ関数
│   └── schemas/           # Zod バリデーションスキーマ
├── ../shared/openapi/
│   └── api.yaml           # OpenAPI 3.x 仕様書
├── db/
│   ├── db.json           # lowdb データファイル
│   └── seed.js           # 初期データ投入スクリプト
├── test/
│   ├── unit/             # 単体テスト
│   ├── integration/      # 統合テスト
│   └── e2e/              # E2Eテスト
└── script/
    └── setup.sh          # 環境セットアップ
```

## 🚀 主要機能

### 認証機能
- ユーザー登録・ログイン
- JWTトークン発行・検証
- セッション管理
- パスワードリセット

### API機能
- ユーザー管理（CRUD）
- マイクロポスト管理
- ページネーション・検索
- OpenAPI仕様準拠

### セキュリティ
- レート制限（API保護）
- CORS設定
- セキュリティヘッダ（Helmet）
- 入力バリデーション（Zod）

## 🚀 クイックスタート

### 1. 環境セットアップ
```bash
# 依存関係のインストール・DB初期化・環境設定を一括実行
npm run setup
```

### 2. 開発サーバー起動
```bash
npm run dev
```

### 3. API動作確認
```bash
# ヘルスチェック
curl http://localhost:8000/health

# Swagger UI でAPI仕様確認
open http://localhost:8000/api-docs
```

## 📋 利用可能なコマンド

### 開発
```bash
npm run dev          # 開発サーバー起動（ホットリロード）
npm start           # 本番サーバー起動
```

### テスト
```bash
npm test            # テスト実行（静音モード）
npm run test:verbose # 詳細テスト実行
npm run test:watch  # ウォッチモード
npm run test:coverage # カバレッジ測定
```

### データベース
```bash
npm run db:seed      # 初期データ投入
npm run db:seed:force # 強制的に初期データ投入
```

## 🔧 設定

### 環境変数（.env）
```bash
NODE_ENV=development
PORT=8000
JWT_SECRET=your-secret-key
DB_PATH=./db/db.json
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

### Express 5.x 対応状況
✅ **完了済み**
- OpenAPIバックエンド復旧
- 自動ルート検証の復元
- ワイルドカードルート構文修正（`*` → `/*catchall`）
- express-async-errors削除対応

## 📊 プロジェクト品質

### テストカバレッジ
- **全体**: 40.15%
- **目標**: 80%+

### セキュリティ
- **npm audit**: 0 脆弱性
- **認証**: JWT + リフレッシュトークン
- **レート制限**: 多層防御

### 技術負債管理
🔴 **Critical**: 解決済み（Express 5.x 互換性）  
🟠 **High**: テストカバレッジ向上  
🟡 **Medium**: PostgreSQL移行準備

## 🔄 開発ワークフロー

### OpenAPI駆動開発
1. **API仕様定義**: `../shared/openapi/api.yaml` でAPI設計
2. **自動バリデーション**: リクエスト・レスポンスの自動検証
3. **Swagger UI**: ブラウザでAPIドキュメント確認
4. **型安全性**: Zodスキーマによる実行時型チェック

### 推奨開発フロー
```bash
# 1. 仕様書作成・編集
edit ../shared/openapi/api.yaml

# 2. スキーマ生成・更新
npm run generate:schemas

# 3. テスト実行・確認
npm run test:watch

# 4. 開発サーバーでAPI確認
npm run dev
```

## 🌟 特徴・利点

### ✅ 高速プロトタイピング
- **Zero Config**: 設定不要で即座に開始
- **lowdb**: 軽量なJSON DBでDB設定不要
- **Hot Reload**: コード変更の即座反映

### ✅ Production Ready
- **Express 5.x**: 最新安定版対応
- **セキュリティ**: 本番環境レベルの防御
- **PostgreSQL移行**: 簡単な本番DB移行

### ✅ 開発者体験
- **型安全**: Zodによる実行時型チェック
- **API-First**: OpenAPI仕様からの自動生成
- **包括的テスト**: 単体・統合・E2Eテスト

## 📈 ロードマップ

### ✅ 完了済み（v1.0）
- Express 5.x 互換性修正
- OpenAPIバックエンド復旧
- 自動ルート検証復元
- JWT認証システム
- 包括的テストスイート

### 🔄 進行中（v1.1）
- テストカバレッジ向上（目標: 80%+）
- パフォーマンス最適化
- ドキュメント拡充

### 🎯 今後の予定（v2.0）
- PostgreSQL移行サポート
- マイクロサービス対応
- CI/CDパイプライン
- Docker化サポート

## 🤝 コントリビューション

### 開発参加方法
1. Issue作成（機能要望・バグ報告）
2. Fork & Pull Request
3. テスト通過確認
4. コードレビュー

### コーディング規約
- ESLint設定準拠
- テストカバレッジ維持
- OpenAPI仕様準拠
- セキュリティベストプラクティス

## 📞 サポート

### ドキュメント
- **API仕様**: `/api-docs` でSwagger UI確認
- **プロジェクト分析**: `PROJECT_ANALYSIS_REPORT.md`
- **設定ガイド**: `CLAUDE.md`

### トラブルシューティング
```bash
# デバッグモードでテスト実行
npm run test:debug

# 詳細ログ出力
NODE_ENV=development npm run dev

# 依存関係の問題確認
npm audit
```

---

*Express 5.x対応済み・OpenAPI駆動開発・高速プロトタイピングに最適化されたAPIフレームワーク*