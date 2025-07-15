#!/bin/bash

# Express API Starter Kit Setup Script
# このスクリプトは開発環境のセットアップを自動化します

set -e # エラー時に停止

echo "🚀 Express API Starter Kit Setup"
echo "================================="

# プロジェクトルートディレクトリに移動
cd "$(dirname "$0")/.."

# Node.js バージョンチェック
echo "📋 Checking Node.js version..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18 or higher is required. Current version: $(node --version)"
    exit 1
fi
echo "✅ Node.js version: $(node --version)"

# .env ファイルの作成
echo "📝 Creating .env file..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ .env file created from .env.example"
else
    echo "⚠️  .env file already exists, skipping creation"
fi

# JWT_SECRET の生成
echo "🔐 Generating JWT secret..."
if ! grep -q "JWT_SECRET=" .env || grep -q "JWT_SECRET=$" .env; then
    # OpenSSL がインストールされているかチェック
    if command -v openssl &> /dev/null; then
        JWT_SECRET=$(openssl rand -base64 32)
    else
        # OpenSSL がない場合のフォールバック
        JWT_SECRET=$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 32)
    fi
    
    # JWT_SECRET を .env に追加または更新
    if grep -q "JWT_SECRET=" .env; then
        sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
    else
        echo "JWT_SECRET=$JWT_SECRET" >> .env
    fi
    echo "✅ JWT secret generated and added to .env"
else
    echo "✅ JWT secret already exists in .env"
fi

# 依存関係のインストール
echo "📦 Installing dependencies..."
if [ -f package-lock.json ]; then
    npm ci
else
    npm install
fi
echo "✅ Dependencies installed"

# データベースディレクトリの作成
echo "🗄️  Setting up database..."
mkdir -p db

# データベースの初期化（シードスクリプトが存在する場合）
if [ -f db/seed.js ]; then
    echo "🌱 Running database seed..."
    node db/seed.js
    echo "✅ Database seeded"
else
    echo "⚠️  No seed script found, skipping database seeding"
fi

# テストディレクトリの作成
echo "🧪 Setting up test environment..."
mkdir -p test/fixtures
echo "✅ Test directories created"

# ログディレクトリの作成
echo "📄 Setting up logs directory..."
mkdir -p logs
echo "✅ Logs directory created"

# 実行権限の確認
echo "🔧 Checking file permissions..."
chmod +x script/setup.sh
echo "✅ File permissions set"

echo ""
echo "🎉 Setup completed successfully!"
echo "================================="
echo ""
echo "Next steps:"
echo "  1. Review and update .env file if needed"
echo "  2. Start development server: npm run dev"
echo "  3. Run tests: npm test"
echo "  4. View API documentation: http://localhost:8000/api-docs"
echo ""
echo "Happy coding! 🚀"