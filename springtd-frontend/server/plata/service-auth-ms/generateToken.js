const jwt = require('jsonwebtoken');
const redis = require('redis');

// Use exact JWT secret from .env
const JWT_SECRET = 'Jb@1zP!k9#tW$xL&5aVn*QyR7gE^cF#Qb23';

// Must match registered user
const userId = "bf107585-161f-47bd-afcd-ca4e9db19315"; 
const email = 'merchant@example.com'; 

// Generate token with full payload 
const token = jwt.sign(
  {
    userId,
    email,
    type: 'email_verification', // Required!
    iat: Math.floor(Date.now() / 1000), // Issued at
    exp: Math.floor(Date.now() / 1000) + 86400, // 24h expiration
  },
  JWT_SECRET,
  {
    issuer: 'service-auth-ms',
    audience: 'client-app'
  }
);

console.log('Generated Verification Token:');
console.log(token);

// Connect to Redis and log the token
(async () => {
  try {
    // Create Redis client using environment configuration
    const redisClient = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      password: process.env.REDIS_PASSWORD || undefined,
    });

    redisClient.on('error', (err) => {
      console.error('Redis connection error:', err);
    });

    await redisClient.connect();
    console.log('Connected to Redis successfully');

    // Store token in Redis with 24-hour expiration
    const key = `verification_token:${userId}`;
    await redisClient.setEx(key, 86400, token);
    console.log(`Token stored in Redis with key: ${key}`);

    await redisClient.quit();
  } catch (error) {
    console.error('Failed to connect to Redis or store token:', error.message);
  }
})();