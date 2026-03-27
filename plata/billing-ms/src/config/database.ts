import mongoose from 'mongoose';
import { config } from './environment';

export const connectToDatabase = async (): Promise<void> => {
    try {
        if (!config.mongoUri) {
            throw new Error('MONGODB_URI environment variable is not defined');
        }

        await mongoose.connect(config.mongoUri);
        console.log('✅ Successfully connected to MongoDB.');

        // Handle connection events
        mongoose.connection.on('error', (err: Error) => {
            console.error(`MongoDB connection error: ${err}`);
            process.exit(1);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('MongoDB disconnected');
        });

    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
};
