import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { kycRoutes } from './src/routes/kycRoutes';
import { adminRoutes } from './src/routes/adminRoutes';
import { merchantRoutes } from './src/routes/merchantRoutes';
import { errorHandler } from './src/middleware/errorHandler';
import { authenticate } from './src/middleware/auth';
import { validateKYC } from './src/middleware/kycValidation';
import { connectDB } from './src/utils/db';
import { seedData } from './src/utils/seed';
import { logger } from './src/utils/logger';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet());
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

// Database connection
connectDB();

// Seed data (development only)
if (process.env.NODE_ENV !== 'production') {
  seedData();
}

// Routes setup
app.use('/api/v1/kyc', kycRoutes);
app.use('/api/v1/kyc/admin', authenticate, adminRoutes);
app.use('/api/v1/kyc/merchant', authenticate, merchantRoutes);

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`Compliance service running on port ${PORT}`);
});

export { app };