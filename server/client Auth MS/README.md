# Client Authentication Microservice

A comprehensive authentication and user management microservice providing secure account creation, verification, authentication, and user lifecycle management capabilities for both merchants and regular users.

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

### 🚧 Planned Implementation
- Email/SMS verification
- JWT-based authentication
- OTP (One-Time Password) support
- Password management and reset
- User profile management
- Administrative account operations
- Database integration (PostgreSQL + Prisma)
- Redis caching
- Comprehensive audit trails

## Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL 14+ (configured, currently using mock database)
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
- PostgreSQL 14+ (for production)
- Redis 7+ (for production)

**Note**: For development, the service uses a mock in-memory database, so PostgreSQL and Redis are not required initially.

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

4. Update the `.env` file with your configuration values (see Environment Variables section).

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

# Register a user
curl -X POST http://localhost:3000/api/v1/auth/register/user \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

## API Documentation

The service provides the following API endpoints:

### Authentication
- `POST /api/v1/auth/register/user` - Register user account ✅ **Implemented**
- `POST /api/v1/auth/register/merchant` - Register merchant account ✅ **Implemented**
- `POST /api/v1/auth/verify-account` - Verify account with token 🚧 **Under Development**
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

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "dateOfBirth": "1990-01-01",
  "address": {
    "street": "123 Main Street",
    "city": "New York",
    "state": "NY",
    "country": "USA",
    "postalCode": "10001"
  }
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
      "firstName": "John",
      "lastName": "Doe",
      "userType": "user",
      "status": "pending",
      "emailVerified": false,
      "createdAt": "2025-01-10T09:00:00.000Z"
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
  "firstName": "John",
  "lastName": "Smith",
  "phone": "+1234567890",
  "businessName": "Smith Electronics",
  "businessType": "Electronics Retail",
  "businessRegistrationNumber": "REG123456789",
  "businessAddress": {
    "street": "456 Business Ave",
    "city": "Los Angeles",
    "state": "CA",
    "country": "USA",
    "postalCode": "90210"
  },
  "website": "https://smithelectronics.com",
  "description": "Leading electronics retailer"
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
      "firstName": "John",
      "lastName": "Smith",
      "userType": "merchant",
      "status": "pending",
      "emailVerified": false,
      "businessName": "Smith Electronics",
      "businessType": "Electronics Retail",
      "createdAt": "2025-01-10T09:00:00.000Z"
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
  firstName: string;
  lastName: string;
  phone?: string;
  userType: UserType;
  status: AccountStatus;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  failedLoginAttempts: number;
  lockedUntil?: Date;
}
```

### User Interface
```typescript
interface User extends BaseUser {
  userType: UserType.USER;
  dateOfBirth?: Date;
  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
}
```

### Merchant Interface
```typescript
interface Merchant extends BaseUser {
  userType: UserType.MERCHANT;
  businessName: string;
  businessType: string;
  businessRegistrationNumber?: string;
  businessAddress: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  website?: string;
  description?: string;
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

### Business Requirements (Merchants)
- Business name: 2-200 characters
- Business type: 2-100 characters
- Business address: Required with all fields
- Website: Must be valid URL format (optional)
- Description: Maximum 1000 characters (optional)

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
- Database integration (PostgreSQL + Prisma)
- Redis caching implementation
- Email/SMS notification services

## Current Database

The service currently uses an in-memory mock database for development and testing. The mock database provides:
- User storage with email indexing
- CRUD operations for user management
- Email uniqueness validation
- Data persistence during runtime (resets on restart)

## Environment Variables

The following environment variables are required:

### Core Configuration
```bash
NODE_ENV=development|production|test
PORT=3000
```

### Database Configuration
```bash
DATABASE_URL=postgresql://username:password@localhost:5432/database_name
DATABASE_SSL=false
```

### Redis Configuration
```bash
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=  # Optional
```

### JWT Configuration
```bash
JWT_SECRET=your-super-secure-jwt-secret-key-minimum-32-characters
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
```

### Password Security
```bash
BCRYPT_ROUNDS=12
```

### Rate Limiting
```bash
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
```

### OTP Configuration
```bash
OTP_EXPIRES_IN=300  # 5 minutes
OTP_MAX_ATTEMPTS=3
OTP_LOCKOUT_DURATION=900  # 15 minutes
```

### Email Configuration (SMTP)
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@yourapp.com
```

### SMS Configuration (Twilio) - Optional
```bash
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

### CORS Configuration
```bash
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://yourapp.com
```

### Security Settings
```bash
ACCOUNT_LOCKOUT_ATTEMPTS=5
ACCOUNT_LOCKOUT_DURATION=1800  # 30 minutes
EMAIL_VERIFICATION_EXPIRES_IN=86400  # 24 hours
PASSWORD_RESET_EXPIRES_IN=3600  # 1 hour
```

**Note**: Create a `.env` file in the project root and populate these variables. Never commit the `.env` file to version control.

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

## Contributing

1. Follow the existing code style and conventions
2. Write tests for new features
3. Update documentation as needed
4. Ensure all tests pass before submitting

## License

ISC