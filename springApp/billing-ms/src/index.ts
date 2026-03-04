import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { config } from './config/environment';
import corsMiddleware from './middleware/cors';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { billingRoutes } from './routes/billingRoutes';
import { PricingScheduler } from './services/pricingScheduler';
import { BillingScheduler } from './services/billingScheduler';

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
    service: 'Billing Microservice',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      billing: '/api/v1/billing'
    },
    features: [
      'Invoicing',
      'Payment Processing',
      'Subscription Management',
      'Transaction History',
      'Recurring Billing',
      'One-Time Billing'
    ],
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Billing Microservice is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// API routes
app.use('/api/v1/billing', billingRoutes);

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

const server = app.listen(config.port, () => {
  console.log(`🚀 Billing Microservice running on port ${config.port}`);
  console.log(`📱 Environment: ${config.nodeEnv}`);
  console.log(`🔗 Service Auth URL: ${config.serviceAuthUrl}`);
  console.log(`🌐 Billing Service Features:`);
  console.log(`   🔄 Invoicing`);
  console.log(`   💰 Payment Processing`);
  console.log(`   📊 Subscription Management`);
  console.log(`   🧾 Transaction History`);
  
  // Start the billing scheduler
  const billingScheduler = BillingScheduler.getInstance();
  const billingInterval = parseInt(process.env.RECURRING_BILLING_INTERVAL || '3600000'); // Default: 1 hour
  billingScheduler.start(billingInterval);
  
  // Start the pricing scheduler
  const pricingScheduler = PricingScheduler.getInstance();
  const pricingInterval = parseInt(process.env.PRICING_INTERVAL || '3600000'); // Default: 1 hour
  pricingScheduler.start(pricingInterval);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  const billingScheduler = BillingScheduler.getInstance();
  billingScheduler.stop();
  const pricingScheduler = PricingScheduler.getInstance();
  pricingScheduler.stop();
  server.close(() => {
    mongoose.connection.close().then(() => {
      console.log('Process terminated');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  const billingScheduler = BillingScheduler.getInstance();
  billingScheduler.stop();
  const pricingScheduler = PricingScheduler.getInstance();
  pricingScheduler.stop();
  server.close(() => {
    mongoose.connection.close().then(() => {
      console.log('Process terminated');
      process.exit(0);
    });
  });
});

export default app;