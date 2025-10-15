# Wallet Microservice

This microservice handles wallet functionality for merchants and their users.

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
- `GET /api/v1/wallets/funding/status/:transactionId` - Check funding status manually

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