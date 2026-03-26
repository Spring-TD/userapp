export enum Permission {
  CREATE_ADMIN = 'create_admin',
  EDIT_PRODUCTS = 'edit_products',
  CREATE_PRODUCTS = 'create_products',
  VIEW_PRODUCTS = 'view_products',
  CHANGE_PASSWORD = 'change_password',
  SEE_BILLING = 'see_billing',
  ADD_PAYMENT_METHOD = 'add_payment_method',
  EDIT_PAYMENT_METHOD = 'edit_payment_method',
  CREATE_APP = 'create_app',
  SEE_ACTIVITY_LOG = 'see_activity_log',
  DOWNLOAD_REPORT = 'download_report'
}

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
  deactivated_at?: Date | null;
  failed_login_attempts: number;
  locked_until?: Date;
}

export interface User extends BaseUser {
  user_type: UserType.USER | UserType.ADMIN;
  user_merchant_id: string;
  country: string;
  role_id?: string; // ID of the role assigned to this user
  user_ref?: string; // External user reference (required when password is not set)
}

export interface Merchant extends BaseUser {
  user_type: UserType.MERCHANT;
  user_merchant_id: string;
  country: string;
  callback_url?: string;
  error_logs_url?: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  merchant_id: string; // The merchant who created/owns this role
  created_at: Date;
  updated_at: Date;
}

export interface CreateRoleRequest {
  name: string;
  description: string;
  permissions: Permission[];
}

export interface Invitation {
  id: string;
  email: string;
  roleId: string;
  merchantId: string;
  token: string;
  status: 'pending' | 'accepted' | 'expired';
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInvitationRequest {
  email: string;
  roleId: string;
}

export interface AcceptInvitationRequest {
  token: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export type UserAccount = User | Merchant;