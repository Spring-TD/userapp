import path from 'path';
import swaggerJsdoc from 'swagger-jsdoc';

const isTs = __filename.endsWith('.ts');
const ext = isTs ? '.ts' : '.js';
const docsPath = path.join(__dirname, '..', `swaggerDocs${ext}`);

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Gateway (Account MS)',
      version: '1.0.0',
      description: 'Stateless gateway; routes /api/v1/* to backend microservices.',
    },
    servers: [{ url: 'http://localhost:3008', description: 'Development' }],
  },
  apis: [docsPath],
};

const spec = swaggerJsdoc(options);
export default spec;
