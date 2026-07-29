# User Wallet Features

This document describes the enhanced features available for User Wallets in the Wallet Microservice.

## Overview

User Wallets support these key features:
1. **Wallet Record Filtering** - Filter transaction records by date range and type
2. **Transfer Out** - Transfer money from user wallet to other wallets
3. **Debit Wallet** - Allow money to be debited via billing (already implemented)
4. **3rd Party API Calls** - Make API calls to external services and debit the wallet
5. **Funding Callbacks** - Receive notifications when wallet is funded via external payment methods
6. **Bank Payouts** - Send money from a PayOnUs-backed user wallet to an external bank account
7. **Transaction PIN** - A 4-digit PIN, set after Fuspay KYC, required to authorize money-out operations (transfer / payout)

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

Transfer money from a user wallet to another wallet. Requires a valid [transaction PIN](#7-transaction-pin) in the body.

**Request Body:**
```json
{
  "toWalletId": "wallet_xyz",
  "amount": 50,
  "description": "Payment for services",
  "pin": "1234"
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

### 3b. Bank Payout

#### POST `/api/v1/wallets/user/:userId/payout`

Send money from the user's active PayOnUs virtual account wallet to an external bank account. Requires a valid [transaction PIN](#7-transaction-pin) in the body.

**Request Body:**
```json
{
  "accountNumber": "0123456789",
  "bankCode": "044",
  "accountName": "Jane Smith",
  "amount": 50,
  "currency": "NGN",
  "narration": "Withdrawal to bank",
  "reference": "optional-client-reference",
  "pin": "1234"
}
```

Only the wallet owner can call this endpoint. The service checks the user's wallet balance and active `virtualNuban`, asks PayOnUs to initiate the payout, then debits the wallet and records a `DEBIT` transaction with provider metadata (initial `metadata.providerStatus` is typically `PENDING` / `PROCESSING`).

#### POST `/api/v1/wallets/payout/callback` (PayOnUs payout status webhook)

Public webhook that captures the **final** PayOnUs payout status and reconciles the original payout transaction automatically. Configure `PAYONUS_PAYOUT_NOTIFICATION_URL` to point here.

- Matches the callback to the payout transaction by `onusReference` (`externalReference`) or `merchantReference` (`referenceId`), scoped to `source = PAYONUS`.
- `SUCCESSFUL` → records the final `providerStatus` / `payoutStatus` and `statusHistory`; balance unchanged.
- `FAILED` / `REJECTED` / `REVERSED` → **auto-reverses the debit once**: credits the wallet back, writes a `PAYOUT_REVERSAL` credit transaction (`<payoutReference>::reversal`), marks the original `FAILED` with `metadata.reversed = true`, and mirrors the credit to the app.
- Idempotent (repeat callbacks are acknowledged with `200`, no double refund). PayOnUs callbacks that arrive at `/funding/callback` instead are detected and routed to the same logic.

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

### 5. Funding Callbacks

#### POST `/api/v1/wallets/funding/callback`

Webhook endpoint for funding notifications from payment providers. This endpoint will be called by external payment providers when a funding transaction is completed.

**Request Body:**
```json
{
  "walletId": "wallet_abc",
  "amount": 100,
  "currency": "USD",
  "transactionId": "txn_98765",
  "paymentMethod": "CARD",
  "status": "SUCCESS",
  "description": "Credit card funding",
  "providerReference": "payment_provider_123",
  "signature": "hmac_signature_for_verification"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Funding callback processed successfully",
  "data": {
    "walletId": "wallet_abc",
    "newBalance": 150
  }
}
```

#### GET `/api/v1/wallets/funding/status/:transactionId`

Manually check the status of a funding transaction.

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionId": "txn_98765",
    "status": "COMPLETED",
    "message": "Funding transaction completed successfully"
  }
}
```

**Important Notes:**
- This endpoint is publicly accessible (no authentication required) as it's designed to receive callbacks from external payment providers
- In a production environment, you should implement signature verification to ensure callbacks are authentic
- The endpoint automatically credits the wallet when a successful funding notification is received
- Supported payment methods: CARD, BANK_TRANSFER, WALLET, OTHER

### 7. Transaction PIN

A **4-digit transaction PIN** authorizes money-out operations (transfer, bank payout). It is user-scoped — one PIN per `userId` regardless of how many wallets the user owns — and stored hashed (scrypt) in the `transactionpins` collection. All PIN endpoints require a Bearer token for the same user.

**Lifecycle:**
1. After a user completes **Fuspay KYC**, the storefront calls the status endpoint and, if no PIN exists, prompts the user to create one.
2. Existing users who never set a PIN are prompted on their **first transfer-out** (the transfer returns `409 TRANSACTION_PIN_REQUIRED`).

#### GET `/api/v1/wallets/user/:userId/transaction-pin/status`

```json
{ "success": true, "data": { "hasTransactionPin": false, "locked": false, "lockedUntil": null } }
```

#### POST `/api/v1/wallets/user/:userId/transaction-pin`

Create a PIN (only when one does not already exist).

```json
{ "pin": "1234" }
```

#### PUT `/api/v1/wallets/user/:userId/transaction-pin`

Change an existing PIN; requires the current PIN.

```json
{ "currentPin": "1234", "newPin": "5678" }
```

#### Enforcement & error codes

The PIN is verified before any funds move on `…/transfer` and `…/payout`. Failure responses include a machine-readable `code`:

| HTTP | `code` | Meaning |
|------|--------|---------|
| `409` | `TRANSACTION_PIN_REQUIRED` | No PIN set → prompt to create one, then retry |
| `400` | `TRANSACTION_PIN_MISSING` | PIN exists but none supplied |
| `401` | `INVALID_TRANSACTION_PIN` | Wrong PIN (response includes `attemptsRemaining`) |
| `423` | `TRANSACTION_PIN_LOCKED` | Locked after 5 wrong attempts for 15 minutes (response includes `lockedUntil`) |

**Implementation:** `src/utils/transactionPin.ts`, `src/db/TransactionPinModel.ts`, `src/services/transactionPinService.ts`, `src/controllers/transactionPinController.ts`.

## Security & Access Control

1. **Wallet Record Filtering**: Users can only filter their own transactions. Merchants can filter transactions of their users.
2. **Transfer Out**: Only wallet owners can transfer money out from their wallets, and only with a valid transaction PIN.
3. **Debit Wallet**: Only merchants can debit wallets of their associated users.
4. **API Calls**: Only wallet owners can make API calls from their wallets.
5. **Funding Callbacks**: Public endpoint for payment provider notifications with signature verification.
6. **Transaction PIN**: Only the wallet owner can set/change/check their PIN. PINs are hashed (scrypt), never returned, and lock for 15 minutes after 5 incorrect attempts.

## Implementation Details

### Service Layer Methods

1. `filterUserTransactions(userId, filterData)` - Filters user transactions
2. `transferOutFromUser(transferData)` - Transfers money from user wallet to another wallet
3. `makeUserApiCall(apiCallData)` - Makes 3rd party API calls from user wallet
4. `TransactionPinService.{setPin,changePin,getStatus,verifyForTransfer}(...)` - Manages and verifies the transaction PIN (with failed-attempt lockout)

### Controller Methods

1. `filterUserTransactions()` - Handles GET requests for filtering user transactions
2. `transferOutFromUser()` - Handles POST requests for transferring money out from user wallets
3. `makeUserApiCall()` - Handles POST requests for making API calls from user wallets
4. `handleFundingCallback()` - Handles POST requests for funding notifications
5. `checkFundingStatus()` - Handles GET requests for checking funding status

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