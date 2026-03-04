import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { kycRoutes } from './routes/kycRoutes';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import { redisCacheService } from './services/RedisCacheService';
import KYCProfileModel from './db/KYCProfileModel';
import { KYCStatus, UserType } from './types/kycTypes';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3003;

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

async function getDbStats(): Promise<{
  kycProfiles: number;
  documents: number;
  statuses: Record<string, number>;
  userTypes: Record<string, number>;
}> {
  const kycProfiles = await KYCProfileModel.countDocuments();
  const profiles = await KYCProfileModel.find({}).lean();
  const documents = profiles.reduce((sum, p) => sum + (p.documents?.length || 0), 0);
  const statuses: Record<string, number> = {};
  const userTypes: Record<string, number> = {};
  for (const p of profiles) {
    statuses[p.status as string] = (statuses[p.status as string] || 0) + 1;
    userTypes[p.userType as string] = (userTypes[p.userType as string] || 0) + 1;
  }
  return {
    kycProfiles,
    documents,
    statuses: {
      pending: statuses[KYCStatus.PENDING] || 0,
      inProgress: statuses[KYCStatus.IN_PROGRESS] || 0,
      completed: statuses[KYCStatus.COMPLETED] || 0,
      approved: statuses[KYCStatus.APPROVED] || 0,
      rejected: statuses[KYCStatus.REJECTED] || 0,
      ...statuses
    },
    userTypes: {
      individual: userTypes[UserType.INDIVIDUAL] || 0,
      merchant: userTypes[UserType.MERCHANT] || 0,
      ...userTypes
    }
  };
}

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
  let stats = { kycProfiles: 0, documents: 0, statuses: {}, userTypes: {} };
  try {
    stats = await getDbStats();
  } catch (error) {
    logger.error('Failed to get DB stats', { error });
  }
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
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
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
async function shutdown(signal: string): Promise<void> {
  logger.info(`${signal} received, shutting down gracefully`);
  try {
    await redisCacheService.clear();
  } catch (error) {
    logger.error('Error clearing cache on shutdown', { error });
  }
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error('Error closing MongoDB', { error });
  }
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Connect to MongoDB and start server
const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL;
if (!MONGODB_URI) {
  logger.error('MONGODB_URI or DATABASE_URL is required');
  process.exit(1);
}

mongoose.connect(MONGODB_URI)
  .then(() => {
    logger.info('Connected to MongoDB');
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Compliance service running on port ${PORT}`);
      getDbStats().then(stats => logger.info('Database stats:', stats)).catch(() => {});
    });
  })
  .catch((err) => {
    logger.error('MongoDB connection error:', err);
    process.exit(1);
  });

export { app };