import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/environment';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { authRoutes } from './routes/authRoutes';
import { otpRoutes } from './routes/otpRoutes';
import { passwordRoutes } from './routes/passwordRoutes';
import { userRoutes } from './routes/userRoutes';
import { samsRoutes } from './routes/samsRoutes';
import { credentialRoutes } from './routes/credentialRoutes';
import { verifyEmailRoutes } from './routes/verifyEmailRoutes';
import { roleRoutes } from './routes/roleRoutes';
import { SAMSService } from './services/samsService';
import { redisCacheService } from './services/redisCacheService';
import { logger } from './utils/logger';
import { AuthService } from './services/authService';
import { AccountStatus } from './models/User';
import { mockDb } from './utils/mockDatabase';

const app = express();

// Trust proxy for Fly.io (trust first proxy only)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.cors.allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(requestLogger);

// Root endpoint
app.get('/', (_req, res) => {
  res.status(200).json({
    service: 'Service Authentication Microservice',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      auth: '/api/v1/auth',
      otp: '/api/v1/otp',
      password: '/api/v1/password',
      user: '/api/v1/user',
      roles: '/api/v1/roles',
      services: '/api/v1/services',
      credentials: '/api/v1/credentials',
      verifyEmail: '/verify-email'
    },
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'service-auth-microservice'
  });
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/otp', otpRoutes);
app.use('/api/v1/password', passwordRoutes);
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/roles', roleRoutes);
app.use('/verify-email', verifyEmailRoutes);

// SAMS (Service Authentication Microservice) routes
app.use('/api/v1/services', samsRoutes);
app.use('/api/v1/credentials', credentialRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

// Function to create a default merchant user
async function createDefaultMerchantUser() {
  try {
    // Check if default merchant already exists
    const existingUser = await AuthService.getUserByEmail('merchant@example.com');
    if (existingUser) {
      // If user exists but is not verified, verify the email
      if (!existingUser.email_verified) {
        // Update user directly in the mock database
        await mockDb.updateUser(existingUser.id, {
          email_verified: true,
          status: AccountStatus.ACTIVE
        });
        logger.info('Default merchant user verified successfully');
      } else {
        logger.info('Default merchant user already exists and is verified');
      }
      return;
    }

    // Create default merchant user data
    const defaultMerchantData = {
      email: 'merchant@example.com',
      password: 'DefaultPass123!',
      first_name: 'Default',
      last_name: 'Merchant',
      phone: '+1234567890',
      user_merchant_id: 'default-merchant-id',
      country: 'US'
    };

    // Register the merchant
    const result = await AuthService.registerMerchant(defaultMerchantData);

    if (result.success && result.merchant) {
      // Verify the email automatically by updating the user directly
      await mockDb.updateUser(result.merchant.id, {
        email_verified: true,
        status: AccountStatus.ACTIVE
      });
      logger.info('Default merchant user created and verified successfully');
    } else {
      logger.error('Failed to create default merchant user:', result.error);
    }
  } catch (error) {
    logger.error('Error creating default merchant user:', error);
  }
}

// Function to create a default admin user
async function createDefaultAdminUser() {
  try {
    // Check if default admin already exists
    const existingUser = await AuthService.getUserByEmail('admin@example.com');
    if (existingUser) {
      logger.info('Default admin user already exists');
      return;
    }

    // Create default admin user data
    const defaultAdminData = {
      email: 'admin@example.com',
      password: 'AdminPass123!',
      first_name: 'Default',
      last_name: 'Admin',
      phone: '+1234567891',
      country: 'US'
    };

    // Register the admin
    const result = await AuthService.registerAdmin(defaultAdminData);

    if (result.success && result.user) {
      logger.info('Default admin user created successfully');
    } else {
      logger.error('Failed to create default admin user:', result.error);
    }
  } catch (error) {
    logger.error('Error creating default admin user:', error);
  }
}

// Only start server if this file is run directly (not imported for testing)
if (require.main === module) {
  const PORT = config.server.port || 3000;

  // Initialize services
  Promise.all([
    redisCacheService.getStats(), // This ensures Redis connection is established
    SAMSService.initialize()
  ]).then(async () => {
    logger.info('Redis cache service initialized');

    // Create default users
    await createDefaultMerchantUser();
    await createDefaultAdminUser();

    // Explicitly bind to 0.0.0.0
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Client Auth Microservice running on port ${PORT}`);
      logger.info(`Environment: ${config.env}`);
      logger.info('SAMS (Service Authentication Microservice) initialized');
    });
  }).catch((error) => {
    logger.error('Failed to initialize services', { error });
    process.exit(1);
  });
}

export default app;