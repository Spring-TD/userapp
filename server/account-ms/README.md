# Account Management Microservice

This microservice handles account management functionality for the SpringTD platform.

## Features

- Create and manage user accounts
- Track account balances
- Handle account transactions
- Support multiple account types

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

- `POST /api/v1/accounts` - Create a new account
- `GET /api/v1/accounts/:id` - Get account by ID
- `GET /api/v1/users/:userId/accounts` - Get accounts by user ID
- `PATCH /api/v1/accounts/:id/balance` - Update account balance
- `DELETE /api/v1/accounts/:id` - Delete an account

## Environment Variables

See [.env.example](.env.example) for required environment variables.

## Testing

Run tests with:
```
npm test
```