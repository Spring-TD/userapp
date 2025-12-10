export enum UserType {
  USER = 'user',
  MERCHANT = 'merchant',
  ADMIN = 'admin'
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
  first_name: string;
  last_name: string;
  phone?: string;
  user_type: UserType;
  status: AccountStatus;
  email_verified: boolean;
  phone_verified: boolean;
  created_at: Date;
  updated_at: Date;
  last_login_at?: Date;
  failed_login_attempts: number;
  locked_until?: Date;
}

export interface User extends BaseUser {
  user_type: UserType.USER | UserType.ADMIN;
  user_merchant_id: string;
  country: string;
  role_id?: string; // ID of the role assigned to this user
}

export interface Merchant extends BaseUser {
  user_type: UserType.MERCHANT;
  user_merchant_id: string;
  country: string;
}

export type UserAccount = User | Merchant;