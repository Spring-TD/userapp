import { userRegistrationSchema, merchantRegistrationSchema, validateInput } from './validation';

describe('Validation Utilities', () => {
  describe('User Registration Validation', () => {
    const validUserData = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      firstName: 'John',
      lastName: 'Doe',
      phone: '+1234567890',
      dateOfBirth: '1990-01-01',
      address: {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        country: 'USA',
        postalCode: '10001'
      }
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
        firstName: 'John',
        lastName: 'Doe'
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

    it('should reject future date of birth', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const invalidData = { ...validUserData, dateOfBirth: futureDate.toISOString() };
      const { error } = validateInput(userRegistrationSchema, invalidData);
      expect(error).toBeDefined();
    });
  });

  describe('Merchant Registration Validation', () => {
    const validMerchantData = {
      email: 'merchant@example.com',
      password: 'SecurePass123!',
      firstName: 'John',
      lastName: 'Smith',
      phone: '+1234567890',
      businessName: 'Smith Electronics',
      businessType: 'Electronics',
      businessRegistrationNumber: 'REG123456789',
      businessAddress: {
        street: '456 Business Ave',
        city: 'Los Angeles',
        state: 'CA',
        country: 'USA',
        postalCode: '90210'
      },
      website: 'https://smithelectronics.com',
      description: 'Electronics retailer'
    };

    it('should validate correct merchant data', () => {
      const { error, value } = validateInput(merchantRegistrationSchema, validMerchantData);
      expect(error).toBeUndefined();
      expect(value).toBeDefined();
      expect(value?.businessName).toBe(validMerchantData.businessName);
    });

    it('should validate minimal merchant data', () => {
      const minimalData = {
        email: 'merchant@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Smith',
        businessName: 'Smith Co',
        businessType: 'Retail',
        businessAddress: {
          street: '456 Business Ave',
          city: 'Los Angeles',
          state: 'CA',
          country: 'USA',
          postalCode: '90210'
        }
      };

      const { error, value } = validateInput(merchantRegistrationSchema, minimalData);
      expect(error).toBeUndefined();
      expect(value).toBeDefined();
    });

    it('should reject missing business name', () => {
      const invalidData = { ...validMerchantData };
      delete (invalidData as any).businessName;
      const { error } = validateInput(merchantRegistrationSchema, invalidData);
      expect(error).toContain('businessName');
    });

    it('should reject missing business address', () => {
      const invalidData = { ...validMerchantData };
      delete (invalidData as any).businessAddress;
      const { error } = validateInput(merchantRegistrationSchema, invalidData);
      expect(error).toContain('businessAddress');
    });

    it('should reject invalid website URL', () => {
      const invalidData = { ...validMerchantData, website: 'not-a-url' };
      const { error } = validateInput(merchantRegistrationSchema, invalidData);
      expect(error).toContain('uri');
    });

    it('should accept valid website URL', () => {
      const validData = { ...validMerchantData, website: 'https://example.com' };
      const { error } = validateInput(merchantRegistrationSchema, validData);
      expect(error).toBeUndefined();
    });
  });
});