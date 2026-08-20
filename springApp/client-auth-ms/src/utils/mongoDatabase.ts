import mongoose from 'mongoose';
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

/**
 * Build an app-scoped filter fragment.
 * - When an appId is provided, match that storefront app exactly.
 * - Otherwise match the "no app" bucket (merchants/admins and other global records).
 */
function appScopeFilter(appId?: string): Record<string, unknown> {
    const id = appId?.trim();
    if (id) {
        return { app_id: id };
    }
    return { $or: [{ app_id: { $exists: false } }, { app_id: null }, { app_id: '' }] };
}

// ─── database class ──────────────────────────────────────────────────────────

class MongoDatabase {
    // ── Users ────────────────────────────────────────────────────────────────

    /**
     * Find a user by email (case-insensitive).
     * Returns the first match. With per-app email identities the same email can
     * belong to several accounts, so prefer `findUserByEmailAndApp` /
     * `findUsersByEmail` where the tenant context is known.
     */
    async findUserByEmail(email: string): Promise<UserAccount | null> {
        const doc = await UserModel.findOne({ email: email.toLowerCase() }).lean();
        if (!doc) return null;
        return { ...doc, id: (doc._id as any).toString() } as UserAccount;
    }

    /** Find every account registered with this email (across all storefront apps). */
    async findUsersByEmail(email: string): Promise<UserAccount[]> {
        const docs = await UserModel.find({ email: email.toLowerCase() }).lean();
        return docs.map((d) => ({ ...d, id: (d._id as any).toString() } as UserAccount));
    }

    /**
     * Find a user by email scoped to a storefront app.
     * When `appId` is omitted, looks up the global (merchant/admin) account that
     * has no app_id. This is the identity boundary that lets one email register
     * separately on multiple apps.
     */
    async findUserByEmailAndApp(email: string, appId?: string): Promise<UserAccount | null> {
        const doc = await UserModel.findOne({
            email: email.toLowerCase(),
            ...appScopeFilter(appId)
        }).lean();
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
    async findUsersByMerchantId(merchantId: string, appId?: string): Promise<UserAccount[]> {
        const query: Record<string, unknown> = { user_merchant_id: merchantId, user_type: 'user' };
        const normalizedAppId = appId?.trim();
        if (normalizedAppId) {
            query.app_id = normalizedAppId;
        }

        const docs = await UserModel.find(query).lean();
        return docs.map((d) => ({ ...d, id: (d._id as any).toString() } as UserAccount));
    }

    /** Count retail customers registered on a merchant app (storefront users). */
    async countRetailCustomersByAppId(appId: string): Promise<number> {
        const normalized = appId.trim();
        if (!normalized) return 0;
        return UserModel.countDocuments({
            app_id: normalized,
            user_type: 'user'
        });
    }

    /**
     * Registered / active retail customers for an app (analytics).
     * `registeredDeltaThisMonth` uses Africa/Lagos calendar month on `created_at`.
     */
    async getRetailCustomerStatsByAppId(appId: string): Promise<{
        registered: number;
        active: number;
        registeredDeltaThisMonth: number;
    }> {
        const normalized = appId.trim();
        if (!normalized) {
            return { registered: 0, active: 0, registeredDeltaThisMonth: 0 };
        }

        const lagosOffsetMs = 60 * 60 * 1000;
        const now = new Date();
        const lagos = new Date(now.getTime() + lagosOffsetMs);
        const monthStartUtc = Date.UTC(lagos.getUTCFullYear(), lagos.getUTCMonth(), 1, 0, 0, 0, 0);
        const monthStart = new Date(monthStartUtc - lagosOffsetMs);

        const base = { app_id: normalized, user_type: 'user' as const };
        const [registered, active, registeredDeltaThisMonth] = await Promise.all([
            UserModel.countDocuments(base),
            UserModel.countDocuments({ ...base, status: 'active' }),
            UserModel.countDocuments({ ...base, created_at: { $gte: monthStart } })
        ]);

        return { registered, active, registeredDeltaThisMonth };
    }

    /** List retail customer ids for account maintenance settlement. */
    async listRetailCustomersByAppId(appId: string): Promise<Array<{ userId: string; merchantId: string }>> {
        const normalized = appId.trim();
        if (!normalized) return [];
        const docs = await UserModel.find({
            app_id: normalized,
            user_type: 'user'
        })
            .select({ _id: 1, user_merchant_id: 1 })
            .lean();
        return docs
            .map((d) => ({
                userId: String(d._id),
                merchantId: String((d as { user_merchant_id?: string }).user_merchant_id || '').trim()
            }))
            .filter((row) => row.userId && row.merchantId);
    }

    /** Contact + status for analytics top accounts (subset by ids). */
    async getRetailCustomerContactsByIds(userIds: string[]): Promise<
        Array<{ userId: string; userName: string; email: string; status: string }>
    > {
        const ids = [...new Set(userIds.map((id) => String(id || '').trim()).filter(Boolean))].slice(0, 50);
        if (!ids.length) return [];
        const objectIds = ids
            .filter((id) => mongoose.isValidObjectId(id))
            .map((id) => new mongoose.Types.ObjectId(id));
        if (!objectIds.length) return [];
        const docs = await UserModel.find({ _id: { $in: objectIds } })
            .select({ first_name: 1, last_name: 1, email: 1, status: 1 })
            .lean();
        const byId = new Map(
            docs.map((d) => {
                const firstName = String((d as { first_name?: string }).first_name || '').trim();
                const lastName = String((d as { last_name?: string }).last_name || '').trim();
                const email = String((d as { email?: string }).email || '').trim();
                const userName = [firstName, lastName].filter(Boolean).join(' ').trim();
                const userId = String(d._id);
                return [
                    userId,
                    {
                        userId,
                        userName: userName || email || 'Customer',
                        email,
                        status: String((d as { status?: string }).status || 'active')
                    }
                ] as const;
            })
        );
        return ids
            .map((id) => byId.get(id))
            .filter((row): row is NonNullable<typeof row> => Boolean(row));
    }

    /**
     * Merchant account whose `user_merchant_id` equals the tenant id shared by retail users.
     * Used so wallet-ms can resolve Payonus BVN from compliance shareholders (keyed by merchant JWT userId).
     */
    async findMerchantOwnerByTenantMerchantId(tenantMerchantId: string): Promise<UserAccount | null> {
        const tid = tenantMerchantId.trim();
        let doc = await UserModel.findOne({
            user_merchant_id: tid,
            user_type: 'merchant'
        }).lean();
        if (!doc) {
            doc = await UserModel.findOne({ user_merchant_id: tid }).sort({ created_at: 1 }).lean();
        }
        if (!doc) return null;
        return { ...doc, id: (doc._id as any).toString() } as UserAccount;
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
        purpose: 'verification' | 'password-reset' | 'password-change' | 'login';
        expiresAt: Date;
        appId?: string;
    }): Promise<OtpDocument> {
        const { appId, ...rest } = data;
        return OtpModel.create({
            ...rest,
            ...(appId?.trim() ? { app_id: appId.trim() } : {})
        });
    }

    /**
     * Find the most recent non-expired, non-verified OTP for an identifier + purpose,
     * scoped to a storefront app (or the no-app bucket when `appId` is omitted).
     */
    async findActiveOtp(
        identifier: string,
        purpose: 'verification' | 'password-reset' | 'password-change' | 'login',
        appId?: string
    ): Promise<OtpDocument | null> {
        return OtpModel.findOne({
            identifier: identifier.toLowerCase(),
            purpose,
            verified: false,
            expiresAt: { $gt: new Date() },
            ...appScopeFilter(appId)
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

    /**
     * Delete all OTP records for an identifier + purpose (used before generating a new one),
     * scoped to a storefront app (or the no-app bucket when `appId` is omitted).
     */
    async deleteOtpsByIdentifier(
        identifier: string,
        purpose: 'verification' | 'password-reset' | 'password-change' | 'login',
        appId?: string
    ): Promise<void> {
        await OtpModel.deleteMany({
            identifier: identifier.toLowerCase(),
            purpose,
            ...appScopeFilter(appId)
        });
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
