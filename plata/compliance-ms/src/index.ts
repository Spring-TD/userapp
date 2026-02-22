import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { kycRoutes } from './routes/kycRoutes';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import { seedMockData, getDbStats } from './utils/mockDb';
import { redisCacheService } from './services/RedisCacheService';
import mongoose from 'mongoose';
import { connectToDatabase, disconnectFromDatabase } from './config/database';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3003;
let server: ReturnType<express.Express['listen']> | null = null;

// Middleware setup
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(helmet());
app.use(morgan('combined', { 
  stream: { write: (message) => logger.info(message.trim()) } 
}));

// Initialize mock database with seed data (used alongside MongoDB for in-memory KYC data until migrated)
seedMockData();

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    service: 'Compliance Microservice',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      kyc: '/api/v1/kyc'
    },
    features: [
      'KYC Verification',
      'AML Checks',
      'Sanctions Screening',
      'CAC Verification',
      'Liveness Testing',
      'Document Verification'
    ],
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', async (req, res) => {
  const stats = getDbStats();
  // Get Redis cache stats if available
  let cacheStats = { count: 0, isRedisConnected: false };
  try {
    cacheStats = await redisCacheService.getStats();
  } catch (error) {
    logger.error('Failed to get cache stats', { error });
  }
  const dbState = mongoose.connection.readyState;
  const database = dbState === 1 ? 'mongodb' : 'mock';

  res.json({
    status: 'healthy',
    service: 'compliance-ms',
    timestamp: new Date().toISOString(),
    database,
    mongodbConnected: dbState === 1,
    cache: cacheStats,
    stats
  });
});

// API routes
app.use('/api/v1/kyc', kycRoutes);

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
    await redisCacheService.clear();
  } catch (error) {
    logger.error('Error clearing cache on shutdown', { error });
  }
  try {
    await disconnectFromDatabase();
  } catch (error) {
    logger.error('Error disconnecting from MongoDB on shutdown', { error });
  }
  if (server) {
    server.close(() => {
      logger.info('Server closed');
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
      server = app.listen(PORT, '0.0.0.0', () => {
        logger.info(`Compliance service running on port ${PORT}`);
        logger.info('MongoDB connected; mock database initialized with sample data');
        const stats = getDbStats();
        logger.info('Database stats:', stats);
      });
    })
    .catch((err) => {
      logger.error('Failed to start compliance-ms:', err);
      process.exit(1);
    });
}

export { app };