# User Wallet Features

This document describes the enhanced features available for User Wallets in the Wallet Microservice.

## Overview

User Wallets now support four key features:
1. **Wallet Record Filtering** - Filter transaction records by date range and type
2. **Transfer Out** - Transfer money from user wallet to other wallets
3. **Debit Wallet** - Allow money to be debited via billing (already implemented)
4. **3rd Party API Calls** - Make API calls to external services and debit the wallet

## API Endpoints

### 1. Wallet Record Filtering

#### GET `/api/v1/wallets/user/:userId/transactions`

Filter user wallet transactions by date range and transaction type.

**Query Parameters:**
- `startDate` (optional): ISO date string for start of date range
- `endDate` (optional): ISO date string for end of date range
- `type` (optional): Transaction type - either "CREDIT" or "DEBIT"

**Response:**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "txn_12345",
        "walletId": "wallet_abc",
        "amount": 100,
        "type": "CREDIT",
        "status": "COMPLETED",
        "description": "Initial deposit",
        "createdAt": "2025-01-01T10:00:00Z",
        "updatedAt": "2025-01-01T10:00:00Z"
      }
    ]
  }
}
```

**Examples:**
- Filter by date range: `GET /api/v1/wallets/user/user123/transactions?startDate=2025-01-01&endDate=2025-12-31`
- Filter by transaction type: `GET /api/v1/wallets/user/user123/transactions?type=DEBIT`
- Combined filtering: `GET /api/v1/wallets/user/user123/transactions?startDate=2025-01-01&type=CREDIT`

### 2. Transfer Out

#### POST `/api/v1/wallets/user/:userId/transfer`

Transfer money from a user wallet to another wallet.

**Request Body:**
```json
{
  "toWalletId": "wallet_xyz",
  "amount": 50,
  "description": "Payment for services"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Money transferred successfully",
  "data": {
    "fromWallet": {
      "id": "wallet_abc",
      "balance": 50,
      "currency": "USD",
      "status": "ACTIVE"
    },
    "toWallet": {
      "id": "wallet_xyz",
      "balance": 150,
      "currency": "USD",
      "status": "ACTIVE"
    },
    "transaction": {
      "id": "txn_12345",
      "walletId": "wallet_abc",
      "amount": -50,
      "type": "DEBIT",
      "status": "COMPLETED",
      "description": "Transfer out: Payment for services",
      "referenceId": "wallet_xyz",
      "createdAt": "2025-01-01T10:00:00Z",
      "updatedAt": "2025-01-01T10:00:00Z"
    }
  }
}
```

### 3. Debit Wallet

#### POST `/api/v1/wallets/treasury/debit` (Merchant endpoint)

Merchants can debit user wallets for billing purposes. This endpoint already existed but now works with user wallets.

**Request Body:**
```json
{
  "userId": "user123",
  "amount": 25,
  "description": "Monthly service fee"
}
```

### 4. 3rd Party API Calls

#### POST `/api/v1/wallets/user/:userId/api-call`

Make a 3rd party API call from a user wallet. The specified amount will be debited from the user's wallet balance.

**Request Body:**
```json
{
  "endpoint": "https://api.example.com/payment",
  "method": "POST",
  "headers": {
    "Content-Type": "application/json",
    "Authorization": "Bearer your-api-key"
  },
  "body": {
    "amount": 50,
    "currency": "USD",
    "description": "Payment for services"
  },
  "amount": 50,
  "description": "Payment to Example API"
}
```

**Response:**
```json
{
  "success": true,
  "message": "API call completed successfully",
  "data": {
    "wallet": {
      "id": "wallet_abc",
      "balance": 50,
      "currency": "USD",
      "status": "ACTIVE"
    },
    "transaction": {
      "id": "txn_12345",
      "walletId": "wallet_abc",
      "amount": -50,
      "type": "DEBIT",
      "status": "COMPLETED",
      "description": "API Call: Payment to Example API",
      "referenceId": "https://api.example.com/payment",
      "createdAt": "2025-01-01T10:00:00Z",
      "updatedAt": "2025-01-01T10:00:00Z"
    },
    "apiResponse": {
      // Response from the 3rd party API
    }
  }
}
```

**Important Notes:**
- The amount specified will be debited from the user's wallet regardless of whether the API call succeeds or fails
- In a production environment, you may want to implement additional logic to handle failed API calls
- The API key can be passed in the request body or as part of the headers
- Supported HTTP methods: GET, POST, PUT, DELETE

## Security & Access Control

1. **Wallet Record Filtering**: Users can only filter their own transactions. Merchants can filter transactions of their users.
2. **Transfer Out**: Only wallet owners can transfer money out from their wallets.
3. **Debit Wallet**: Only merchants can debit wallets of their associated users.
4. **API Calls**: Only wallet owners can make API calls from their wallets.

## Implementation Details

### Service Layer Methods

1. `filterUserTransactions(userId, filterData)` - Filters user transactions
2. `transferOutFromUser(transferData)` - Transfers money from user wallet to another wallet
3. `makeUserApiCall(apiCallData)` - Makes 3rd party API calls from user wallet

### Controller Methods

1. `filterUserTransactions()` - Handles GET requests for filtering user transactions
2. `transferOutFromUser()` - Handles POST requests for transferring money out from user wallets
3. `makeUserApiCall()` - Handles POST requests for making API calls from user wallets

## Testing

A test suite is available in `src/utils/testUserWallet.ts` that verifies all functionality:

1. Creates merchant and user wallets
2. Funds the user wallet
3. Tests transaction filtering by type
4. Tests transferring money out from user wallet
5. Verifies transaction records after transfers

A separate test for API calls is available in `src/utils/testUserApiCall.ts`:

1. Creates merchant and user wallets
2. Funds the user wallet
3. Makes a test API call to a public endpoint
4. Verifies the wallet balance is updated

To run the tests:
```bash
npm run test:user-wallet
npm run test:user-api-call
```