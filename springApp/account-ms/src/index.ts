import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import axios from 'axios';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/environment';
import { swaggerServices, getServiceById, gatewaySpec } from './config/swagger';
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

// Swagger: serve gateway spec inline; proxy other microservices' OpenAPI specs
app.get('/api-docs/spec/:serviceId', async (req, res) => {
  const { serviceId } = req.params;
  if (serviceId === 'gateway') {
    res.setHeader('Content-Type', 'application/json');
    return res.json(gatewaySpec);
  }
  const service = getServiceById(serviceId);
  if (!service) {
    return res.status(404).json({ error: 'Unknown service', serviceId });
  }
  try {
    const { data } = await axios.get(service.specUrl, { timeout: 5000 });
    res.setHeader('Content-Type', 'application/json');
    return res.json(data);
  } catch (err: any) {
    return res.status(502).json({
      error: 'Failed to fetch spec',
      serviceId: service.id,
      message: err?.message || 'Backend unreachable',
    });
  }
});

// Swagger UI hub: gateway first (always loads), then all microservices (load when selected)
const swaggerOptions = {
  swaggerOptions: {
    urls: [
      { name: 'Gateway (Account MS)', url: '/api-docs/spec/gateway' },
      ...swaggerServices.map((s) => ({ name: s.name, url: `/api-docs/spec/${s.id}` })),
    ],
  },
};
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(undefined, swaggerOptions));
app.use('/api-docs/', swaggerUi.serve, swaggerUi.setup(undefined, swaggerOptions));

// Root route (for verifying service is running)
app.get('/', (req, res) => {
  res.status(200).json({
    service: 'Account Management Microservice',
    status: 'Running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      api: '/api/v1',
      apiDocs: '/api-docs'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Account Service listening on port ${PORT}`);
  console.log(`Environment: ${config.nodeEnv}`);
});

export default app;