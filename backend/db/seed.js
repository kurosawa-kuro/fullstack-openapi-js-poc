#!/usr/bin/env node

/**
 * Database Seed Script
 * 開発環境用の初期データを生成します
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// データベースファイルパス
const dbPath = path.join(__dirname, 'db.json');

// 初期データ
const seedData = {
  users: [
    {
      id: 1,
      name: "Alice Johnson",
      email: "alice@example.com",
      bio: "Software engineer with a passion for API development",
      location: "Tokyo",
      website: "https://alice.dev",
      roles: ["user"],
      createdAt: "2024-01-15T10:00:00Z",
      updatedAt: "2024-01-15T10:00:00Z",
      passwordHash: null // 後で生成
    },
    {
      id: 2,
      name: "Bob Smith",
      email: "bob@example.com",
      bio: "Full-stack developer and tech enthusiast",
      location: "Osaka",
      website: "https://bobsmith.blog",
      roles: ["user", "readonly-admin"],
      createdAt: "2024-01-16T14:30:00Z",
      updatedAt: "2024-01-16T14:30:00Z",
      passwordHash: null // 後で生成
    },
    {
      id: 3,
      name: "Charlie Brown",
      email: "charlie@example.com",
      bio: "DevOps engineer and cloud architect",
      location: "Kyoto",
      website: "https://charlie.cloud",
      roles: ["user", "admin"],
      createdAt: "2024-01-17T09:15:00Z",
      updatedAt: "2024-01-17T09:15:00Z",
      passwordHash: null // 後で生成
    }
  ],
  microposts: [
    {
      id: 1,
      userId: 1,
      content: "Welcome to our API! This is my first micropost.",
      createdAt: "2024-01-15T11:00:00Z"
    },
    {
      id: 2,
      userId: 1,
      content: "Building APIs with Express is really enjoyable!",
      createdAt: "2024-01-15T12:00:00Z"
    },
    {
      id: 3,
      userId: 2,
      content: "Just deployed a new feature using OpenAPI specifications.",
      createdAt: "2024-01-16T15:00:00Z"
    },
    {
      id: 4,
      userId: 3,
      content: "DevOps practices make development so much smoother.",
      createdAt: "2024-01-17T10:00:00Z"
    },
    {
      id: 5,
      userId: 2,
      content: "TypeScript + Express = Developer happiness",
      createdAt: "2024-01-18T14:30:00Z"
    }
  ],
  passwordResetTokens: []
};

async function generatePasswordHashes() {
  const saltRounds = 12;
  const defaultPassword = 'password123'; // 開発環境用デフォルトパスワード
  
  console.log('🔐 Generating password hashes...');
  
  for (const user of seedData.users) {
    user.passwordHash = await bcrypt.hash(defaultPassword, saltRounds);
  }
  
  console.log(`✅ Generated password hashes for ${seedData.users.length} users`);
  console.log(`📝 Default password for all users: ${defaultPassword}`);
}

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');
    console.log('================================');
    
    // パスワードハッシュ生成
    await generatePasswordHashes();
    
    // 既存のファイルをバックアップ
    if (fs.existsSync(dbPath)) {
      const backupPath = `${dbPath}.backup.${Date.now()}`;
      fs.copyFileSync(dbPath, backupPath);
      console.log(`📋 Existing database backed up to: ${path.basename(backupPath)}`);
    }
    
    // 新しいデータを書き込み
    fs.writeFileSync(dbPath, JSON.stringify(seedData, null, 2));
    console.log(`💾 Database seeded successfully: ${path.basename(dbPath)}`);
    
    console.log('');
    console.log('📊 Seeded data summary:');
    console.log(`   - Users: ${seedData.users.length}`);
    console.log(`   - Microposts: ${seedData.microposts.length}`);
    console.log(`   - Password reset tokens: ${seedData.passwordResetTokens.length}`);
    
    console.log('');
    console.log('👥 Test user accounts:');
    seedData.users.forEach(user => {
      console.log(`   - ${user.email} (${user.roles.join(', ')})`);
    });
    
    console.log('');
    console.log('🔑 Login credentials:');
    console.log('   Email: alice@example.com');
    console.log('   Password: password123');
    console.log('');
    console.log('✅ Database seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
    process.exit(1);
  }
}

// オプション解析
const args = process.argv.slice(2);
const isForce = args.includes('--force') || args.includes('-f');
const isQuiet = args.includes('--quiet') || args.includes('-q');

// ヘルプ表示
if (args.includes('--help') || args.includes('-h')) {
  console.log('Database Seed Script');
  console.log('');
  console.log('Usage: node db/seed.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  -f, --force    Force overwrite existing database');
  console.log('  -q, --quiet    Suppress output messages');
  console.log('  -h, --help     Show this help message');
  console.log('');
  process.exit(0);
}

// 既存データ確認
if (!isForce && fs.existsSync(dbPath)) {
  try {
    const existingData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    if (existingData.users && existingData.users.length > 0) {
      console.log('⚠️  Database already contains data.');
      console.log('   Use --force to overwrite or delete db.json manually.');
      console.log('   Run with --help for more options.');
      process.exit(0);
    }
  } catch (error) {
    // JSON parse error - ファイルが壊れている可能性があるので続行
  }
}

// シード実行
if (!isQuiet) {
  seedDatabase();
} else {
  seedDatabase().then(() => {
    console.log('Database seeded successfully.');
  });
}