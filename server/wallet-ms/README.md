# Wallet Microservice

This microservice handles wallet functionality for merchants and their users.

## Features

- Merchant Wallets
- User Wallets (associated with merchants)
- Wallet transactions
- Balance management
- Transaction history

## API Endpoints

### Merchant Wallets
- `POST /api/v1/wallets/merchant` - Create merchant wallet
- `GET /api/v1/wallets/merchant/:merchantId` - Get merchant wallet
- `PUT /api/v1/wallets/merchant/:merchantId/balance` - Update merchant wallet balance

### User Wallets
- `POST /api/v1/wallets/user` - Create user wallet
- `GET /api/v1/wallets/user/:userId` - Get user wallet
- `PUT /api/v1/wallets/user/:userId/balance` - Update user wallet balance
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

## Implementation Status

- [x] Merchant wallet creation and management
- [x] User wallet creation and management
- [x] Wallet balance updates
- [ ] Transaction processing
- [ ] Transaction history
- [ ] Security enhancements
- [ ] Database integration