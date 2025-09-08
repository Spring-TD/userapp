import { UserAccount } from '../models/User';
import { v4 as uuidv4 } from 'uuid';

// Mock in-memory database
class MockDatabase {
  private users: Map<string, UserAccount> = new Map();
  private emailIndex: Map<string, string> = new Map(); // email -> userId mapping

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
  async createUser(userData: Omit<UserAccount, 'id' | 'createdAt' | 'updatedAt' | 'failedLoginAttempts'>): Promise<UserAccount> {
    const id = uuidv4();
    const now = new Date();
    
    const user: UserAccount = {
      ...userData,
      id,
      createdAt: now,
      updatedAt: now,
      failedLoginAttempts: 0
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
      updatedAt: new Date()
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
   * Clear all data (for testing purposes)
   */
  async clearAll(): Promise<void> {
    this.users.clear();
    this.emailIndex.clear();
  }
}

// Export singleton instance
export const mockDb = new MockDatabase();