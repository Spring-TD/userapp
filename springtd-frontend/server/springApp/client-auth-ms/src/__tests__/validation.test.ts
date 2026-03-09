import { validateForm, merchantRegistrationSchema, userRegistrationSchema } from '../utils/validation';
import { MerchantRegistrationForm, UserRegistrationForm } from '../types/forms';

describe('Validation Tests', () => {
  describe('Merchant Registration Validation', () => {
    const validMerchantData: MerchantRegistrationForm = {
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      country: 'United States',
      password: 'SecurePass123!'
    };

    test('should validate correct merchant data', () => {
      const result = validateForm(merchantRegistrationSchema, validMerchantData);
      expect(result.error).toBeUndefined();
      expect(result.value).toEqual(validMerchantData);
    });

    test('should reject invalid email', () => {
      const invalidData = { ...validMerchantData, email: 'invalid-email' };
      const result = validateForm(merchantRegistrationSchema, invalidData);
      expect(result.error).toContain('valid email address');
    });

    test('should reject weak password', () => {
      const invalidData = { ...validMerchantData, password: '123' };
      const result = validateForm(merchantRegistrationSchema, invalidData);
      expect(result.error).toContain('Password must');
    });
  });

  describe('User Registration Validation', () => {
    const validUserData: UserRegistrationForm = {
      user_merchant_id: 'merchant123',
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane@example.com',
      phone: '+1234567890',
      country: 'United States',
      password: 'SecurePass123!'
    };

    test('should validate correct user data', () => {
      const result = validateForm(userRegistrationSchema, validUserData);
      expect(result.error).toBeUndefined();
      expect(result.value).toEqual(validUserData);
    });

    test('should reject missing merchant ID', () => {
      const invalidData = { ...validUserData, user_merchant_id: '' };
      const result = validateForm(userRegistrationSchema, invalidData);
      expect(result.error).toContain('User Merchant ID must be at least 5 characters');
    });
  });
});