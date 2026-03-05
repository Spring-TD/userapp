import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/environment';
import swaggerSpec from './config/swagger';
import corsMiddleware from './middleware/cors';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { paymentRoutes } from './routes/paymentRoutes';
import { recordRoutes } from './routes/recordRoutes';
import logger from './utils/logger';

const app = express();

// Security and CORS middleware
app.use(helmet());
app.use(corsMiddleware);
app.use(morgan('combined'));

// Body parsing middleware (limit from config)
app.use(express.json({ limit: config.requestBodyLimit }));
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
    service: 'Payment Microservice',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      apiDocs: '/api-docs',
      openApiSpec: '/api-docs.json',
      payments: '/api/v1/payments',
      records: '/api/v1/records'
    },
    features: [
      'Card Payments',
      'Bank Transfers',
      'PayPal Integration',
      'Crypto Payments',
      'Merchant Record Management',
      'Debit/Credit Ledger Tracking'
    ],
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Payment Microservice is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// API routes
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/records', recordRoutes);

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

async function start(): Promise<void> {
  if (!config.mongoUri) {
    logger.error('MONGODB_URI or DATABASE_URL is required');
    process.exit(1);
  }
  try {
    await mongoose.connect(config.mongoUri);
    logger.info('Connected to MongoDB (Digital Ocean)');
  } catch (err) {
    logger.error('MongoDB connection error:', err);
    process.exit(1);
  }

  const server = app.listen(config.port, () => {
    logger.info(`🚀 Payment Microservice running on port ${config.port}`);
    logger.info(`📱 Environment: ${config.nodeEnv}`);
    logger.info(`🗄️ MongoDB: connected`);
    logger.info(`🔗 Service Auth URL: ${config.serviceAuthUrl}`);
    logger.info(`🔗 Billing Service URL: ${config.billingServiceUrl}`);
    logger.info(`🔗 Wallet Service URL: ${config.walletServiceUrl}`);
    logger.info(`🌐 Payment Service Features:`);
    logger.info(`   💳 Card Payments`);
    logger.info(`   🏦 Bank Transfers`);
    logger.info(`   💰 PayPal Integration`);
    logger.info(`   ₿ Crypto Payments`);
    logger.info(`   📊 Merchant Record Management`);
    logger.info(`   📒 Debit/Credit Ledger Tracking`);
  });

  async function shutdown(): Promise<void> {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
      mongoose.connection.close().then(() => {
        logger.info('MongoDB connection closed');
        process.exit(0);
      }).catch((err) => {
        logger.error('Error closing MongoDB', err);
        process.exit(1);
      });
    });
  }

  process.on('SIGTERM', () => void shutdown());
  process.on('SIGINT', () => void shutdown());
}

start().catch((err) => {
  logger.error('Failed to start server', err);
  process.exit(1);
});

export default app;
