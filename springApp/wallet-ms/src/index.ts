import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/environment';
import swaggerSpec from './config/swagger';
import { walletRoutes } from './routes/walletRoutes';
import { internalWalletRoutes } from './routes/internalWalletRoutes';
import { transactionRoutes } from './routes/transactionRoutes';
import { errorHandler } from './middleware/errorHandler';
import { ensureWalletIndexes } from './db/database';
import { registerTransactionReceiptHandler } from './services/transactionReceiptService';

dotenv.config();

// Initialize Express app
const app = express();
const PORT = config.port || 3004;

// Middleware setup (body limit from config)
// PayOnUs webhooks often send JSON as text/plain;charset=ISO-8859-1
app.use(
  express.text({
    limit: config.requestBodyLimit,
    type: (req) => String(req.headers['content-type'] || '').toLowerCase().includes('text/plain')
  })
);
app.use(express.json({ limit: config.requestBodyLimit }));
app.use(express.urlencoded({ extended: true, limit: config.requestBodyLimit }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(helmet());
app.use(morgan('combined'));

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'Wallet Microservice',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      apiDocs: '/api-docs',
      openApiSpec: '/api-docs.json',
      wallets: '/api/v1/wallets',
      transactions: '/api/v1/transactions'
    },
    features: [
      'User Wallets',
      'Merchant Wallets (Billing, KYC, Repayment)',
      'Wallet Balance Management',
      'Transaction History',
      'Wallet Funding',
      'Transfer Operations'
    ],
    timestamp: new Date().toISOString()
  });
});

// Swagger API docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'wallet-ms',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// API routes
app.use('/api/v1/wallets', walletRoutes);
app.use('/api/v1/internal/wallets', internalWalletRoutes);
app.use('/api/v1/transactions', transactionRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Connect to MongoDB before starting server
mongoose.connect(config.mongoUri)
  .then(() => {
    console.log('✅ Connected to MongoDB (DigitalOcean)');
    void ensureWalletIndexes();
    registerTransactionReceiptHandler();
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Wallet service running on port ${PORT}`);
  console.log(`Environment: ${config.nodeEnv}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    mongoose.connection.close().then(() => {
      console.log('Process terminated');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    mongoose.connection.close().then(() => {
      console.log('Process terminated');
      process.exit(0);
    });
  });
});

export { app };