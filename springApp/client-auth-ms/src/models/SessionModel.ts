import mongoose, { Schema, Document, Types } from 'mongoose';

export interface SessionDocument extends Document {
    user_id: Types.ObjectId;
    /** SHA-256 hex of the current refresh JWT for this session */
    token_hash: string;
    user_agent?: string;
    ip?: string;
    created_at: Date;
    last_active_at: Date;
    expires_at: Date;
    revoked_at: Date | null;
}

const sessionSchema = new Schema<SessionDocument>(
    {
        user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        token_hash: { type: String, required: true, unique: true },
        user_agent: { type: String },
        ip: { type: String },
        created_at: { type: Date, default: Date.now },
        last_active_at: { type: Date, default: Date.now },
        expires_at: { type: Date, required: true, index: true },
        revoked_at: { type: Date, default: null, index: true },
    },
    { collection: 'refresh_sessions' }
);

sessionSchema.index({ user_id: 1, revoked_at: 1, expires_at: 1 });

export const SessionModel =
    mongoose.models.Session || mongoose.model<SessionDocument>('Session', sessionSchema);
