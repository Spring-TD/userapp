import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger';
import { config } from './config/environment';
import { setupProxies } from './middleware/proxyMiddleware';
import { merchantGatewayAuth } from './middleware/merchantGatewayAuth';
import { getSpecUrls, handleSpecRequest } from './specHub';

const app = express();
const PORT = config.port;
let server: ReturnType<express.Express['listen']> | null = null;

app.set('trust proxy', 1);

// Middleware
app.use(helmet());
app.use(cors({
  origin: config.corsOrigins,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Public-Key', 'X-Secret-Key'],
}));
app.use(morgan(config.logLevel));

// Merchant API key + IP policy (service-auth-ms) before upstream proxies
app.use(merchantGatewayAuth);

// Setup Proxies (must be before body parser)
setupProxies(app);

// Body parsers (for any future local routes)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root endpoint – confirms this is the gateway and which backends are used
app.get('/', (req, res) => {
  res.json({
    success: true,
    service: 'API Gateway',
    version: '1.0.0',
    status: 'running',
    description: 'Stateless gateway; routes /api/v1/* to backend services.',
    role: 'gateway',
    proxied: {
      registration: 'client-auth-ms',
      auth: 'client-auth-ms',
      otp: 'client-auth-ms',
      password: 'client-auth-ms',
      user: 'client-auth-ms',
      products: 'product-ms',
      wallets: 'wallet-ms',
      billing: 'billing-ms',
      payments: 'payment-ms',
      apps: 'create-app-ms',
      compliance: 'compliance-ms',
      keys: 'service-auth-ms',
    },
    endpoints: {
      health: '/health',
      apiDocs: '/api-docs',
    },
    timestamp: new Date().toISOString()
  });
});

// OpenAPI / Swagger documentation (hub: dropdown of all service specs)
const specBasePath = '/api-docs/specs';
const specUrls = getSpecUrls(specBasePath);
app.get(`${specBasePath}/:serviceId`, (req, res, next) => {
  handleSpecRequest(req, res).catch(next);
});
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  swaggerOptions: {
    urls: specUrls,
    'urls.primaryName': specUrls[0]?.name ?? 'Gateway (API Overview)',
  },
}));

// Health check endpoint (no database)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'gateway'
  });
});

// 404 handler
app.use((req, res) => {
  console.log(`404 - Not Found: ${req.method} ${req.url}`);
  res.status(404).json({ error: 'Route not found', path: req.url, method: req.method });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Graceful shutdown
const shutdown = () => {
  if (server) {
    server.close(() => {
      console.log('Process terminated');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  shutdown();
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  shutdown();
});

// Start server (no database connection)
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`API Gateway listening on port ${PORT}`);
    console.log(`Environment: ${config.nodeEnv}`);
  });
}

export default app;
