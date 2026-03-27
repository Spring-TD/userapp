import path from 'path';
import swaggerJsdoc from 'swagger-jsdoc';

const isTs = __filename.endsWith('.ts');
const ext = isTs ? '.ts' : '.js';
const routesPath = path.join(__dirname, '..', 'routes', '**', `*${ext}`);

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Billing Microservice API',
      version: '1.0.0',
      description: 'Billing, invoicing, and payment processing APIs',
    },
    servers: [{ url: 'http://localhost:3006', description: 'Development' }],
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
