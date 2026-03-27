import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { config } from './config/environment';
import { connectToDatabase, disconnectFromDatabase } from './config/database';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger';
import { walletRoutes } from './routes/walletRoutes';
import { transactionRoutes } from './routes/transactionRoutes';
import { errorHandler } from './middleware/errorHandler';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = config.port || 3004;
let server: ReturnType<express.Express['listen']> | null = null;

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
  const dbState = mongoose.connection.readyState;
  const database = dbState === 1 ? 'mongodb' : 'none';
  res.status(200).json({
    status: 'healthy',
    service: 'wallet-ms',
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
const shutdown = async () => {
  try {
    await disconnectFromDatabase();
  } catch (error) {
    console.error('Error disconnecting from MongoDB on shutdown', error);
  }
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

// Connect to MongoDB then start server (skip in test so tests can use app without connecting)
if (process.env.NODE_ENV !== 'test') {
  connectToDatabase()
    .then(() => {
      server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`Wallet service running on port ${PORT}`);
        console.log(`Environment: ${config.nodeEnv}`);
        console.log('Database: MongoDB connected');
      });
    })
    .catch((err) => {
      console.error('Failed to start wallet-ms:', err);
      process.exit(1);
    });
}

export { app };