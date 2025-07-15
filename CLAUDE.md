# CLAUDE.md

このファイルは、このリポジトリでコードを扱う際のClaude Code (claude.ai/code)へのガイダンスを提供します。

## コマンド

### バックエンド開発
```bash
cd backend

# セットアップ（依存関係のインストール + DBの初期化）
npm run setup

# 開発
npm run dev          # ポート3000でホットリロード起動
npm run start        # プロダクションモード

# テスト
npm run test         # 全テスト実行（カバレッジ40.15%、目標: 80%以上）
npm run test:watch   # ウォッチモード
npm run test:unit    # ユニットテストのみ
npm run test:int     # 統合テストのみ
npm run test:coverage # カバレッジレポート生成

# コード品質
npm run lint         # ESLintチェック
npm run lint:fix     # リンティング問題の自動修正
npm run format       # Prettierフォーマット
npm run format:check # フォーマットチェック

# APIドキュメント
npm run swagger:serve # Swagger UI（http://localhost:3001）
```

### フロントエンド開発
```bash
cd frontend

# 開発
npm install
npm run dev          # Vite開発サーバー

# ビルド
npm run build        # プロダクションビルド
npm run preview      # プロダクションビルドのプレビュー
```

## アーキテクチャ概要

### プロジェクト構造
```
fullstack-openapi-js-poc/
├── backend/          # Express 5.x APIサーバー
│   ├── src/
│   │   ├── controllers/  # ルートハンドラー
│   │   ├── services/     # ビジネスロジック
│   │   ├── repositories/ # データアクセス層
│   │   ├── models/       # Zodスキーマ＆バリデーション
│   │   ├── middleware/   # 認証、エラーハンドリング、バリデーション
│   │   └── utils/        # ヘルパー（JWT、bcryptなど）
│   └── data/            # LowDB JSONデータベースファイル
├── frontend/         # Vue 3 SPA
│   └── src/
│       ├── views/    # ページコンポーネント
│       ├── layouts/  # レイアウトコンポーネント
│       └── router/   # Vue Router設定
└── shared/          # OpenAPI仕様（バックエンド↔フロントエンド契約）
```

### 主要な設計パターン
1. **APIファースト開発**: OpenAPI仕様がバックエンドとフロントエンドの両方を駆動
2. **レイヤードアーキテクチャ**: コントローラー → サービス → リポジトリ
3. **リポジトリパターン**: データベース操作の抽象化（lowdbからPostgreSQLへの移行が容易）
4. **JWT認証**: アクセス/リフレッシュトークンによるステートレス認証
5. **バリデーション**: リクエスト/レスポンスバリデーションのためのZodスキーマ

### データベース
現在、高速プロトタイピングのために**lowdb**（ファイルベースのJSONデータベース）を使用:
- データは`backend/data/*.json`に保存
- リポジトリパターンによりPostgreSQLへの移行が容易
- コレクション: users、products、orders

### APIエンドポイント
すべてのエンドポイントは`/api`プレフィックス付き:
- `POST /api/auth/register` - ユーザー登録
- `POST /api/auth/login` - ログイン（JWTトークンを返す）
- `POST /api/auth/refresh` - アクセストークンの更新
- `GET /api/users` - ユーザー一覧（管理者のみ）
- `GET /api/products` - 商品一覧
- `POST /api/products` - 商品作成（管理者のみ）
- `GET /api/orders` - ユーザーの注文
- `POST /api/orders` - 注文作成

### 認証フロー
1. ユーザーログイン → アクセストークン（15分）＋リフレッシュトークン（7日）を受信
2. アクセストークンを`Authorization: Bearer <token>`として送信
3. 期限切れ時にリフレッシュトークンで新しいアクセストークンを取得
4. パスワードはbcryptでハッシュ化（10ラウンド）

## 既知の問題と制限事項

1. **Express 5.x互換性**: Express 5互換性問題のため、OpenAPIバックエンドは現在無効化
2. **テストカバレッジ**: 現在40.15%（目標: 80%以上）。特に低いカバレッジ:
   - 認証ミドルウェア: 13.08%
   - エラーミドルウェア: 20%
   - より多くの統合テストが必要
3. **データベース**: ファイルベースJSON使用（本番環境には不適切）
4. **フロントエンド**: 最小限の実装、API統合が必要

## 開発のヒント

### テストの実行
```bash
# 特定のテストファイルを実行
npm test -- auth.test.js

# パターンに一致するテストを実行
npm test -- --testNamePattern="should create user"

# テストのデバッグ
npm test -- --verbose
```

### データベース操作
- DBファイルは`backend/data/`内
- DBリセット: JSONファイルを削除して`npm run setup`を実行
- バックアップ: `backend/data/`ディレクトリをコピー

### APIテスト
1. バックエンド起動: `cd backend && npm run dev`
2. Swagger UIアクセス: http://localhost:3001
3. Swaggerの「Try it out」でエンドポイントをテスト
4. JWTトークンは15分で期限切れ（開発環境）

### 一般的なタスク
- **新しいエンドポイントの追加**: OpenAPI仕様を更新 → コントローラー → サービス → リポジトリを実装
- **バリデーションの追加**: `models/`にZodスキーマを作成 → ミドルウェアで使用
- **リンティングの修正**: コミット前に`npm run lint:fix`を実行
- **カバレッジの確認**: `npm run test:coverage` → `coverage/index.html`を開く

## セキュリティに関する考慮事項
- JWT秘密鍵は`.env`内（絶対にコミットしない！）
- レート制限有効（100リクエスト/15分）
- セキュリティヘッダーのためのHelmet.js
- CORSはlocalhostのみに設定
- Zodによる入力検証
- SQLインジェクション不可（JSON DB使用）

## パフォーマンスに関する注意事項
- LowDBは全データベースをメモリにロード
- ページネーション未実装
- 各リクエストでJWT検証
- 本番環境ではキャッシングを検討

## デプロイ準備
1. lowdbをPostgreSQL/MongoDBに置き換え
2. 環境ベースの設定を追加
3. 適切なロギングの実装（Winston/Pino）
4. モニタリング/APMの追加
5. 本番環境のCORS設定
6. リクエストIDトラッキングの追加
7. グレースフルシャットダウンの実装

## 将来のロードマップ（TODO.mdより）
- OpenAPI統合の完了
- テストカバレッジを80%以上に増加
- WebSocketサポートの追加
- キャッシング層の実装
- CI/CDパイプラインの追加
- フロントエンドAPI統合の完了
- ユーザーロール/権限の追加
- ページネーションの実装
- ファイルアップロードサポートの追加
- Dockerセットアップの作成