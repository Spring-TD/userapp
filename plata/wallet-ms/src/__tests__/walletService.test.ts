import { WalletService } from '../services/walletService';
import { WalletStatus, MerchantWalletType } from '../models/Wallet';

describe('WalletService', () => {
  const savedPayonusEnabled = process.env.PAYONUS_NUBAN_ENABLED;

  beforeEach(() => {
    jest.clearAllMocks();
    // NGN matches Payonus default eligibility; keep provisioning off so Jest never calls the network.
    process.env.PAYONUS_NUBAN_ENABLED = 'false';
  });

  afterAll(() => {
    if (savedPayonusEnabled === undefined) {
      delete process.env.PAYONUS_NUBAN_ENABLED;
    } else {
      process.env.PAYONUS_NUBAN_ENABLED = savedPayonusEnabled;
    }
  });

  describe('createMerchantWallet', () => {
    it('should create a new merchant wallet', async () => {
      const result = await WalletService.createMerchantWallet({
        merchantId: 'merchant_123',
        name: 'Test Merchant Wallet',
        currency: 'NGN',
        merchantWalletType: MerchantWalletType.TREASURY
      });

      expect(result.success).toBe(true);
      expect(result.wallet).toBeDefined();
      expect(result.wallet?.merchantId).toBe('merchant_123');
      expect(result.wallet?.name).toBe('Test Merchant Wallet');
      expect(result.wallet?.currency).toBe('NGN');
      expect(result.wallet?.merchantWalletType).toBe(MerchantWalletType.TREASURY);
      expect(result.wallet?.balance).toBe(0);
      expect(result.wallet?.status).toBe(WalletStatus.ACTIVE);
    });

    it('should fail to create a duplicate merchant wallet of same type', async () => {
      // Create first wallet
      await WalletService.createMerchantWallet({
        merchantId: 'merchant_456',
        name: 'First Wallet',
        currency: 'NGN',
        merchantWalletType: MerchantWalletType.OPERATION
      });

      // Try to create duplicate
      const result = await WalletService.createMerchantWallet({
        merchantId: 'merchant_456',
        name: 'Second Wallet',
        currency: 'NGN',
        merchantWalletType: MerchantWalletType.OPERATION
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('OPERATION wallet already exists for this merchant');
    });
  });

  describe('createUserWallet', () => {
    it('should create a new user wallet', async () => {
      const result = await WalletService.createUserWallet({
        userId: 'user_123',
        merchantId: 'merchant_789',
        name: 'Test User Wallet',
        currency: 'NGN'
      });

      expect(result.success).toBe(true);
      expect(result.wallet).toBeDefined();
      expect(result.wallet?.userId).toBe('user_123');
      expect(result.wallet?.merchantId).toBe('merchant_789');
      expect(result.wallet?.name).toBe('Test User Wallet');
      expect(result.wallet?.currency).toBe('NGN');
      expect(result.wallet?.balance).toBe(0);
      expect(result.wallet?.status).toBe(WalletStatus.ACTIVE);
    });

    it('should fail to create a duplicate user wallet', async () => {
      // Create first wallet
      await WalletService.createUserWallet({
        userId: 'user_456',
        merchantId: 'merchant_789',
        name: 'First User Wallet',
        currency: 'NGN'
      });

      // Try to create duplicate
      const result = await WalletService.createUserWallet({
        userId: 'user_456',
        merchantId: 'merchant_789',
        name: 'Second User Wallet',
        currency: 'NGN'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('User wallet already exists');
    });
  });

  describe('updateWalletBalance', () => {
    it('should update wallet balance successfully', async () => {
      // Create a wallet first
      const createResult = await WalletService.createMerchantWallet({
        merchantId: 'merchant_999',
        name: 'Test Wallet',
        currency: 'NGN',
        merchantWalletType: MerchantWalletType.KYC
      });

      expect(createResult.success).toBe(true);
      const walletId = createResult.wallet?.id!;

      // Update balance
      const updateResult = await WalletService.updateWalletBalance(
        walletId,
        100,
        'Test deposit'
      );

      expect(updateResult.success).toBe(true);
      expect(updateResult.wallet?.balance).toBe(100);
    });

    it('should fail to update balance for non-existent wallet', async () => {
      const result = await WalletService.updateWalletBalance(
        'nonexistent_wallet',
        100,
        'Test deposit'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Wallet not found');
    });
  });
});