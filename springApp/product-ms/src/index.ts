import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/environment';
import swaggerSpec from './config/swagger';
import { corsMiddleware } from './middleware';
import { errorHandler, notFoundHandler } from './middleware';
import { productRoutes, configurationRoutes, productApplicationRoutes, applicationRoutes, savingsAccountRoutes, investmentAccountRoutes, commodityAccountRoutes } from './routes';
import { maturityWithdrawalInternalRoutes } from './routes/maturityWithdrawalInternalRoutes';
import productCatalogSyncScheduler from './services/productCatalogSyncScheduler';

const app = express();

// Security and CORS middleware
app.use(helmet());
app.use(corsMiddleware);
app.use(morgan('combined'));

// Body parsing middleware (limit from config)
app.use(
  express.json({
    limit: config.requestBodyLimit,
    verify: (req, _res, buf) => {
      (req as express.Request & { rawBody?: Buffer }).rawBody = Buffer.from(buf);
    }
  })
);
app.use(express.urlencoded({ extended: true, limit: config.requestBodyLimit }));

// Swagger / OpenAPI documentation
app.get('/api-docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(swaggerSpec);
});
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    success: true,
    service: 'Product Microservice - Updated',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      apiDocs: '/api-docs',
      openApiSpec: '/api-docs.json',
      products: '/api/v1/products',
      productCatalogSyncStatus: '/api/v1/products/internal/catalog-sync/status',
      productCatalogSyncWebhook: '/api/v1/products/webhooks/plata/product-updated',
      productOverview: '/api/v1/products/app/:appId/product-overview',
      productOverviewByType: '/api/v1/products/app/:appId/product-overview/by-type/:productType',
      configurations: '/api/v1/configurations',
      applications: '/api/v1/applications',
      applicationsSummary: '/api/v1/applications/summary',
      productApplications: '/api/v1/product-applications',
      savingsAccounts: '/api/v1/savings-accounts',
      investmentAccounts: '/api/v1/investment-accounts',
      commodityAccounts: '/api/v1/commodity-accounts'
    },
    features: [
      'Loan Products',
      'Savings Products',
      'Mortgage Products',
      'Commodity Products',
      'Product Configuration Management'
    ],
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Product Microservice is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// API routes
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/configurations', configurationRoutes);
app.use('/api/v1/applications', applicationRoutes);
app.use('/api/v1/product-applications', productApplicationRoutes);
app.use('/api/v1/savings-accounts', savingsAccountRoutes);
app.use('/api/v1/investment-accounts', investmentAccountRoutes);
app.use('/api/v1/commodity-accounts', commodityAccountRoutes);
app.use('/api/v1/internal/maturity-withdrawals', maturityWithdrawalInternalRoutes);

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Listen first so Fly's proxy always has a target; retry Mongo instead of process.exit (missing/wrong MONGODB_URI on Fly was crashing the machine in a loop).
const MONGO_RETRY_MS = 5000;
function connectMongo(): void {
  const rs = mongoose.connection.readyState;
  if (rs === 1) return; // connected
  if (rs === 2) return; // in-flight connect; wait for it to settle

  mongoose
    .connect(config.mongoUri, {
      serverSelectionTimeoutMS: 10_000
    })
    .then(() => {
      console.log('✅ Connected to MongoDB');
    })
    .catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`❌ MongoDB connection error (retry in ${MONGO_RETRY_MS}ms):`, msg);
      setTimeout(connectMongo, MONGO_RETRY_MS);
    });
}

const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`🚀 Product Microservice listening on 0.0.0.0:${config.port}`);
  console.log(`📱 Environment: ${config.nodeEnv}`);
  connectMongo();
  productCatalogSyncScheduler.start();
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  productCatalogSyncScheduler.stop();
  server.close(() => {
    mongoose.connection.close().then(() => {
      console.log('Process terminated');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  productCatalogSyncScheduler.stop();
  server.close(() => {
    mongoose.connection.close().then(() => {
      console.log('Process terminated');
      process.exit(0);
    });
  });
});

export default app;