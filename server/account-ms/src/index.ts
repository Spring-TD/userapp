import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/environment';
import accountRoutes from './routes/accountRoutes';

const app = express();
const PORT = config.port;

// Middleware
app.use(helmet());
app.use(cors({
  origin: config.corsOrigins
}));
app.use(morgan(config.logLevel));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/v1', accountRoutes);

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