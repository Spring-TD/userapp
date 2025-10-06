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

### Transactions
- `POST /api/v1/transactions` - Create transaction
- `GET /api/v1/transactions/:walletId` - Get transaction history

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