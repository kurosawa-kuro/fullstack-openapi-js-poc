# fullstack-openapi-js-poc

OpenAPI駆動開発による高速プロトタイピング用の Node.js + Express + Vue.js フルスタック構成


## ✅  「OpenAPIドリブン・フルスタック開発」手順 

| ステップ | 項目                               | 内容                                               | 補足（AI活用ポイント）                    |
| ---- | -------------------------------- | ------------------------------------------------ | ------------------------------- |
| ①    | 🎯 **仕様定義**                      | 「どんな画面が必要か？」「何を一覧・投稿・編集したいか？」を言語化                | ChatGPTにUIモック、ユースケース記述を依頼       |
| ②    | 🧾 **OpenAPI設計**                 | `openapi.yaml` に GET/POST/PUT/DELETE 定義、schema記述 | Swagger Editor or GPT補助で生成      |
| ③    | 🧪 **Playwrightテスト作成**           | 最低1つ、「この画面でこのデータが表示されるべき」テストを書く                  | GPTに「この仕様でE2Eテストを書いて」と依頼可       |
| ④    | 🧩 **フロントUI作成（仮）**               | `PostList.vue` など最小の一覧・フォームをVite + Vueで作成        | Playwrightが通る見た目を優先。デザインは後回しでOK |
| ⑤    | 🔗 **mswでモックAPI実装**              | `msw/handlers.ts` にOpenAPIに基づいた仮レスポンスを定義         | OpenAPIからGPTで自動変換可能             |
| ⑥    | 🌐 **APIサービス層作成**                | `api/posts.ts` など、fetch/Axiosラッパーを型付きで用意         | `openapi-typescript-codegen`が便利 |
| ⑦    | ✅ **Playwrightテスト通過確認**          | mswで仮APIが返る状態で、Playwrightテストを実行 → 通るか確認          | 通れば**PoCとして成立**。ここまでで90%完成感あり   |
| ⑧    | 🧠 **Zodスキーマ定義**                 | OpenAPIのschemaをZodで再現し、サーバ側バリデーションへ備える           | `zod-openapi`やGPTで変換可           |
| ⑨    | 🔧 **バックエンド実装（openapi-backend）** | ルーティング・バリデーションをOpenAPIから機械的に生成し、SQLite連携も組み込む    | 実装というより構成（生成）作業                 |
| ⑩    | 🔁 **msw → 実API差し替え**            | mswを止め、`baseURL`をExpress APIに切り替える               | CORS対応などの最小調整で済む構成にする           |
| ⑪    | 🧪 **Playwright再実行（E2E本番）**      | 仮想 → 実APIに切り替えてもテストが通るか確認                        | → 通れば **実装完了・受け入れ基準クリア**        |
| ⑫    | 🧾 **ドキュメント最終整備**                | `openapi.yaml` + Playwrightの仕様コード = 完全ドキュメント     | READMEやSwagger UIで可視化可能         |

---

## ✅ ポイント

* **どのフェーズでもテスト（Playwright）がガイド役**になる
* \*\*OpenAPIがすべての源泉（UI・API・DB・テスト）\*\*になる
* 一人でやってもブレず、AI補助込みで**一貫性・再現性・拡張性が高い**

---

## 🎯 理想構成：プロジェクト構造イメージ

```
project-root/
├── openapi.yaml
├── frontend/
│   ├── components/       # PostList.vue, PostForm.vue
│   ├── api/              # posts.ts (axios or fetch)
│   ├── mocks/            # msw handlers
│   └── tests/            # Playwright E2E
├── backend/
│   ├── openapi/          # openapi-backend setup
│   ├── routes/
│   └── db/               # SQLite or Prisma
```

---

## ✅ 結論

この流れに従えば：

* 🧠 **最小設計・最小構築でPoCを完成させつつ**、
* 💼 **エンタープライズでもそのまま拡張可能な土台**が手に入ります。



## 🎯 プロジェクト概要

このプロジェクトは、**OpenAPI 3.0 駆動開発**による高速プロトタイピングを実現するフルスタック構成です。
- バックエンド: **Express 5.x** + **lowdb** (JSONファイルDB)
- フロントエンド: **Vue 3** + **Vite** (最小限構成)
- 共通仕様: **OpenAPI 3.0** + **Zod** バリデーション
- 認証: **JWT** + **bcrypt** による認証システム

## 🚀 主な特徴

### ✅ 高速プロトタイピング
- ファイルベースJSON Database (lowdb) による迅速なデータ管理
- PostgreSQL移行対応の リポジトリパターン設計
- Express 5.x互換の最新アーキテクチャ

### ✅ OpenAPI駆動開発
- YAML仕様からの自動ルーティング・バリデーション
- Swagger UI による即座のAPI確認
- Zod による型安全なスキーマ管理

### ✅ 完全な認証システム
- JWT アクセストークン + リフレッシュトークン
- パスワードリセット機能
- bcrypt による安全なパスワードハッシュ化
- トークンブラックリスト機能

### ✅ 企業レベル品質管理
- 包括的なテストスイート (Jest + Supertest)
- セキュリティ対策 (Helmet, CORS, Rate Limiting)
- 構造化エラーハンドリング

## 🛠 技術スタック

### バックエンド（必須度順）
1. **Express 5.x** - 最新Web フレームワーク
2. **Zod** - 型安全スキーマバリデーション
3. **dotenv** - 環境変数管理
4. **CORS** - クロスオリジン対応
5. **openapi-backend** - OpenAPI 3.0 駆動ルーティング
6. **lowdb 7.x** - ファイルベースJSON Database (プロトタイピング用)
7. **JWT** - ステートレス認証
8. **bcrypt** - パスワードハッシュ化
9. **Helmet** - セキュリティヘッダー
10. **morgan** - HTTPリクエストログ
11. **express-rate-limit** - API Rate Limiting
12. **Jest + Supertest** - 統合テスト

### フロントエンド（必須度順）
1. **Vue 3** - リアクティブUI フレームワーク
2. **Vite** - 高速ビルドツール
3. **Vue Router** - SPA ルーティング
4. **Pinia** - 状態管理ライブラリ
5. **Tailwind CSS** - ユーティリティファーストCSS フレームワーク
6. **Playwright** - E2E テスト自動化ツール

### 共通・開発ツール（必須度順）
1. **OpenAPI 3.0** - API仕様定義
2. **Swagger UI** - API ドキュメント自動生成
3. **cross-env** - クロスプラットフォーム環境変数
4. **concurrently** - 複数プロセス同時実行
5. **husky** - Git フック管理
6. **lint-staged** - コミット前の自動整形
7. **commitizen** - コミットメッセージ規約

## 📁 プロジェクト構造

```
fullstack-openapi-js-poc/
├── backend/                    # Express APIサーバー
│   ├── src/
│   │   ├── controllers/        # APIコントローラー
│   │   ├── services/          # ビジネスロジック
│   │   ├── repositories/      # データアクセス層
│   │   ├── middlewares/       # カスタムミドルウェア
│   │   ├── routes/           # ルーティング定義
│   │   ├── utils/            # ユーティリティ関数
│   │   └── config/           # アプリケーション設定
│   ├── test/                 # テストスイート
│   │   ├── unit/            # ユニットテスト
│   │   ├── integration/     # 統合テスト
│   │   └── e2e/            # E2Eテスト
│   └── db/                  # LowDB データファイル
├── frontend/                 # Vue.js SPA
│   ├── src/
│   │   ├── components/      # Vueコンポーネント
│   │   ├── views/          # ページコンポーネント
│   │   ├── router/         # ルーティング設定
│   │   └── assets/         # 静的リソース
│   └── template-admin/      # 管理画面テンプレート
├── shared/                  # 共通リソース
│   ├── openapi/            # OpenAPI仕様
│   └── schemas/            # Zodスキーマ
└── docs/                   # ドキュメント
```

## 🔧 セットアップ & 実行

### 前提条件
- Node.js 18.x 以上
- npm 9.x 以上

### 1. バックエンドセットアップ

```bash
cd backend

# 依存関係のインストール + DB初期化
npm run setup

# 開発サーバー起動 (ポート8000)
npm run dev
```

### 2. フロントエンドセットアップ

```bash
cd frontend

# 依存関係のインストール
npm install

# 開発サーバー起動
npm run dev
```

### 3. API確認

- **Swagger UI**: http://localhost:8000/api-docs
- **API Base URL**: http://localhost:8000/api
- **ヘルスチェック**: http://localhost:8000/health

## 🧪 テスト実行

```bash
cd backend

# 全テスト実行
npm test

# ウォッチモード
npm run test:watch

# カバレッジレポート
npm run test:coverage

# 特定のテストタイプのみ
npm run test:unit        # ユニットテスト
npm run test:integration # 統合テスト
npm run test:e2e        # E2Eテスト
```

## 📊 主要API エンドポイント

### 認証
- `POST /api/auth/register` - ユーザー登録
- `POST /api/auth/login` - ログイン
- `POST /api/auth/logout` - ログアウト
- `GET /api/auth/me` - 現在のユーザー情報
- `PUT /api/auth/password` - パスワード変更
- `POST /api/auth/forgot-password` - パスワードリセット要求
- `POST /api/auth/reset-password` - パスワードリセット実行
- `POST /api/auth/refresh` - トークンリフレッシュ

### ユーザー管理
- `GET /api/users` - ユーザー一覧 (ページネーション対応)
- `GET /api/users/:id` - ユーザー詳細

### マイクロポスト
- `GET /api/microposts` - 全投稿一覧
- `GET /api/microposts/:id` - 投稿詳細
- `GET /api/users/:id/microposts` - 特定ユーザーの投稿一覧
- `POST /api/users/:id/microposts` - 新規投稿作成

## 🔐 セキュリティ機能

### 実装済み
- JWT による認証・認可
- パスワードの bcrypt ハッシュ化
- Rate Limiting (API保護)
- CORS設定
- Helmet による セキュリティヘッダー
- 入力値検証 (Zod)
- トークンブラックリスト

### 本番環境での追加対応
- HTTPS通信の強制
- より厳格なCSP設定
- 監査ログの実装
- 2FA対応

## 📈 開発・運用

### 開発コマンド

```bash
# バックエンド
cd backend
npm run dev          # 開発サーバー
npm run start        # プロダクションモード
npm run db:seed      # DBシードデータ挿入
npm run test:debug   # デバッグモードテスト

# フロントエンド
cd frontend
npm run dev          # 開発サーバー
npm run build        # プロダクションビルド
npm run preview      # ビルドプレビュー
```

### デプロイ準備

#### 1. データベース移行
- lowdb → PostgreSQL/MongoDB
- リポジトリパターンにより最小限の変更で対応可能

#### 2. 本番環境設定
- 環境変数の設定
- セキュリティ設定の強化
- ログ設定の追加
- モニタリングシステム導入

## 🎯 開発方針

### 1. 段階的移行対応
- プロトタイピング段階: lowdb + Express
- 本番移行段階: PostgreSQL + スケーラブル構成

### 2. 品質保証
- 型安全性の確保 (Zod)
- 包括的テストカバレッジ
- セキュリティベストプラクティス

### 3. 開発効率
- OpenAPI駆動開発
- 自動生成ドキュメント
- 迅速なプロトタイピング

## 🚧 今後の拡張予定

- [ ] WebSocket リアルタイム通信
- [ ] ファイルアップロード機能
- [ ] 管理者画面の実装
- [ ] Redis セッション管理
- [ ] Docker化
- [ ] CI/CD パイプライン
- [ ] API レスポンス キャッシュ
- [ ] 通知システム

## 🤝 コントリビューション

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチをプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📄 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) ファイルを参照してください。

## 🙋 サポート

- 技術的な質問: [Issues](https://github.com/your-username/fullstack-openapi-js-poc/issues)
- 機能要求: [Feature Requests](https://github.com/your-username/fullstack-openapi-js-poc/issues)
- ドキュメント: [Wiki](https://github.com/your-username/fullstack-openapi-js-poc/wiki)

---

**このプロジェクトで、OpenAPI駆動開発による高速プロトタイピングを体験してください！**
