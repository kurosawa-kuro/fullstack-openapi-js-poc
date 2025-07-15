import { OpenAPIBackend } from 'openapi-backend';
import YAML from 'yamljs';
import path from 'path';
import { fileURLToPath } from 'url';
import addFormats from 'ajv-formats';
import usersFixture from '../fixtures/users.json' assert { type: 'json' };
import micropostsFixture from '../fixtures/microposts.json' assert { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create mock OpenAPI backend
export const createMockOpenAPI = () => {
  const api = new OpenAPIBackend({ 
    definition: YAML.load(path.resolve(__dirname, '../../../shared/openapi/api.yaml')),
    validate: true,
    customizeAjv: (ajv) => {
      addFormats(ajv);
      return ajv;
    }
  });

  // Mock handlers
  api.register('getUsers', (_, __, res) => {
    res.status(200).json(usersFixture);
  });

  api.register('getUserMicroposts', (c, __, res) => {
    const userId = parseInt(c.request.params.userId);
    const userMicroposts = micropostsFixture.filter(mp => mp.userId === userId);
    
    if (userMicroposts.length === 0 && !usersFixture.find(u => u.id === userId)) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.status(200).json(userMicroposts);
  });

  api.register('createUserMicropost', (c, __, res) => {
    const userId = parseInt(c.request.params.userId);
    const { content } = c.request.body;
    
    // Validate user exists
    if (!usersFixture.find(u => u.id === userId)) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Validate content
    if (!content || content.trim() === '') {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    const newMicropost = {
      id: Date.now(),
      userId: userId,
      content: content.trim(),
      createdAt: new Date().toISOString()
    };
    
    res.status(201).json(newMicropost);
  });

  api.register('notFound', (_, __, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  api.register('validationFail', (c, __, res) => {
    res.status(400).json({ error: 'Validation failed', details: c.validation.errors });
  });

  api.register('unauthorizedHandler', (_, __, res) => {
    res.status(401).json({ error: 'Unauthorized' });
  });

  api.init();
  
  return api;
};

// Mock data getters
export const getMockUsers = () => usersFixture;
export const getMockMicroposts = () => micropostsFixture;
export const getMockUserMicroposts = (userId) => 
  micropostsFixture.filter(mp => mp.userId === userId);