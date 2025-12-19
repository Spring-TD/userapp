# Wallet Microservice

This microservice handles wallet functionality for merchants and their users.

Deployment URL: https://wallet-ms.fly.dev/

## Features

- Merchant Wallets (Treasury, Operation, KYC)
- User Wallets (associated with merchants)
- Wallet transactions
- Balance management with Main Balance and Ledger Balance
- Transaction history
- 3rd Party API Integration
- External Funding Callbacks

## API Endpoints

### Merchant Wallets
- `POST /api/v1/wallets/merchant` - Create merchant wallet
- `POST /api/v1/wallets/merchant/all` - Create all merchant wallets (Treasury, Operation, KYC)
- `GET /api/v1/wallets/merchant/:merchantId/type/:walletType` - Get specific merchant wallet by type
- `GET /api/v1/wallets/merchant/:merchantId/all` - Get all merchant wallets
- `PUT /api/v1/wallets/merchant/balance` - Update merchant wallet balance

### Operation Wallet Operations
- `GET /api/v1/wallets/operation/:merchantId/transactions` - Get Operation wallet transactions
- `POST /api/v1/wallets/operation-to-kyc` - Transfer money from Operation Wallet to KYC Wallet
- `POST /api/v1/wallets/kyc-to-operation` - Transfer money from KYC Wallet to Operation Wallet
- `POST /api/v1/wallets/operation/debit` - Debit the merchant's own Operation Wallet

### KYC Wallet Operations
- `GET /api/v1/wallets/kyc/:merchantId/transactions` - Get KYC wallet transactions
- `POST /api/v1/wallets/kyc/debit` - Debit the merchant's own KYC Wallet
- `POST /api/v1/wallets/kyc/fee` - Process KYC fee by debiting the merchant's KYC Wallet

### Treasury Wallet Operations
- `GET /api/v1/wallets/treasury/:merchantId/transactions` - Get Treasury wallet transactions
- `POST /api/v1/wallets/treasury/transfer` - Transfer money from Treasury Wallet to another wallet
- `POST /api/v1/wallets/treasury/debit` - Debit a user wallet
- `POST /api/v1/wallets/treasury/debit-merchant` - Debit the merchant's own Treasury Wallet

### User Wallets
- `POST /api/v1/wallets/user` - Create user wallet
- `GET /api/v1/wallets/user/:userId` - Get user wallet
- `PUT /api/v1/wallets/user/:userId/balance` - Update user wallet balance
- `GET /api/v1/wallets/user/:userId/transactions` - Get user wallet transactions with filtering options (by date range and type)
- `POST /api/v1/wallets/user/:userId/transfer` - Transfer money out from user wallet to another wallet
- `POST /api/v1/wallets/user/:userId/api-call` - Make a 3rd party API call from user wallet
- `GET /api/v1/wallets/merchant/:merchantId/users` - Get all user wallets for a merchant

### Funding Callbacks
- `POST /api/v1/wallets/funding/callback` - Webhook endpoint for funding notifications from payment providers
  - **Supports merchant wallet funding**: Use `merchantId` + `merchantWalletType` (TREASURY, OPERATION, or KYC)
  - **Supports user wallet funding (by walletId)**: Use `walletId`
  - **Supports user wallet funding (by user)**: Use `userId` + `merchantId` (NEW!)
  - **Transaction deduplication**: Prevents duplicate processing using `transactionId`
  - `GET /api/v1/wallets/funding/status/:transactionId` - Check funding status manually

#### Funding Callback Usage Examples

**Example 1: Fund Merchant Treasury Wallet**
```bash
curl -X POST "https://wallet-ms.fly.dev/api/v1/wallets/funding/callback" \
  -H "Content-Type: application/json" \
  -d '{
    "merchantId": "merchant-123",
    "merchantWalletType": "TREASURY",
    "amount": 1000.00,
    "currency": "USD",
    "transactionId": "txn-ext-001",
    "paymentMethod": "BANK_TRANSFER",
    "status": "SUCCESS",
    "description": "Monthly funding from bank",
    "providerReference": "BANK-REF-12345"
  }'
```

Response:
```json
{
  "success": true,
  "message": "Merchant wallet funding callback processed successfully",
  "data": {
    "walletId": "wallet_1234567890",
    "merchantId": "merchant-123",
    "merchantWalletType": "TREASURY",
    "newMainBalance": 1000.00,
    "newLedgerBalance": 1000.00,
    "transactionId": "txn-ext-001"
  }
}
```

**Example 2: Fund Merchant Operation Wallet**
```bash
curl -X POST "https://wallet-ms.fly.dev/api/v1/wallets/funding/callback" \
  -H "Content-Type: application/json" \
  -d '{
    "merchantId": "merchant-123",
    "merchantWalletType": "OPERATION",
    "amount": 500.00,
    "currency": "USD",
    "transactionId": "txn-ext-002",
    "paymentMethod": "CARD",
    "status": "COMPLETED",
    "description": "Card payment for operations"
  }'
```

**Example 3: Fund User Wallet by walletId**
```bash
curl -X POST "https://wallet-ms.fly.dev/api/v1/wallets/funding/callback" \
  -H "Content-Type: application/json" \
  -d '{
    "walletId": "wallet_user_9876543210",
    "amount": 150.00,
    "currency": "USD",
    "transactionId": "txn-ext-004",
    "paymentMethod": "BANK_TRANSFER",
    "status": "SUCCESS",
    "description": "User wallet funding"
  }'
```

**Example 4: Fund User Wallet by userId + merchantId (NEW!)**
```bash
curl -X POST "https://wallet-ms.fly.dev/api/v1/wallets/funding/callback" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-456",
    "merchantId": "merchant-123",
    "amount": 75.50,
    "currency": "USD",
    "transactionId": "txn-ext-005",
    "paymentMethod": "CARD",
    "status": "COMPLETED",
    "description": "Card payment for user"
  }'
```

Response:
```json
{
  "success": true,
  "message": "User wallet funding callback processed successfully",
  "data": {
    "walletId": "wallet_user_9876543210",
    "userId": "user-456",
    "merchantId": "merchant-123",
    "newMainBalance": 225.50,
    "newLedgerBalance": 225.50,
    "transactionId": "txn-ext-005"
  }
}
```

**Payment Methods:**
- `CARD` - Credit/Debit card payments
- `BANK_TRANSFER` - Bank transfers
- `WALLET` - Digital wallet payments (PayPal, Stripe, etc.)
- `OTHER` - Other payment methods

**Transaction Status:**
Only `SUCCESS` or `COMPLETED` status will credit the wallet. Other statuses (`PENDING`, `FAILED`, `CANCELLED`) are acknowledged but don't update the balance.

**Idempotency:**
The system prevents duplicate funding by tracking `transactionId`. Retrying with the same transaction ID returns:
```json
{
  "success": true,
  "message": "Transaction already processed",
  "duplicate": true
}
```

### Transactions
- `POST /api/v1/transactions` - Create transaction (Not yet implemented)
- `GET /api/v1/transactions/:walletId` - Get transaction history (Not yet implemented)

## Wallet Ledger Structure

The wallet implements a dual balance system:

- **Main Balance**: The first balance to debit when a user authorizes a transaction
- **Ledger Balance**: The last balance to update after an operation is complete, only debited when an operation on a 3rd party API is complete

This structure ensures that funds are reserved when a user authorizes a transaction (Main Balance) but only actually deducted when the external operation completes successfully (Ledger Balance).

## Data Models

### Merchant Wallet
```typescript
interface MerchantWallet extends BaseWallet {
  merchantId: string;
  walletType: 'MERCHANT';
  merchantWalletType: MerchantWalletType; // TREASURY, OPERATION, or KYC
  name: string;
}
```

### User Wallet
```typescript
interface UserWallet extends BaseWallet {
  userId: string;
  merchantId: string;
  walletType: 'USER';
  name: string;
}
```

### Base Wallet
```typescript
interface BaseWallet {
  id: string;
  mainBalance: number;
  ledgerBalance: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
  status: WalletStatus;
}
```

### Transaction
```typescript
interface Transaction {
  id: string;
  walletId: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  description: string;
  referenceId?: string;
  balanceBefore?: number;
  balanceAfter?: number;
  category?: string;
  source?: string;
  metadata?: Record<string, any>;
  tags?: string[];
  externalReference?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

## API Call Endpoint

### POST `/api/v1/wallets/user/:userId/api-call`

Make a 3rd party API call from a user wallet. The specified amount will be debited from the user's wallet balance.

**Request Body:**
```json
{
  "endpoint": "https://api.example.com/payment",
  "method": "POST",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "amount": 50,
    "currency": "USD",
    "description": "Payment for services"
  },
  "amount": 50,
  "description": "Payment to Example API",
  "apiKey": "your-api-key"
}
```

**Response:**
```
{
  "success": true,
  "message": "API call completed successfully",
  "data": {
    "wallet": {
      "id": "wallet_abc",
      "mainBalance": 50,
      "ledgerBalance": 50,
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
      "balanceBefore": 100,
      "balanceAfter": 50,
      "createdAt": "2025-01-01T10:00:00Z",
      "updatedAt": "2025-01-01T10:00:00Z"
    },
    "apiResponse": {
      // Response from the 3rd party API
    }
  }
}
```

## Funding Callback Endpoint

### POST `/api/v1/wallets/funding/callback`

Webhook endpoint for funding notifications from payment providers. This endpoint will be called by external payment providers when a funding transaction is completed.

**Request Body:**
```
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

**Response for User Wallet Funding:**
```
{
  "success": true,
  "message": "User wallet funding callback processed successfully",
  "data": {
    "walletId": "wallet_abc",
    "userId": "user_456",
    "newMainBalance": 150,
    "newLedgerBalance": 150
  }
}
```

**Response for Merchant Wallet Funding:**
```
{
  "success": true,
  "message": "Merchant wallet funding callback processed successfully",
  "data": {
    "walletId": "wallet_def",
    "merchantId": "merchant_123",
    "merchantWalletType": "TREASURY",
    "newMainBalance": 2500,
    "newLedgerBalance": 2500
  }
}
```

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables (copy .env.example to .env and modify)

3. Run development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

5. Run production server:
   ```bash
   npm start
   ```

## Testing

Run user wallet feature tests:
```bash
npm run test:user-wallet
```

## Implementation Status

- [x] Merchant wallet creation and management
- [x] User wallet creation and management
- [x] Wallet balance updates
- [x] Operation-KYC wallet transfers
- [x] Operation wallet transaction filtering
- [x] Operation wallet debit functionality
- [x] KYC wallet transaction filtering
- [x] KYC wallet debit functionality
- [x] KYC fee processing functionality
- [x] Treasury wallet handles all merchant's users wallet balance (Wallet Record filtering, Transfer Out, Debit Wallet)
- [x] User wallet transaction filtering
- [x] User wallet transfer out functionality
- [x] User wallet 3rd party API call functionality
- [x] Wallet funding callback functionality
- [x] Enhanced transaction model with balance tracking
- [x] Dual balance system (Main Balance and Ledger Balance)
- [ ] Transaction processing
- [ ] Transaction history
- [ ] Security enhancements
- [ ] Database integration