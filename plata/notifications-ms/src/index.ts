import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/environment';
import { corsMiddleware } from './middleware';
import { errorHandler, notFoundHandler } from './middleware';
import notificationRoutes from './routes/notificationRoutes';

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
    service: 'Notifications Microservice',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
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
      database: 'mock database (in-memory)'
    }
  });
});

// API routes
app.use('/api/v1/notifications', notificationRoutes);

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const server = app.listen(config.port, () => {
  console.log(`🚀 Notifications Microservice running on port ${config.port}`);
  console.log(`📱 Environment: ${config.nodeEnv}`);
  console.log(`📧 Email service: ${config.mailtrap.user ? 'Enabled (Mailtrap)' : 'Disabled'}`);
  console.log(`📱 SMS service: ${config.twilio.accountSid ? 'Enabled (Twilio)' : 'Disabled'}`);
  console.log(`💾 Database: Mock in-memory database`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

export default app;

