// Special API Service - Advanced endpoints requiring API key authentication
// These endpoints allow merchants to access user data, subscriptions, and advanced features

import { getAccessToken } from '@/lib/cookieAuth';

const SPECIAL_API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'https://account-ms.fly.dev').replace(/\/$/, '');

const getSpecialHeaders = () => {
  const token = typeof window !== 'undefined' ? getAccessToken() : null;
  const specialKey = process.env.NEXT_PUBLIC_SPECIAL_API_KEY;
  const publicKey = process.env.NEXT_PUBLIC_PUBLIC_KEY;

  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...(specialKey && { 'X-Special-Key': specialKey }),
    ...(publicKey && { 'X-Public-Key': publicKey }),
  };
};

// Types
export interface SpecialApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface App {
  id: string;
  name: string;
  websiteUrl: string;
  alias: string;
  description?: string;
  merchantId: string;
  status: string;
  productKeys?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  type: string;
  appId: string;
  status: string;
  referenceNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserSubscription {
  id: string;
  userId: string;
  productId: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'CANCELLED';
  startDate: string;
  endDate?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export interface ProductApplication {
  id: string;
  userId: string;
  productId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  applicationData?: any;
  rejectionReason?: string;
  submittedAt: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserDocument {
  id: string;
  userId: string;
  productId?: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  metadata?: any;
  uploadedAt: string;
}

export interface WalletBalance {
  walletId: string;
  userId?: string;
  merchantId?: string;
  walletType?: string;
  balance: number;
  currency: string;
  status: string;
}

export interface WalletHistory {
  walletId: string;
  transactions: Array<{
    id: string;
    amount: number;
    type: 'CREDIT' | 'DEBIT';
    status: string;
    description: string;
    createdAt: string;
  }>;
  totalTransactions: number;
  totalCredit: number;
  totalDebit: number;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

// App Operations
export const specialAppApi = {
  /**
   * Get all apps (across all merchants)
   */
  async getAllApps() {
    const response = await fetch(`${SPECIAL_API_BASE}/api/v1/special/apps`, {
      headers: getSpecialHeaders(),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch apps');
    }

    return data as SpecialApiResponse<App[]>;
  },

  /**
   * Get app by ID with special access
   */
  async getAppById(appId: string) {
    const response = await fetch(`${SPECIAL_API_BASE}/api/v1/special/apps/${appId}`, {
      headers: getSpecialHeaders(),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch app');
    }

    return data as SpecialApiResponse<App>;
  },
};

// Product Operations
export const specialProductApi = {
  /**
   * Get all products (across all apps)
   */
  async getAllProducts() {
    const response = await fetch(`${SPECIAL_API_BASE}/api/v1/special/products`, {
      headers: getSpecialHeaders(),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch products');
    }

    return data as SpecialApiResponse<Product[]>;
  },

  /**
   * Get product by ID with special access
   */
  async getProductById(productId: string) {
    const response = await fetch(`${SPECIAL_API_BASE}/api/v1/special/products/${productId}`, {
      headers: getSpecialHeaders(),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch product');
    }

    return data as SpecialApiResponse<Product>;
  },

  /**
   * Get all users subscribed to a product
   */
  async getProductSubscribers(productId: string) {
    const response = await fetch(
      `${SPECIAL_API_BASE}/api/v1/special/products/${productId}/subscribers`,
      { headers: getSpecialHeaders() }
    );

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch product subscribers');
    }

    return data as SpecialApiResponse<UserSubscription[]>;
  },
};

// Wallet Operations
export const specialWalletApi = {
  /**
   * Get merchant wallet balance
   */
  async getMerchantWalletBalance(
    merchantId: string,
    walletType: 'TREASURY' | 'OPERATION' | 'KYC'
  ) {
    const response = await fetch(
      `${SPECIAL_API_BASE}/api/v1/special/wallets/merchant/${merchantId}/balance/${walletType}`,
      { headers: getSpecialHeaders() }
    );

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch merchant wallet balance');
    }

    return data as SpecialApiResponse<WalletBalance>;
  },

  /**
   * Get merchant wallet transaction history
   */
  async getMerchantWalletHistory(
    merchantId: string,
    walletType: 'TREASURY' | 'OPERATION' | 'KYC'
  ) {
    const response = await fetch(
      `${SPECIAL_API_BASE}/api/v1/special/wallets/merchant/${merchantId}/history/${walletType}`,
      { headers: getSpecialHeaders() }
    );

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch merchant wallet history');
    }

    return data as SpecialApiResponse<WalletHistory>;
  },

  /**
   * Get user's wallet
   */
  async getUserWallet(userId: string) {
    const response = await fetch(`${SPECIAL_API_BASE}/api/v1/special/wallets/user/${userId}`, {
      headers: getSpecialHeaders(),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch user wallet');
    }

    return data as SpecialApiResponse<WalletBalance>;
  },

  /**
   * Get all users' wallets for a merchant
   */
  async getAllUsersWallets(merchantId: string) {
    const response = await fetch(
      `${SPECIAL_API_BASE}/api/v1/special/wallets/users/${merchantId}`,
      { headers: getSpecialHeaders() }
    );

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch users wallets');
    }

    return data as SpecialApiResponse<WalletBalance[]>;
  },

  /**
   * Withdraw from user's wallet
   */
  async withdrawFromUserWallet(
    userId: string,
    withdrawData: {
      amount: number;
      description: string;
      destination?: string;
    }
  ) {
    const response = await fetch(
      `${SPECIAL_API_BASE}/api/v1/special/wallets/user/${userId}/withdraw`,
      {
        method: 'POST',
        headers: getSpecialHeaders(),
        body: JSON.stringify(withdrawData),
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to withdraw from user wallet');
    }

    return data as SpecialApiResponse<any>;
  },
};

// User Operations
export const specialUserApi = {
  /**
   * Create user and wallet
   */
  async createUserAndWallet(userData: {
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    merchantId: string;
  }) {
    const response = await fetch(`${SPECIAL_API_BASE}/api/v1/special/users`, {
      method: 'POST',
      headers: getSpecialHeaders(),
      body: JSON.stringify(userData),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to create user');
    }

    return data as SpecialApiResponse<{ user: User; wallet: WalletBalance }>;
  },

  /**
   * Get all users
   */
  async getAllUsers() {
    const response = await fetch(`${SPECIAL_API_BASE}/api/v1/special/users`, {
      headers: getSpecialHeaders(),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch users');
    }

    return data as SpecialApiResponse<User[]>;
  },

  /**
   * Get user by ID
   */
  async getUserById(userId: string) {
    const response = await fetch(`${SPECIAL_API_BASE}/api/v1/special/users/${userId}`, {
      headers: getSpecialHeaders(),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch user');
    }

    return data as SpecialApiResponse<User>;
  },
};

// Transaction Operations
export const specialTransactionApi = {
  /**
   * Get transaction history for a user
   */
  async getTransactionHistoryForUser(userId: string) {
    const response = await fetch(
      `${SPECIAL_API_BASE}/api/v1/special/transactions/user/${userId}`,
      { headers: getSpecialHeaders() }
    );

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch user transaction history');
    }

    return data as SpecialApiResponse<any[]>;
  },

  /**
   * Get all transaction history by product
   */
  async getAllTransactionHistoryByProduct(productId: string) {
    const response = await fetch(
      `${SPECIAL_API_BASE}/api/v1/special/transactions/product/${productId}`,
      { headers: getSpecialHeaders() }
    );

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch product transaction history');
    }

    return data as SpecialApiResponse<any[]>;
  },

  /**
   * Get transaction history by app
   */
  async getTransactionHistoryByApp(appId: string) {
    const response = await fetch(
      `${SPECIAL_API_BASE}/api/v1/special/transactions/app/${appId}`,
      { headers: getSpecialHeaders() }
    );

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch app transaction history');
    }

    return data as SpecialApiResponse<any[]>;
  },
};

// Drive/Document Operations
export const specialDriveApi = {
  /**
   * Submit documents for a user
   */
  async submitDocsForUser(
    userId: string,
    documentData: {
      fileName: string;
      fileType: string;
      fileSize: number;
      fileUrl: string;
      productId?: string;
      metadata?: any;
    }
  ) {
    const response = await fetch(
      `${SPECIAL_API_BASE}/api/v1/special/users/${userId}/documents`,
      {
        method: 'POST',
        headers: getSpecialHeaders(),
        body: JSON.stringify(documentData),
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to submit documents');
    }

    return data as SpecialApiResponse<UserDocument>;
  },

  /**
   * Get drive documents by user
   */
  async getDriveByUser(userId: string) {
    const response = await fetch(`${SPECIAL_API_BASE}/api/v1/special/drive/users/${userId}`, {
      headers: getSpecialHeaders(),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch user documents');
    }

    return data as SpecialApiResponse<UserDocument[]>;
  },

  /**
   * Get drive documents by product
   */
  async getDriveByProducts(productId: string) {
    const response = await fetch(
      `${SPECIAL_API_BASE}/api/v1/special/drive/products/${productId}`,
      { headers: getSpecialHeaders() }
    );

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch product documents');
    }

    return data as SpecialApiResponse<UserDocument[]>;
  },
};

// Subscription Operations
export const specialSubscriptionApi = {
  /**
   * Subscribe a user to a product
   */
  async subscribeUserToProduct(
    userId: string,
    productId: string,
    subscriptionData?: {
      startDate?: string;
      endDate?: string;
      metadata?: any;
    }
  ) {
    const response = await fetch(
      `${SPECIAL_API_BASE}/api/v1/special/subscriptions/users/${userId}/products/${productId}`,
      {
        method: 'POST',
        headers: getSpecialHeaders(),
        body: JSON.stringify(subscriptionData || {}),
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to subscribe user to product');
    }

    return data as SpecialApiResponse<UserSubscription>;
  },

  /**
   * Get user's product subscription
   */
  async getUserProductSubscription(userId: string, productId: string) {
    const response = await fetch(
      `${SPECIAL_API_BASE}/api/v1/special/subscriptions/users/${userId}/products/${productId}`,
      { headers: getSpecialHeaders() }
    );

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch user subscription');
    }

    return data as SpecialApiResponse<UserSubscription>;
  },
};

// Application Operations
export const specialApplicationApi = {
  /**
   * Apply user to a product
   */
  async applyToProduct(
    userId: string,
    productId: string,
    applicationData?: any
  ) {
    const response = await fetch(
      `${SPECIAL_API_BASE}/api/v1/special/applications/users/${userId}/products/${productId}`,
      {
        method: 'POST',
        headers: getSpecialHeaders(),
        body: JSON.stringify({ applicationData }),
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to apply to product');
    }

    return data as SpecialApiResponse<ProductApplication>;
  },

  /**
   * Get all applications for a product
   */
  async getAllProductApplications(productId: string) {
    const response = await fetch(
      `${SPECIAL_API_BASE}/api/v1/special/applications/products/${productId}`,
      { headers: getSpecialHeaders() }
    );

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch product applications');
    }

    return data as SpecialApiResponse<ProductApplication[]>;
  },
};

// Callback/Webhook Operations
export const specialCallbackApi = {
  /**
   * Register callback for user events
   */
  async registerCallback(
    userId: string,
    callbackData: {
      url: string;
      events: string[];
      secret?: string;
    }
  ) {
    const response = await fetch(
      `${SPECIAL_API_BASE}/api/v1/special/callbacks/users/${userId}`,
      {
        method: 'POST',
        headers: getSpecialHeaders(),
        body: JSON.stringify(callbackData),
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to register callback');
    }

    return data as SpecialApiResponse<any>;
  },
};

// Combined export for convenience
export const specialApiService = {
  apps: specialAppApi,
  products: specialProductApi,
  wallets: specialWalletApi,
  users: specialUserApi,
  transactions: specialTransactionApi,
  drive: specialDriveApi,
  subscriptions: specialSubscriptionApi,
  applications: specialApplicationApi,
  callbacks: specialCallbackApi,
};

export default specialApiService;
