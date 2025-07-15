import request from 'supertest';

export const createTestUser = (userData = {}) => {
  return {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    createdAt: new Date().toISOString(),
    ...userData
  };
};

export const createTestMicropost = (micropostData = {}) => {
  return {
    id: 1,
    userId: 1,
    content: 'Test micropost content',
    createdAt: new Date().toISOString(),
    ...micropostData
  };
};

export const expectUserStructure = (user) => {
  expect(user).toHaveProperty('id');
  expect(user).toHaveProperty('name');
  expect(user).toHaveProperty('email');
  expect(user).toHaveProperty('createdAt');
  expect(typeof user.id).toBe('number');
  expect(typeof user.name).toBe('string');
  expect(typeof user.email).toBe('string');
  expect(typeof user.createdAt).toBe('string');
};

export const expectMicropostStructure = (micropost) => {
  expect(micropost).toHaveProperty('id');
  expect(micropost).toHaveProperty('userId');
  expect(micropost).toHaveProperty('content');
  expect(micropost).toHaveProperty('createdAt');
  expect(typeof micropost.id).toBe('number');
  expect(typeof micropost.userId).toBe('number');
  expect(typeof micropost.content).toBe('string');
  expect(typeof micropost.createdAt).toBe('string');
};

export const expectValidEmail = (email) => {
  expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
};

export const expectValidISODate = (dateString) => {
  expect(dateString).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/);
  expect(new Date(dateString)).toBeInstanceOf(Date);
  expect(new Date(dateString).getTime()).not.toBeNaN();
};

export const makeRequest = (app) => {
  return {
    get: (path) => request(app).get(path),
    post: (path) => request(app).post(path),
    put: (path) => request(app).put(path),
    delete: (path) => request(app).delete(path)
  };
};

export const withErrorHandling = async (testFn) => {
  try {
    await testFn();
  } catch (error) {
    console.error('Test error:', error);
    throw error;
  }
};