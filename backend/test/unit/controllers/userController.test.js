import request from 'supertest';
import app from '../../../src/app.js';

describe('User Controller', () => {
  describe('GET /api/v1/users', () => {
    it('should return paginated users with status 200', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Check pagination structure
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('totalPages');
      
      // Check structure of first user
      expect(response.body.data[0]).toHaveProperty('id');
      expect(response.body.data[0]).toHaveProperty('name');
      expect(response.body.data[0]).toHaveProperty('email');
      expect(response.body.data[0]).toHaveProperty('createdAt');
      expect(response.body.data[0]).toHaveProperty('micropostCount');
    });

    it('should return users with valid email format', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .expect(200);

      response.body.data.forEach(user => {
        expect(user.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      });
    });
    
    it('should support pagination parameters', async () => {
      const response = await request(app)
        .get('/api/v1/users?page=1&limit=2')
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(2);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(2);
    });
    
    it('should support search functionality', async () => {
      const response = await request(app)
        .get('/api/v1/users?search=alice')
        .expect(200);

      response.body.data.forEach(user => {
        expect(
          user.name.toLowerCase().includes('alice') ||
          user.email.toLowerCase().includes('alice')
        ).toBe(true);
      });
    });
    
    it('should support sorting', async () => {
      const response = await request(app)
        .get('/api/v1/users?sort=name_asc')
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Only test sorting if there are multiple users
      if (response.body.data.length > 1) {
        for (let i = 1; i < response.body.data.length; i++) {
          expect(response.body.data[i-1].name.localeCompare(response.body.data[i].name)).toBeLessThanOrEqual(0);
        }
      }
      
      // Test that the sorting parameter is accepted and returns valid data
      expect(response.body.data).toBeInstanceOf(Array);
      response.body.data.forEach(user => {
        expect(user).toHaveProperty('name');
        expect(typeof user.name).toBe('string');
      });
    });

    it('should return users with valid date format', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .expect(200);

      response.body.data.forEach(user => {
        expect(user.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      });
    });

    it('should return users with positive integer IDs', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .expect(200);

      response.body.data.forEach(user => {
        expect(user.id).toBeGreaterThan(0);
        expect(Number.isInteger(user.id)).toBe(true);
      });
    });

    it('should return users with non-empty names', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .expect(200);

      response.body.data.forEach(user => {
        expect(user.name).toBeTruthy();
        expect(user.name.length).toBeGreaterThan(0);
      });
    });
  });
  
  describe('GET /api/v1/users/:userId', () => {
    it('should return user details with status 200', async () => {
      const response = await request(app)
        .get('/api/v1/users/1')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', 1);
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('email');
      expect(response.body.data).toHaveProperty('createdAt');
      expect(response.body.data).toHaveProperty('micropostCount');
      expect(response.body.data).toHaveProperty('recentMicroposts');
      
      // Recent microposts should be an array
      expect(response.body.data.recentMicroposts).toBeInstanceOf(Array);
      expect(response.body.data.recentMicroposts.length).toBeLessThanOrEqual(5);
    });
    
    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/v1/users/999')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
    
    it('should return 400 for invalid user ID', async () => {
      const response = await request(app)
        .get('/api/v1/users/invalid')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });
});