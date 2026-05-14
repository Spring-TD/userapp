import { WalletService } from '../services/walletService';

// Mock axios
jest.mock('axios');
const mockAxios = require('axios');

describe('WalletService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createMerchantWallet', () => {
    it('should successfully create a merchant wallet', async () => {
      // Mock the axios response
      const mockResponse = {
        data: {
          success: true,
          message: 'Merchant wallet created successfully',
          data: {
            wallet: {
              id: 'wallet-123',
              merchantId: 'app-123',
              walletType: 'MERCHANT',
              merchantWalletType: 'TREASURY',
              name: 'TREASURY Wallet for App app-123',
              mainBalance: 0,
              ledgerBalance: 0,
              currency: 'USD',
              status: 'ACTIVE',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          }
        }
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await WalletService.createMerchantWallet('app-123', 'TREASURY');

      expect(result.success).toBe(true);
      expect(result.data && 'wallet' in result.data ? result.data.wallet : undefined).toBeDefined();
      expect(mockAxios.post).toHaveBeenCalledWith(
        'http://localhost:3004/api/v1/wallets/merchant',
        {
          name: 'TREASURY Wallet for App app-123',
          currency: 'USD',
          merchantWalletType: 'TREASURY'
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    });

    it('should handle wallet creation failure', async () => {
      // Mock the axios error response
      const mockError = new Error('Failed to create wallet');
      mockAxios.post.mockRejectedValue(mockError);

      const result = await WalletService.createMerchantWallet('app-123', 'TREASURY');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create wallet');
    });
  });

  describe('createAllMerchantWallets', () => {
    it('should successfully create all merchant wallets', async () => {
      // Mock the axios response
      const mockResponse = {
        data: {
          success: true,
          message: 'All merchant wallets created successfully',
          data: {
            wallets: [
              {
                id: 'wallet-123',
                merchantId: 'app-123',
                walletType: 'MERCHANT',
                merchantWalletType: 'TREASURY',
                name: 'Treasury Wallet',
                mainBalance: 0,
                ledgerBalance: 0,
                currency: 'USD',
                status: 'ACTIVE',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              },
              {
                id: 'wallet-456',
                merchantId: 'app-123',
                walletType: 'MERCHANT',
                merchantWalletType: 'OPERATION',
                name: 'Operation Wallet',
                mainBalance: 0,
                ledgerBalance: 0,
                currency: 'USD',
                status: 'ACTIVE',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              },
              {
                id: 'wallet-789',
                merchantId: 'app-123',
                walletType: 'MERCHANT',
                merchantWalletType: 'KYC',
                name: 'KYC Wallet',
                mainBalance: 0,
                ledgerBalance: 0,
                currency: 'USD',
                status: 'ACTIVE',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }
            ]
          }
        }
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await WalletService.createAllMerchantWallets('app-123');

      expect(result.success).toBe(true);
      expect(result.data && 'wallets' in result.data ? result.data.wallets : undefined).toHaveLength(3);
      expect(mockAxios.post).toHaveBeenCalledWith(
        'http://localhost:3004/api/v1/wallets/merchant/all',
        {
          currency: 'USD'
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    });

    it('should handle failure when creating all merchant wallets', async () => {
      // Mock the axios error response
      const mockError = new Error('Failed to create wallets');
      mockAxios.post.mockRejectedValue(mockError);

      const result = await WalletService.createAllMerchantWallets('app-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create wallets');
    });
  });
});