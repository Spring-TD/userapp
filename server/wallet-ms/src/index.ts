import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { config } from './config/environment';
import { walletRoutes } from './routes/walletRoutes';
import { transactionRoutes } from './routes/transactionRoutes';
import { errorHandler } from './middleware/errorHandler';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = config.port || 3004;

// Middleware setup
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
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
      wallets: '/api/v1/wallets',
      transactions: '/api/v1/transactions'
    },
    features: [
      'User Wallets',
      'Merchant Wallets (Treasury, Operation, KYC)',
      'Wallet Balance Management',
      'Transaction History',
      'Wallet Funding',
      'Transfer Operations'
    ],
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'wallet-ms',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API routes
app.use('/api/v1/wallets', walletRoutes);
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

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Wallet service running on port ${PORT}`);
  console.log(`Environment: ${config.nodeEnv}`);
});

export { app };