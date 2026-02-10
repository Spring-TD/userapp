import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { config } from './config';
import authRoutes from './routes/authRoutes';
import walletRoutes from './routes/walletRoutes';
import billingRoutes from './routes/billingRoutes';

const app: Express = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(morgan('dev'));
app.use(cors({
    origin: config.corsOrigins
}));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/wallets', walletRoutes);
app.use('/api/v1/billing', billingRoutes);

// Root Route
app.get('/', (req: Request, res: Response) => {
    res.json({ 
        message: 'AirSign Account Microservice', 
        status: 'UP', 
        timestamp: new Date(), 
        service: 'account-ms',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            auth: '/api/v1/auth',
            wallets: '/api/v1/wallets',
            billing: '/api/v1/billing'
        }
    });
});

// Health Check
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'UP', timestamp: new Date(), service: 'account-ms' });
});

/*
// Database connection
mongoose.connect(config.mongoUri)
    .then(() => {
        console.log('Connected to MongoDB');
    })
    .catch((error) => {
        console.error('MongoDB connection error:', error);
    });
*/
console.log('Using In-Memory Mock Database');

// Start server
app.listen(config.port, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${config.port}`);
});

export default app;
