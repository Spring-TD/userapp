import { User, Merchant, UserType, AccountStatus, UserAccount } from '../models/User';
import { mockDb } from '../utils/mockDatabase';
import { hashPassword } from '../utils/crypto';
import { logger } from '../utils/logger';

export interface UserRegistrationData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: Date;
  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
}

export interface MerchantRegistrationData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  businessName: string;
  businessType: string;
  businessRegistrationNumber?: string;
  businessAddress: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  website?: string;
  description?: string;
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
      const userToCreate: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'failedLoginAttempts'> = {
        email: userData.email.toLowerCase(),
        password: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        userType: UserType.USER,
        status: AccountStatus.PENDING,
        emailVerified: false,
        phoneVerified: false,
        ...(userData.dateOfBirth && { dateOfBirth: userData.dateOfBirth }),
        ...(userData.address && { address: userData.address })
      };

      const createdUser = await mockDb.createUser(userToCreate) as User;

      logger.info('User registered successfully', {
        userId: createdUser.id,
        email: createdUser.email,
        userType: createdUser.userType
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
      const merchantToCreate: Omit<Merchant, 'id' | 'createdAt' | 'updatedAt' | 'failedLoginAttempts'> = {
        email: merchantData.email.toLowerCase(),
        password: hashedPassword,
        firstName: merchantData.firstName,
        lastName: merchantData.lastName,
        userType: UserType.MERCHANT,
        status: AccountStatus.PENDING,
        emailVerified: false,
        phoneVerified: false,
        businessName: merchantData.businessName,
        businessType: merchantData.businessType,
        businessAddress: merchantData.businessAddress,
        ...(merchantData.phone && { phone: merchantData.phone }),
        ...(merchantData.businessRegistrationNumber && { businessRegistrationNumber: merchantData.businessRegistrationNumber }),
        ...(merchantData.website && { website: merchantData.website }),
        ...(merchantData.description && { description: merchantData.description })
      };

      const createdMerchant = await mockDb.createUser(merchantToCreate) as Merchant;

      logger.info('Merchant registered successfully', {
        userId: createdMerchant.id,
        email: createdMerchant.email,
        userType: createdMerchant.userType,
        businessName: createdMerchant.businessName
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