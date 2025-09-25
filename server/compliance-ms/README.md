# Compliance Microservice

A comprehensive compliance microservice providing Know Your Customer (KYC) verification, risk assessment, and regulatory compliance capabilities for merchants and users.

## Features

### ✅ Implemented
- Individual and business KYC verification
- Risk assessment and scoring
- Document management and validation
- Compliance workflow management
- Shareholder liveness testing
- Administrative compliance management
- API-based compliance checking
- **CAC Certificate Verification** - Verify business registration with the Nigerian Corporate Affairs Commission

## Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js with TypeScript
- **Database**: MongoDB (configured, currently using mock database)
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Joi
- **Testing**: Jest + Supertest
- **Security**: helmet, CORS, express-rate-limit
- **Logging**: Winston

## API Documentation

### KYC Status Check
**`GET /api/v1/kyc/status/:userId`**

Checks the KYC compliance status for a user or merchant.

**Authentication**: Requires valid JWT token

**Path Parameters:**
- `userId`: The ID of the user to check compliance status for

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "userId": "user-123",
    "userType": "merchant",
    "status": "APPROVED",
    "documentCount": 5,
    "submittedAt": "2025-01-10T09:00:00.000Z",
    "completedAt": "2025-01-10T10:30:00.000Z",
    "riskLevel": "LOW"
  }
}
```

**Not Found Response (404 Not Found):**
```json
{
  "success": false,
  "error": "No KYC profile found for this user"
}
```

**Possible Status Values:**
- `PENDING` - KYC submission received, under review
- `APPROVED` - KYC verification completed successfully
- `REJECTED` - KYC verification failed
- `REVIEW` - Additional review required
- `EXPIRED` - KYC documents have expired
- `COMPLETED` - All requirements fulfilled

**Possible Risk Level Values:**
- `LOW` - Low risk customer
- `MEDIUM` - Medium risk customer
- `HIGH` - High risk customer
- `VERY_HIGH` - Very high risk customer

## Integration with Service Authentication Microservice

This compliance service is integrated with the service authentication microservice to check merchant compliance status after login.

When a merchant logs in through service-auth-ms, the authentication service calls:
`GET /api/v1/kyc/status/{userId}`

This endpoint returns the compliance status which is then included in the login response to inform client applications if additional compliance steps are needed.

## CAC Certificate Verification

Admin Compliance Officers can verify the Certificate of Incorporation document provided by business customers through a third-party API call to the Nigerian Corporate Affairs Commission.

### Configuration
To enable CAC verification, set the following environment variables:
```env
CAC_API_URL=https://api.cac.gov.ng
CAC_API_KEY=your_api_key_here
```

### API Endpoint
**`POST /api/v1/admin/businesses/{userId}/verify-certificate`**

**Request Body:**
```json
{
  "registrationNumber": "RC123456",
  "companyName": "Example Company Limited"
}
```

See [CAC Verification Documentation](docs/cac-verification.md) for detailed information.

## Implementation Status

### ✅ Completed Features
- Individual KYC verification
- Business KYC verification
- Risk assessment and scoring
- Document management
- Compliance workflow management
- Shareholder liveness testing
- Administrative compliance management
- API-based compliance checking
- Service-to-service integration with auth microservice
- **CAC Certificate Verification**

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn

**Note**: For development, the service uses a mock in-memory database.

### Installation

1. Clone the repository and navigate to the project directory:
   ```bash
   cd server/compliance-ms
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

### Development

Run the development server with hot reload:
```bash
npm run dev
```

The server will start on port 3003 (or the port specified in your configuration) and automatically restart when you make changes.

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