import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { config } from './config/environment';
import { connectToDatabase, disconnectFromDatabase } from './config/database';
import { corsMiddleware } from './middleware';
import { errorHandler, notFoundHandler } from './middleware';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger';
import { productRoutes, configurationRoutes } from './routes';

const app = express();
let server: ReturnType<express.Express['listen']> | null = null;

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
    service: 'Product Microservice',
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
  const dbState = mongoose.connection.readyState;
  const database = dbState === 1 ? 'mongodb' : 'none';
  res.json({
    success: true,
    message: 'Product Microservice is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    database,
    mongodbConnected: dbState === 1
  });
});

// OpenAPI / Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API routes
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/configurations', configurationRoutes);

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown
const shutdown = async () => {
  try {
    await disconnectFromDatabase();
  } catch (error) {
    console.error('Error disconnecting from MongoDB on shutdown', error);
  }
  if (server) {
    server.close(() => {
      console.log('Process terminated');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  shutdown();
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  shutdown();
});

// Connect to MongoDB then start server (skip in test so tests can use app without connecting)
if (process.env.NODE_ENV !== 'test') {
  connectToDatabase()
    .then(() => {
      server = app.listen(config.port, '0.0.0.0', () => {
        console.log(`🚀 Product Microservice running on port ${config.port}`);
        console.log(`📱 Environment: ${config.nodeEnv}`);
        console.log(`💾 Database: MongoDB connected`);
      });
    })
    .catch((err) => {
      console.error('Failed to start product-ms:', err);
      process.exit(1);
    });
}

export default app;