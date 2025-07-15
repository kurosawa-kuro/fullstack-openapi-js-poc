新しいAPIエンドポイントを完全実装してください：

引数: $ARGUMENTS (例: "POST /users" または "GET /products/:id")

以下を含む完全な実装を生成：
1. ../shared/openapi/api.yaml への仕様追加
2. src/schemas/ に対応するZodスキーマ作成
3. src/controllers/ にビジネスロジック実装
4. src/routes/ にExpress ルーター追加
5. lowdb データ操作（CRUD）
6. express-async-errors 対応のエラーハンドリング
7. test/ にSupertest テストケース
8. Swagger UI での動作確認可能な状態

実装パターン:
- RESTful API 設計準拠
- OpenAPI 3.x 仕様完全対応
- Zod バリデーション統合
- 適切なHTTPステータスコード