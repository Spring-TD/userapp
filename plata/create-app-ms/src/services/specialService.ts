import axios from 'axios';
import { config } from '../config/environment';
import { App } from '../types/app';

interface Product {
  id: string;
  name: string;
  description: string;
  type: string;
  appId: string;
  createdAt: string;
  updatedAt: string;
}

interface Wallet {
  id: string;
  mainBalance: number;
  ledgerBalance: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  status: string;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface Transaction {
  id: string;
  walletId: string;
  amount: number;
  type: string;
  status: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

interface Document {
  id: string;
  appId: string;
  userId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string;
  uploadedAt: string;
  status: string;
}

interface ProductApplication {
  id: string;
  userId: string;
  productId: string;
  status: string;
  details: string;
  createdAt: string;
  updatedAt: string;
}

interface Subscription {
  id: string;
  userId: string;
  productId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface CallbackRegistration {
  id: string;
  userId: string;
  eventType: string;
  callbackUrl: string;
  createdAt: string;
  updatedAt: string;
}

export class SpecialService {
  private static readonly PRODUCT_SERVICE_URL = config.productServiceUrl;
  private static readonly WALLET_SERVICE_URL = config.walletServiceUrl;
  private static readonly SERVICE_AUTH_URL = config.serviceAuthUrl;

  // 1. Get all Apps
  static async getAllApps(): Promise<App[]> {
    // This would typically call the product service or database directly
    // For now, we'll return an empty array as a placeholder
    return [];
  }

  // 2. Get app by ID
  static async getAppById(id: string): Promise<App | null> {
    // This would typically call the product service or database directly
    // For now, we'll return null as a placeholder
    return null;
  }

  // 3. Get all Products
  static async getAllProducts(): Promise<Product[]> {
    try {
      const response = await axios.get(`${this.PRODUCT_SERVICE_URL}/api/v1/products`);
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching products:', error);
      return [];
    }
  }

  // 4. Get product by ID
  static async getProductById(id: string): Promise<Product | null> {
    try {
      const response = await axios.get(`${this.PRODUCT_SERVICE_URL}/api/v1/products/${id}`);
      return response.data.data || null;
    } catch (error) {
      console.error(`Error fetching product ${id}:`, error);
      return null;
    }
  }

  // 5. Get merchant Wallet balance
  static async getMerchantWalletBalance(merchantId: string, walletType: string): Promise<Wallet | null> {
    try {
      const response = await axios.get(`${this.WALLET_SERVICE_URL}/api/v1/wallets/merchant/${merchantId}/type/${walletType}`);
      return response.data.data?.wallet || null;
    } catch (error) {
      console.error(`Error fetching merchant wallet ${merchantId} of type ${walletType}:`, error);
      return null;
    }
  }

  // 6. Get merchant Wallet history
  static async getMerchantWalletHistory(merchantId: string, walletType: string): Promise<Transaction[]> {
    try {
      let url = '';
      switch (walletType) {
        case 'TREASURY':
          url = `${this.WALLET_SERVICE_URL}/api/v1/wallets/treasury/${merchantId}/transactions`;
          break;
        case 'OPERATION':
          url = `${this.WALLET_SERVICE_URL}/api/v1/wallets/operation/${merchantId}/transactions`;
          break;
        case 'KYC':
          url = `${this.WALLET_SERVICE_URL}/api/v1/wallets/kyc/${merchantId}/transactions`;
          break;
        default:
          throw new Error('Invalid wallet type');
      }
      
      const response = await axios.get(url);
      return response.data.data || [];
    } catch (error) {
      console.error(`Error fetching merchant wallet history for ${merchantId}:`, error);
      return [];
    }
  }

  // 7. Create user → create a wallet
  static async createUserAndWallet(userData: any): Promise<{user: User | null, wallet: Wallet | null}> {
    try {
      // First create the user
      const userResponse = await axios.post(`${this.SERVICE_AUTH_URL}/api/v1/auth/register/user`, userData);
      const user = userResponse.data.data?.user || null;
      
      // Then create a wallet for the user
      let wallet = null;
      if (user) {
        const walletResponse = await axios.post(`${this.WALLET_SERVICE_URL}/api/v1/wallets/user`, {
          userId: user.id,
          merchantId: userData.user_merchant_id,
          name: `Wallet for ${user.firstName} ${user.lastName}`,
          currency: 'USD'
        });
        wallet = walletResponse.data.data?.wallet || null;
      }
      
      return { user, wallet };
    } catch (error) {
      console.error('Error creating user and wallet:', error);
      return { user: null, wallet: null };
    }
  }

  // 8. Get all users
  static async getAllUsers(): Promise<User[]> {
    try {
      // This would typically require admin privileges
      // For now, we'll return an empty array as a placeholder
      return [];
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  }

  // 9. Get user details by ID
  static async getUserById(id: string): Promise<User | null> {
    try {
      const response = await axios.get(`${this.SERVICE_AUTH_URL}/api/v1/user/info/${id}`);
      return response.data.data?.user || null;
    } catch (error) {
      console.error(`Error fetching user ${id}:`, error);
      return null;
    }
  }

  // 10. Get user's wallet
  static async getUserWallet(userId: string): Promise<Wallet | null> {
    try {
      const response = await axios.get(`${this.WALLET_SERVICE_URL}/api/v1/wallets/user/${userId}`);
      return response.data.data?.wallet || null;
    } catch (error) {
      console.error(`Error fetching wallet for user ${userId}:`, error);
      return null;
    }
  }

  // 11. Get all users wallet
  static async getAllUsersWallet(merchantId: string): Promise<Wallet[]> {
    try {
      const response = await axios.get(`${this.WALLET_SERVICE_URL}/api/v1/wallets/merchant/${merchantId}/users`);
      return response.data.data?.wallets || [];
    } catch (error) {
      console.error(`Error fetching all user wallets for merchant ${merchantId}:`, error);
      return [];
    }
  }

  // 12. Get product's users subscribers → by product Id
  static async getProductSubscribers(productId: string): Promise<User[]> {
    try {
      // This would typically be implemented in the product service
      // For now, we'll return an empty array as a placeholder
      return [];
    } catch (error) {
      console.error(`Error fetching subscribers for product ${productId}:`, error);
      return [];
    }
  }

  // 13. Withdraw from user's wallet
  static async withdrawFromUserWallet(userId: string, amount: number, description: string): Promise<Wallet | null> {
    try {
      const response = await axios.post(`${this.WALLET_SERVICE_URL}/api/v1/wallets/user/${userId}/transfer`, {
        amount,
        description
      });
      return response.data.data?.wallet || null;
    } catch (error) {
      console.error(`Error withdrawing from user ${userId} wallet:`, error);
      return null;
    }
  }

  // 14. Submit docs for a user
  static async submitDocsForUser(userId: string, documentData: any): Promise<Document | null> {
    try {
      // This would typically be implemented in a document service
      // For now, we'll return null as a placeholder
      return null;
    } catch (error) {
      console.error(`Error submitting docs for user ${userId}:`, error);
      return null;
    }
  }

  // 15. Get Drive by user
  static async getDriveByUser(userId: string): Promise<Document[]> {
    try {
      // This would typically be implemented in a drive service
      // For now, we'll return an empty array as a placeholder
      return [];
    } catch (error) {
      console.error(`Error fetching drive documents for user ${userId}:`, error);
      return [];
    }
  }

  // 16. Get Drive by products
  static async getDriveByProducts(productId: string): Promise<Document[]> {
    try {
      // This would typically be implemented in a drive service
      // For now, we'll return an empty array as a placeholder
      return [];
    } catch (error) {
      console.error(`Error fetching drive documents for product ${productId}:`, error);
      return [];
    }
  }

  // 17. Get transaction history for a user
  static async getTransactionHistoryForUser(userId: string): Promise<Transaction[]> {
    try {
      const response = await axios.get(`${this.WALLET_SERVICE_URL}/api/v1/wallets/user/${userId}/transactions`);
      return response.data.data || [];
    } catch (error) {
      console.error(`Error fetching transaction history for user ${userId}:`, error);
      return [];
    }
  }

  // 18. Get all transaction history by product
  static async getAllTransactionHistoryByProduct(productId: string): Promise<Transaction[]> {
    try {
      // This would typically be implemented in a transaction service
      // For now, we'll return an empty array as a placeholder
      return [];
    } catch (error) {
      console.error(`Error fetching transaction history for product ${productId}:`, error);
      return [];
    }
  }

  // 19. Get transaction history by app
  static async getTransactionHistoryByApp(appId: string): Promise<Transaction[]> {
    try {
      // This would typically be implemented in an app service
      // For now, we'll return an empty array as a placeholder
      return [];
    } catch (error) {
      console.error(`Error fetching transaction history for app ${appId}:`, error);
      return [];
    }
  }

  // 20. Subscribe a user to a product
  static async subscribeUserToProduct(userId: string, productId: string): Promise<Subscription | null> {
    try {
      // This would typically be implemented in a subscription service
      // For now, we'll return null as a placeholder
      return null;
    } catch (error) {
      console.error(`Error subscribing user ${userId} to product ${productId}:`, error);
      return null;
    }
  }

  // 21. Get user's product subscription
  static async getUserProductSubscription(userId: string, productId: string): Promise<Subscription | null> {
    try {
      // This would typically be implemented in a subscription service
      // For now, we'll return null as a placeholder
      return null;
    } catch (error) {
      console.error(`Error fetching subscription for user ${userId} and product ${productId}:`, error);
      return null;
    }
  }

  // 22. Apply to product
  static async applyToProduct(userId: string, productId: string, applicationData: any): Promise<ProductApplication | null> {
    try {
      // This would typically be implemented in an application service
      // For now, we'll return null as a placeholder
      return null;
    } catch (error) {
      console.error(`Error applying for product ${productId} by user ${userId}:`, error);
      return null;
    }
  }

  // 23. Get all product application → status, details
  static async getAllProductApplications(productId: string): Promise<ProductApplication[]> {
    try {
      // This would typically be implemented in an application service
      // For now, we'll return an empty array as a placeholder
      return [];
    } catch (error) {
      console.error(`Error fetching applications for product ${productId}:`, error);
      return [];
    }
  }

  // 24. Register callback → user application status, user's wallet events
  static async registerCallback(userId: string, eventType: string, callbackUrl: string): Promise<CallbackRegistration | null> {
    try {
      // This would typically be implemented in a callback service
      // For now, we'll return null as a placeholder
      return null;
    } catch (error) {
      console.error(`Error registering callback for user ${userId}:`, error);
      return null;
    }
  }
}