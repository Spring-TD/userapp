export interface MerchantRegistrationForm {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  country: string;
  password: string;
}

export interface UserRegistrationForm {
  user_merchant_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  country: string;
  password: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  details?: string;
}