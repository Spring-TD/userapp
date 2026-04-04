import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/environment';
import { corsMiddleware } from './middleware/cors';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger';
import { APP_PWA_SPLASH_COLOR_OPTIONS } from './constants/pwaSplashColorOptions';
import { APP_PWA_SPLASH_DEFAULT_COLORS } from './types/pwaTemplate';
import { appRoutes } from './routes/appRoutes';
import { specialRoutes } from './routes/specialRoutes';

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
    service: 'Create App Microservice',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      apps: '/api/v1/apps',
      appPwaTemplates: '/api/v1/apps/:appId/pwa-templates',
      appPwaTemplateLogoUpload:
        '/api/v1/apps/:appId/pwa-templates/:templateId/assets/logo',
      appPwaTemplateSplashUpload:
        '/api/v1/apps/:appId/pwa-templates/:templateId/assets/splash',
      appPwaTemplateOnboardingScreenImage:
        '/api/v1/apps/:appId/pwa-templates/:templateId/onboarding/screens/:screenIndex/image',
      pwaSplashColorOptions: '/api/v1/pwa/splash-color-options',
      special: '/api/v1/special'
    },
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Create App Microservice is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// OpenAPI / Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (_req, res) => res.json(swaggerSpec));

/** Public palette for splash primary/secondary color pickers (same list for both). */
app.get('/api/v1/pwa/splash-color-options', (_req, res) => {
  res.json({
    success: true,
    data: {
      options: APP_PWA_SPLASH_COLOR_OPTIONS,
      defaults: APP_PWA_SPLASH_DEFAULT_COLORS
    }
  });
});

// API routes
app.use('/api/v1/apps', appRoutes);
app.use('/api/v1/special', specialRoutes);

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Declare server variable in outer scope
let server: any;

import { connectToDatabase } from './config/database';

// Connect to database before starting
connectToDatabase().then(() => {
  server = app.listen(config.port, '0.0.0.0', () => {
    console.log(`Create App Microservice running on port ${config.port}`);
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;