import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

export async function connectDb() {
    if (!MONGODB_URI) {
        console.error('❌ MONGODB_URI is not defined in environment variables');
        throw new Error('MONGODB_URI is required');
    }

    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
}
