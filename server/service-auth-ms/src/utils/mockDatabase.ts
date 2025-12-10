import { UserAccount } from '../models/User';
import { Role } from '../models/Role';
import { Invitation } from '../models/Invitation';
import { v4 as uuidv4 } from 'uuid';

// Mock in-memory database
class MockDatabase {
  private users: Map<string, UserAccount> = new Map();
  private emailIndex: Map<string, string> = new Map(); // email -> userId mapping
  private roles: Map<string, Role> = new Map();
  private invitations: Map<string, Invitation> = new Map();

  /**
   * Find user by email
   */
  async findUserByEmail(email: string): Promise<UserAccount | null> {
    const userId = this.emailIndex.get(email.toLowerCase());
    if (!userId) return null;
    return this.users.get(userId) || null;
  }

  /**
   * Find user by ID
   */
  async findUserById(id: string): Promise<UserAccount | null> {
    return this.users.get(id) || null;
  }

  /**
   * Create a new user
   */
  async createUser(userData: Omit<UserAccount, 'id' | 'created_at' | 'updated_at' | 'failed_login_attempts'>): Promise<UserAccount> {
    const id = uuidv4();
    const now = new Date();

    const user: UserAccount = {
      ...userData,
      id,
      created_at: now,
      updated_at: now,
      failed_login_attempts: 0
    } as UserAccount;

    this.users.set(id, user);
    this.emailIndex.set(userData.email.toLowerCase(), id);

    return user;
  }

  /**
   * Update user
   */
  async updateUser(id: string, updates: Partial<UserAccount>): Promise<UserAccount | null> {
    const user = this.users.get(id);
    if (!user) return null;

    const updatedUser = {
      ...user,
      ...updates,
      updated_at: new Date()
    } as UserAccount;

    this.users.set(id, updatedUser);
    return updatedUser;
  }

  /**
   * Delete user
   */
  async deleteUser(id: string): Promise<boolean> {
    const user = this.users.get(id);
    if (!user) return false;

    this.users.delete(id);
    this.emailIndex.delete(user.email.toLowerCase());
    return true;
  }

  /**
   * Get all users (for testing purposes)
   */
  async getAllUsers(): Promise<UserAccount[]> {
    return Array.from(this.users.values());
  }

  /**
   * Find users by merchant ID
   */
  async findUsersByMerchantId(merchantId: string): Promise<UserAccount[]> {
    const result: UserAccount[] = [];
    for (const user of this.users.values()) {
      if ('user_merchant_id' in user && user.user_merchant_id === merchantId && user.user_type === 'user') {
        result.push(user);
      }
    }
    return result;
  }

  /**
   * Create a new role
   */
  async createRole(role: Role): Promise<Role> {
    this.roles.set(role.id, role);
    return role;
  }

  /**
   * Find role by ID
   */
  async findRoleById(id: string): Promise<Role | null> {
    return this.roles.get(id) || null;
  }

  /**
   * Find roles by merchant ID
   */
  async findRolesByMerchantId(merchantId: string): Promise<Role[]> {
    const result: Role[] = [];
    for (const role of this.roles.values()) {
      if (role.merchant_id === merchantId) {
        result.push(role);
      }
    }
    return result;
  }

  /**
   * Create invitation
   */
  async createInvitation(invitation: Invitation): Promise<Invitation> {
    this.invitations.set(invitation.id, invitation);
    return invitation;
  }

  /**
   * Find invitation by token
   */
  async findInvitationByToken(token: string): Promise<Invitation | null> {
    for (const invite of this.invitations.values()) {
      if (invite.token === token) {
        return invite;
      }
    }
    return null;
  }

  /**
   * Find invitation by ID
   */
  async findInvitationById(id: string): Promise<Invitation | null> {
    return this.invitations.get(id) || null;
  }

  /**
   * Update invitation
   */
  async updateInvitation(id: string, updates: Partial<Invitation>): Promise<Invitation | null> {
    const invite = this.invitations.get(id);
    if (!invite) return null;

    const updatedInvite = {
      ...invite,
      ...updates,
      updatedAt: new Date()
    };

    this.invitations.set(id, updatedInvite);
    return updatedInvite;
  }

  /**
   * Find invitations by merchant ID
   */
  async findInvitationsByMerchantId(merchantId: string): Promise<Invitation[]> {
    const result: Invitation[] = [];
    for (const invite of this.invitations.values()) {
      if (invite.merchantId === merchantId) {
        result.push(invite);
      }
    }
    return result;
  }

  /**
   * Clear all data (for testing purposes)
   */
  async clearAll(): Promise<void> {
    this.users.clear();
    this.emailIndex.clear();
    this.roles.clear();
    this.invitations.clear();
  }
}

// Export singleton instance
export const mockDb = new MockDatabase();