import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { config } from './config/environment';
import { connectToDatabase, disconnectFromDatabase } from './config/database';
import corsMiddleware from './middleware/cors';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger';
import { paymentRoutes } from './routes/paymentRoutes';
import { recordRoutes } from './routes/recordRoutes';
import logger from './utils/logger';

const app = express();
let server: ReturnType<express.Express['listen']> | null = null;

// Security and CORS middleware
app.use(helmet());
app.use(corsMiddleware);
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    success: true,
    service: 'Payment Microservice',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
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
  const dbState = mongoose.connection.readyState;
  const database = dbState === 1 ? 'mongodb' : 'none';
  res.json({
    success: true,
    message: 'Payment Microservice is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    database,
    mongodbConnected: dbState === 1
  });
});

// OpenAPI / Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (_req, res) => res.json(swaggerSpec));

// API routes
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/records', recordRoutes);

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown
const shutdown = async () => {
  try {
    await disconnectFromDatabase();
  } catch (error) {
    logger.error('Error disconnecting from MongoDB on shutdown', error);
  }
  if (server) {
    server.close(() => {
      logger.info('Process terminated');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  shutdown();
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  shutdown();
});

// Connect to MongoDB then start server (skip in test so tests can use app without connecting)
if (process.env.NODE_ENV !== 'test') {
  connectToDatabase()
    .then(() => {
      server = app.listen(config.port, '0.0.0.0', () => {
        logger.info(`🚀 Payment Microservice running on port ${config.port}`);
        logger.info(`📱 Environment: ${config.nodeEnv}`);
        logger.info(`🔗 Service Auth URL: ${config.serviceAuthUrl}`);
        logger.info(`🔗 Billing Service URL: ${config.billingServiceUrl}`);
        logger.info(`🔗 Wallet Service URL: ${config.walletServiceUrl}`);
        logger.info(`💾 Database: MongoDB connected`);
        logger.info(`🌐 Payment Service Features:`);
        logger.info(`   💳 Card Payments`);
        logger.info(`   🏦 Bank Transfers`);
        logger.info(`   💰 PayPal Integration`);
        logger.info(`   ₿ Crypto Payments`);
        logger.info(`   📊 Merchant Record Management`);
        logger.info(`   📒 Debit/Credit Ledger Tracking`);
      });
    })
    .catch((err) => {
      logger.error('Failed to start payment-ms:', err);
      process.exit(1);
    });
}

export default app;
