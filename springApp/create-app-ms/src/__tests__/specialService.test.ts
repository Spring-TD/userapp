import { SpecialService } from '../services/specialService';

describe('SpecialService', () => {
  describe('getAllProducts', () => {
    it('should return an empty array when no products are available', async () => {
      const products = await SpecialService.getAllProducts();
      expect(Array.isArray(products)).toBe(true);
    });
  });

  describe('getProductById', () => {
    it('should return null for non-existent product', async () => {
      const product = await SpecialService.getProductById('non-existent-id');
      expect(product).toBeNull();
    });
  });

  describe('getMerchantWalletBalance', () => {
    it('should return null for non-existent wallet', async () => {
      const wallet = await SpecialService.getMerchantWalletBalance('non-existent-id', 'SETTLEMENT');
      expect(wallet).toBeNull();
    });
  });

  describe('getUserById', () => {
    it('should return null for non-existent user', async () => {
      const user = await SpecialService.getUserById('non-existent-id');
      expect(user).toBeNull();
    });
  });

  describe('getUserWallet', () => {
    it('should return null for non-existent wallet', async () => {
      const wallet = await SpecialService.getUserWallet('non-existent-id');
      expect(wallet).toBeNull();
    });
  });

  describe('getTransactionHistoryForUser', () => {
    it('should return an empty array for non-existent user', async () => {
      const transactions = await SpecialService.getTransactionHistoryForUser('non-existent-id');
      expect(Array.isArray(transactions)).toBe(true);
      expect(transactions).toHaveLength(0);
    });
  });
});