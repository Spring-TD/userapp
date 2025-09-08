# Client Authentication Microservice

A comprehensive authentication and user management microservice providing secure account creation, verification, authentication, and user lifecycle management capabilities for both merchants and regular users.

## Features

- User and merchant account registration
- Email/SMS verification
- JWT-based authentication
- OTP (One-Time Password) support
- Password management and reset
- User profile management
- Administrative account operations
- Rate limiting and security measures
- Comprehensive logging and audit trails

## Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL 14+
- **Cache**: Redis 7+
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcrypt
- **Validation**: Joi
- **ORM**: Prisma
- **Testing**: Jest + Supertest

## Getting Started

### Prerequisites

- Node.js 18 or higher
- PostgreSQL 14 or higher
- Redis 7 or higher
- npm or yarn

### Installation

1. Clone the repository and navigate to the project directory:
   ```bash
   cd "server/Client Auth MS"
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the environment variables file:
   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your configuration values.

5. Build the project:
   ```bash
   npm run build
   ```

### Development

Run the development server with hot reload:
```bash
npm run dev
```

### Testing

Run tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

### Production

Build and start the production server:
```bash
npm run build
npm start
```

## API Documentation

The service provides the following API endpoints:

### Authentication
- `POST /api/v1/auth/register/user` - Register user account
- `POST /api/v1/auth/register/merchant` - Register merchant account
- `POST /api/v1/auth/verify-account` - Verify account with token
- `POST /api/v1/auth/login` - User/merchant login
- `POST /api/v1/auth/logout` - Logout and invalidate session
- `POST /api/v1/auth/refresh` - Refresh JWT token

### OTP Management
- `POST /api/v1/otp/generate` - Generate OTP code
- `POST /api/v1/otp/verify` - Verify OTP code
- `POST /api/v1/otp/resend` - Resend OTP code

### Password Management
- `POST /api/v1/password/forgot` - Initiate password reset
- `POST /api/v1/password/reset` - Reset password with token
- `PUT /api/v1/password/change` - Change password (authenticated)

### User Management
- `GET /api/v1/user/profile` - Get user profile
- `PUT /api/v1/user/profile` - Update user profile
- `GET /api/v1/user/info` - Get detailed user information
- `POST /api/v1/user/verify-info` - Verify user information
- `PUT /api/v1/user/suspend` - Suspend user account (admin)
- `PUT /api/v1/user/activate` - Activate suspended account (admin)

## Environment Variables

See `.env.example` for all required environment variables.

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