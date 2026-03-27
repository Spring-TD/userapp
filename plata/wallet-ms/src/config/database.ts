import mongoose from 'mongoose';
import { config } from './environment';
import { logger } from '../utils/logger';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 2000;

export const connectToDatabase = async (): Promise<void> => {
  if (!config.mongoUri) {
    logger.error(
      'MONGODB_URI environment variable is not defined. Set it in .env or use mongodb://localhost:27017/wallet_ms if MongoDB runs locally.'
    );
    process.exit(1);
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await mongoose.connect(config.mongoUri);
      logger.info('Successfully connected to MongoDB.');
      mongoose.connection.on('error', (err) => {
        logger.error(`MongoDB connection error: ${err}`);
        process.exit(1);
      });
      mongoose.connection.on('disconnected', () => {
        logger.info('MongoDB disconnected');
      });
      return;
    } catch (error) {
      logger.error(
        `MongoDB connection attempt ${attempt}/${MAX_RETRIES} failed:`,
        (error as Error).message
      );
      if (attempt === MAX_RETRIES) {
        logger.error(
          'Cannot connect to MongoDB. Ensure MongoDB is running (e.g. local install, Docker, or set MONGODB_URI to a MongoDB Atlas connection string).'
        );
        process.exit(1);
      }
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }
};

export const disconnectFromDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB.');
  } catch (error) {
    logger.error('Error disconnecting from MongoDB:', error);
  }
};
