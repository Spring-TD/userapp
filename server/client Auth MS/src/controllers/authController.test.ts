import request from 'supertest';
import app from '../index';
import { mockDb } from '../utils/mockDatabase';

describe('AuthController - Registration', () => {
  beforeEach(async () => {
    // Clear mock database before each test
    await mockDb.clearAll();
  });

  describe('POST /api/v1/auth/register/user', () => {
    const validUserData = {
      email: 'john.doe@example.com',
      password: 'SecurePass123!',
      firstName: 'John',
      lastName: 'Doe',
      phone: '+1234567890',
      dateOfBirth: '1990-01-01',
      address: {
        street: '123 Main Street',
        city: 'New York',
        state: 'NY',
        country: 'USA',
        postalCode: '10001'
      }
    };

    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register/user')
        .send(validUserData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        message: 'User registered successfully. Please check your email for verification instructions.',
        data: {
          user: {
            id: expect.any(String),
            email: validUserData.email,
            firstName: validUserData.firstName,
            lastName: validUserData.lastName,
            userType: 'user',
            status: 'pending',
            emailVerified: false,
            createdAt: expect.any(String)
          }
        }
      });
    });

    it('should register a user with minimal required fields', async () => {
      const minimalUserData = {
        email: 'jane.doe@example.com',
        password: 'SecurePass123!',
        firstName: 'Jane',
        lastName: 'Doe'
      };

      const response = await request(app)
        .post('/api/v1/auth/register/user')
        .send(minimalUserData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(minimalUserData.email);
    });

    it('should reject registration with duplicate email', async () => {
      // Register first user
      await request(app)
        .post('/api/v1/auth/register/user')
        .send(validUserData)
        .expect(201);

      // Try to register with same email
      const response = await request(app)
        .post('/api/v1/auth/register/user')
        .send(validUserData)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Email address is already registered'
      });
    });

    it('should reject registration with invalid email', async () => {
      const invalidData = {
        ...validUserData,
        email: 'invalid-email'
      };

      const response = await request(app)
        .post('/api/v1/auth/register/user')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject registration with weak password', async () => {
      const invalidData = {
        ...validUserData,
        password: 'weak'
      };

      const response = await request(app)
        .post('/api/v1/auth/register/user')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toContain('Password must contain');
    });

    it('should reject registration with missing required fields', async () => {
      const invalidData = {
        email: 'test@example.com'
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/v1/auth/register/user')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('POST /api/v1/auth/register/merchant', () => {
    const validMerchantData = {
      email: 'merchant@example.com',
      password: 'SecurePass123!',
      firstName: 'John',
      lastName: 'Smith',
      phone: '+1234567890',
      businessName: 'Smith Electronics',
      businessType: 'Electronics Retail',
      businessRegistrationNumber: 'REG123456789',
      businessAddress: {
        street: '456 Business Ave',
        city: 'Los Angeles',
        state: 'CA',
        country: 'USA',
        postalCode: '90210'
      },
      website: 'https://smithelectronics.com',
      description: 'Leading electronics retailer'
    };

    it('should register a new merchant successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register/merchant')
        .send(validMerchantData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        message: 'Merchant registered successfully. Please check your email for verification instructions.',
        data: {
          merchant: {
            id: expect.any(String),
            email: validMerchantData.email,
            firstName: validMerchantData.firstName,
            lastName: validMerchantData.lastName,
            userType: 'merchant',
            status: 'pending',
            emailVerified: false,
            businessName: validMerchantData.businessName,
            businessType: validMerchantData.businessType,
            createdAt: expect.any(String)
          }
        }
      });
    });

    it('should register a merchant with minimal required fields', async () => {
      const minimalMerchantData = {
        email: 'minimal@merchant.com',
        password: 'SecurePass123!',
        firstName: 'Jane',
        lastName: 'Business',
        businessName: 'Jane Business Co',
        businessType: 'Consulting',
        businessAddress: {
          street: '789 Business St',
          city: 'Chicago',
          state: 'IL',
          country: 'USA',
          postalCode: '60601'
        }
      };

      const response = await request(app)
        .post('/api/v1/auth/register/merchant')
        .send(minimalMerchantData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.merchant.businessName).toBe(minimalMerchantData.businessName);
    });

    it('should reject merchant registration with duplicate email', async () => {
      // Register first merchant
      await request(app)
        .post('/api/v1/auth/register/merchant')
        .send(validMerchantData)
        .expect(201);

      // Try to register with same email
      const response = await request(app)
        .post('/api/v1/auth/register/merchant')
        .send(validMerchantData)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Email address is already registered'
      });
    });

    it('should reject merchant registration with missing business fields', async () => {
      const invalidData = {
        email: 'test@merchant.com',
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'Merchant'
        // Missing business fields
      };

      const response = await request(app)
        .post('/api/v1/auth/register/merchant')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject merchant registration with invalid website URL', async () => {
      const invalidData = {
        ...validMerchantData,
        website: 'not-a-valid-url'
      };

      const response = await request(app)
        .post('/api/v1/auth/register/merchant')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('Cross-type email uniqueness', () => {
    it('should reject merchant registration if email is already used by a user', async () => {
      const userData = {
        email: 'shared@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe'
      };

      const merchantData = {
        email: 'shared@example.com',
        password: 'SecurePass123!',
        firstName: 'Jane',
        lastName: 'Business',
        businessName: 'Jane Business Co',
        businessType: 'Consulting',
        businessAddress: {
          street: '789 Business St',
          city: 'Chicago',
          state: 'IL',
          country: 'USA',
          postalCode: '60601'
        }
      };

      // Register user first
      await request(app)
        .post('/api/v1/auth/register/user')
        .send(userData)
        .expect(201);

      // Try to register merchant with same email
      const response = await request(app)
        .post('/api/v1/auth/register/merchant')
        .send(merchantData)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Email address is already registered'
      });
    });
  });
});