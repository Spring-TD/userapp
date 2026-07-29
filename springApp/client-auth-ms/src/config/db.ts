import mongoose from 'mongoose';
import { UserModel } from '../models/UserModel';
import { OtpModel } from '../models/OtpModel';

const MONGODB_URI = process.env.MONGODB_URI;

/**
 * Reconcile collection indexes with the current schema.
 *
 * Email identity moved from globally unique (`email_1`) to unique-per-app
 * (`unique_email_per_app` on `{ email, app_id }`). syncIndexes drops the stale
 * `email_1` index and builds the new ones so the same email can register on
 * multiple storefront apps. Non-fatal: a failure here must not block startup.
 */
async function reconcileIndexes() {
    try {
        await UserModel.syncIndexes();
        await OtpModel.syncIndexes();
        console.log('✅ Mongo indexes reconciled (per-app email identity)');
    } catch (error) {
        console.error('⚠️  Failed to reconcile Mongo indexes:', error);
    }
}

export async function connectDb() {
    if (!MONGODB_URI) {
        console.error('❌ MONGODB_URI is not defined in environment variables');
        throw new Error('MONGODB_URI is required');
    }

    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    await reconcileIndexes();
}
