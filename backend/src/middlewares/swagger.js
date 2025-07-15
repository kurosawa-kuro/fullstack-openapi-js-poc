import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load OpenAPI definition
const apiDefinition = YAML.load(path.resolve(__dirname, '../../../shared/openapi/api.yaml'));

export const swaggerMiddleware = swaggerUi.setup(apiDefinition, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'API Documentation'
});

export const swaggerServe = swaggerUi.serve;