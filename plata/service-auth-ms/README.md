# Service Authentication Microservice (SAMS)

A specialized microservice for service-to-service authentication and management. Provides secure registration, IP whitelisting, credential management, and inter-service communication capabilities for microservice architectures.

Deployment URL: https://service-auth-ms.fly.dev/

## Overview

This service provides capabilities for managing inter-service authentication in a microservices architecture. It handles service registration, IP whitelisting, and credential management for secure service-to-service communication.

## Table of Contents
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Implemented Endpoints](#implemented-endpoints)
- [Data Models](#data-models)
- [Validation Rules](#validation-rules)
- [Error Handling](#error-handling)
- [Implementation Status](#implementation-status)
- [Security Features](#security-features)
- [Redis Caching Implementation](#redis-caching-implementation)
- [SAMS Documentation](#sams-documentation)

## Features

### ✅ Implemented
- **Service Registration**: Register and manage microservices ✅
- **IP Whitelisting**: Control service access based on IP addresses ✅
- **Credential Management**: Create, validate, and revoke service credentials ✅
- **Service Discovery**: Find and manage registered services ✅
- **Rate limiting and security headers** ✅
- **Structured logging and error handling** ✅
- **Comprehensive test coverage** ✅
- **Redis caching** ✅
- **Database integration** (MongoDB - configured, using mock database) ✅

## Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js with TypeScript
- **Database**: MongoDB (configured, currently using mock database)
- **Cache**: Redis 7+ ✅
- **Validation**: Joi ✅
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
   cd plata/service-auth-ms
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
# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000            # Rate limit window in ms (default: 15 minutes)
RATE_LIMIT_MAX_REQUESTS=100            # Max requests per window (default: 100)

# CORS Settings
CORS_ALLOWED_ORIGINS=http://localhost:3000  # Comma-separated allowed origins
```

### Validation Rules
- **PORT**: Must be a valid port number
- **Duration fields**: Must be positive integers (in seconds)

### Example .env File
```
# Core
NODE_ENV=development
PORT=3000

# Redis
REDIS_URL=redis://localhost:6379

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```
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

# Register a service
curl -X POST http://localhost:3000/api/v1/services/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Payment Service",
    "description": "Handles payment processing",
    "version": "1.0.0",
    "endpoint_url": "http://payment-ms:3007",
    "health_check_url": "http://payment-ms:3007/health",
    "owner_email": "team@example.com",
    "tags": ["payment", "finance"]
  }'
```

## SAMS (Service Authentication Microservice) API

The service provides comprehensive service-to-service authentication and management capabilities.

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
- `POST /api/v1/credentials/:credentialId/regenerate` - Regenerate credential with identical properties ✅ **Implemented**

## Implemented Endpoints

### Service Registration
**`POST /api/v1/services/create`**

Registers a new microservice in the SAMS system.

**Request Body:**
```json
{
  "name": "Payment Service",
  "description": "Handles payment processing",
  "version": "1.0.0",
  "endpoint_url": "http://payment-ms:3007",
  "health_check_url": "http://payment-ms:3007/health",
  "owner_email": "team@example.com",
  "tags": ["payment", "finance"]
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Service registered successfully",
  "data": {
    "service": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Payment Service",
      "description": "Handles payment processing",
      "version": "1.0.0",
      "endpoint_url": "http://payment-ms:3007",
      "health_check_url": "http://payment-ms:3007/health",
      "owner_email": "team@example.com",
      "tags": ["payment", "finance"],
      "created_at": "2025-01-10T09:00:00.000Z",
      "updated_at": "2025-01-10T09:00:00.000Z"
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
  "service": "service-auth-microservice"
}
```

### Root Endpoint
**`GET /`**

Provides service information and available endpoints.

**Success Response (200 OK):**
```json
{
  "service": "Service Authentication Microservice (SAMS)",
  "version": "1.0.0",
  "status": "running",
  "description": "Service-to-service authentication and management",
  "endpoints": {
    "health": "/health",
    "services": "/api/v1/services",
    "credentials": "/api/v1/credentials"
  },
  "timestamp": "2025-01-10T09:00:00.000Z"
}
```

## Data Models

### Service Interface
```typescript
interface Service {
  id: string;
  name: string;
  description: string;
  version: string;
  endpoint_url: string;
  health_check_url: string;
  owner_email: string;
  tags: string[];
  created_at: Date;
  updated_at: Date;
}
```

### Credential Interface
```typescript
interface Credential {
  id: string;
  service_id: string;
  credential_type: 'api_key' | 'jwt' | 'client_secret';
  credential_value: string;
  permissions: string[];
  rate_limit: number;
  expires_at: Date;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface WhitelistedIP {
  id: string;
  service_id: string;
  ip_address: string;
  description: string;
  created_at: Date;
}
```

## Validation Rules

### Service Registration
- **Name**: Required, 1-100 characters
- **Description**: Optional, max 500 characters
- **Version**: Required, semantic versioning format
- **Endpoint URL**: Required, valid URL format
- **Health Check URL**: Required, valid URL format
- **Owner Email**: Required, valid email format
- **Tags**: Optional, array of strings

### IP Whitelisting
- **IP Address**: Required, valid IP address or CIDR notation
- **Description**: Optional, max 200 characters

### Credential Management
- **Credential Type**: Required, must be 'api_key', 'jwt', or 'client_secret'
- **Permissions**: Optional, array of permission strings
- **Rate Limit**: Optional, positive integer
- **Expires In**: Optional, positive integer (seconds)

## Error Handling

All errors follow a consistent format:

**Validation Error (400 Bad Request):**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": "Service name is required"
}
```

**Service Registration Error (400 Bad Request):**
```json
{
  "success": false,
  "error": "Service with this name already exists"
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
- Service registration with validation
- IP whitelisting with CIDR support
- Credential management (create, validate, revoke, regenerate)
- Service discovery and health monitoring
- Input validation using Joi
- Mock database layer
- Comprehensive test suite
- Security middleware (helmet, CORS, rate limiting)
- Structured logging with Winston
- Error handling middleware
- Redis caching implementation ✅
- Service-to-service authentication ✅

## Current Database

The service currently uses an in-memory mock database for development and testing. The mock database provides:
- Service storage with unique identifiers
- Credential management
- IP whitelisting storage
- CRUD operations for service management
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

- Rate limiting on authentication endpoints
- CORS configuration
- Input sanitization and validation
- SQL injection prevention
- XSS protection headers
- Redis-based credential management
- Comprehensive data caching
- IP-based access control

## Redis Caching Implementation ✅

The service includes comprehensive Redis caching capabilities:

### Features
- **Service Data Caching**: Service registration and metadata are cached for improved performance
- **Credential Caching**: Service credentials are cached with automatic expiration
- **Fallback Support**: In-memory caching when Redis is unavailable
- **Automatic Cleanup**: Expired cache entries are automatically cleaned up
- **Connection Management**: Robust Redis connection handling with reconnection logic

### Cache Keys
- `service:{serviceId}` - Service registration data
- `credential:{credentialId}` - Credential data
- `whitelist:{serviceId}` - IP whitelisting data

### Performance Benefits
- Reduced database queries for frequently accessed service data
- Faster credential validation
- Improved response times for service management endpoints
- Scalable credential management

### Configuration
Redis caching is configured through environment variables:
```bash
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-redis-password  # Optional
```

### Cache TTL (Time To Live)
- Service data: 1 hour (3600 seconds)
- Credential data: Based on expiration time
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

**Regenerate Credential - `POST /api/v1/credentials/:credentialId/regenerate`**
Creates a new credential with identical properties and automatically voids the old one.

```bash
curl -X POST "http://localhost:3000/api/v1/credentials/{credentialId}/regenerate" \
  -H "Content-Type: application/json"
```

The regeneration endpoint preserves all original credential properties (type, permissions, rate limits, expiration, etc.) while creating a new credential value and automatically invalidating the old one.

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


