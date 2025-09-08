export enum UserType {
  USER = 'user',
  MERCHANT = 'merchant'
}

export enum AccountStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DEACTIVATED = 'deactivated'
}

export interface BaseUser {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  userType: UserType;
  status: AccountStatus;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  failedLoginAttempts: number;
  lockedUntil?: Date;
}

export interface User extends BaseUser {
  userType: UserType.USER;
  dateOfBirth?: Date;
  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
}

export interface Merchant extends BaseUser {
  userType: UserType.MERCHANT;
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

export type UserAccount = User | Merchant;