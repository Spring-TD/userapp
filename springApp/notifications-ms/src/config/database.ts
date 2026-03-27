import mongoose from 'mongoose';
import { config } from './environment';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 2000;

export const connectToDatabase = async (): Promise<void> => {
  if (!config.mongoUri) {
    console.error(
      'MONGO_URI environment variable is not defined. Set it in .env or use mongodb://localhost:27017/notifications_db if MongoDB runs locally.'
    );
    process.exit(1);
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await mongoose.connect(config.mongoUri);
      console.log('Successfully connected to MongoDB.');
      mongoose.connection.on('error', (err) => {
        console.error(`MongoDB connection error: ${err}`);
        process.exit(1);
      });
      mongoose.connection.on('disconnected', () => {
        console.log('MongoDB disconnected');
      });
      return;
    } catch (error) {
      console.error(
        `MongoDB connection attempt ${attempt}/${MAX_RETRIES} failed:`,
        (error as Error).message
      );
      if (attempt === MAX_RETRIES) {
        console.error(
          'Cannot connect to MongoDB. Ensure MongoDB is running (e.g. local install, Docker, or set MONGO_URI to a MongoDB Atlas connection string).'
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
    console.log('Disconnected from MongoDB.');
  } catch (error) {
    console.error('Error disconnecting from MongoDB:', error);
  }
};
