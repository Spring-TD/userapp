import { UserModel } from '../models/UserModel';
import { RoleModel } from '../models/RoleModel';
import { InvitationModel } from '../models/InvitationModel';
import { OtpModel, OtpDocument } from '../models/OtpModel';
import { SessionModel } from '../models/SessionModel';
import { UserAccount, Role, Invitation } from '../models/User';

// ─── helpers ────────────────────────────────────────────────────────────────

/** Strip Mongoose internals and map _id → id */
function toUser(doc: any): UserAccount {
    const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
    return { ...obj, id: obj._id.toString() } as UserAccount;
}

function toRole(doc: any): Role {
    const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
    return { ...obj, id: obj._id.toString() } as Role;
}

function toInvitation(doc: any): Invitation {
    const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
    return { ...obj, id: obj._id.toString() } as Invitation;
}

// ─── database class ──────────────────────────────────────────────────────────

class MongoDatabase {
    // ── Users ────────────────────────────────────────────────────────────────

    /** Find a user by email (case-insensitive). */
    async findUserByEmail(email: string): Promise<UserAccount | null> {
        const doc = await UserModel.findOne({ email: email.toLowerCase() }).lean();
        if (!doc) return null;
        return { ...doc, id: (doc._id as any).toString() } as UserAccount;
    }

    /** Find a user by their Mongo _id string. */
    async findUserById(id: string): Promise<UserAccount | null> {
        const doc = await UserModel.findById(id).lean();
        if (!doc) return null;
        return { ...doc, id: (doc._id as any).toString() } as UserAccount;
    }

    /**
     * Create a new user.
     * Timestamps (created_at / updated_at) are handled by the schema option
     * `{ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }`.
     */
    async createUser(
        userData: Omit<UserAccount, 'id' | 'created_at' | 'updated_at' | 'failed_login_attempts'>
    ): Promise<UserAccount> {
        const doc = await UserModel.create({
            ...userData,
            failed_login_attempts: 0,
        });
        return toUser(doc);
    }

    /**
     * Apply a partial update to a user document.
     * Returns the updated document or null if not found.
     */
    async updateUser(id: string, updates: Partial<UserAccount>): Promise<UserAccount | null> {
        // Remove undefined values so we don't accidentally unset fields
        const sanitised = Object.fromEntries(
            Object.entries(updates).filter(([, v]) => v !== undefined)
        );

        const doc = await UserModel.findByIdAndUpdate(
            id,
            { $set: sanitised },
            { new: true }
        ).lean();

        if (!doc) return null;
        return { ...doc, id: (doc._id as any).toString() } as UserAccount;
    }

    /** Permanently delete a user document. */
    async deleteUser(id: string): Promise<boolean> {
        const result = await UserModel.findByIdAndDelete(id).lean();
        return result !== null;
    }

    /** Return all users (use sparingly – unfiltered). */
    async getAllUsers(): Promise<UserAccount[]> {
        const docs = await UserModel.find().lean();
        return docs.map((d) => ({ ...d, id: (d._id as any).toString() } as UserAccount));
    }

    /** Return all users that belong to a specific merchant as sub-users. */
    async findUsersByMerchantId(merchantId: string): Promise<UserAccount[]> {
        const docs = await UserModel.find({ user_merchant_id: merchantId, user_type: 'user' }).lean();
        return docs.map((d) => ({ ...d, id: (d._id as any).toString() } as UserAccount));
    }

    // ── Roles ─────────────────────────────────────────────────────────────────

    /**
     * Create a role.
     * Note: the mock accepted a full Role (with id / timestamps already set by
     * the caller). We ignore caller-supplied id and timestamps here – Mongo
     * generates them instead.
     */
    async createRole(roleData: Omit<Role, 'id' | 'created_at' | 'updated_at'>): Promise<Role> {
        const doc = await RoleModel.create(roleData);
        return toRole(doc);
    }

    /** Find a role by its Mongo _id string. */
    async findRoleById(id: string): Promise<Role | null> {
        const doc = await RoleModel.findById(id).lean();
        if (!doc) return null;
        return { ...doc, id: (doc._id as any).toString() } as Role;
    }

    /** Return all roles owned by a merchant. */
    async findRolesByMerchantId(merchantId: string): Promise<Role[]> {
        const docs = await RoleModel.find({ merchant_id: merchantId }).lean();
        return docs.map((d) => ({ ...d, id: (d._id as any).toString() } as Role));
    }

    /** Apply a partial update to a role. */
    async updateRole(id: string, updates: Partial<Role>): Promise<Role | null> {
        const doc = await RoleModel.findByIdAndUpdate(
            id,
            { $set: updates },
            { new: true }
        ).lean();
        if (!doc) return null;
        return { ...doc, id: (doc._id as any).toString() } as Role;
    }

    /** Permanently delete a role. */
    async deleteRole(id: string): Promise<boolean> {
        const result = await RoleModel.findByIdAndDelete(id).lean();
        return result !== null;
    }

    // ── Invitations ───────────────────────────────────────────────────────────

    /**
     * Persist a new invitation.
     * The mock accepted a fully-formed Invitation object (with id / createdAt /
     * updatedAt set by the caller). We treat the caller-supplied `id` as an
     * optional hint and let Mongo generate its own _id. The returned object has
     * `id` mapped from `_id`.
     */
    async createInvitation(invitation: Omit<Invitation, 'createdAt' | 'updatedAt'>): Promise<Invitation> {
        const { id: _ignored, ...rest } = invitation as any;
        const doc = await InvitationModel.create(rest);
        return toInvitation(doc);
    }

    /** Lookup an invitation by its unique token string. */
    async findInvitationByToken(token: string): Promise<Invitation | null> {
        const doc = await InvitationModel.findOne({ token }).lean();
        if (!doc) return null;
        return { ...doc, id: (doc._id as any).toString() } as Invitation;
    }

    /** Lookup an invitation by Mongo _id string. */
    async findInvitationById(id: string): Promise<Invitation | null> {
        const doc = await InvitationModel.findById(id).lean();
        if (!doc) return null;
        return { ...doc, id: (doc._id as any).toString() } as Invitation;
    }

    /** Apply a partial update to an invitation. */
    async updateInvitation(id: string, updates: Partial<Invitation>): Promise<Invitation | null> {
        const doc = await InvitationModel.findByIdAndUpdate(
            id,
            { $set: updates },
            { new: true }
        ).lean();
        if (!doc) return null;
        return { ...doc, id: (doc._id as any).toString() } as Invitation;
    }

    /** Return all invitations sent by a merchant. */
    async findInvitationsByMerchantId(merchantId: string): Promise<Invitation[]> {
        const docs = await InvitationModel.find({ merchantId }).lean();
        return docs.map((d) => ({ ...d, id: (d._id as any).toString() } as Invitation));
    }

    // ── OTPs ────────────────────────────────────────────────────────────────

    /**
     * Create a new OTP record.
     * The `code` field should already be bcrypt-hashed by the caller.
     */
    async createOtp(data: {
        identifier: string;
        code: string;
        channel: 'email' | 'sms';
        purpose: 'verification' | 'password-reset' | 'login';
        expiresAt: Date;
    }): Promise<OtpDocument> {
        return OtpModel.create(data);
    }

    /**
     * Find the most recent non-expired, non-verified OTP for an identifier + purpose.
     */
    async findActiveOtp(
        identifier: string,
        purpose: 'verification' | 'password-reset' | 'login'
    ): Promise<OtpDocument | null> {
        return OtpModel.findOne({
            identifier: identifier.toLowerCase(),
            purpose,
            verified: false,
            expiresAt: { $gt: new Date() },
        }).sort({ createdAt: -1 });
    }

    /** Increment the verification-attempt counter on an OTP record. */
    async incrementOtpAttempts(id: string): Promise<void> {
        await OtpModel.findByIdAndUpdate(id, { $inc: { attempts: 1 } });
    }

    /** Mark an OTP record as verified. */
    async markOtpVerified(id: string): Promise<void> {
        await OtpModel.findByIdAndUpdate(id, { $set: { verified: true } });
    }

    /** Delete all OTP records for an identifier + purpose (used before generating a new one). */
    async deleteOtpsByIdentifier(
        identifier: string,
        purpose: 'verification' | 'password-reset' | 'login'
    ): Promise<void> {
        await OtpModel.deleteMany({ identifier: identifier.toLowerCase(), purpose });
    }

    // ── Utility ───────────────────────────────────────────────────────────────

    /**
     * Drop all documents from all collections.
     * Useful for integration tests – do NOT call in production.
     */
    async clearAll(): Promise<void> {
        await Promise.all([
            UserModel.deleteMany({}),
            RoleModel.deleteMany({}),
            InvitationModel.deleteMany({}),
            OtpModel.deleteMany({}),
            SessionModel.deleteMany({}),
        ]);
    }
}

/** Singleton – import this everywhere you previously imported `mockDb` */
export const db = new MongoDatabase();
