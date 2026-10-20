import { userRegistrationSchema, merchantRegistrationSchema, validateInput } from './validation';

describe('Validation Utilities', () => {
  describe('User Registration Validation', () => {
    const validUserData = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      first_name: 'John',
      last_name: 'Doe',
      phone: '+1234567890',
      user_merchant_id: 'merchant_001',
      country: 'USA'
    };

    it('should validate correct user data', () => {
      const { error, value } = validateInput(userRegistrationSchema, validUserData);
      expect(error).toBeUndefined();
      expect(value).toBeDefined();
      expect(value?.email).toBe(validUserData.email);
    });

    it('should validate minimal user data', () => {
      const minimalData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        first_name: 'John',
        last_name: 'Doe',
        user_merchant_id: 'merchant_001',
        country: 'USA'
      };

      const { error, value } = validateInput(userRegistrationSchema, minimalData);
      expect(error).toBeUndefined();
      expect(value).toBeDefined();
    });

    it('should reject invalid email', () => {
      const invalidData = { ...validUserData, email: 'invalid-email' };
      const { error } = validateInput(userRegistrationSchema, invalidData);
      expect(error).toContain('email');
    });

    it('should reject weak password', () => {
      const invalidData = { ...validUserData, password: 'weak' };
      const { error } = validateInput(userRegistrationSchema, invalidData);
      expect(error).toContain('Password must contain');
    });

    it('should reject invalid phone number', () => {
      const invalidData = { ...validUserData, phone: 'invalid-phone' };
      const { error } = validateInput(userRegistrationSchema, invalidData);
      expect(error).toContain('Phone number');
    });


  });

  describe('Merchant Registration Validation', () => {
    const validMerchantData = {
      email: 'merchant@example.com',
      password: 'SecurePass123!',
      first_name: 'John',
      last_name: 'Smith',
      phone: '+1234567890',
      user_merchant_id: 'merchant_001',
      country: 'USA'
    };

    it('should validate correct merchant data', () => {
      const { error, value } = validateInput(merchantRegistrationSchema, validMerchantData);
      expect(error).toBeUndefined();
      expect(value).toBeDefined();
      expect(value?.user_merchant_id).toBe(validMerchantData.user_merchant_id);
    });

    it('should validate minimal merchant data', () => {
      const minimalData = {
        email: 'merchant@example.com',
        password: 'SecurePass123!',
        first_name: 'John',
        last_name: 'Smith',
        user_merchant_id: 'merchant_002',
        country: 'USA'
      };

      const { error, value } = validateInput(merchantRegistrationSchema, minimalData);
      expect(error).toBeUndefined();
      expect(value).toBeDefined();
    });

    it('should reject missing user_merchant_id', () => {
      const invalidData = { ...validMerchantData };
      delete (invalidData as any).user_merchant_id;
      const { error } = validateInput(merchantRegistrationSchema, invalidData);
      expect(error).toContain('user_merchant_id');
    });

    it('should reject missing country', () => {
      const invalidData = { ...validMerchantData };
      delete (invalidData as any).country;
      const { error } = validateInput(merchantRegistrationSchema, invalidData);
      expect(error).toContain('country');
    });


  });
});