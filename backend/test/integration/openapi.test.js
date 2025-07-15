// OpenAPI Backend Integration Tests
import request from 'supertest';
import app from '../../src/app.js';
import { OpenAPIBackend } from 'openapi-backend';
import YAML from 'yamljs';
import path from 'path';
import { fileURLToPath } from 'url';
import addFormats from 'ajv-formats';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load OpenAPI specification
const apiDefinition = YAML.load(path.resolve(__dirname, '../../../shared/openapi/api.yaml'));

describe('OpenAPI Integration Tests', () => {
  let api;

  beforeAll(() => {
    // Create OpenAPI backend instance for validation
    api = new OpenAPIBackend({
      definition: apiDefinition,
      validate: true,
      customizeAjv: (ajv) => {
        addFormats(ajv);
        return ajv;
      }
    });
    api.init();
  });

  describe('Users API (OpenAPI-driven)', () => {
    it('GET /api/v1/users should return paginated users', async () => {
      const res = await request(app).get('/api/v1/users');
      expect(res.status).toBe(200);
      
      // Check OpenAPI response format
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      
      // Check pagination structure
      expect(res.body.pagination).toHaveProperty('page');
      expect(res.body.pagination).toHaveProperty('limit');
      expect(res.body.pagination).toHaveProperty('total');
      expect(res.body.pagination).toHaveProperty('totalPages');
      
      // Check user structure according to OpenAPI
      expect(res.body.data[0]).toHaveProperty('id');
      expect(res.body.data[0]).toHaveProperty('name');
      expect(res.body.data[0]).toHaveProperty('email');
      expect(res.body.data[0]).toHaveProperty('createdAt');
      expect(res.body.data[0]).toHaveProperty('micropostCount');
    });

    it('should follow OpenAPI User schema validation', async () => {
      const res = await request(app).get('/api/v1/users');
      
      res.body.data.forEach(user => {
        expect(typeof user.id).toBe('number');
        expect(typeof user.name).toBe('string');
        expect(typeof user.email).toBe('string');
        expect(typeof user.createdAt).toBe('string');
        expect(typeof user.micropostCount).toBe('number');
        
        // Validate email format
        expect(user.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
        
        // Validate optional fields if present
        if (user.bio !== undefined) {
          expect(typeof user.bio).toBe('string');
        }
        if (user.location !== undefined) {
          expect(typeof user.location).toBe('string');
        }
        if (user.website !== undefined) {
          expect(typeof user.website).toBe('string');
        }
      });
    });

    it('GET /api/v1/users/:userId should return user detail', async () => {
      const res = await request(app).get('/api/v1/users/1');
      expect(res.status).toBe(200);
      
      // Check OpenAPI UserDetailResponse format
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('id', 1);
      expect(res.body.data).toHaveProperty('name');
      expect(res.body.data).toHaveProperty('email');
      expect(res.body.data).toHaveProperty('createdAt');
      expect(res.body.data).toHaveProperty('micropostCount');
      expect(res.body.data).toHaveProperty('recentMicroposts');
      
      // Recent microposts should be array with max 5 items
      expect(Array.isArray(res.body.data.recentMicroposts)).toBe(true);
      expect(res.body.data.recentMicroposts.length).toBeLessThanOrEqual(5);
    });

    it('should support pagination parameters', async () => {
      const res = await request(app).get('/api/v1/users?page=1&limit=2');
      expect(res.status).toBe(200);
      
      expect(res.body.data.length).toBeLessThanOrEqual(2);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(2);
    });

    it('should support search functionality', async () => {
      const res = await request(app).get('/api/v1/users?search=alice');
      expect(res.status).toBe(200);
      
      // If results exist, they should match search term
      if (res.body.data.length > 0) {
        res.body.data.forEach(user => {
          expect(
            user.name.toLowerCase().includes('alice') ||
            user.email.toLowerCase().includes('alice')
          ).toBe(true);
        });
      }
    });
  });

  describe('Microposts API (OpenAPI-driven)', () => {
    const userId = 1;

    it('GET /api/v1/users/:userId/microposts should return user microposts', async () => {
      const res = await request(app).get(`/api/v1/users/${userId}/microposts`);
      expect(res.status).toBe(200);
      
      // Check OpenAPI MicropostListResponse format
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
      expect(res.body).toHaveProperty('meta');
      expect(Array.isArray(res.body.data)).toBe(true);
      
      // Check meta information
      expect(res.body.meta).toHaveProperty('userId', userId);
      expect(res.body.meta).toHaveProperty('userName');
      
      // Check micropost structure according to OpenAPI
      if (res.body.data.length > 0) {
        expect(res.body.data[0]).toHaveProperty('id');
        expect(res.body.data[0]).toHaveProperty('userId', userId);
        expect(res.body.data[0]).toHaveProperty('content');
        expect(res.body.data[0]).toHaveProperty('contentLength');
        expect(res.body.data[0]).toHaveProperty('createdAt');
        expect(res.body.data[0]).toHaveProperty('user');
        
        // Check user summary structure
        expect(res.body.data[0].user).toHaveProperty('id');
        expect(res.body.data[0].user).toHaveProperty('name');
        expect(res.body.data[0].user).toHaveProperty('email');
      }
    });

    it('POST /api/v1/users/:userId/microposts should create micropost', async () => {
      const newPost = {
        content: 'Test micropost content for OpenAPI validation'
      };
      
      const res = await request(app)
        .post(`/api/v1/users/${userId}/microposts`)
        .send(newPost)
        .set('Accept', 'application/json');
      
      expect(res.status).toBe(201);
      
      // Check OpenAPI MicropostResponse format
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data).toHaveProperty('userId', userId);
      expect(res.body.data).toHaveProperty('content', newPost.content);
      expect(res.body.data).toHaveProperty('contentLength', newPost.content.length);
      expect(res.body.data).toHaveProperty('createdAt');
      expect(res.body.data).toHaveProperty('user');
    });

    it('POST /api/v1/users/:userId/microposts should validate content', async () => {
      const invalidPost = {
        content: ''  // Empty content should fail
      };
      
      const res = await request(app)
        .post(`/api/v1/users/${userId}/microposts`)
        .send(invalidPost)
        .set('Accept', 'application/json');
      
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('GET /api/v1/microposts should return all microposts', async () => {
      const res = await request(app).get('/api/v1/microposts');
      expect(res.status).toBe(200);
      
      // Check OpenAPI MicropostListResponse format
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.data)).toBe(true);
      
      // Check micropost structure
      if (res.body.data.length > 0) {
        expect(res.body.data[0]).toHaveProperty('id');
        expect(res.body.data[0]).toHaveProperty('userId');
        expect(res.body.data[0]).toHaveProperty('content');
        expect(res.body.data[0]).toHaveProperty('contentLength');
        expect(res.body.data[0]).toHaveProperty('createdAt');
        expect(res.body.data[0]).toHaveProperty('user');
      }
    });

    it('GET /api/v1/microposts/:micropostId should return micropost detail', async () => {
      const res = await request(app).get('/api/v1/microposts/1');
      expect(res.status).toBe(200);
      
      // Check OpenAPI MicropostResponse format
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('id', 1);
      expect(res.body.data).toHaveProperty('userId');
      expect(res.body.data).toHaveProperty('content');
      expect(res.body.data).toHaveProperty('contentLength');
      expect(res.body.data).toHaveProperty('createdAt');
      expect(res.body.data).toHaveProperty('user');
    });

    it('should return 404 for non-existent endpoints', async () => {
      const res = await request(app).get('/api/v1/nonexistent');
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });
  });
});