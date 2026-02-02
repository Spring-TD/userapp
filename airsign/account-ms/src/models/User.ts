import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    email: string;
    password?: string; // Optional for Google Sign-in users
    name: string;      // Unified name field to match design
    googleId?: string;
    avatar?: string;
    otpCode?: string;
    otpExpires?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema: Schema = new Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String },
    name: { type: String, required: true },
    googleId: { type: String, unique: true, sparse: true },
    avatar: { type: String },
    otpCode: { type: String },
    otpExpires: { type: Date }
}, {
    timestamps: true
});

export const User = mongoose.model<IUser>('User', UserSchema);
