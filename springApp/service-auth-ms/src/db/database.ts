import mongoose from 'mongoose';
import { UserAccount } from '../models/User';
import { Role } from '../models/Role';
import { Invitation } from '../models/Invitation';
import { ApiKey, ApiKeyStatus } from '../models/ApiKey';
import { Session } from '../models/Session';
import UserAccountModel from './UserModel';
import RoleModel from './RoleModel';
import InvitationModel from './InvitationModel';
import ApiKeyModel from './ApiKeyModel';
import SessionModel from './SessionModel';

function userDocToAccount(doc: mongoose.Document | null): UserAccount | null {
  if (!doc) return null;
  const o = doc.toObject() as Record<string, unknown> & { _id: mongoose.Types.ObjectId };
  const { _id, __v, ...rest } = o;
  return { id: _id.toString(), ...rest } as unknown as UserAccount;
}

function roleDocToRole(doc: mongoose.Document | null): Role | null {
  if (!doc) return null;
  const o = doc.toObject() as Record<string, unknown> & { _id: mongoose.Types.ObjectId };
  const { _id, __v, ...rest } = o;
  return { id: _id.toString(), ...rest } as unknown as Role;
}

function invitationDocToInvitation(doc: mongoose.Document | null): Invitation | null {
  if (!doc) return null;
  const o = doc.toObject() as Record<string, unknown> & { _id: mongoose.Types.ObjectId; invitation_id?: string };
  const { _id, __v, invitation_id, ...rest } = o;
  return { id: (invitation_id as string) || _id.toString(), ...rest } as unknown as Invitation;
}

function apiKeyDocToApiKey(doc: mongoose.Document | null): ApiKey | null {
  if (!doc) return null;
  const o = doc.toObject() as Record<string, unknown> & { _id: mongoose.Types.ObjectId; key_id?: string };
  const { _id, __v, key_id, ...rest } = o;
  return { id: (key_id as string) || _id.toString(), ...rest } as unknown as ApiKey;
}

function sessionDocToSession(doc: mongoose.Document | null): Session | null {
  if (!doc) return null;
  const o = doc.toObject() as Record<string, unknown> & { _id: mongoose.Types.ObjectId; session_id?: string };
  const { _id, __v, session_id, ...rest } = o;
  return { id: (session_id as string) || _id.toString(), ...rest } as unknown as Session;
}

/**
 * Database layer with same API as mockDb - uses MongoDB via Mongoose.
 */
export const db = {
  async findUserByEmail(email: string): Promise<UserAccount | null> {
    const doc = await UserAccountModel.findOne({ email: email.toLowerCase() });
    return userDocToAccount(doc);
  },

  async findUserById(id: string): Promise<UserAccount | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await UserAccountModel.findById(id);
    return userDocToAccount(doc);
  },

  async createUser(userData: Omit<UserAccount, 'id' | 'created_at' | 'updated_at' | 'failed_login_attempts'>): Promise<UserAccount> {
    const doc = await UserAccountModel.create({
      ...userData,
      failed_login_attempts: 0
    });
    return userDocToAccount(doc)!;
  },

  async updateUser(id: string, updates: Partial<UserAccount>): Promise<UserAccount | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const { id: _omitId, ...safeUpdates } = updates as Partial<UserAccount> & { id?: string };
    const doc = await UserAccountModel.findByIdAndUpdate(id, { $set: safeUpdates }, { new: true });
    return userDocToAccount(doc);
  },

  async deleteUser(id: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(id)) return false;
    const result = await UserAccountModel.findByIdAndDelete(id);
    return !!result;
  },

  async getAllUsers(): Promise<UserAccount[]> {
    const docs = await UserAccountModel.find({});
    return docs.map(d => userDocToAccount(d)!).filter(Boolean);
  },

  async findUsersByMerchantId(merchantId: string): Promise<UserAccount[]> {
    const docs = await UserAccountModel.find({ user_merchant_id: merchantId, user_type: 'user' });
    return docs.map(d => userDocToAccount(d)!).filter(Boolean);
  },

  async createRole(role: Role): Promise<Role> {
    const doc = await RoleModel.create({
      merchant_id: role.merchant_id,
      name: role.name,
      description: role.description,
      permissions: role.permissions
    });
    return roleDocToRole(doc)!;
  },

  async findRoleById(id: string): Promise<Role | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await RoleModel.findById(id);
    return roleDocToRole(doc);
  },

  async findRolesByMerchantId(merchantId: string): Promise<Role[]> {
    const docs = await RoleModel.find({ merchant_id: merchantId });
    return docs.map(d => roleDocToRole(d)!).filter(Boolean);
  },

  async updateRole(id: string, updates: Partial<Role>): Promise<Role | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const { id: _omitId, ...safeUpdates } = updates as Partial<Role> & { id?: string };
    const doc = await RoleModel.findByIdAndUpdate(id, { $set: safeUpdates }, { new: true });
    return roleDocToRole(doc);
  },

  async deleteRole(id: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(id)) return false;
    const result = await RoleModel.findByIdAndDelete(id);
    return !!result;
  },

  async createInvitation(invitation: Invitation): Promise<Invitation> {
    const doc = await InvitationModel.create({
      invitation_id: invitation.id,
      email: invitation.email,
      roleId: invitation.roleId,
      merchantId: invitation.merchantId,
      token: invitation.token,
      status: invitation.status,
      expiresAt: invitation.expiresAt
    });
    return invitationDocToInvitation(doc)!;
  },

  async findInvitationByToken(token: string): Promise<Invitation | null> {
    const doc = await InvitationModel.findOne({ token });
    return invitationDocToInvitation(doc);
  },

  async findInvitationById(id: string): Promise<Invitation | null> {
    if (mongoose.Types.ObjectId.isValid(id) && id.length === 24) {
      const doc = await InvitationModel.findById(id);
      return invitationDocToInvitation(doc);
    }
    const doc = await InvitationModel.findOne({ invitation_id: id });
    return invitationDocToInvitation(doc);
  },

  async updateInvitation(id: string, updates: Partial<Invitation>): Promise<Invitation | null> {
    const { id: _omitId, ...safeUpdates } = updates as Partial<Invitation> & { id?: string };
    let doc = null;
    if (mongoose.Types.ObjectId.isValid(id) && id.length === 24) {
      doc = await InvitationModel.findByIdAndUpdate(id, { $set: safeUpdates }, { new: true });
    } else {
      doc = await InvitationModel.findOneAndUpdate({ invitation_id: id }, { $set: safeUpdates }, { new: true });
    }
    return invitationDocToInvitation(doc);
  },

  async findInvitationsByMerchantId(merchantId: string): Promise<Invitation[]> {
    const docs = await InvitationModel.find({ merchantId });
    return docs.map(d => invitationDocToInvitation(d)!).filter(Boolean);
  },

  async createApiKey(apiKey: ApiKey): Promise<ApiKey> {
    const doc = await ApiKeyModel.create({
      key_id: apiKey.id,
      merchant_id: apiKey.merchant_id,
      name: apiKey.name,
      public_key: apiKey.public_key,
      secret_key_hash: apiKey.secret_key_hash,
      environment: apiKey.environment,
      status: apiKey.status,
      permissions: apiKey.permissions ?? [],
      last_used_at: apiKey.last_used_at,
      expires_at: apiKey.expires_at
    });
    return apiKeyDocToApiKey(doc)!;
  },

  async findApiKeyById(id: string): Promise<ApiKey | null> {
    if (mongoose.Types.ObjectId.isValid(id) && id.length === 24) {
      const doc = await ApiKeyModel.findById(id);
      return apiKeyDocToApiKey(doc);
    }
    const doc = await ApiKeyModel.findOne({ key_id: id });
    return apiKeyDocToApiKey(doc);
  },

  async findApiKeyByPublicKey(publicKey: string): Promise<ApiKey | null> {
    const doc = await ApiKeyModel.findOne({ public_key: publicKey });
    return apiKeyDocToApiKey(doc);
  },

  async findApiKeysByMerchantId(merchantId: string): Promise<ApiKey[]> {
    const docs = await ApiKeyModel.find({ merchant_id: merchantId, status: { $ne: ApiKeyStatus.REVOKED } });
    return docs.map(d => apiKeyDocToApiKey(d)!).filter(Boolean);
  },

  async updateApiKey(id: string, updates: Partial<ApiKey>): Promise<ApiKey | null> {
    const { id: _omitId, ...safeUpdates } = updates as Partial<ApiKey> & { id?: string };
    let doc = null;
    if (mongoose.Types.ObjectId.isValid(id) && id.length === 24) {
      doc = await ApiKeyModel.findByIdAndUpdate(id, { $set: safeUpdates }, { new: true });
    } else {
      doc = await ApiKeyModel.findOneAndUpdate({ key_id: id }, { $set: safeUpdates }, { new: true });
    }
    return apiKeyDocToApiKey(doc);
  },

  async deleteApiKey(id: string): Promise<boolean> {
    if (mongoose.Types.ObjectId.isValid(id) && id.length === 24) {
      const result = await ApiKeyModel.findByIdAndDelete(id);
      return !!result;
    }
    const result = await ApiKeyModel.findOneAndDelete({ key_id: id });
    return !!result;
  },

  async createSession(session: Session): Promise<Session> {
    const doc = await SessionModel.create({
      session_id: session.id,
      userId: session.userId,
      refreshToken: session.refreshToken,
      deviceInfo: session.deviceInfo,
      ipAddress: session.ipAddress,
      lastActiveAt: session.lastActiveAt,
      expiresAt: session.expiresAt,
      isValid: session.isValid
    });
    return sessionDocToSession(doc)!;
  },

  async findSessionById(id: string): Promise<Session | null> {
    if (mongoose.Types.ObjectId.isValid(id) && id.length === 24) {
      const doc = await SessionModel.findById(id);
      return sessionDocToSession(doc);
    }
    const doc = await SessionModel.findOne({ session_id: id });
    return sessionDocToSession(doc);
  },

  async findSessionsByUserId(userId: string): Promise<Session[]> {
    const docs = await SessionModel.find({ userId, isValid: true });
    return docs.map(d => sessionDocToSession(d)!).filter(Boolean);
  },

  async findSessionByRefreshToken(refreshToken: string): Promise<Session | null> {
    const doc = await SessionModel.findOne({ refreshToken });
    return sessionDocToSession(doc);
  },

  async invalidateSession(id: string): Promise<boolean> {
    if (mongoose.Types.ObjectId.isValid(id) && id.length === 24) {
      const doc = await SessionModel.findByIdAndUpdate(id, { $set: { isValid: false } });
      return !!doc;
    }
    const doc = await SessionModel.findOneAndUpdate({ session_id: id }, { $set: { isValid: false } });
    return !!doc;
  },

  async deleteSession(id: string): Promise<boolean> {
    if (mongoose.Types.ObjectId.isValid(id) && id.length === 24) {
      const result = await SessionModel.findByIdAndDelete(id);
      return !!result;
    }
    const result = await SessionModel.findOneAndDelete({ session_id: id });
    return !!result;
  },

  async clearAll(): Promise<void> {
    await UserAccountModel.deleteMany({});
    await RoleModel.deleteMany({});
    await InvitationModel.deleteMany({});
    await ApiKeyModel.deleteMany({});
    await SessionModel.deleteMany({});
  }
};
