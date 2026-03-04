import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { config } from './config/environment';
import { corsMiddleware } from './middleware/cors';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { registrationRoutes } from './routes/registrationRoutes';
import { authRoutes } from './routes/authRoutes';
import { otpRoutes } from './routes/otpRoutes';
import { passwordRoutes } from './routes/passwordRoutes';
import { userRoutes } from './routes/userRoutes';
import { verifyEmailRoutes } from './routes/verifyEmailRoutes';
import { roleRoutes } from './routes/roleRoutes';
import { invitationRoutes } from './routes/invitationRoutes';
import { sessionRoutes } from './routes/sessionRoutes';

const app = express();

// Security and CORS middleware
app.use(helmet());
app.use(corsMiddleware);
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    success: true,
    service: 'Client Authentication Microservice',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      registration: '/api/v1/registration',
      auth: '/api/v1/auth',
      otp: '/api/v1/otp',
      password: '/api/v1/password',
      user: '/api/v1/user',
      roles: '/api/v1/roles',
      invitations: '/api/v1/invitations',
      verifyEmail: '/verify-email'
    },
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Client Auth Microservice is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// API routes
app.use('/api/v1/registration', registrationRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/otp', otpRoutes);
app.use('/api/v1/password', passwordRoutes);
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/roles', roleRoutes);
app.use('/api/v1/invitations', invitationRoutes);
app.use('/api/v1/sessions', sessionRoutes);
app.use('/verify-email', verifyEmailRoutes);

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Connect to MongoDB before starting server
mongoose.connect(config.mongoUri)
  .then(() => {
    console.log('✅ Connected to MongoDB');
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`🚀 Client Auth Microservice running on port ${config.port}`);
  console.log(`📱 Environment: ${config.nodeEnv}`);
  console.log(`🔗 Service Auth URL: ${config.serviceAuthUrl}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    mongoose.connection.close().then(() => {
      console.log('Process terminated');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    mongoose.connection.close().then(() => {
      console.log('Process terminated');
      process.exit(0);
    });
  });
});

export default app;