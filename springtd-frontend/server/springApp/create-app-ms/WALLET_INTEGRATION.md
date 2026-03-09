# Wallet Integration for Create App Microservice

## Overview

This document describes the integration between the Create App Microservice and the Wallet Microservice. When an application is created using the create-app-ms, a user wallet is automatically created for that application using the wallet-ms.

## Implementation Details

### 1. Environment Configuration

The wallet service URL has been added to the environment configuration:
- `WALLET_SERVICE_URL`: URL for the Wallet Microservice (default: http://localhost:3004)

### 2. Wallet Service

A new service `WalletService` has been created to handle communication with the Wallet Microservice:
- `createUserWallet()`: Creates a user wallet for the application
- `createMerchantWallet()`: Creates a single merchant wallet of a specific type
- `createAllMerchantWallets()`: Creates all required merchant wallets (Treasury, Operation, KYC)

### 3. Automatic Wallet Creation

When an application is created via the `POST /api/v1/apps` endpoint:
1. The application is created as usual
2. The system automatically calls the Wallet Microservice to create a user wallet for the application
3. The response includes both the application information and wallet creation results

### 4. Wallet Types Created

For each application, the following wallet is automatically created:
- **User Wallet**: A wallet for the merchant (as a user of their own app)

## API Changes

### Create App Endpoint Response

The response from `POST /api/v1/apps` now includes wallet information:

```json
{
  "success": true,
  "message": "App created successfully",
  "data": {
    "app": {
      "id": "app-123",
      "name": "My Application",
      // ... other app fields
    },
    "wallets": {
      "success": true,
      "message": "User wallet created successfully",
      "data": {
        "wallet": {
          "id": "wallet-1",
          "userId": "merchant-123",
          "merchantId": "app-123",
          "walletType": "USER",
          "name": "User Wallet for App app-123",
          // ... other wallet fields
        }
      }
    }
  }
}
```

## Error Handling

If wallet creation fails, the application is still created successfully. The error is logged but does not prevent the application creation process. This ensures that application creation is not blocked by wallet service issues.

## Testing

Unit tests have been added for the WalletService to verify:
- Successful wallet creation
- Error handling for wallet creation failures
- Proper API call formatting

## Future Improvements

1. Add authentication headers for secure communication with the Wallet Microservice
2. Implement retry logic for failed wallet creation attempts
3. Add more detailed logging for wallet creation events
4. Implement rollback mechanism to delete wallets if application creation fails after wallet creation