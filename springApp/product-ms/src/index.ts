import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { config } from './config/environment';
import { corsMiddleware } from './middleware';
import { errorHandler, notFoundHandler } from './middleware';
import { productRoutes, configurationRoutes } from './routes';

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
    service: 'Product Microservice - Updated',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      products: '/api/v1/products',
      configurations: '/api/v1/configurations'
    },
    features: [
      'Loan Products',
      'Savings Products',
      'Mortgage Products',
      'Commodity Products',
      'Product Configuration Management'
    ],
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Product Microservice is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// API routes
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/configurations', configurationRoutes);

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Connect to MongoDB before starting server
mongoose.connect(config.mongoUri)
  .then(() => {
    console.log('✅ Connected to MongoDB (DigitalOcean)');
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`🚀 Product Microservice running on port ${config.port}`);
  console.log(`📱 Environment: ${config.nodeEnv}`);
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