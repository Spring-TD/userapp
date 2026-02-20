import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/environment';
import accountRoutes from './routes/accountRoutes';
import applicationRoutes from './routes/applicationRoutes';
import loanRoutes from './routes/loanRoutes';
import commodityRoutes from './routes/commodityRoutes';
import savingsRoutes from './routes/savingsRoutes';
import mortgageRoutes from './routes/mortgageRoutes';
import apiKeyRoutes from './routes/apiKeyRoutes';
import { setupProxies } from './middleware/proxyMiddleware';

const app = express();
const PORT = config.port;

// Middleware
app.use(helmet());
app.use(cors({
  origin: config.corsOrigins
}));
app.use(morgan(config.logLevel));

// Setup Proxies (must be before body parser)
setupProxies(app);

// Body parsers (for local routes)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/v1', accountRoutes);
app.use('/api/v1/applications', applicationRoutes);
app.use('/api/v1/loans', loanRoutes);
app.use('/api/v1/commodities', commodityRoutes);
app.use('/api/v1/savings-accounts', savingsRoutes);
app.use('/api/v1/mortgages', mortgageRoutes);
app.use('/api/v1/keys', apiKeyRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    service: 'Account Microservice',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      accounts: '/api/v1/accounts',
      applications: '/api/v1/applications',
      loans: '/api/v1/loans',
      savings: '/api/v1/savings-accounts',
      mortgages: '/api/v1/mortgages',
      keys: '/api/v1/keys'
    },
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  console.log(`404 - Not Found: ${req.method} ${req.url}`);
  res.status(404).json({ error: 'Route not found', path: req.url, method: req.method });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Account Service listening on port ${PORT}`);
  console.log(`Environment: ${config.nodeEnv}`);
});

export default app;