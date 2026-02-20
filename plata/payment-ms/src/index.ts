import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/environment';
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
  res.json({
    success: true,
    message: 'Payment Microservice is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API routes
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/records', recordRoutes);

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(config.port, '0.0.0.0', () => {
  logger.info(`🚀 Payment Microservice running on port ${config.port}`);
  logger.info(`📱 Environment: ${config.nodeEnv}`);
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

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
  });
});

export default app;
