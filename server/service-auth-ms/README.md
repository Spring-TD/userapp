# Service Authentication Microservice

A comprehensive authentication and user management microservice providing secure account creation, verification, authentication, and user lifecycle management capabilities for both merchants and regular users. **Now includes inter-service authentication and management.**

Deployment URL: https://service-auth-ms.fly.dev/

## Features

### ✅ Implemented
- User and merchant account registration
- Admin account registration 
- Input validation and sanitization
- Password complexity requirements
- Email uniqueness validation
- Secure password hashing with bcrypt
- Rate limiting and security headers
- Structured logging and error handling
- Comprehensive test coverage
- JWT-based authentication ✅
- Redis caching ✅
- Email verification ✅ 
- Password management and reset ✅
- User profile management ✅
- Administrative account operations ✅
- OTP generation and verification ✅
- Role Management and Permissions (RBAC) ✅
- Merchant User Invitation System ✅
- Merchant compliance status checking ✅
- Database integration (MongoDB) 🛠️ (configured, using mock database)
- Comprehensive audit trails 🚧 (structured logging implemented)

## Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js with TypeScript
- **Database**: MongoDB (configured, currently using mock database)
- **Cache**: Redis 7+ ✅ (now fully implemented)
- **Authentication**: JWT (JSON Web Tokens) ✅
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
```

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

### Compliance Service Configuration
```bash
# Compliance Service
COMPLIANCE_SERVICE_URL=http://localhost:3003  # Compliance microservice URL (default: http://localhost:3003)
```

### Validation Rules
- **JWT_SECRET**: Must be at least 32 characters long
- **BCRYPT_ROUNDS**: Must be between 10-15 (higher = more secure but slower)
- **EMAIL fields**: Must be valid email format
- **PORT**: Must be a valid port number
- **Duration fields**: Must be positive integers (in seconds)

### Example .env File
```
# Core
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=mongodb://localhost:27017/auth_db  # Required
MONGODB_SSL=false                     # Enable SSL for database connection (default: false)
MONGODB_REPLICASET=                   # Optional replica set name
MONGODB_AUTH_SOURCE=                  # Optional authentication database

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
- `POST /api/v1/auth/register/admin` - Register admin account  ✅ **Implemented**
- `POST /api/v1/auth/verify-account` - Verify account with token ✅ **Implemented**
- `POST /api/v1/auth/login` - User/merchant login ✅ **Implemented**
- `POST /api/v1/auth/logout` - Logout and invalidate session ✅ **Implemented**
- `POST /api/v1/auth/refresh` - Refresh JWT token ✅ **Implemented**

### OTP Management
- `POST /api/v1/otp/generate` - Generate OTP code ✅ **Implemented**
- `POST /api/v1/otp/verify` - Verify OTP code ✅ **Implemented**
- `POST /api/v1/otp/resend` - Resend OTP code ✅ **Implemented**

### Password Management
- `POST /api/v1/password/forgot` - Initiate password reset ✅ **Implemented**
- `POST /api/v1/password/reset` - Reset password with token ✅ **Implemented**
- `PUT /api/v1/password/change` - Change password (authenticated) ✅ **Implemented**

### User Management
- `GET /api/v1/user/profile` - Get user profile ✅ **Implemented**
- `GET /api/v1/user/list` - List users for merchant ✅ **Implemented**
- `PUT /api/v1/user/profile` - Update user profile ✅ **Implemented**
- `GET /api/v1/user/info` - Get detailed user information ✅ **Implemented**
- `POST /api/v1/user/verify-info` - Verify user information ✅ **Implemented**
- `PUT /api/v1/user/suspend` - Suspend user account (admin) ✅ **Implemented**
- `PUT /api/v1/user/activate` - Activate suspended account (admin) ✅ **Implemented**
- `PUT /api/v1/user/:userId/status` - Update user status (Merchant/Admin) ✅ **Implemented**

### Role Management
- `POST /api/v1/roles` - Create new role (Merchant) ✅ **Implemented**
- `GET /api/v1/roles` - Get all roles (Merchant) ✅ **Implemented**
- `GET /api/v1/roles/permissions` - Get available permissions ✅ **Implemented**

### Invitation Management
- `POST /api/v1/invitations` - Create invitation (Merchant) ✅ **Implemented**
- `GET /api/v1/invitations` - Get invitations (Merchant) ✅ **Implemented**
- `GET /api/v1/invitations/validate/:token` - Validate invitation token ✅ **Implemented**
- `POST /api/v1/invitations/accept` - Accept invitation ✅ **Implemented**

### Health Check
- `GET /health` - Service health status ✅ **Implemented**

## SAMS (Service Authentication Microservice) API

**NEW:** The service now includes comprehensive service-to-service authentication and management capabilities.

### Service Management
- `POST /api/v1/services/create` - Create new service registration ✅ **Implemented**
- `GET /api/v1/services` - Get all registered services ✅ **Implemented**
- `GET /api/v1/services/:serviceId` - Get specific service by ID ✅ **Implemented**
- `GET /api/v1/services/health` - Get SAMS system health ✅ **Implemented**

### IP Whitelisting
- `POST /api/v1/services/:serviceId/whitelist-ip` - Whitelist IP addresses for service ✅ **Implemented**
- `GET /api/v1/services/:serviceId/whitelist-ip` - Get whitelisted IPs for service ✅ **Implemented**
- `POST /api/v1/services/:serviceId/check-ip` - Check if IP is whitelisted ✅ **Implemented**

### Credential Management
- `POST /api/v1/services/:serviceId/credentials` - Create credentials for service ✅ **Implemented**
- `GET /api/v1/services/:serviceId/credentials` - Get service credentials ✅ **Implemented**
- `POST /api/v1/credentials/validate` - Validate credential ✅ **Implemented**
- `POST /api/v1/credentials/void/:credentialId` - Void/revoke credential ✅ **Implemented**

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

### Admin Registration
**`POST /api/v1/auth/register/admin`**

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "SecurePass123!",
  "first_name": "Admin",
  "last_name": "User",
  "phone": "+1234567890",
  "country": "USA"
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Admin registered successfully.",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "admin@example.com",
      "first_name": "Admin",
      "last_name": "User",
      "user_type": "admin",
      "status": "active",
      "email_verified": true,
      "phone_verified": false,
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

### User/Merchant Login
**`POST /api/v1/auth/login`**

Authenticates a user or merchant and returns access/refresh tokens. For merchants, also checks compliance status with the compliance service.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
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
      "last_login_at": "2025-01-10T09:00:00.000Z",
      "created_at": "2025-01-01T09:00:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    },
    "compliance": {
      "needsCompliance": false,
      "complianceStatus": "NOT_APPLICABLE"
    }
  }
}
```

For merchants, the compliance section will indicate if compliance checks are needed:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    // ... user and tokens data ...
    "compliance": {
      "needsCompliance": true,
      "complianceStatus": "PENDING"
    }
  }
}
```

**Error Response (401 Unauthorized):**
```json
{
  "success": false,
  "error": "Invalid email or password"
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": "email is required"
}
```

## Data Models

### User Types
```typescript
enum UserType {
  USER = 'user',
  MERCHANT = 'merchant',
  ADMIN = 'admin'
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

### Admin Interface
```typescript
interface Admin extends BaseUser {
  user_type: UserType.ADMIN;
  user_merchant_id: 'admin';
  country: string;
}
\`\`\`

### Role & Permissions
\`\`\`typescript
enum Permission {
  CREATE_ADMIN = 'create_admin',
  GENERATE_SECRET_KEYS = 'generate_secret_keys',
  SEE_SECRET_KEYS = 'see_secret_keys',
  EDIT_PRODUCTS = 'edit_products',
  CREATE_PRODUCTS = 'create_products',
  VIEW_PRODUCTS = 'view_products',
  CHANGE_PASSWORD = 'change_password',
  SEE_BILLING = 'see_billing',
  ADD_PAYMENT_METHOD = 'add_payment_method',
  EDIT_PAYMENT_METHOD = 'edit_payment_method',
  CREATE_APP = 'create_app',
  SEE_ACTIVITY_LOG = 'see_activity_log',
  DOWNLOAD_REPORT = 'download_report'
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  merchant_id: string;
  created_at: Date;
  merchant_id: string;
  created_at: Date;
  updated_at: Date;
}

interface Invitation {
  id: string;
  email: string;
  roleId: string;
  merchantId: string;
  token: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
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

### Admin Requirements
- Country: Required, user's country location
- Phone: Optional field in international format
- Email verified by default
- Status set to active by default

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
- Admin registration with validation 
- Password hashing with bcrypt
- Input validation using Joi
- Mock database layer
- Comprehensive test suite
- Security middleware (helmet, CORS, rate limiting)
- Structured logging with Winston
- Error handling middleware
- JWT-based authentication
- Redis caching implementation ✅
- Email verification system ✅
- Password management and reset ✅
- OTP generation and verification ✅
- User profile management ✅
- Administrative account operations ✅
- SAMS (Service Authentication Microservice) ✅
- Merchant compliance status checking ✅

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
- Redis-based token blacklisting
- Comprehensive data caching

## Redis Caching Implementation ✅

The service now includes comprehensive Redis caching capabilities:

### Features
- **User Data Caching**: User profiles and authentication data are cached for improved performance
- **Token Blacklisting**: JWT tokens are blacklisted using Redis with automatic expiration
- **Fallback Support**: In-memory caching when Redis is unavailable
- **Automatic Cleanup**: Expired cache entries are automatically cleaned up
- **Connection Management**: Robust Redis connection handling with reconnection logic

### Cache Keys
- `user:{userId}` - User profile data
- `email:{email}` - User lookup by email
- `blacklist:{token}` - Blacklisted JWT tokens

### Performance Benefits
- Reduced database queries for frequently accessed user data
- Faster authentication token validation
- Improved response times for user profile endpoints
- Scalable token blacklist management

### Configuration
Redis caching is configured through environment variables:
```bash
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-redis-password  # Optional
```

### Cache TTL (Time To Live)
- User data: 1 hour (3600 seconds)
- Token blacklist: Based on token expiration time
- Custom TTL can be set per cache operation

## SAMS (Service Authentication Microservice) Documentation

### Overview

SAMS provides comprehensive service-to-service authentication and management capabilities, enabling secure communication between microservices through:

- **Service Registration**: Register and manage microservices
- **IP Whitelisting**: Control access based on IP addresses
- **Credential Management**: Create, validate, and revoke authentication credentials
- **Service Discovery**: Find and manage registered services

### SAMS API Endpoints

#### Service Management

**Create Service - `POST /api/v1/services/create`**
Returns `service_id` for a new microservice registration.

```bash
curl -X POST "http://localhost:3000/api/v1/services/create" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mortgage Calculation MS",
    "description": "A microservice for calculating mortgage rates and payments",
    "version": "1.0.0",
    "endpoint_url": "http://localhost:3001",
    "health_check_url": "http://localhost:3001/health",
    "owner_email": "dev@example.com",
    "tags": ["mortgage", "calculation", "finance"]
  }'
```

**Get All Services - `GET /api/v1/services`**
Returns all registered services.

**Get Service - `GET /api/v1/services/:serviceId`**
Returns specific service details with whitelisted IPs and credential count.

#### IP Whitelisting

**Whitelist IP - `POST /api/v1/services/:serviceId/whitelist-ip`**
Restricts service access to specific IP addresses or ranges.

```bash
curl -X POST "http://localhost:3000/api/v1/services/{serviceId}/whitelist-ip" \
  -H "Content-Type: application/json" \
  -d '{
    "ip_addresses": ["192.168.1.100", "10.0.0.0/24"],
    "description": "Allow access from internal network"
  }'
```

#### Credential Management

**Create Credential - `POST /api/v1/services/:serviceId/credentials`**
Generates secure credentials for service-to-service authentication.

```bash
curl -X POST "http://localhost:3000/api/v1/services/{serviceId}/credentials" \
  -H "Content-Type: application/json" \
  -d '{
    "credential_type": "api_key",
    "expires_in": 86400,
    "permissions": ["read", "write"],
    "rate_limit": 1000
  }'
```

**Validate Credential - `POST /api/v1/credentials/validate`**
Verifies if a credential is active and authorized.

```bash
curl -X POST "http://localhost:3000/api/v1/credentials/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "credential_value": "sams_Q6OrmkzcEbE7wWXOiGRYvcRrT1QAbUSZ",
    "service_id": "72018112-bedb-42bf-8697-9bef5fb4eb19",
    "requested_permissions": ["read"]
  }'
```

**Void Credential - `POST /api/v1/credentials/void/:credentialId`**
Revokes a credential, making it inactive.

### SAMS Usage Workflow

1. **Service Registration**: Register your microservice to get a `service_id`
2. **IP Whitelisting**: Define which servers can access your service
3. **Credential Creation**: Generate credentials for other services to authenticate
4. **Credential Validation**: Target services validate incoming credentials
5. **Credential Management**: Void compromised or unused credentials

### SAMS Features

- **Secure Credential Generation**: Uses cryptographically secure random tokens
- **Multiple Credential Types**: API keys, JWT tokens, client secrets
- **Flexible Permissions**: Define granular access permissions
- **Rate Limiting**: Control request rates per credential
- **IP-based Access Control**: CIDR notation support for IP ranges
- **Automatic Cleanup**: Expired credentials are automatically marked
- **Comprehensive Logging**: All operations are logged for audit trails

### Integration Example

```javascript
// Microservice A requests access to Microservice B
const response = await fetch('http://microservice-b/api/data', {
  headers: {
    'Authorization': 'Bearer sams_Q6OrmkzcEbE7wWXOiGRYvcRrT1QAbUSZ',
    'X-Service-ID': 'service-a-id'
  }
});

// Microservice B validates the credential
const validation = await fetch('http://sams:3000/api/v1/credentials/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    credential_value: 'sams_Q6OrmkzcEbE7wWXOiGRYvcRrT1QAbUSZ',
    service_id: 'service-b-id',
    requested_permissions: ['read']
  })
});

if (validation.valid) {
  // Process the request
} else {
  // Rejected with 401 Unauthorized
}
\`\`\`

### Role Management API

#### Create Role
**\`POST /api/v1/roles\`**

Creates a new role with specific permissions. Only available to merchants.

**Request Body:**
\`\`\`json
{
  "name": "Support Agent",
  "description": "Role for customer support staff",
  "permissions": [
    "view_products",
    "see_activity_log",
    "change_password"
  ]
}
\`\`\`

**Success Response (201 Created):**
\`\`\`json
{
  "success": true,
  "message": "Role created successfully",
  "data": {
    "role": {
      "id": "role-uuid-1234",
      "name": "Support Agent",
      "description": "Role for customer support staff",
      "permissions": ["view_products", "see_activity_log", "change_password"],
      "merchant_id": "merchant-uuid-5678",
      "created_at": "2025-01-10T12:00:00.000Z",
      "updated_at": "2025-01-10T12:00:00.000Z"
    }
  }
}
\`\`\`

#### Get Roles
**\`GET /api/v1/roles\`**

Retrieves all roles created by the authenticated merchant.

#### Get Permissions
**\`GET /api/v1/roles/permissions\`**

Returns a list of all available permissions that can be assigned to roles.

**Success Response (200 OK):**
\`\`\`json
{
  "success": true,
  "data": {
    "permissions": [
      "create_admin",
      "generate_secret_keys",
      "see_secret_keys",
      "edit_products",
      "create_products",
      "view_products",
      "change_password",
      "see_billing",
      "add_payment_method",
      "edit_payment_method",
      "create_app",
      "see_activity_log",
      "download_report"
    ]
  }
}
\`\`\`


### Default Users
default merchant user that was created has the following credentials:

- **Email**: merchant@example.com
- **Password**: DefaultPass123!

This user was created with verified email status and active account status when the server started. The system registered the merchant, sent a mock email verification, and then automatically verified the account as part of our initialization process.

You can use these credentials to log in as the default merchant user. The user was created with the following details:
- First Name: Default
- Last Name: Merchant
- Phone: +1234567890
- Country: US
- User Merchant ID: default-merchant-id

Default admin user details:
Email: admin@example.com
Password: AdminPass123!
Name: Default Admin
Phone: +1234567891
Country: US
