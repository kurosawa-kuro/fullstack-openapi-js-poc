import { beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Global test setup
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.PORT = '3001';
  
  // Use unique database file for each test worker to prevent conflicts
  const workerId = process.env.JEST_WORKER_ID || '0';
  process.env.DB_PATH = `./test/db/test-${workerId}.json`;
  
  // JWT configuration for tests
  process.env.JWT_SECRET = 'test-super-secure-32-character-secret-key-for-testing-12345678';
  process.env.JWT_EXPIRES_IN = '3600';
  process.env.JWT_REFRESH_EXPIRES_IN = '604800';
  
  // Password configuration
  process.env.BCRYPT_ROUNDS = '4'; // Lower rounds for faster tests
  
  // Email configuration (mock)
  process.env.FROM_EMAIL = 'test@example.com';
  
  // Rate limiting (relaxed for tests)
  process.env.RATE_LIMIT_WINDOW_MS = '60000';
  process.env.RATE_LIMIT_MAX_REQUESTS = '1000';
  process.env.AUTH_RATE_LIMIT_WINDOW_MS = '60000';
  process.env.AUTH_RATE_LIMIT_MAX_REQUESTS = '100';
  
  // API Configuration
  process.env.API_BASE_PATH = '/api/v1';
  process.env.SWAGGER_PATH = '/api-docs';
  
  // Initialize test database with fixture data
  await initializeTestDatabase();
  
  if (process.env.TEST_VERBOSE === 'true') {
    console.log('Setting up test environment...');
  }
});

afterAll(async () => {
  // Clean up test environment
  if (process.env.TEST_VERBOSE === 'true') {
    console.log('Cleaning up test environment...');
  }
});

beforeEach(async () => {
  // Reset test data before each test
  // Add delay to prevent race conditions in parallel test execution
  await new Promise(resolve => setTimeout(resolve, 50));
  await initializeTestDatabase();
});

afterEach(async () => {
  // Clean up after each test
  // This would clean up any test artifacts
});

// Global test configuration
export const testConfig = {
  timeout: 10000,
  retries: 2,
  verbose: true
};

// Mock console methods in test environment for cleaner output
if (process.env.NODE_ENV === 'test' && process.env.TEST_SILENT !== 'false') {
  // Only mock console if jest is available and we want silent tests
  if (typeof jest !== 'undefined') {
    // Keep original console methods for test output
    const originalConsole = { ...console };
    
    global.console = {
      ...console,
      // Mock application logs but keep test framework logs
      log: process.env.TEST_VERBOSE === 'true' ? originalConsole.log : jest.fn(),
      error: process.env.TEST_VERBOSE === 'true' ? originalConsole.error : jest.fn(),
      warn: process.env.TEST_VERBOSE === 'true' ? originalConsole.warn : jest.fn(),
      info: process.env.TEST_VERBOSE === 'true' ? originalConsole.info : jest.fn(),
      debug: jest.fn() // Always mock debug logs
    };
  }
}

// Initialize test database with fixture data
async function initializeTestDatabase() {
  try {
    const workerId = process.env.JEST_WORKER_ID || '0';
    const testDbPath = path.resolve(__dirname, `../db/test-${workerId}.json`);
    const usersFixturePath = path.resolve(__dirname, '../fixtures/users.json');
    const micropostsFixturePath = path.resolve(__dirname, '../fixtures/microposts.json');
    
    // Load fixture data
    const users = JSON.parse(await fs.readFile(usersFixturePath, 'utf8'));
    const microposts = JSON.parse(await fs.readFile(micropostsFixturePath, 'utf8'));
    
    // Add required fields to users for testing
    const enhancedUsers = users.map(user => ({
      ...user,
      bio: "Test user bio",
      location: "Test location",
      website: "https://test.example.com",
      roles: ["user"],
      updatedAt: user.createdAt,
      passwordHash: "$2b$04$test.hash.for.testing.purposes.only" // Low bcrypt rounds for testing
    }));
    
    // Create test database structure
    const testData = {
      users: enhancedUsers,
      microposts: microposts,
      passwordResetTokens: [],
      refreshTokens: [],
      tokenBlacklist: []
    };
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(testDbPath), { recursive: true });
    
    // Write test data to test database atomically
    const tempPath = `${testDbPath}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(testData, null, 2));
    await fs.rename(tempPath, testDbPath);
    
    // Force repository instances to reinitialize with new database path
    try {
      const { reinitializeRepository: reinitializeMicropost } = await import('../../src/services/micropostService.js');
      const { reinitializeRepository: reinitializeUser } = await import('../../src/services/userService.js');
      
      await reinitializeMicropost();
      await reinitializeUser();
    } catch (error) {
      // Ignore errors if repositories don't support reinitialize yet
      if (process.env.TEST_VERBOSE === 'true') {
        console.log('Warning: Could not reinitialize repositories:', error.message);
      }
    }
    
    if (process.env.TEST_VERBOSE === 'true') {
      console.log(`Test database initialized with ${users.length} users and ${microposts.length} microposts`);
    }
  } catch (error) {
    console.error('Failed to initialize test database:', error);
    throw error;
  }
}