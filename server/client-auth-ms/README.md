# Client Authentication Microservice

## Overview
The Client Authentication Microservice (client-auth-ms) is a comprehensive API gateway that handles all client-facing authentication operations. It acts as the single entry point for frontend applications, providing form validation, request forwarding, and seamless integration with the backend authentication service (service-auth-ms). This service now supports the complete authentication workflow including registration, login, password management, OTP verification, and user profile management.

Deployment URL: https://client-auth-ms.fly.dev/

## Features
- **✅ Registration Forms**: Merchant, user, and admin signup with validation
- **✅ Authentication**: Complete login/logout/refresh token flow  
- **✅ Account Verification**: Email-based account verification
- **✅ OTP Management**: Generate, verify, and resend OTP codes
- **✅ Password Management**: Forgot password, reset, and change operations
- **✅ User Profile**: Get and update user profile information
- **✅ Role Management**: Create roles and manage permissions
- **✅ Invitation Management**: Invite users, validate tokens, accept invitations
- **✅ Administrative Operations**: User suspension and activation
- **✅ API Gateway**: Centralized routing and validation
- **✅ CORS Support**: Configured for frontend integration
- **✅ Health Check**: Service monitoring endpoint

## API Endpoints

### Health Check
```
GET /health
```

### Registration Endpoints

#### Registration Forms Schema
```
GET /api/v1/registration/forms
```
Returns the form schemas for merchant, user, and admin registration.

#### Merchant Registration
```
POST /api/v1/registration/merchant
Content-Type: application/json

{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com", 
  "phone": "+1234567890",
  "country": "United States",
  "password": "SecurePass123!"
}
```

#### User Registration
```
POST /api/v1/registration/user
Content-Type: application/json

{
  "user_merchant_id": "merchant123",
  "first_name": "Jane",
  "last_name": "Smith", 
  "email": "jane@example.com",
  "phone": "+1234567890",
  "country": "United States",
  "password": "SecurePass123!"
}
```

#### Admin Registration
```
POST /api/v1/registration/admin
Content-Type: application/json

{
  "first_name": "Admin",
  "last_name": "User",
  "email": "admin@example.com",
  "phone": "+1234567890",
  "country": "United States",
  "password": "SecurePass123!"
}
```

### Authentication Endpoints ✅

#### Account Verification
```
POST /api/v1/auth/verify-account
Content-Type: application/json

{
  "token": "verification-token-string"
}
```

#### User Login
```
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

#### User Logout
```
POST /api/v1/auth/logout
Authorization: Bearer <jwt-token>
```

#### Refresh Token
```
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "refresh-token-string"
}
```

#### Get Current User
```
GET /api/v1/auth/me
Authorization: Bearer <jwt-token>
```

#### Verify Token
```
POST /api/v1/auth/verify-token
Authorization: Bearer <jwt-token>
```

#### Check Email Exists
```
GET /api/v1/auth/email-exists/{email}
```

### OTP Management Endpoints ✅

#### Generate OTP
```
POST /api/v1/otp/generate
Content-Type: application/json

{
  "identifier": "user@example.com",
  "channel": "email",
  "purpose": "verification"
}
```

#### Verify OTP
```
POST /api/v1/otp/verify
Content-Type: application/json

{
  "identifier": "user@example.com",
  "code": "123456"
}
```

#### Resend OTP
```
POST /api/v1/otp/resend
Content-Type: application/json

{
  "identifier": "user@example.com",
  "channel": "email",
  "purpose": "verification"
}
```

### Password Management Endpoints ✅

#### Forgot Password
```
POST /api/v1/password/forgot
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Reset Password
```
POST /api/v1/password/reset
Content-Type: application/json

{
  "token": "reset-token-string",
  "password": "NewSecurePass123!"
}
```

#### Change Password
```
PUT /api/v1/password/change
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "currentPassword": "OldPass123!",
  "newPassword": "NewSecurePass123!"
}
```

### User Management Endpoints ✅

#### Get User Profile
```
GET /api/v1/user/profile
Authorization: Bearer <jwt-token>
```

#### List Merchant Users
```
GET /api/v1/user/list
Authorization: Bearer <merchant-jwt-token>
```

#### Update User Profile
```
PUT /api/v1/user/profile
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "first_name": "UpdatedName",
  "last_name": "UpdatedLastName",
  "phone": "+1234567890"
}
```

#### Get User Info (Admin)
```
GET /api/v1/user/info/{userId}
Authorization: Bearer <admin-jwt-token>
```

#### Verify User Info (Admin)
```
POST /api/v1/user/verify-info/{userId}
Content-Type: application/json
Authorization: Bearer <admin-jwt-token>

{
  "verificationData": {
    "field": "value"
  }
}
```

#### Suspend User (Admin)
```
PUT /api/v1/user/suspend/{userId}
Content-Type: application/json
Authorization: Bearer <admin-jwt-token>

{
  "reason": "Violation of terms"
}
```

#### Activate User (Admin)
```
PUT /api/v1/user/activate/{userId}
Authorization: Bearer <admin-jwt-token>
```

#### Update User Status (Merchant/Admin)
```
PUT /api/v1/user/{userId}/status
Authorization: Bearer <merchant-jwt-token>

{
  "status": "active"
}
```

### Invitation Management Endpoints ✅

#### Create Invitation (Merchant)
```
POST /api/v1/invitations
Content-Type: application/json
Authorization: Bearer <merchant-jwt-token>

{
  "email": "new.user@example.com",
  "roleId": "role-id-uuid"
}
```

#### Get Invitations (Merchant)
```
GET /api/v1/invitations
Authorization: Bearer <merchant-jwt-token>
```

#### Validate Invitation Token (Public)
```
GET /api/v1/invitations/validate/{token}
```

#### Accept Invitation (Public)
```
POST /api/v1/invitations/accept
Content-Type: application/json

{
  "token": "invitation-token-uuid",
  "firstName": "Jane",
  "lastName": "Doe",
  "password": "SecurePass123!",
  "phone": "+1234567890" // Optional
}
```
- `last_name`: String (required, 2-50 chars)  
- `email`: Valid email address (required)
- `phone`: International format (required)
- `country`: String (required, 2-100 chars)
- `password`: Strong password (required, 8-128 chars with complexity requirements)

### User Registration Form
- `user_merchant_id`: String (required, 5-50 chars) - The merchant ID user belongs to
- `first_name`: String (required, 2-50 chars)
- `last_name`: String (required, 2-50 chars)
- `email`: Valid email address (required)
- `phone`: International format (required)
- `country`: String (required, 2-100 chars)  
- `password`: Strong password (required, 8-128 chars with complexity requirements)

### Admin Registration Form
- `first_name`: String (required, 2-50 chars)
- `last_name`: String (required, 2-50 chars)
- `email`: Valid email address (required)
- `phone`: International format (required)
- `country`: String (required, 2-100 chars)
- `password`: Strong password (required, 8-128 chars with complexity requirements)

## Setup Instructions

1. **Install Dependencies**
   ```bash
   cd server/client-auth-ms
   npm install
   ```

2. **Environment Configuration**
   Copy the .env file and configure:
   ```bash
   cp .env.example .env
   ```

3. **Development**
   ```bash
   npm run dev
   ```

4. **Production Build**
   ```bash
   npm run build
   npm start
   ```

## Environment Variables

### Core Configuration
| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `PORT` | number | `3001` | Server port for client-auth-ms |
| `NODE_ENV` | string | `development` | Environment mode (development/production) |
| `LOG_LEVEL` | string | `info` | Logging level (error, warn, info, debug) |

### Service Communication
| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `SERVICE_AUTH_URL` | string | `http://localhost:3000` | Base URL for service-auth-ms communication |

### Security & CORS
| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `CORS_ORIGINS` | string | `http://localhost:3000,http://localhost:3001,http://localhost:8080` | Comma-separated list of allowed CORS origins |

### Environment Variable Validation
- All environment variables are validated on startup
- Missing required variables will cause startup failure
- Default values are applied for optional variables
- Configuration is loaded from `src/config/environment.ts`

## Architecture

### Microservice Communication
The client-auth-ms acts as a comprehensive API gateway that handles all client-facing authentication operations:

```
Frontend → client-auth-ms (port 3001) → service-auth-ms (port 3000) → Database/Redis
```

### Communication Protocol
- **Protocol**: HTTP/HTTPS
- **Data Format**: JSON
- **Client Port**: 3001 (configurable via PORT env var)
- **Service Port**: 3000 (configurable via SERVICE_AUTH_URL env var)
- **Complete API Coverage**: 
  - Registration: `POST /api/v1/registration/*`
  - Authentication: `POST /api/v1/auth/*`
  - OTP Management: `POST /api/v1/otp/*`
  - Password Operations: `POST|PUT /api/v1/password/*`
  - User Management: `GET|PUT|POST /api/v1/user/*`

### Data Flow
1. Frontend submits requests to client-auth-ms endpoints
2. client-auth-ms validates request data and extracts authentication tokens
3. Validated requests are forwarded to appropriate service-auth-ms endpoints
4. service-auth-ms processes the request (registration, authentication, etc.)
5. client-auth-ms forwards the response back to frontend
6. All authentication state is managed by service-auth-ms
7. client-auth-ms acts as a transparent proxy with validation

## Data Structure & Models

### Form Data Structure
The client-auth-ms collects form data and maps it to the service-auth-ms data models:

#### Merchant Registration Data Model
``typescript
interface MerchantRegistrationForm {
  first_name: string;     // Maps to BaseUser.first_name
  last_name: string;      // Maps to BaseUser.last_name
  email: string;          // Maps to BaseUser.email
  phone: string;          // Maps to BaseUser.phone (optional)
  country: string;        // Maps to Merchant.country
  password: string;       // Maps to BaseUser.password (hashed by service)
}
```

#### User Registration Data Model
``typescript
interface UserRegistrationForm {
  user_merchant_id: string; // Maps to User.user_merchant_id
  first_name: string;       // Maps to BaseUser.first_name
  last_name: string;        // Maps to BaseUser.last_name
  email: string;            // Maps to BaseUser.email
  phone: string;            // Maps to BaseUser.phone (optional)
  country: string;          // Maps to User.country
  password: string;         // Maps to BaseUser.password (hashed by service)
}
```

#### Admin Registration Data Model
``typescript
interface AdminRegistrationForm {
  first_name: string;     // Maps to BaseUser.first_name
  last_name: string;      // Maps to BaseUser.last_name
  email: string;          // Maps to BaseUser.email
  phone: string;          // Maps to BaseUser.phone (optional)
  country: string;        // Maps to Admin.country
  password: string;       // Maps to BaseUser.password (hashed by service)
}
```

### Service-Auth-MS Data Model Relationship
The collected form data maps to the service-auth-ms data models:

``typescript
// BaseUser interface (inherited by User, Merchant, and Admin)
interface BaseUser {
  id: string;
  email: string;
  password: string;        // Hashed by service-auth-ms
  first_name: string;
  last_name: string;
  phone?: string;
  user_type: UserType;     // Set automatically by service
  status: AccountStatus;   // Set to 'pending' by service (except for admins)
  email_verified: boolean; // Set to false by service (except for admins)
  phone_verified: boolean; // Set to false by service
  // ... additional fields managed by service
}

// User extends BaseUser
interface User extends BaseUser {
  user_type: UserType.USER;
  user_merchant_id: string;
  country: string;
}

// Merchant extends BaseUser
interface Merchant extends BaseUser {
  user_type: UserType.MERCHANT;
  user_merchant_id: string;  // Auto-generated by client-auth-ms
  country: string;
}

// Admin extends BaseUser
interface Admin extends BaseUser {
  user_type: UserType.ADMIN;
  user_merchant_id: 'admin'; // Fixed value for admins
  country: string;
}
```

### Field Mapping
| Client Form Field | Service Model Field | Notes |
|------------------|--------------------|---------|
| `first_name` | `BaseUser.first_name` | Direct mapping |
| `last_name` | `BaseUser.last_name` | Direct mapping |
| `email` | `BaseUser.email` | Validated and lowercased |
| `phone` | `BaseUser.phone` | Optional, validated format |
| `password` | `BaseUser.password` | Hashed by service-auth-ms |
| `country` | `User/Merchant/Admin.country` | Direct mapping |
| `user_merchant_id` | `User.user_merchant_id` | For users: provided by form<br/>For merchants: auto-generated<br/>For admins: fixed as 'admin' |

## Validation Rules
- Email must be valid format and unique
- Password must contain uppercase, lowercase, number, and special character
- Phone numbers must be in international format
- All required fields must be provided
- Field length limits are enforced
- JWT tokens must be valid for authenticated endpoints
- OTP codes must be 6 digits
- Password reset tokens must be valid and not expired

## Complete API Gateway Coverage ✅

The client-auth-ms now provides complete coverage of all authentication operations:

| Category | Endpoints | Status |
|----------|-----------|--------|
| **Registration** | Merchant/User/Admin registration, Forms schema | ✅ Complete |
| **Authentication** | Login, Logout, Refresh, Verify account | ✅ Complete |
| **Token Management** | JWT verification, Email existence check | ✅ Complete |
| **OTP Operations** | Generate, Verify, Resend OTP codes | ✅ Complete |
| **Password Management** | Forgot, Reset, Change password | ✅ Complete |
| **User Profile** | Get/Update profile, User information | ✅ Complete |
| **Role Management** | Create roles, Get roles, Permissions | ✅ Complete |
| **Invitation Management** | Create, List, Validate, Accept | ✅ Complete |
| **Administration** | Suspend/Activate users, Verify info | ✅ Complete |
| **Health & Monitoring** | Health check endpoint | ✅ Complete |

### Frontend Integration Benefits
- **Single Entry Point**: All authentication operations through one service
- **Consistent API**: Uniform request/response patterns across all endpoints
- **Built-in Validation**: Request validation at the gateway level
- **Error Handling**: Standardized error responses
- **Token Management**: Centralized JWT token handling
- **CORS Support**: Pre-configured for frontend integration