import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/environment';
import swaggerSpec from './config/swagger';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { samsRoutes } from './routes/samsRoutes';
import { credentialRoutes } from './routes/credentialRoutes';
import { apiKeyRoutes } from './routes/apiKeyRoutes';
import { userRoutes } from './routes/userRoutes';
import { authRoutes } from './routes/authRoutes';
import { SAMSService } from './services/samsService';
import { redisCacheService } from './services/redisCacheService';
import { logger } from './utils/logger';

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
    service: 'Service Authentication Microservice (SAMS)',
    version: '1.0.0',
    status: 'running',
    description: 'Service-to-service authentication and management',
    endpoints: {
      health: '/health',
      apiDocs: '/api-docs',
      openApiSpec: '/api-docs.json',
      services: '/api/v1/services',
      credentials: '/api/v1/credentials',
      keys: '/api/v1/keys',
      user: '/api/v1/user',
      auth: '/api/v1/auth'
    },
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'service-auth-microservice',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// OpenAPI spec (for import in Swagger UI / Postman)
app.get('/api-docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Swagger UI (mount on both paths to avoid redirect loop with swagger-ui-express)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api-docs/', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// SAMS (Service Authentication Microservice) routes
app.use('/api/v1/services', samsRoutes);
app.use('/api/v1/credentials', credentialRoutes);
app.use('/api/v1/keys', apiKeyRoutes);
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/auth', authRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

// SAMS service initialization - no default user creation needed

// Only start server if this file is run directly (not imported for testing)
if (require.main === module) {
  const PORT = config.server.port || 3000;

  // Connect to MongoDB and initialize services
  Promise.all([
    mongoose.connect(config.mongodb.uri).then(() => {
      console.log('✅ MongoDB database connected');
      logger.info('Connected to MongoDB (DigitalOcean)');
    }),
    redisCacheService.getStats(),
    SAMSService.initialize()
  ]).then(() => {
    logger.info('Redis cache service initialized');
    logger.info('SAMS service initialized');

    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Service Authentication Microservice (SAMS) running on port ${PORT}`);
      logger.info(`Environment: ${config.env}`);
      logger.info('SAMS initialized - service-to-service authentication only');
    });

    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        mongoose.connection.close().then(() => {
          logger.info('Process terminated');
          process.exit(0);
        });
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      server.close(() => {
        mongoose.connection.close().then(() => {
          logger.info('Process terminated');
          process.exit(0);
        });
      });
    });
  }).catch((error) => {
    logger.error('Failed to initialize services', { error });
    process.exit(1);
  });
}

export default app;