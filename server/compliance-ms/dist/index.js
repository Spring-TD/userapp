"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const kycRoutes_1 = require("./routes/kycRoutes");
const errorHandler_1 = require("./middleware/errorHandler");
const logger_1 = require("./utils/logger");
const mockDb_1 = require("./utils/mockDb");
const RedisCacheService_1 = require("./services/RedisCacheService");
dotenv_1.default.config();
const app = (0, express_1.default)();
exports.app = app;
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3003;
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use((0, helmet_1.default)());
app.use((0, morgan_1.default)('combined', {
    stream: { write: (message) => logger_1.logger.info(message.trim()) }
}));
(0, mockDb_1.seedMockData)();
app.get('/', (req, res) => {
    res.json({
        success: true,
        service: 'Compliance Microservice',
        version: '1.0.0',
        status: 'running',
        endpoints: {
            health: '/health',
            kyc: '/api/v1/kyc'
        },
        features: [
            'KYC Verification',
            'AML Checks',
            'Sanctions Screening',
            'CAC Verification',
            'Liveness Testing',
            'Document Verification'
        ],
        timestamp: new Date().toISOString()
    });
});
app.get('/health', async (req, res) => {
    const stats = (0, mockDb_1.getDbStats)();
    let cacheStats = { count: 0, isRedisConnected: false };
    try {
        cacheStats = await RedisCacheService_1.redisCacheService.getStats();
    }
    catch (error) {
        logger_1.logger.error('Failed to get cache stats', { error });
    }
    res.json({
        status: 'healthy',
        service: 'compliance-ms',
        timestamp: new Date().toISOString(),
        database: 'mock',
        cache: cacheStats,
        stats
    });
});
app.use('/api/v1/kyc', kycRoutes_1.kycRoutes);
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        path: req.originalUrl
    });
});
app.use(errorHandler_1.errorHandler);
process.on('SIGTERM', async () => {
    logger_1.logger.info('SIGTERM received, shutting down gracefully');
    try {
        await RedisCacheService_1.redisCacheService.clear();
    }
    catch (error) {
        logger_1.logger.error('Error clearing cache on shutdown', { error });
    }
    process.exit(0);
});
process.on('SIGINT', async () => {
    logger_1.logger.info('SIGINT received, shutting down gracefully');
    try {
        await RedisCacheService_1.redisCacheService.clear();
    }
    catch (error) {
        logger_1.logger.error('Error clearing cache on shutdown', { error });
    }
    process.exit(0);
});
app.listen(PORT, '0.0.0.0', () => {
    logger_1.logger.info(`Compliance service running on port ${PORT}`);
    logger_1.logger.info('Mock database initialized with sample data');
    const stats = (0, mockDb_1.getDbStats)();
    logger_1.logger.info('Database stats:', stats);
});
//# sourceMappingURL=index.js.map