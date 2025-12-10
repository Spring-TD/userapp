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
import { invitationRoutes } from './routes/invitationRoutes';
import { SAMSService } from './services/samsService';
import { redisCacheService } from './services/redisCacheService';
import { logger } from './utils/logger';
import { AuthService } from './services/authService';
import { AccountStatus, UserType } from './models/User';
import { mockDb } from './utils/mockDatabase';
import { RoleService } from './services/roleService';
import { Permission } from './models/Role';
import { hashPassword } from './utils/crypto';

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
      invitations: '/api/v1/invitations',
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
app.use('/api/v1/invitations', invitationRoutes);
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

// Function to create default merchant roles and invited users
async function createDefaultMerchantContext() {
  try {
    const merchant = await AuthService.getUserByEmail('merchant@example.com');
    if (!merchant) {
      logger.error('Default merchant not found, skipping context creation');
      return;
    }

    const merchantId = merchant.user_merchant_id;
    logger.info(`Creating context for merchant ${merchantId}`);

    // define roles
    const rolesToCreate = [
      {
        name: 'Admin',
        description: 'Administrator with full access',
        permissions: Object.values(Permission)
      },
      {
        name: 'Manager',
        description: 'Manager with operational access',
        permissions: [
          Permission.VIEW_PRODUCTS, Permission.EDIT_PRODUCTS, Permission.CREATE_PRODUCTS,
          Permission.SEE_BILLING, Permission.ADD_PAYMENT_METHOD, Permission.EDIT_PAYMENT_METHOD,
          Permission.CREATE_APP, Permission.SEE_ACTIVITY_LOG, Permission.DOWNLOAD_REPORT
        ]
      },
      {
        name: 'Support',
        description: 'Support staff with read-only access',
        permissions: [
          Permission.VIEW_PRODUCTS, Permission.SEE_ACTIVITY_LOG, Permission.SEE_BILLING
        ]
      }
    ];

    const createdRoles: Record<string, string> = {}; // Name -> ID

    for (const roleDef of rolesToCreate) {
      // Check if role exists (simple check by name isn't directly supported by mockDb, so we iterate or just create new ones since it's in-memory)
      // Since it's a mock DB that resets on start, we can just create them.
      // But if we want to be safe against re-runs if logic changes:
      const existingRoles = await mockDb.findRolesByMerchantId(merchantId);
      const existingRole = existingRoles.find(r => r.name === roleDef.name);

      if (existingRole) {
        createdRoles[roleDef.name] = existingRole.id;
        logger.info(`Role ${roleDef.name} already exists`);
      } else {
        const result = await RoleService.createRole(merchantId, {
          name: roleDef.name,
          description: roleDef.description,
          permissions: roleDef.permissions
        });
        if (result.success && result.role) {
          createdRoles[roleDef.name] = result.role.id;
          logger.info(`Role ${roleDef.name} created successfully`);
        } else {
          logger.error(`Failed to create role ${roleDef.name}: ${result.error}`);
        }
      }
    }

    // Create users with roles
    const usersToCreate = [
      { email: 'merchant-admin@example.com', role: 'Admin', first: 'Merchant', last: 'Admin' },
      { email: 'merchant-manager@example.com', role: 'Manager', first: 'Merchant', last: 'Manager' },
      { email: 'merchant-support@example.com', role: 'Support', first: 'Merchant', last: 'Support' }
    ];

    for (const userDef of usersToCreate) {
      const existingUser = await AuthService.getUserByEmail(userDef.email);
      if (existingUser) {
        logger.info(`User ${userDef.email} already exists`);
        continue;
      }

      const roleId = createdRoles[userDef.role];
      if (!roleId) {
        logger.error(`Cannot create user ${userDef.email}: Role ${userDef.role} not found`);
        continue;
      }

      const hashedPassword = await hashPassword('DefaultPass123!');

      // We use mockDb.createUser to set everything directly including role_id
      await mockDb.createUser({
        email: userDef.email,
        password: hashedPassword,
        first_name: userDef.first,
        last_name: userDef.last,
        user_type: UserType.USER, // Regular user type (invited user)
        status: AccountStatus.ACTIVE,
        email_verified: true,
        phone_verified: false,
        user_merchant_id: merchantId,
        country: 'US',
        role_id: roleId,
        phone: '+15550000000'
      } as any);

      logger.info(`User ${userDef.email} created with role ${userDef.role}`);
    }

  } catch (error) {
    logger.error('Error creating default merchant context:', error);
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
    await createDefaultMerchantContext();

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