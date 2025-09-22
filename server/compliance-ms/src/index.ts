import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { kycRoutes } from './routes/kycRoutes';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import { seedMockData, getDbStats } from './utils/mockDb';

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
app.get('/health', (req, res) => {
  const stats = getDbStats();
  res.json({
    status: 'healthy',
    service: 'compliance-ms',
    timestamp: new Date().toISOString(),
    database: 'mock',
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
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
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