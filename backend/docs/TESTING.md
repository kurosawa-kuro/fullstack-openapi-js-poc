# テスト実行ガイド

このプロジェクトでは様々なテストコマンドが利用できます。

## 基本的なテストコマンド

### 通常のテスト実行（簡潔出力）
```bash
npm test
```
- 全テストを実行
- console.logや警告を非表示にして簡潔な結果のみ表示
- 失敗時の調査には最適

### 詳細なテスト実行（verboseモード）
```bash
npm run test:verbose
```
- 全テストを実行
- 詳細なログとエラー情報を表示
- テスト失敗時のデバッグに使用

### デバッグモード
```bash
npm run test:debug
```
- キャッシュを無効化してテスト実行
- 最も詳細な出力
- テスト環境の問題調査に使用

## カテゴリ別テスト実行

### ユニットテストのみ
```bash
npm run test:unit
```

### 統合テストのみ
```bash
npm run test:integration
```

### E2Eテストのみ
```bash
npm run test:e2e
```

### カバレッジレポート付きテスト
```bash
npm run test:coverage
```

## ウォッチモード

### ファイル変更時に自動実行
```bash
npm run test:watch
```

## テスト結果の見方

### 簡潔出力（npm test）
```
PASS test/unit/controllers/authController.test.js
PASS test/integration/openapi.test.js
PASS test/e2e/api.test.js
PASS test/unit/controllers/micropostController.test.js
PASS test/unit/controllers/userController.test.js

Test Suites: 5 passed, 5 total
Tests:       1 skipped, 61 passed, 62 total
Time:        3.497 s
```

### 詳細出力（npm run test:verbose）
- 各テストの詳細なログ
- エラーハンドリングのテスト時の意図的なエラーログ
- デバッグ情報とスタックトレース

## トラブルシューティング

### テスト失敗時の調査手順

1. **まず簡潔モードで実行**
   ```bash
   npm test
   ```

2. **失敗があれば詳細モードで調査**
   ```bash
   npm run test:verbose
   ```

3. **特定のテストファイルのみ実行**
   ```bash
   npm run test:unit -- --testPathPattern=micropostController
   ```

4. **環境問題が疑われる場合はデバッグモード**
   ```bash
   npm run test:debug
   ```

### 注意事項

- `test:verbose` モードでは、意図的なエラーテスト時に大量のエラーログが表示されますが、これは正常な動作です
- テスト中にデータベース（JSON）ファイルが変更されるのは正常な動作です
- 全テストが通過していれば、コンソールの警告は無視して問題ありません