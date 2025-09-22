const jwt = require('jsonwebtoken');

// 🔐 Use exact JWT secret from .env
const JWT_SECRET = 'Jb@1zP!k9#tW$xL&5aVn*QyR7gE^cF#Qb23';

// ✅ Must match registered user
const userId = "4b73e3e3-3db2-49a8-bf58-3e8de2773c68"; // From registration response
const email = 'test@example.com'; // Must match registered email

// 🔒 Generate token with full payload (required by verifyEmailVerificationToken)
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