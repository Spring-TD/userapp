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
      expect(result.error).toBeDefined();
      expect(result.error).toMatch(/user_merchant_id|User Merchant ID/);
    });

    test('should validate user data with user_ref when password is empty', () => {
      const userRefData: UserRegistrationForm = {
        user_merchant_id: 'merchant123',
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane@example.com',
        phone: '+1234567890',
        country: 'United States',
        password: '',
        user_ref: 'external-id-123'
      };
      const result = validateForm<UserRegistrationForm>(userRegistrationSchema, userRefData);
      expect(result.error).toBeUndefined();
      expect(result.value?.user_ref).toBe('external-id-123');
    });

    test('should reject user registration when password is empty and user_ref is missing', () => {
      const noPasswordNoRef: UserRegistrationForm = {
        user_merchant_id: 'merchant123',
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane@example.com',
        phone: '+1234567890',
        country: 'United States',
        password: ''
      };
      const result = validateForm(userRegistrationSchema, noPasswordNoRef);
      expect(result.error).toContain('user_ref is required when password is not provided');
    });
  });
});