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

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3003;

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

// Initialize mock database with seed data
seedMockData();

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
  
  res.json({
    status: 'healthy',
    service: 'compliance-ms',
    timestamp: new Date().toISOString(),
    database: 'mock',
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
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  try {
    // Clear cache on shutdown
    await redisCacheService.clear();
  } catch (error) {
    logger.error('Error clearing cache on shutdown', { error });
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  try {
    // Clear cache on shutdown
    await redisCacheService.clear();
  } catch (error) {
    logger.error('Error clearing cache on shutdown', { error });
  }
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  logger.info(`Compliance service running on port ${PORT}`);
  logger.info('Mock database initialized with sample data');
  const stats = getDbStats();
  logger.info('Database stats:', stats);
});

export { app };