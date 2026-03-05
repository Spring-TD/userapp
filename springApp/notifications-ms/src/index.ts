import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/environment';
import swaggerSpec from './config/swagger';
import { corsMiddleware } from './middleware';
import { errorHandler, notFoundHandler } from './middleware';
import notificationRoutes from './routes/notificationRoutes';

const app = express();

// Security and CORS middleware
app.use(helmet());
app.use(corsMiddleware);
app.use(morgan('combined'));

// Body parsing middleware (limit from config)
app.use(express.json({ limit: config.requestBodyLimit }));
app.use(express.urlencoded({ extended: true, limit: config.requestBodyLimit }));

// Swagger / OpenAPI documentation
app.get('/api-docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(swaggerSpec);
});
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    success: true,
    service: 'Notifications Microservice',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      apiDocs: '/api-docs',
      openApiSpec: '/api-docs.json',
      send: '/api/v1/notifications/send',
      status: '/api/v1/notifications/:id/status',
      userNotifications: '/api/v1/notifications/user/:recipient',
      allNotifications: '/api/v1/notifications'
    },
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Notifications Microservice is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      email: config.mailtrap.user ? 'configured' : 'not configured',
      sms: config.twilio.accountSid ? 'configured' : 'not configured',
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    }
  });
});

// API routes
app.use('/api/v1/notifications', notificationRoutes);

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Connect to MongoDB
mongoose.connect(config.mongoUri)
  .then(() => {
    console.log('✅ Connected to MongoDB');
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  });

// Start server
const server = app.listen(config.port, () => {
  console.log(`🚀 Notifications Microservice running on port ${config.port}`);
  console.log(`📱 Environment: ${config.nodeEnv}`);
  console.log(`📧 Email service: ${config.mailtrap.user ? 'Enabled (Mailtrap)' : 'Disabled'}`);
  console.log(`📱 SMS service: ${config.twilio.accountSid ? 'Enabled (Twilio)' : 'Disabled'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    mongoose.connection.close();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    mongoose.connection.close();
    process.exit(0);
  });
});

export default app;

