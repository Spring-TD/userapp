import mongoose from 'mongoose';
import { UserAccount, Role, Invitation } from '../models/User';
import UserAccountModel from './UserModel';
import RoleModel from './RoleModel';
import InvitationModel from './InvitationModel';

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
  const o = doc.toObject() as Record<string, unknown> & { _id: mongoose.Types.ObjectId };
  const { _id, __v, ...rest } = o;
  return { id: _id.toString(), ...rest } as unknown as Invitation;
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

  async createRole(roleData: Omit<Role, 'id' | 'created_at' | 'updated_at'>): Promise<Role> {
    const doc = await RoleModel.create(roleData);
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
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await InvitationModel.findById(id);
    return invitationDocToInvitation(doc);
  },

  async updateInvitation(id: string, updates: Partial<Invitation>): Promise<Invitation | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const { id: _omitId, ...safeUpdates } = updates as Partial<Invitation> & { id?: string };
    const doc = await InvitationModel.findByIdAndUpdate(id, { $set: safeUpdates }, { new: true });
    return invitationDocToInvitation(doc);
  },

  async findInvitationsByMerchantId(merchantId: string): Promise<Invitation[]> {
    const docs = await InvitationModel.find({ merchantId });
    return docs.map(d => invitationDocToInvitation(d)!).filter(Boolean);
  },

  async clearAll(): Promise<void> {
    await UserAccountModel.deleteMany({});
    await RoleModel.deleteMany({});
    await InvitationModel.deleteMany({});
  }
};
