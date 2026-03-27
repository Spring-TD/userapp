import { UserAccount } from '../models/User';
import { Role } from '../models/Role';
import { Invitation } from '../models/Invitation';
import { ApiKey, ApiKeyStatus } from '../models/ApiKey';
import { Session } from '../models/Session';
import { v4 as uuidv4 } from 'uuid';
import {
  UserModel,
  RoleModel,
  InvitationModel,
  ApiKeyModel,
  SessionModel
} from '../models/authModels';

// Database adapter (formerly MockDatabase)
class MockDatabase {

  /**
   * Find user by email
   */
  async findUserByEmail(email: string): Promise<UserAccount | null> {
    const user = await UserModel.findOne({ email: email.toLowerCase() });
    return user ? (user.toObject() as unknown as UserAccount) : null;
  }

  /**
   * Find user by ID
   */
  async findUserById(id: string): Promise<UserAccount | null> {
    const user = await UserModel.findById(id);
    return user ? (user.toObject() as unknown as UserAccount) : null;
  }

  /**
   * Create a new user
   */
  async createUser(userData: Omit<UserAccount, 'id' | 'created_at' | 'updated_at' | 'failed_login_attempts'>): Promise<UserAccount> {
    const id = uuidv4();
    const now = new Date();

    const user = new UserModel({
      _id: id, // Set _id to match uuid
      ...userData,
      email: userData.email.toLowerCase(),
      created_at: now,
      updated_at: now,
      failed_login_attempts: 0
    });

    const savedUser = await user.save();
    return savedUser.toObject() as unknown as UserAccount;
  }

  /**
   * Update user
   */
  async updateUser(id: string, updates: Partial<UserAccount>): Promise<UserAccount | null> {
    const user = await UserModel.findByIdAndUpdate(
      id,
      { ...updates, updated_at: new Date() },
      { new: true }
    );
    return user ? (user.toObject() as unknown as UserAccount) : null;
  }

  /**
   * Delete user
   */
  async deleteUser(id: string): Promise<boolean> {
    const result = await UserModel.deleteOne({ _id: id });
    return result.deletedCount ? result.deletedCount > 0 : false;
  }

  /**
   * Get all users (for testing purposes)
   */
  async getAllUsers(): Promise<UserAccount[]> {
    const users = await UserModel.find({});
    return users.map(u => u.toObject() as unknown as UserAccount);
  }

  /**
   * Find users by merchant ID
   */
  async findUsersByMerchantId(merchantId: string): Promise<UserAccount[]> {
    const users = await UserModel.find({
      user_merchant_id: merchantId,
      user_type: 'user'
    });
    return users.map(u => u.toObject() as unknown as UserAccount);
  }

  /**
   * Create a new role
   */
  async createRole(role: Role): Promise<Role> {
    // Role interface has 'id', we should use it for _id
    const newRole = new RoleModel({
      _id: role.id,
      ...role
    });
    const savedRole = await newRole.save();
    return savedRole.toObject() as unknown as Role;
  }

  /**
   * Find role by ID
   */
  async findRoleById(id: string): Promise<Role | null> {
    const role = await RoleModel.findById(id);
    return role ? (role.toObject() as unknown as Role) : null;
  }

  /**
   * Find roles by merchant ID
   */
  async findRolesByMerchantId(merchantId: string): Promise<Role[]> {
    const roles = await RoleModel.find({ merchant_id: merchantId });
    return roles.map(r => r.toObject() as unknown as Role);
  }

  /**
   * Update role
   */
  async updateRole(id: string, updates: Partial<Role>): Promise<Role | null> {
    const role = await RoleModel.findByIdAndUpdate(
      id,
      { ...updates, updated_at: new Date() },
      { new: true }
    );
    return role ? (role.toObject() as unknown as Role) : null;
  }

  /**
   * Delete role
   */
  async deleteRole(id: string): Promise<boolean> {
    const result = await RoleModel.deleteOne({ _id: id });
    return result.deletedCount ? result.deletedCount > 0 : false;
  }

  /**
   * Create invitation
   */
  async createInvitation(invitation: Invitation): Promise<Invitation> {
    const newInvitation = new InvitationModel({
      _id: invitation.id,
      ...invitation
    });
    const saved = await newInvitation.save();
    return saved.toObject() as unknown as Invitation;
  }

  /**
   * Find invitation by token
   */
  async findInvitationByToken(token: string): Promise<Invitation | null> {
    const invite = await InvitationModel.findOne({ token });
    return invite ? (invite.toObject() as unknown as Invitation) : null;
  }

  /**
   * Find invitation by ID
   */
  async findInvitationById(id: string): Promise<Invitation | null> {
    const invite = await InvitationModel.findById(id);
    return invite ? (invite.toObject() as unknown as Invitation) : null;
  }

  /**
   * Update invitation
   */
  async updateInvitation(id: string, updates: Partial<Invitation>): Promise<Invitation | null> {
    const invite = await InvitationModel.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true }
    );
    return invite ? (invite.toObject() as unknown as Invitation) : null;
  }

  /**
   * Find invitations by merchant ID
   */
  async findInvitationsByMerchantId(merchantId: string): Promise<Invitation[]> {
    const invites = await InvitationModel.find({ merchantId });
    return invites.map(i => i.toObject() as unknown as Invitation);
  }

  /**
   * Create ApiKey
   */
  async createApiKey(apiKey: ApiKey): Promise<ApiKey> {
    const newKey = new ApiKeyModel({
      _id: apiKey.id,
      ...apiKey
    });
    const saved = await newKey.save();
    return saved.toObject() as unknown as ApiKey;
  }

  /**
   * Find ApiKey by ID
   */
  async findApiKeyById(id: string): Promise<ApiKey | null> {
    const key = await ApiKeyModel.findById(id);
    return key ? (key.toObject() as unknown as ApiKey) : null;
  }

  /**
   * Find ApiKey by Public Key
   */
  async findApiKeyByPublicKey(publicKey: string): Promise<ApiKey | null> {
    const key = await ApiKeyModel.findOne({ public_key: publicKey });
    return key ? (key.toObject() as unknown as ApiKey) : null;
  }

  /**
   * Find ApiKeys by Merchant ID
   */
  async findApiKeysByMerchantId(merchantId: string): Promise<ApiKey[]> {
    const keys = await ApiKeyModel.find({
      merchant_id: merchantId,
      status: { $ne: ApiKeyStatus.REVOKED }
    });
    return keys.map(k => k.toObject() as unknown as ApiKey);
  }

  /**
   * Update ApiKey
   */
  async updateApiKey(id: string, updates: Partial<ApiKey>): Promise<ApiKey | null> {
    const key = await ApiKeyModel.findByIdAndUpdate(
      id,
      { ...updates, updated_at: new Date() },
      { new: true }
    );
    return key ? (key.toObject() as unknown as ApiKey) : null;
  }

  /**
   * Delete ApiKey (Revoke)
   */
  async deleteApiKey(id: string): Promise<boolean> {
    const result = await ApiKeyModel.deleteOne({ _id: id });
    return result.deletedCount ? result.deletedCount > 0 : false;
  }

  /**
   * Create Session
   */
  async createSession(session: Session): Promise<Session> {
    const newSession = new SessionModel({
      _id: session.id,
      ...session
    });
    const saved = await newSession.save();
    return saved.toObject() as unknown as Session;
  }

  /**
   * Find Session by ID
   */
  async findSessionById(id: string): Promise<Session | null> {
    const session = await SessionModel.findById(id);
    return session ? (session.toObject() as unknown as Session) : null;
  }

  /**
   * Find Sessions by User ID
   */
  async findSessionsByUserId(userId: string): Promise<Session[]> {
    const sessions = await SessionModel.find({
      userId,
      isValid: true
    });
    return sessions.map(s => s.toObject() as unknown as Session);
  }

  /**
   * Find Session by Refresh Token
   */
  async findSessionByRefreshToken(refreshToken: string): Promise<Session | null> {
    const session = await SessionModel.findOne({ refreshToken });
    return session ? (session.toObject() as unknown as Session) : null;
  }

  /**
   * Invalidate Session
   */
  async invalidateSession(id: string): Promise<boolean> {
    const result = await SessionModel.updateOne(
      { _id: id },
      { isValid: false }
    );
    return result.modifiedCount > 0;
  }

  /**
   * Delete Session
   */
  async deleteSession(id: string): Promise<boolean> {
    const result = await SessionModel.deleteOne({ _id: id });
    return result.deletedCount ? result.deletedCount > 0 : false;
  }

  /**
   * Clear all data (for testing purposes)
   */
  async clearAll(): Promise<void> {
    await UserModel.deleteMany({});
    await RoleModel.deleteMany({});
    await InvitationModel.deleteMany({});
    await ApiKeyModel.deleteMany({});
    await SessionModel.deleteMany({});
  }
}

// Export singleton instance
export const mockDb = new MockDatabase();