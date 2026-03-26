import path from 'path';
import swaggerJsdoc from 'swagger-jsdoc';

const isTs = __filename.endsWith('.ts');
const ext = isTs ? '.ts' : '.js';
const routesPath = path.join(__dirname, '..', 'routes', '**', `*${ext}`);

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Service Auth Microservice (SAMS) API',
      version: '1.0.0',
      description: 'Service-to-service authentication and management APIs',
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Development' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: [routesPath],
};

const spec = swaggerJsdoc(options);
export default spec;
