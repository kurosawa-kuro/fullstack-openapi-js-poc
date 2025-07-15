import { OpenAPIBackend } from 'openapi-backend';
import path from 'path';
import { fileURLToPath } from 'url';
// import { config } from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// OpenAPI specification path
const openApiPath = path.join(__dirname, '../../../shared/openapi/api.yaml');

// Create OpenAPI backend instance for validation only
const api = new OpenAPIBackend({
  definition: openApiPath,
  strict: false, // Allow requests that don't match the schema
  validate: true, // Enable request/response validation
  ajvOpts: {
    formats: true, // Enable formats but don't validate them strictly
    strict: false,
    validateFormats: false,
    addUsedSchema: false
  }
});

// OpenAPI validation utility function
const validateRequest = (req, operationId) => {
  try {
    const operation = api.getOperation(operationId);
    if (!operation) {
      return { valid: false, errors: [`Operation ${operationId} not found`] };
    }
    
    const validationResult = api.validateRequest(req, operation);
    if (!validationResult.valid) {
      return {
        valid: false,
        errors: validationResult.errors?.map(err => ({
          field: err.instancePath || err.keyword,
          message: err.message,
          value: err.data
        })) || []
      };
    }
    
    return { valid: true, errors: [] };
  } catch (error) {
    console.warn('OpenAPI validation error:', error.message);
    return { valid: true, errors: [] }; // Fail gracefully
  }
};

// Express 5.x compatible middleware (disabled for now)
const openApiMiddleware = (req, res, next) => {
  // Temporarily disabled - routes handle their own validation
  next();
};

// Initialize the API
try {
  await api.init();
  console.log('OpenAPI backend initialized successfully');
} catch (error) {
  console.warn('OpenAPI backend initialization failed:', error.message);
}

export { api, openApiMiddleware, validateRequest };
export default openApiMiddleware;