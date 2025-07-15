import request from 'supertest';
import app from '../../../src/app.js';

describe('Micropost Controller', () => {
  const userId = 1;

  describe('GET /api/v1/users/:userId/microposts', () => {
    it('should return user microposts with pagination', async () => {
      const response = await request(app)
        .get(`/api/v1/users/${userId}/microposts`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Check pagination structure
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('totalPages');
      
      // Check meta structure
      expect(response.body.meta).toHaveProperty('userId', userId);
      expect(response.body.meta).toHaveProperty('userName');
      
      response.body.data.forEach(micropost => {
        expect(micropost).toHaveProperty('id');
        expect(micropost).toHaveProperty('userId', userId);
        expect(micropost).toHaveProperty('content');
        expect(micropost).toHaveProperty('contentLength');
        expect(micropost).toHaveProperty('createdAt');
        expect(micropost).toHaveProperty('user');
        
        // Check user structure
        expect(micropost.user).toHaveProperty('id');
        expect(micropost.user).toHaveProperty('name');
        expect(micropost.user).toHaveProperty('email');
        
        // Check content length matches content
        expect(micropost.contentLength).toBe(micropost.content.length);
      });
    });

    it('should support pagination parameters', async () => {
      const response = await request(app)
        .get(`/api/v1/users/${userId}/microposts?page=1&limit=1`)
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(1);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(1);
    });

    it('should support date filtering', async () => {
      const since = '2024-01-01T00:00:00Z';
      const response = await request(app)
        .get(`/api/v1/users/${userId}/microposts?since=${since}`)
        .expect(200);

      response.body.data.forEach(micropost => {
        expect(new Date(micropost.createdAt).getTime()).toBeGreaterThanOrEqual(new Date(since).getTime());
      });
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/v1/users/999/microposts')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/v1/users/:userId/microposts', () => {
    it('should create a new micropost with status 201', async () => {
      const newMicropost = {
        content: 'This is a test micropost'
      };

      const response = await request(app)
        .post(`/api/v1/users/${userId}/microposts`)
        .send(newMicropost)
        .expect(201);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('userId', userId);
      expect(response.body.data).toHaveProperty('content', newMicropost.content);
      expect(response.body.data).toHaveProperty('contentLength', newMicropost.content.length);
      expect(response.body.data).toHaveProperty('createdAt');
      expect(response.body.data).toHaveProperty('user');
      
      // Check user structure
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user).toHaveProperty('name');
      expect(response.body.data.user).toHaveProperty('email');
    });

    it('should return 400 for empty content', async () => {
      const invalidMicropost = {
        content: ''
      };

      const response = await request(app)
        .post(`/api/v1/users/${userId}/microposts`)
        .send(invalidMicropost)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for missing content', async () => {
      const invalidMicropost = {};

      const response = await request(app)
        .post(`/api/v1/users/${userId}/microposts`)
        .send(invalidMicropost)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for content too long', async () => {
      const invalidMicropost = {
        content: 'a'.repeat(281) // 281 characters, exceeds 280 limit
      };

      const response = await request(app)
        .post(`/api/v1/users/${userId}/microposts`)
        .send(invalidMicropost)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 for non-existent user', async () => {
      const newMicropost = {
        content: 'This is a test micropost'
      };

      const response = await request(app)
        .post('/api/v1/users/999/microposts')
        .send(newMicropost)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/microposts', () => {
    it('should return all microposts with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/microposts')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.data).toBeInstanceOf(Array);
      
      // Check pagination structure
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('totalPages');
      
      response.body.data.forEach(micropost => {
        expect(micropost).toHaveProperty('id');
        expect(micropost).toHaveProperty('userId');
        expect(micropost).toHaveProperty('content');
        expect(micropost).toHaveProperty('contentLength');
        expect(micropost).toHaveProperty('createdAt');
        expect(micropost).toHaveProperty('user');
        
        // Check user structure (user can be null if user was deleted)
        if (micropost.user) {
          expect(micropost.user).toHaveProperty('id');
          expect(micropost.user).toHaveProperty('name');
          expect(micropost.user).toHaveProperty('email');
        } else {
          expect(micropost.user).toBeNull();
        }
        
        // Check content length matches content
        expect(micropost.contentLength).toBe(micropost.content.length);
      });
    });

    it('should support search functionality', async () => {
      const response = await request(app)
        .get('/api/v1/microposts?search=micropost')
        .expect(200);

      response.body.data.forEach(micropost => {
        expect(micropost.content.toLowerCase()).toContain('micropost');
      });
    });

    it('should support pagination parameters', async () => {
      const response = await request(app)
        .get('/api/v1/microposts?page=1&limit=2')
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(2);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(2);
    });
  });

  describe('GET /api/v1/microposts/:micropostId', () => {
    it('should return micropost details with status 200', async () => {
      const response = await request(app)
        .get('/api/v1/microposts/1')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', 1);
      expect(response.body.data).toHaveProperty('userId');
      expect(response.body.data).toHaveProperty('content');
      expect(response.body.data).toHaveProperty('contentLength');
      expect(response.body.data).toHaveProperty('createdAt');
      expect(response.body.data).toHaveProperty('user');
      
      // Check user structure
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user).toHaveProperty('name');
      expect(response.body.data.user).toHaveProperty('email');
      
      // Check content length matches content
      expect(response.body.data.contentLength).toBe(response.body.data.content.length);
    });

    it('should return 404 for non-existent micropost', async () => {
      const response = await request(app)
        .get('/api/v1/microposts/999')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for invalid micropost ID', async () => {
      const response = await request(app)
        .get('/api/v1/microposts/invalid')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });
});