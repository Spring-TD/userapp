# Client Authentication Microservice

## Overview
The Client Authentication Microservice (client-auth-ms) is responsible for collecting registration form data from frontend clients and forwarding it to the service-auth-ms for account creation. It provides form validation, data formatting, and API gateway functionality.

## Features
- **Merchant Registration Form**: Collects merchant signup data
- **User Registration Form**: Collects user signup data under a merchant
- **Form Validation**: Client-side validation with detailed error messages
- **API Gateway**: Forwards validated data to service-auth-ms
- **CORS Support**: Configured for frontend integration
- **Health Check**: Service monitoring endpoint

## API Endpoints

### Health Check
```
GET /health
```

### Registration Forms Schema
```
GET /api/v1/registration/forms
```
Returns the form schemas for both merchant and user registration.

### Merchant Registration
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

### User Registration
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

## Form Field Specifications

### Merchant Registration Form
- `first_name`: String (required, 2-50 chars)
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
The client-auth-ms acts as a frontend-facing API gateway that validates form data before forwarding to service-auth-ms:

```
Frontend → client-auth-ms (port 3001) → service-auth-ms (port 3000) → Database
```

### Communication Protocol
- **Protocol**: HTTP/HTTPS
- **Data Format**: JSON
- **Client Port**: 3001 (configurable via PORT env var)
- **Service Port**: 3000 (configurable via SERVICE_AUTH_URL env var)
- **Endpoints**: 
  - Merchant: `POST /api/v1/auth/register/merchant`
  - User: `POST /api/v1/auth/register/user`

### Data Flow
1. Frontend submits form data to client-auth-ms
2. client-auth-ms validates form data using Joi schemas
3. On successful validation, data is forwarded to service-auth-ms
4. service-auth-ms processes registration and returns response
5. client-auth-ms forwards response back to frontend

## Data Structure & Models

### Form Data Structure
The client-auth-ms collects form data and maps it to the service-auth-ms data models:

#### Merchant Registration Data Model
```typescript
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
```typescript
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

### Service-Auth-MS Data Model Relationship
The collected form data maps to the service-auth-ms data models:

```typescript
// BaseUser interface (inherited by User and Merchant)
interface BaseUser {
  id: string;
  email: string;
  password: string;        // Hashed by service-auth-ms
  first_name: string;
  last_name: string;
  phone?: string;
  user_type: UserType;     // Set automatically by service
  status: AccountStatus;   // Set to 'pending' by service
  email_verified: boolean; // Set to false by service
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
```

### Field Mapping
| Client Form Field | Service Model Field | Notes |
|------------------|--------------------|---------|
| `first_name` | `BaseUser.first_name` | Direct mapping |
| `last_name` | `BaseUser.last_name` | Direct mapping |
| `email` | `BaseUser.email` | Validated and lowercased |
| `phone` | `BaseUser.phone` | Optional, validated format |
| `password` | `BaseUser.password` | Hashed by service-auth-ms |
| `country` | `User/Merchant.country` | Direct mapping |
| `user_merchant_id` | `User.user_merchant_id` | For users: provided by form<br/>For merchants: auto-generated |

## Validation Rules
- Email must be valid format and unique
- Password must contain uppercase, lowercase, number, and special character
- Phone numbers must be in international format
- All required fields must be provided
- Field length limits are enforced