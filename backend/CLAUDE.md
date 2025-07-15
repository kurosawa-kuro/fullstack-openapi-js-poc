# CLAUDE.md（改訂版）

## 🎯 プロジェクト概要
PoC・技術検証フェーズにおける **「高速な試作開発」および「OpenAPI駆動開発」** を実践するための **JS + Express + json.db** ベースの標準構成です。

試作段階では多対多・リレーション管理の負荷を排除し、PostgreSQL の代わりに **lowdb（JSON DB）を採用**することで、高速に API を検証可能な土台を提供します。

**必要に応じてフロントエンドに Vue + Tailwind を組み合わせ、SPA として PoC 展開可能です。**

---

## 🛠 技術スタック

### バックエンド
- **Express**: 軽量・シンプルな API サーバー
- **lowdb (json.db)**: ファイルベース JSON DB（試作・検証用）
- **openapi-backend**: OpenAPI仕様駆動でルーティング・バリデーション管理
- **express-async-errors**: async 関数でのエラーハンドリング自動化

### バリデーション・スキーマ
- **Zod**: 型安全・高可読なスキーマバリデーション
- **OpenAPI 3.x**: API仕様定義（YAML形式）

### APIドキュメント
- **Swagger UI Express**: OpenAPI仕様に基づくUIドキュメント自動生成
- **yamljs**: YAML ファイル読み込み

### フロントエンド（オプション）
- **Vue 3**: SPA フレームワーク
- **Tailwind CSS**: ユーティリティファースト CSS
- **Vite**: 高速ビルドツール
- **Pinia**: 状態管理（必要時）

### 開発・運用支援
- **dotenv**: 環境変数管理
- **cors**: CORS対応
- **morgan**: HTTPリクエストログ
- **nodemon**: ホットリロード開発
- **helmet**: セキュリティ強化ヘッダ
- **cookie-parser**: Cookie解析

### テスト・認証
- **jest, supertest**: APIテスト
- **jsonwebtoken**: JWT認証
- **bcrypt**: パスワードハッシュ化
- **express-session**: セッション管理
- **redis**: セッション/キャッシュ用（必要時）

### ユーティリティ
- **fs-extra**: ファイル操作補助
- **http-errors**: エラーハンドリング補助

---

## 📁 プロジェクト構造

```
project-root/
├── src/
│   ├── controllers/        # ビジネスロジック
│   ├── middlewares/        # カスタムミドルウェア
│   ├── models/            # データモデル定義
│   ├── routes/            # Express ルーター
│   ├── services/          # 外部サービス連携
│   ├── utils/             # ユーティリティ関数
│   ├── schemas/           # Zod バリデーションスキーマ
│   └── server.js          # アプリケーションエントリーポイント
├── ../shared/openapi/
│   └── api.yaml           # OpenAPI 3.x 仕様書
├── db/
│   ├── db.json           # lowdb データファイル
│   └── seed.js           # 初期データ投入スクリプト
├── frontend/              # Vue + Tailwind (必要時)
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── src/
│       ├── components/
│       ├── views/
│       ├── stores/        # Pinia stores
│       └── main.js
├── test/
│   ├── api.test.js       # APIテスト
│   ├── integration/      # 統合テスト
│   └── fixtures/         # テストデータ
├── scripts/
│   ├── setup.js          # 初期セットアップ
│   └── migrate.js        # PostgreSQL移行用
├── .env.example          # 環境変数テンプレート
├── .env                  # 環境変数（.gitignore対象）
├── Makefile              # 開発タスク定義
├── package.json
├── README.md
└── CLAUDE.md             # このファイル
```

---

## 🔧 Makefile タスク例

```make
# 開発サーバー起動
dev:
	nodemon src/server.js

# テスト実行
test:
	jest

# テスト（ウォッチモード）
test-watch:
	jest --watch

# API テストのみ
test-api:
	jest test/api.test.js

# リント・フォーマット
lint:
	eslint src/ test/

format:
	prettier --write src/ test/ openapi/

# フロントエンド開発サーバー
dev-front:
	cd frontend && npm run dev

# フロントエンドビルド
build-front:
	cd frontend && npm run build

# Swagger UI 表示
docs:
	open http://localhost:8000/api-docs

# データベース初期化
db-seed:
	node db/seed.js

# 全体セットアップ
setup:
	npm install && npm run db-seed

# Redis起動（Docker）
redis-start:
	docker run -d -p 6379:6379 redis:alpine

# プロジェクトクリーンアップ
clean:
	rm -rf node_modules frontend/node_modules frontend/dist
```

---

## 🚀 開発方針

### 1. 高速な試作開発・技術検証
- ✅ JSON DB による柔軟性とゼロコンフィグ
- ✅ Express の簡潔なAPI設計
- ✅ フロントエンド(Vue)と合わせて即座に PoC 展開
- ✅ Docker/Kind/EKS への後付けデプロイ対応

### 2. OpenAPI駆動開発（API-First）
- ✅ `../shared/openapi/api.yaml` からルーティング・バリデーション自動化
- ✅ Swagger による即時API仕様可視化
- ✅ Zod による実行時型安全管理
- ✅ フロントエンド・バックエンド間の型定義共有

### 3. PostgreSQL移行対応
- ✅ 試作フェーズは json.db メイン運用
- ✅ 本番移行時の PostgreSQL 対応済み設計
- ✅ データモデルの互換性維持

---

## 📋 開発チェックリスト

### 初期セットアップ
- [ ] `src/server.js` 基本実装
- [ ] `../shared/openapi/api.yaml` API仕様定義
- [ ] `db/db.json` 初期化・シードデータ作成
- [ ] 環境変数設定（`.env`）

### API開発
- [ ] CRUD操作の基本実装
- [ ] Zod バリデーションスキーマ作成
- [ ] エラーハンドリング統一
- [ ] Swagger UI 動作確認

### 認証・セキュリティ
- [ ] JWT認証実装
- [ ] セッション管理設定
- [ ] CORS・セキュリティヘッダ設定
- [ ] パスワードハッシュ化

### テスト
- [ ] `jest` + `supertest` テスト環境構築
- [ ] API エンドポイントテスト実装
- [ ] バリデーションテスト
- [ ] 認証フローテスト

### フロントエンド（必要時）
- [ ] Vue 3 + Vite 環境構築
- [ ] Tailwind CSS 設定
- [ ] API クライアント実装
- [ ] 状態管理（Pinia）セットアップ

### 運用・デプロイ
- [ ] Redis連携（セッション・キャッシュ）
- [ ] ログ設定・監視
- [ ] Docker化
- [ ] CI/CD パイプライン

---

## 🎨 即座に実装可能なテンプレート

Claude Code で以下を即座に生成可能：

### バックエンド
- ✅ 基本的な Express サーバー + OpenAPI-backend 統合
- ✅ CRUD API + Zod バリデーション
- ✅ JWT認証フロー
- ✅ Swagger UI 設定

### フロントエンド
- ✅ Vue 3 + Tailwind 管理画面テンプレート
- ✅ API クライアント + 型定義
- ✅ 認証対応 SPA 構成

### テスト・運用
- ✅ Jest + Supertest テストスイート
- ✅ Docker Compose 構成
- ✅ PostgreSQL 移行スクリプト

---

## 💡 Claude Code 活用のポイント

### 推奨プロンプト例
- "OpenAPI仕様に基づいてZodスキーマを生成してください"
- "Express ルーターとopenapi-backendの統合を実装してください"
- "Vue コンポーネントとTailwind CSSでダッシュボードを作成してください"
- "Jest テストでAPI エンドポイントの動作確認を実装してください"

### 型安全性の確保
- OpenAPI → Zod スキーマの一貫性
- フロントエンド・バックエンド間の型共有
- 実行時バリデーションの徹底

### パフォーマンス最適化
- lowdb アクセスパターンの最適化
- Express ミドルウェアの効率化
- フロントエンドバンドルサイズの最小化

---

この設定により、**「試作→動くものを素早く見せる」流れを最速で実現**し、技術検証から本格運用への段階的な移行が可能になります。