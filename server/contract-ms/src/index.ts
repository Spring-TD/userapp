import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/environment';
import { connectDatabase } from './config/database';
import corsMiddleware from './middleware/cors';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { contractRoutes } from './routes/contractRoutes';

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
    service: 'Contract Microservice',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      contracts: '/api/v1/contracts'
    },
    features: [
      'Contract Creation',
      'Contract Management',
      'Agreement Templates',
      'Contract Signing',
      'Contract Storage',
      'Contract Versioning'
    ],
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Contract Microservice is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API routes
app.use('/api/v1/contracts', contractRoutes);

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(config.port, async () => {
  // Connect to MongoDB
  await connectDatabase();

  console.log(`🚀 Contract Microservice running on port ${config.port}`);
  console.log(`📱 Environment: ${config.nodeEnv}`);
  console.log(`🔗 Service Auth URL: ${config.serviceAuthUrl}`);
  console.log(`🌐 Contract Service Features:`);
  console.log(`   📝 Contract Creation`);
  console.log(`   📋 Contract Management`);
  console.log(`   📄 Agreement Templates`);
  console.log(`   ✍️  Contract Signing`);
  console.log(`   💾 Contract Storage`);
  console.log(`   🔄 Contract Versioning`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

export default app;
