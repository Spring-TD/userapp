import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/environment';
import { corsMiddleware } from './middleware/cors';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger';
import { registrationRoutes } from './routes/registrationRoutes';
import { authRoutes } from './routes/authRoutes';
import { otpRoutes } from './routes/otpRoutes';
import { passwordRoutes } from './routes/passwordRoutes';
import { userRoutes } from './routes/userRoutes';
import { verifyEmailRoutes } from './routes/verifyEmailRoutes';
import { roleRoutes } from './routes/roleRoutes';
import { invitationRoutes } from './routes/invitationRoutes';
import { sessionRoutes } from './routes/sessionRoutes';
import { faqRoutes } from './routes/faqRoutes';
import { supportContactRoutes } from './routes/supportContactRoutes';
import { legalDocumentRoutes } from './routes/legalDocumentRoutes';
import { connectDb } from './config/db';

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
      faqs: '/api/v1/faqs',
      supportContacts: '/api/v1/support-contacts',
      legalDocuments: '/api/v1/legal-documents',
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
    version: '1.0.0'
  });
});

// OpenAPI / Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (_req, res) => res.json(swaggerSpec));

// API routes
app.use('/api/v1/registration', registrationRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/otp', otpRoutes);
app.use('/api/v1/password', passwordRoutes);
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/roles', roleRoutes);
app.use('/api/v1/invitations', invitationRoutes);
app.use('/api/v1/sessions', sessionRoutes);
app.use('/api/v1/faqs', faqRoutes);
app.use('/api/v1/support-contacts', supportContactRoutes);
app.use('/api/v1/legal-documents', legalDocumentRoutes);
app.use('/verify-email', verifyEmailRoutes);

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
  const port = config.port;
  const server = app.listen(port, () => {
    console.log(`🚀 Client Auth Microservice running on port ${port}`);
    console.log(`📱 Environment: ${config.nodeEnv}`);
    console.log(`🔗 Service Auth URL: ${config.serviceAuthUrl} (timeout ${config.serviceAuthHttpTimeoutMs}ms)`);
  });

  try {
    await connectDb();
    console.log('✅ Startup sequence complete');
  } catch (err) {
    console.error('❌ Error during startup sequence:', err);
    // We don't exit(1) immediately to allow the process to stay alive 
    // so we can inspect logs or reach the health endpoint if needed.
    // However, for Fly.io, it's often better to exit if critical infra is down.
    // But let's keep it alive for now to debug port issues.
  }

  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('Process terminated');
    });
  });
}

start().catch((err) => {
  console.error('❌ Critical startup failure:', err);
  process.exit(1);
});

export default app;