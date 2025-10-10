# Wallet Microservice

This microservice handles wallet functionality for merchants and their users.

## Features

- Merchant Wallets (Treasury, Operation, KYC)
- User Wallets (associated with merchants)
- Wallet transactions
- Balance management
- Transaction history
- 3rd Party API Integration

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

### Transactions
- `POST /api/v1/transactions` - Create transaction (Not yet implemented)
- `GET /api/v1/transactions/:walletId` - Get transaction history (Not yet implemented)

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
- [ ] Transaction processing
- [ ] Transaction history
- [ ] Security enhancements
- [ ] Database integration