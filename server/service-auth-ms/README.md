# Client Authentication Microservice

A comprehensive authentication and user management microservice providing secure account creation, verification, authentication, and user lifecycle management capabilities for both merchants and regular users.

## 🚨 Recent Updates

### Field Naming Convention Change
The API has been updated to use **snake_case** field naming convention instead of camelCase:
- `firstName` → `first_name`
- `lastName` → `last_name`
- `userType` → `user_type`
- `emailVerified` → `email_verified`
- `phoneVerified` → `phone_verified`
- `createdAt` → `created_at`
- `updatedAt` → `updated_at`
- `lastLoginAt` → `last_login_at`
- `failedLoginAttempts` → `failed_login_attempts`
- `lockedUntil` → `locked_until`
- `userMerchantId` → `user_merchant_id`

### User Registration Changes
- **Removed**: Independent user registration
- **Required**: Users must now register under a merchant using `user_merchant_id`
- **Simplified**: Removed `dateOfBirth` and `address` fields from user registration
- **Added**: `country` field is now required for all users

## Features

### ✅ Implemented
- User and merchant account registration
- Input validation and sanitization
- Password complexity requirements
- Email uniqueness validation
- Secure password hashing with bcrypt
- Rate limiting and security headers
- Structured logging and error handling
- Comprehensive test coverage

### Planned Implementation
- Email/SMS verification
- JWT-based authentication
- OTP (One-Time Password) support
- Password management and reset
- User profile management
- Administrative account operations
- Database integration (MongoDB)
- Redis caching
- Comprehensive audit trails

## Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js with TypeScript
- **Database**: MongoDB (configured, currently using mock database)
- **Cache**: Redis 7+ (configured, not yet implemented)
- **Authentication**: JWT (JSON Web Tokens) - *planned implementation*
- **Password Hashing**: bcrypt ✅
- **Validation**: Joi ✅
- **ORM**: Prisma (configured, not yet connected)
- **Testing**: Jest + Supertest ✅
- **Security**: helmet, CORS, express-rate-limit ✅
- **Logging**: Winston ✅

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- MongoDB 4+ (for production)
- Redis 7+ (for production)

**Note**: For development, the service uses a mock in-memory database, so MongoDB not required initially.

### Installation

1. Clone the repository and navigate to the project directory:
   ```bash
   cd "server/client Auth MS"
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment variables file:
   ```bash
   # Copy the example file (if available) or create manually
   cp .env.example .env
   ```

4. Update the `.env` file with your configuration values.

## Environment Variables

The application requires the following environment variables. Create a `.env` file in the project root with these settings:

### Core Configuration
```bash
# Application Environment
NODE_ENV=development                    # Options: development, production, test
PORT=3000                              # Server port (default: 3000)
```

### Database Configuration
```bash
# PostgreSQL Database
DATABASE_URL=postgresql://user:password@localhost:5432/auth_db  # Required
DATABASE_SSL=false                     # Enable SSL for database connection (default: false)

# Redis Cache
REDIS_URL=redis://localhost:6379      # Required
REDIS_PASSWORD=                        # Optional redis password
```

### Security Configuration
```bash
# JWT Authentication
JWT_SECRET=your-super-secure-secret-key-minimum-32-characters  # Required (min 32 chars)
JWT_EXPIRES_IN=1h                      # JWT token expiration (default: 1h)
JWT_REFRESH_EXPIRES_IN=7d              # Refresh token expiration (default: 7d)

# Password Hashing
BCRYPT_ROUNDS=12                       # Password hashing rounds (10-15, default: 12)

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000            # Rate limit window in ms (default: 15 minutes)
RATE_LIMIT_MAX_REQUESTS=100            # Max requests per window (default: 100)

# Account Security
ACCOUNT_LOCKOUT_ATTEMPTS=5             # Failed login attempts before lockout (default: 5)
ACCOUNT_LOCKOUT_DURATION=1800          # Account lockout duration in seconds (default: 30 min)

# CORS Settings
CORS_ALLOWED_ORIGINS=http://localhost:3000  # Comma-separated allowed origins
```

### Email Configuration
```bash
# SMTP Settings (Required for email verification)
SMTP_HOST=smtp.gmail.com               # Required
SMTP_PORT=587                          # Default: 587
SMTP_SECURE=false                      # Use TLS (default: false)
SMTP_USER=your-email@gmail.com         # Required
SMTP_PASS=your-app-password            # Required
FROM_EMAIL=noreply@yourapp.com         # Required
```

### SMS Configuration (Optional - Twilio)
```bash
# Twilio Settings (Optional for SMS OTP)
TWILIO_ACCOUNT_SID=your-twilio-sid     # Optional
TWILIO_AUTH_TOKEN=your-twilio-token    # Optional
TWILIO_PHONE_NUMBER=+1234567890        # Optional
```

### OTP Configuration
```bash
# OTP Settings
OTP_EXPIRES_IN=300                     # OTP expiration in seconds (default: 5 min)
OTP_MAX_ATTEMPTS=3                     # Max OTP verification attempts (default: 3)
OTP_LOCKOUT_DURATION=900               # OTP lockout duration in seconds (default: 15 min)
```

### Verification Settings
```bash
# Email/Password Reset
EMAIL_VERIFICATION_EXPIRES_IN=86400    # Email verification expiry in seconds (default: 24 hours)
PASSWORD_RESET_EXPIRES_IN=3600         # Password reset token expiry in seconds (default: 1 hour)
```

### Validation Rules
- **JWT_SECRET**: Must be at least 32 characters long
- **BCRYPT_ROUNDS**: Must be between 10-15 (higher = more secure but slower)
- **EMAIL fields**: Must be valid email format
- **PORT**: Must be a valid port number
- **Duration fields**: Must be positive integers (in seconds)

### Example .env File
```bash
# Core
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/auth_db
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=your-super-secure-secret-key-at-least-32-characters-long
BCRYPT_ROUNDS=12

# Email
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@yourapp.com

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

5. Build the project:
   ```bash
   npm run build
   ```

### Development

Run the development server with hot reload:
```bash
npm run dev
```

The server will start on port 3000 (or the port specified in your `.env` file) and automatically restart when you make changes.

### Testing

Run all tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Generate test coverage report:
```bash
npm run test:coverage
```

### Production

Build and start the production server:
```bash
npm run build
npm start
```

### API Testing

You can test the implemented endpoints using curl or any API testing tool:

```bash
# Health check
curl http://localhost:3000/health

# Register a user (must include user_merchant_id)
curl -X POST http://localhost:3000/api/v1/auth/register/user \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "first_name": "John",
    "last_name": "Doe",
    "user_merchant_id": "merchant_001",
    "country": "USA"
  }'
```

## API Documentation

The service provides the following API endpoints:

### Authentication
- `POST /api/v1/auth/register/user` - Register user account ✅ **Implemented**
- `POST /api/v1/auth/register/merchant` - Register merchant account ✅ **Implemented**
- `POST /api/v1/auth/verify-account` - Verify account with token ✅ **Implemented**
- `POST /api/v1/auth/login` - User/merchant login 🚧 **Under Development**
- `POST /api/v1/auth/logout` - Logout and invalidate session 🚧 **Under Development**
- `POST /api/v1/auth/refresh` - Refresh JWT token 🚧 **Under Development**

### OTP Management
- `POST /api/v1/otp/generate` - Generate OTP code 🚧 **Under Development**
- `POST /api/v1/otp/verify` - Verify OTP code 🚧 **Under Development**
- `POST /api/v1/otp/resend` - Resend OTP code 🚧 **Under Development**

### Password Management
- `POST /api/v1/password/forgot` - Initiate password reset 🚧 **Under Development**
- `POST /api/v1/password/reset` - Reset password with token 🚧 **Under Development**
- `PUT /api/v1/password/change` - Change password (authenticated) 🚧 **Under Development**

### User Management
- `GET /api/v1/user/profile` - Get user profile 🚧 **Under Development**
- `PUT /api/v1/user/profile` - Update user profile 🚧 **Under Development**
- `GET /api/v1/user/info` - Get detailed user information 🚧 **Under Development**
- `POST /api/v1/user/verify-info` - Verify user information 🚧 **Under Development**
- `PUT /api/v1/user/suspend` - Suspend user account (admin) 🚧 **Under Development**
- `PUT /api/v1/user/activate` - Activate suspended account (admin) 🚧 **Under Development**

### Health Check
- `GET /health` - Service health status ✅ **Implemented**

## Implemented Endpoints

### User Registration
**`POST /api/v1/auth/register/user`**

**Note**: Users must register under a merchant with a valid `user_merchant_id`.

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+1234567890",
  "user_merchant_id": "merchant_001",
  "country": "USA"
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "User registered successfully. Please check your email for verification instructions.",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "john.doe@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "user_type": "user",
      "status": "pending",
      "email_verified": false,
      "created_at": "2025-01-10T09:00:00.000Z"
    }
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Email address is already registered"
}
```

### Merchant Registration
**`POST /api/v1/auth/register/merchant`**

**Request Body:**
```json
{
  "email": "merchant@example.com",
  "password": "SecurePass123!",
  "first_name": "John",
  "last_name": "Smith",
  "phone": "+1234567890",
  "user_merchant_id": "merchant_001",
  "country": "USA"
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Merchant registered successfully. Please check your email for verification instructions.",
  "data": {
    "merchant": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "merchant@example.com",
      "first_name": "John",
      "last_name": "Smith",
      "user_type": "merchant",
      "status": "pending",
      "email_verified": false,
      "user_merchant_id": "merchant_001",
      "country": "USA",
      "created_at": "2025-01-10T09:00:00.000Z"
    }
  }
}
```

### Health Check
**`GET /health`**

**Success Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-10T09:00:00.000Z",
  "service": "client-auth-microservice"
}
```

### Account Verification
**`POST /api/v1/auth/verify-account`**

**Request Body:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Account verified successfully",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "user_type": "user",
      "status": "active",
      "email_verified": true,
      "phone_verified": false,
      "created_at": "2025-01-10T09:00:00.000Z"
    }
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Invalid or expired verification token"
}
```

## Data Models

### User Types
```typescript
enum UserType {
  USER = 'user',
  MERCHANT = 'merchant'
}

enum AccountStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DEACTIVATED = 'deactivated'
}
```

### Base User Interface
```typescript
interface BaseUser {
  id: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  user_type: UserType;
  status: AccountStatus;
  email_verified: boolean;
  phone_verified: boolean;
  created_at: Date;
  updated_at: Date;
  last_login_at?: Date;
  failed_login_attempts: number;
  locked_until?: Date;
}
```

### User Interface
```typescript
interface User extends BaseUser {
  user_type: UserType.USER;
  user_merchant_id: string;
  country: string;
}
```

### Merchant Interface
```typescript
interface Merchant extends BaseUser {
  user_type: UserType.MERCHANT;
  user_merchant_id: string;
  country: string;
}
```

## Validation Rules

### Password Requirements
- Minimum 8 characters, maximum 128 characters
- Must contain at least one lowercase letter
- Must contain at least one uppercase letter
- Must contain at least one number
- Must contain at least one special character (@$!%*?&)

### Email Validation
- Must be a valid email format
- Case-insensitive (converted to lowercase)
- Must be unique across all user types

### Phone Validation
- Must be in international format (e.g., +1234567890)
- Optional field for both users and merchants

### User Requirements
- Must be associated with a valid merchant via `user_merchant_id`
- Country: Required field indicating user's location
- Phone: Optional field in international format

### Merchant Requirements
- User Merchant ID: Required, unique identifier for merchant
- Country: Required, user's country location

## Error Handling

All errors follow a consistent format:

**Validation Error (400 Bad Request):**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": "Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character"
}
```

**Registration Error (400 Bad Request):**
```json
{
  "success": false,
  "error": "Email address is already registered"
}
```

**Server Error (500 Internal Server Error):**
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "Internal server error",
    "details": null,
    "timestamp": "2025-01-10T09:00:00.000Z",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

## Implementation Status

### ✅ Completed Features
- User registration with validation
- Merchant registration with validation
- Password hashing with bcrypt
- Input validation using Joi
- Mock database layer
- Comprehensive test suite
- Security middleware (helmet, CORS, rate limiting)
- Structured logging with Winston
- Error handling middleware

### 🚧 Under Development
- Account verification system
- JWT-based authentication
- Password reset functionality
- OTP generation and verification
- User profile management
- Database integration (MongoDB)
- Redis caching implementation
- Email/SMS notification services

## Current Database

The service currently uses an in-memory mock database for development and testing. The mock database provides:
- User storage with email indexing
- CRUD operations for user management
- Email uniqueness validation
- Data persistence during runtime (resets on restart)

## Project Structure

```
src/
├── config/          # Configuration files
├── controllers/     # HTTP request handlers
├── middleware/      # Express middleware
├── models/          # Data models and interfaces
├── routes/          # API route definitions
├── services/        # Business logic services
├── utils/           # Utility functions
└── index.ts         # Application entry point
```

## Security Features

- Password complexity validation
- Rate limiting on authentication endpoints
- Account lockout after failed attempts
- JWT token expiration and refresh
- CORS configuration
- Input sanitization and validation
- SQL injection prevention
- XSS protection headers
