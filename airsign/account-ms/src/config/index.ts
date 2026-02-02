import dotenv from 'dotenv';

dotenv.config();

export const config = {
    port: process.env['PORT'] || 3010,
    mongoUri: process.env['MONGO_URI'] || 'mongodb://localhost:27017/airsign_account_db',
    jwtSecret: process.env['JWT_SECRET'] || 'default_secret',
    env: process.env['NODE_ENV'] || 'development',
    corsOrigins: process.env['CORS_ORIGINS']?.split(',') || ['http://localhost:3000']
};
