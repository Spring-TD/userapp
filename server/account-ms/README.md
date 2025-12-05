# Account Management Microservice

This microservice handles account management functionality for the SpringTD platform.

## Features

- Create and manage user accounts
- Track account balances
- Handle account transactions
- Support multiple account types
- Process product applications
- Handle billing checks and account pricing calculations
- Act as API Gateway for all SpringTD microservices

## Tech Stack

- Node.js with Express
- TypeScript
- MongoDB (via Mongoose)
- Jest for testing

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB

### Installation

1. Clone the repository
2. Navigate to the account-ms directory
3. Install dependencies:
   ```
   npm install
   ```

### Running the Service

#### Development Mode
```
npm run dev
```

#### Production Mode
```
npm run build
npm start
```

## API Endpoints

### Account Management
- `POST /api/v1/accounts` - Create a new account
- `GET /api/v1/accounts/:id` - Get account by ID
- `GET /api/v1/users/:userId/accounts` - Get accounts by user ID
- `PATCH /api/v1/accounts/:id/balance` - Update account balance
- `DELETE /api/v1/accounts/:id` - Delete an account

### Application Processing
- `POST /api/v1/applications/apply` - Apply for a product
- `POST /api/v1/applications/:id/approve` - Approve application (Admin)
- `POST /api/v1/applications/:id/reject` - Reject application (Admin)
- `GET /api/v1/applications/` - Get all applications (Admin)
- `GET /api/v1/applications/pending` - Get pending applications (Admin)
- `GET /api/v1/applications/user/:userId` - Get user applications
- `GET /api/v1/applications/:id` - Get application by ID

### Account Services
- `POST /api/v1/users/:userId/billing-check` - Check billing status
- `GET /api/v1/users/:userId/app-ownership` - Get app ownership information
- `POST /api/v1/pricing/calculate` - Calculate account pricing based on product
- `GET /api/v1/pricing/product/:productId` - Get product pricing

## API Gateway

This service acts as the API Gateway for the SpringTD platform. It proxies requests to the following microservices:

- `/api/v1/products/*` -> Product Service
- `/api/v1/configurations/*` -> Product Service
- `/api/v1/compliance/*` -> Compliance Service
- `/api/v1/wallets/*` -> Wallet Service
- `/api/v1/billing/*` -> Billing Service
- `/api/v1/apps/*` -> Create App Service
- `/api/v1/payments/*` -> Payment Service
- `/api/v1/auth/*` -> Client Auth Service
- `/api/v1/registration/*` -> Client Auth Service
- `/api/v1/otp/*` -> Client Auth Service
- `/api/v1/password/*` -> Client Auth Service
- `/api/v1/user/*` -> Client Auth Service
- `/verify-email/*` -> Client Auth Service

### Running Gateway Tests
To verify the gateway configuration:
```bash
npx ts-node scripts/test-gateway.ts
```

## Environment Variables

See [.env.example](.env.example) for required environment variables.

## Testing

Run tests with:
```
npm test
```