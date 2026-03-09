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
      first_name: 'John',
      last_name: 'Doe',
      phone: '+1234567890',
      user_merchant_id: 'merchant_001',
      country: 'USA'
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
            first_name: validUserData.first_name,
            last_name: validUserData.last_name,
            user_type: 'user',
            status: 'pending',
            email_verified: false,
            created_at: expect.any(String)
          }
        }
      });
    });

    it('should register a user with minimal required fields', async () => {
      const minimalUserData = {
        email: 'jane.doe@example.com',
        password: 'SecurePass123!',
        first_name: 'Jane',
        last_name: 'Doe',
        user_merchant_id: 'merchant_002',
        country: 'USA'
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
      first_name: 'John',
      last_name: 'Smith',
      phone: '+1234567890',
      user_merchant_id: 'merchant_001',
      country: 'USA'
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
            first_name: validMerchantData.first_name,
            last_name: validMerchantData.last_name,
            user_type: 'merchant',
            status: 'pending',
            email_verified: false,
            user_merchant_id: validMerchantData.user_merchant_id,
            country: validMerchantData.country,
            created_at: expect.any(String)
          }
        }
      });
    });

    it('should register a merchant with minimal required fields', async () => {
      const minimalMerchantData = {
        email: 'minimal@merchant.com',
        password: 'SecurePass123!',
        first_name: 'Jane',
        last_name: 'Business',
        user_merchant_id: 'merchant_003',
        country: 'USA'
      };

      const response = await request(app)
        .post('/api/v1/auth/register/merchant')
        .send(minimalMerchantData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.merchant.user_merchant_id).toBe(minimalMerchantData.user_merchant_id);
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

    it('should reject merchant registration with missing required fields', async () => {
      const invalidData = {
        email: 'test@merchant.com',
        password: 'SecurePass123!',
        first_name: 'Test',
        last_name: 'Merchant'
        // Missing user_merchant_id and country
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
        first_name: 'John',
        last_name: 'Doe',
        user_merchant_id: 'merchant_001',
        country: 'USA'
      };

      const merchantData = {
        email: 'shared@example.com',
        password: 'SecurePass123!',
        first_name: 'Jane',
        last_name: 'Business',
        user_merchant_id: 'merchant_002',
        country: 'USA'
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