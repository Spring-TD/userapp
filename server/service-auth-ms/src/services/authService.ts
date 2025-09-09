import { User, Merchant, UserType, AccountStatus, UserAccount } from '../models/User';
import { mockDb } from '../utils/mockDatabase';
import { hashPassword } from '../utils/crypto';
import { logger } from '../utils/logger';

export interface UserRegistrationData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  user_merchant_id: string;
  country: string;
}

export interface MerchantRegistrationData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  user_merchant_id: string;
  country: string;
}

export class AuthService {
  /**
   * Register a new user
   */
  static async registerUser(userData: UserRegistrationData): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      // Check if email already exists
      const existingUser = await mockDb.findUserByEmail(userData.email);
      if (existingUser) {
        return {
          success: false,
          error: 'Email address is already registered'
        };
      }

      // Hash password
      const hashedPassword = await hashPassword(userData.password);

      // Create user object
      const userToCreate: Omit<User, 'id' | 'created_at' | 'updated_at' | 'failed_login_attempts'> = {
        email: userData.email.toLowerCase(),
        password: hashedPassword,
        first_name: userData.first_name,
        last_name: userData.last_name,
        user_type: UserType.USER,
        status: AccountStatus.PENDING,
        email_verified: false,
        phone_verified: false,
        user_merchant_id: userData.user_merchant_id,
        country: userData.country,
        ...(userData.phone && { phone: userData.phone })
      };

      const createdUser = await mockDb.createUser(userToCreate) as User;

      logger.info('User registered successfully', {
        userId: createdUser.id,
        email: createdUser.email,
        user_type: createdUser.user_type
      });

      // Remove password from response
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userResponse } = createdUser;

      return {
        success: true,
        user: userResponse as User
      };
    } catch (error) {
      logger.error('Error registering user', { error: error instanceof Error ? error.message : 'Unknown error' });
      return {
        success: false,
        error: 'Internal server error during registration'
      };
    }
  }

  /**
   * Register a new merchant
   */
  static async registerMerchant(merchantData: MerchantRegistrationData): Promise<{ success: boolean; merchant?: Merchant; error?: string }> {
    try {
      // Check if email already exists
      const existingUser = await mockDb.findUserByEmail(merchantData.email);
      if (existingUser) {
        return {
          success: false,
          error: 'Email address is already registered'
        };
      }

      // Hash password
      const hashedPassword = await hashPassword(merchantData.password);

      // Create merchant object
      const merchantToCreate: Omit<Merchant, 'id' | 'created_at' | 'updated_at' | 'failed_login_attempts'> = {
        email: merchantData.email.toLowerCase(),
        password: hashedPassword,
        first_name: merchantData.first_name,
        last_name: merchantData.last_name,
        user_type: UserType.MERCHANT,
        status: AccountStatus.PENDING,
        email_verified: false,
        phone_verified: false,
        user_merchant_id: merchantData.user_merchant_id,
        country: merchantData.country,
        ...(merchantData.phone && { phone: merchantData.phone })
      };

      const createdMerchant = await mockDb.createUser(merchantToCreate) as Merchant;

      logger.info('Merchant registered successfully', {
        userId: createdMerchant.id,
        email: createdMerchant.email,
        user_type: createdMerchant.user_type,
        user_merchant_id: createdMerchant.user_merchant_id
      });

      // Remove password from response
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...merchantResponse } = createdMerchant;

      return {
        success: true,
        merchant: merchantResponse as Merchant
      };
    } catch (error) {
      logger.error('Error registering merchant', { error: error instanceof Error ? error.message : 'Unknown error' });
      return {
        success: false,
        error: 'Internal server error during registration'
      };
    }
  }

  /**
   * Check if email exists
   */
  static async emailExists(email: string): Promise<boolean> {
    const user = await mockDb.findUserByEmail(email);
    return user !== null;
  }

  /**
   * Get user by email
   */
  static async getUserByEmail(email: string): Promise<UserAccount | null> {
    return mockDb.findUserByEmail(email);
  }

  /**
   * Get user by ID
   */
  static async getUserById(id: string): Promise<UserAccount | null> {
    return mockDb.findUserById(id);
  }
}