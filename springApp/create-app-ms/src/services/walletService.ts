import axios from 'axios';
import { config } from '../config/environment';

interface CreateWalletRequest {
  name: string;
  currency: string;
  merchantWalletType: 'BILLING' | 'KYC' | 'REPAYMENT';
}

interface CreateUserWalletRequest {
  userId: string;
  merchantId: string;
  name: string;
  currency: string;
}

interface CreateSingleWalletResponse {
  wallet: any;
}

interface CreateAllWalletsResponse {
  wallets: any[];
}

type CreateWalletResponseData = CreateSingleWalletResponse | CreateAllWalletsResponse;

interface CreateWalletResponse {
  success: boolean;
  message?: string;
  data?: CreateWalletResponseData;
  error?: string;
}

interface GetMerchantWalletsResponse {
  success: boolean;
  message?: string;
  data?: {
    wallets?: any[];
  };
  error?: string;
}

export class WalletService {
  private static readonly WALLET_SERVICE_URL = config.walletServiceUrl;

  /**
   * Create a user wallet
   * @param userId The user ID
   * @param merchantId The merchant ID
   * @param name The name of the wallet
   * @param currency The currency for the wallet
   * @returns The created wallet or error information
   */
  static async createUserWallet(
    userId: string,
    merchantId: string,
    name?: string,
    currency: string = 'USD'
  ): Promise<CreateWalletResponse> {
    try {
      // In a real implementation, we would need to authenticate with the wallet service
      // For now, we'll make a direct call assuming the service accepts requests without auth
      const response = await axios.post<CreateWalletResponse>(
        `${this.WALLET_SERVICE_URL}/api/v1/wallets/user`,
        {
          userId,
          merchantId,
          name: name || `User Wallet for ${userId}`,
          currency
        },
        {
          headers: {
            'Content-Type': 'application/json'
            // In a real implementation, we would add authentication headers here
          }
        }
      );

      return response.data;
    } catch (error: any) {
      // Handle errors appropriately
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        return {
          success: false,
          error: error.response.data.error
        };
      }
      
      return {
        success: false,
        error: error.message || 'Failed to create user wallet'
      };
    }
  }

  /**
   * Create a merchant wallet of specific type
   * @param merchantId The merchant ID (used as the app ID)
   * @param walletType The type of wallet to create
   * @param name The name of the wallet
   * @returns The created wallet or error information
   */
  static async createMerchantWallet(
    merchantId: string,
    walletType: 'BILLING' | 'KYC' | 'REPAYMENT',
    name?: string
  ): Promise<CreateWalletResponse> {
    try {
      // In a real implementation, we would need to authenticate with the wallet service
      // For now, we'll make a direct call assuming the service accepts requests without auth
      const response = await axios.post<CreateWalletResponse>(
        `${this.WALLET_SERVICE_URL}/api/v1/wallets/merchant`,
        {
          name: name || `${walletType} Wallet for App ${merchantId}`,
          currency: config.merchantWalletCurrency,
          merchantWalletType: walletType
        },
        {
          headers: {
            'Content-Type': 'application/json'
            // In a real implementation, we would add authentication headers here
          }
        }
      );

      return response.data;
    } catch (error: any) {
      // Handle errors appropriately
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        return {
          success: false,
          error: error.response.data.error
        };
      }
      
      return {
        success: false,
        error: error.message || 'Failed to create wallet'
      };
    }
  }

  /**
   * Create all required merchant wallets (Billing, KYC, Repayment)
   * @param merchantId The merchant ID (used as the app ID)
   * @returns The created wallets or error information
   */
  static async createAllMerchantWallets(
    appId: string,
    authHeader?: string,
    appName?: string
  ): Promise<CreateWalletResponse> {
    try {
      const response = await axios.post<CreateWalletResponse>(
        `${this.WALLET_SERVICE_URL}/api/v1/wallets/merchant/all`,
        {
          currency: config.merchantWalletCurrency,
          appId,
          ...(appName ? { appName } : {})
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(authHeader ? { Authorization: authHeader } : {})
          }
        }
      );

      return response.data;
    } catch (error: any) {
      // Handle errors appropriately
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        return {
          success: false,
          error: error.response.data.error
        };
      }
      
      return {
        success: false,
        error: error.message || 'Failed to create wallets'
      };
    }
  }

  /**
   * Fetch all merchant wallets for a specific app.
   * @param merchantId Merchant owner ID
   * @param appId App ID used to scope wallets
   * @param authHeader Optional bearer token for wallet-ms auth
   */
  static async getAllMerchantWallets(
    merchantId: string,
    appId: string,
    authHeader?: string
  ): Promise<GetMerchantWalletsResponse> {
    try {
      const response = await axios.get<GetMerchantWalletsResponse>(
        `${this.WALLET_SERVICE_URL}/api/v1/wallets/merchant/${merchantId}/all`,
        {
          params: { appId },
          headers: {
            'Content-Type': 'application/json',
            ...(authHeader ? { Authorization: authHeader } : {})
          }
        }
      );

      return response.data;
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        return {
          success: false,
          error: error.response.data.error
        };
      }

      return {
        success: false,
        error: error.message || 'Failed to fetch merchant wallets'
      };
    }
  }
}