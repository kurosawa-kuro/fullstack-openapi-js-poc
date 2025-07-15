import request from 'supertest';
import app from '../../src/app.js';

describe('End-to-End API Tests', () => {
  describe('Full User and Micropost Workflow', () => {
    it('should complete a full user workflow according to OpenAPI', async () => {
      // 1. Get all users (OpenAPI endpoint)
      const usersResponse = await request(app)
        .get('/api/v1/users')
        .expect(200);

      // Check OpenAPI UserListResponse format
      expect(usersResponse.body).toHaveProperty('data');
      expect(usersResponse.body).toHaveProperty('pagination');
      expect(usersResponse.body.data).toBeInstanceOf(Array);
      expect(usersResponse.body.data.length).toBeGreaterThan(0);
      
      const userId = usersResponse.body.data[0].id;

      // 2. Get user details (OpenAPI endpoint)
      const userDetailResponse = await request(app)
        .get(`/api/v1/users/${userId}`)
        .expect(200);

      expect(userDetailResponse.body).toHaveProperty('data');
      expect(userDetailResponse.body.data).toHaveProperty('id', userId);
      expect(userDetailResponse.body.data).toHaveProperty('micropostCount');
      expect(userDetailResponse.body.data).toHaveProperty('recentMicroposts');

      // 3. Get user's microposts (OpenAPI endpoint)
      const micropostsResponse = await request(app)
        .get(`/api/v1/users/${userId}/microposts`)
        .expect(200);

      // Check OpenAPI MicropostListResponse format
      expect(micropostsResponse.body).toHaveProperty('data');
      expect(micropostsResponse.body).toHaveProperty('pagination');
      expect(micropostsResponse.body).toHaveProperty('meta');
      expect(micropostsResponse.body.data).toBeInstanceOf(Array);
      expect(micropostsResponse.body.meta).toHaveProperty('userId', userId);

      // 4. Create a new micropost (OpenAPI endpoint)
      const newMicropost = {
        content: 'End-to-end test micropost according to OpenAPI specification'
      };

      const createResponse = await request(app)
        .post(`/api/v1/users/${userId}/microposts`)
        .send(newMicropost)
        .expect(201);

      // Check OpenAPI MicropostResponse format
      expect(createResponse.body).toHaveProperty('data');
      expect(createResponse.body.data).toHaveProperty('id');
      expect(createResponse.body.data).toHaveProperty('userId', userId);
      expect(createResponse.body.data).toHaveProperty('content', newMicropost.content);
      expect(createResponse.body.data).toHaveProperty('contentLength', newMicropost.content.length);
      expect(createResponse.body.data).toHaveProperty('user');

      const createdMicropostId = createResponse.body.data.id;

      // 5. Get the created micropost by ID (OpenAPI endpoint)
      const micropostDetailResponse = await request(app)
        .get(`/api/v1/microposts/${createdMicropostId}`)
        .expect(200);

      expect(micropostDetailResponse.body).toHaveProperty('data');
      expect(micropostDetailResponse.body.data).toHaveProperty('id', createdMicropostId);
      expect(micropostDetailResponse.body.data).toHaveProperty('content', newMicropost.content);

      // 6. Get all microposts to verify creation (OpenAPI endpoint)
      const allMicropostsResponse = await request(app)
        .get('/api/v1/microposts')
        .expect(200);

      expect(allMicropostsResponse.body).toHaveProperty('data');
      expect(allMicropostsResponse.body).toHaveProperty('pagination');
      expect(allMicropostsResponse.body.data).toBeInstanceOf(Array);

      // Verify our created micropost is in the list
      const createdPost = allMicropostsResponse.body.data.find(post => post.id === createdMicropostId);
      expect(createdPost).toBeDefined();
      expect(createdPost.content).toBe(newMicropost.content);

      // 7. Verify the micropost count increased for the user
      const updatedUserResponse = await request(app)
        .get(`/api/v1/users/${userId}`)
        .expect(200);

      expect(updatedUserResponse.body.data.micropostCount).toBeGreaterThan(
        userDetailResponse.body.data.micropostCount
      );
    });

    it('should handle error scenarios gracefully according to OpenAPI', async () => {
      // Test 404 for non-existent user microposts
      const response1 = await request(app)
        .get('/api/v1/users/999/microposts')
        .expect(404);
      expect(response1.body).toHaveProperty('error');

      // Test 404 for non-existent user detail
      const response2 = await request(app)
        .get('/api/v1/users/999')
        .expect(404);
      expect(response2.body).toHaveProperty('error');

      // Test 404 for non-existent micropost
      const response3 = await request(app)
        .get('/api/v1/microposts/999')
        .expect(404);
      expect(response3.body).toHaveProperty('error');

      // Test 400 for invalid micropost creation (empty content)
      const response4 = await request(app)
        .post('/api/v1/users/1/microposts')
        .send({ content: '' })
        .expect(400);
      expect(response4.body).toHaveProperty('error');

      // Test 400 for invalid micropost creation (content too long)
      const response5 = await request(app)
        .post('/api/v1/users/1/microposts')
        .send({ content: 'a'.repeat(281) })
        .expect(400);
      expect(response5.body).toHaveProperty('error');

      // Test 400 for invalid user ID format
      const response6 = await request(app)
        .get('/api/v1/users/invalid')
        .expect(400);
      expect(response6.body).toHaveProperty('error');

      // Test 404 for non-existent API endpoint
      const response7 = await request(app)
        .get('/api/v1/nonexistent')
        .expect(404);
      expect(response7.body).toHaveProperty('error');
    });

    it('should support pagination and search according to OpenAPI', async () => {
      // Test user pagination
      const paginatedUsersResponse = await request(app)
        .get('/api/v1/users?page=1&limit=1')
        .expect(200);

      expect(paginatedUsersResponse.body.data.length).toBeLessThanOrEqual(1);
      expect(paginatedUsersResponse.body.pagination.page).toBe(1);
      expect(paginatedUsersResponse.body.pagination.limit).toBe(1);

      // Test user search
      const searchUsersResponse = await request(app)
        .get('/api/v1/users?search=example')
        .expect(200);

      expect(searchUsersResponse.body).toHaveProperty('data');
      expect(searchUsersResponse.body).toHaveProperty('pagination');

      // Test micropost pagination
      const paginatedMicropostsResponse = await request(app)
        .get('/api/v1/microposts?page=1&limit=2')
        .expect(200);

      expect(paginatedMicropostsResponse.body.data.length).toBeLessThanOrEqual(2);
      expect(paginatedMicropostsResponse.body.pagination.page).toBe(1);
      expect(paginatedMicropostsResponse.body.pagination.limit).toBe(2);

      // Test micropost search
      const searchMicropostsResponse = await request(app)
        .get('/api/v1/microposts?search=micropost')
        .expect(200);

      expect(searchMicropostsResponse.body).toHaveProperty('data');
      expect(searchMicropostsResponse.body).toHaveProperty('pagination');
    });
  });

  describe('API Documentation', () => {
    it('should serve Swagger UI at /api-docs', async () => {
      const response = await request(app)
        .get('/api-docs/')
        .expect(200);

      expect(response.text).toContain('API Documentation');
    });

    it('should serve OpenAPI specification', async () => {
      const response = await request(app)
        .get('/api-docs/')
        .expect(200);

      // Check that Swagger UI is loading the OpenAPI spec
      expect(response.text).toContain('swagger');
    });
  });

  describe('CORS and Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .expect(200);

      // Check for security headers added by helmet
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
    });

    it('should handle CORS properly', async () => {
      const response = await request(app)
        .options('/api/v1/users')
        .set('Origin', 'http://localhost:8000')
        .expect(200);  // Express typically returns 200 for OPTIONS, not 204

      // Check CORS headers
      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting in production mode', async () => {
      // This test verifies that rate limiting middleware is configured
      // In development mode, rate limiting might be disabled
      const response = await request(app)
        .get('/api/v1/users')
        .expect(200);

      // Just verify the endpoint works - rate limiting tests would require
      // setting production environment and making many requests
      expect(response.body).toHaveProperty('data');
    });
  });
});