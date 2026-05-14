import path from 'path';
import swaggerJsdoc from 'swagger-jsdoc';

const isTs = __filename.endsWith('.ts');
const ext = isTs ? '.ts' : '.js';
const routesPath = path.join(__dirname, '..', 'routes', '**', `*${ext}`);

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Notifications Microservice API',
      version: '1.0.0',
      description: 'Email, SMS, in-app inbox, and dual (email + in-app) notification APIs for SpringTD',
    },
    servers: [
      { url: 'http://localhost:3009', description: 'Docker Compose / Fly internal port' },
      { url: 'http://localhost:4009', description: 'Local dev default when PORT unset' },
    ],
    tags: [{ name: 'Notifications', description: 'Send and query notifications' }],
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
