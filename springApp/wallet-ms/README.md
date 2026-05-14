# Wallet Microservice

This microservice handles wallet functionality for merchants and their users.

Deployment URL: https://walletms-2026.fly.dev/

## Features

- Merchant Wallets (Treasury, Operation, KYC)
- User Wallets (associated with merchants)
- Wallet transactions
- Balance management with Main Balance and Ledger Balance
- Transaction history
- 3rd Party API Integration
- External Funding Callbacks
- Optional **Payonus** virtual **NUBAN** provisioning for wallets whose currency matches `PAYONUS_NUBAN_CURRENCIES` (default **NGN**): **dynamic** virtual accounts for each merchant wallet (Treasury, Operation, KYC), **reserved** accounts for user wallets when using the documented fixed-account API path

## API Endpoints

### Merchant Wallets
- `POST /api/v1/wallets/merchant` - Create merchant wallet (optional body: `appId`, `appName`, `payonusSubaccountCode`, `complianceShareholderUserId`, plus `name`, `currency`, `merchantWalletType`)
- `POST /api/v1/wallets/merchant/all` - Create all merchant wallets (Treasury, Operation, KYC). Body may include `currency`, `appId`, `appName`, `payonusSubaccountCode`, `complianceShareholderUserId` (defaults shareholder id from JWT when omitted)
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
- `POST /api/v1/wallets/user` - Create user wallet (requires **Bearer** JWT; user must be `userType` user with `merchantId`)
- `GET /api/v1/wallets/user/:userId` - Get user wallet
- `PUT /api/v1/wallets/user/:userId/balance` - Update user wallet balance
- `GET /api/v1/wallets/user/:userId/transactions` - Get user wallet transactions with filtering options (by date range and type)
- `POST /api/v1/wallets/user/:userId/transfer` - Transfer money out from user wallet to another wallet
- `POST /api/v1/wallets/user/:userId/api-call` - Make a 3rd party API call from user wallet
- `GET /api/v1/wallets/merchant/:merchantId/users` - Get all user wallets for a merchant

### Internal (service-to-service)

Used by **client-auth-ms** after retail user signup so a wallet can be created **before** the user has a session JWT.

- `POST /api/v1/internal/wallets/user` — Create user wallet + Payonus flow. **Header:** `X-Internal-Token: <WALLET_INTERNAL_TOKEN>` (must match wallet-ms env). **Body:** `userId`, `merchantId`, optional `name`, `currency`, `complianceShareholderUserId` (defaults to `userId`). Returns same shape as `POST /api/v1/wallets/user`. If `WALLET_INTERNAL_TOKEN` is unset on wallet-ms, this route responds **503**.

### Funding Callbacks
- `POST /api/v1/wallets/funding/callback` - Webhook endpoint for funding notifications from payment providers
  - **Supports merchant wallet funding**: Use `merchantId` + `merchantWalletType` (TREASURY, OPERATION, or KYC). For **app-scoped** merchant wallets, include **`appId`** so the correct Treasury / Operation / KYC row is resolved.
  - **Supports user wallet funding (by walletId)**: Use `walletId`
  - **Supports user wallet funding (by user)**: Use `userId` + `merchantId`
  - **PayOnUs / virtual account**: If the body includes **`accountNumber`** or **`virtual_account_number`** and no wallet identifiers yet, the service looks up the wallet by stored Payonus NUBAN and fills `walletId`, `merchantId`, `appId` (merchant), and `merchantWalletType` as appropriate. Normalizes common PayOnUs fields (`onusReference`, `paymentStatus`, `transactionAmount`, `businessId`, etc.). Verifies the **`hash`** header (or body `hash`) when `PAYONUS_WEBHOOK_*` is configured.
  - **Transaction deduplication**: In-memory dedupe uses **`onusReference`** when present, otherwise **`transactionId`**
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
The system prevents duplicate funding by tracking `onusReference` (PayOnUs) when present, otherwise `transactionId`. Retrying with the same key returns:
```json
{
  "success": true,
  "message": "Transaction already processed",
  "duplicate": true
}
```

### Transactions
- `POST /api/v1/transactions` - Create transaction (Not yet implemented)
- `GET /api/v1/transactions/:walletId` - Get transaction history

**Get Transaction History:**
```bash
curl -X GET http://localhost:3004/api/v1/transactions/{walletId} \
  -H "Authorization: Bearer {token}"
```

Response:
```json
{
  "success": true,
  "transactions": [
    {
      "id": "txn_123",
      "walletId": "wallet_456",
      "amount": 100,
      "type": "CREDIT",
      "status": "COMPLETED",
      "description": "Funding",
      "balanceBefore": 0,
      "balanceAfter": 100,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "count": 1
}
```

## Payonus virtual NUBAN

When `PAYONUS_NUBAN_ENABLED` is set to a truthy value (`true`, `1`, `yes`) and `PAYONUS_BASE_URL` plus credentials are set, the service calls PayOnUs after each successful **merchant** or **user** wallet create.

| Wallet | Payonus flow | Stored `virtualNuban.accountType` |
|--------|----------------|-----------------------------------|
| Merchant (Treasury, Operation, KYC) | Dynamic virtual account (`POST /api/v1/virtual-accounts/dynamic`) | `dynamic` |
| User | Reserved virtual NUBAN via documented fixed-account path (default `POST /api/v1/virtual-accounts/fixed-account`) | `reserved` |

Provisioning runs only when the wallet **currency** is listed in `PAYONUS_NUBAN_CURRENCIES` (default **`NGN`**). If PayOnUs returns an error or no account number, the wallet row still exists; responses include `virtualNuban` with `provisionStatus: "failed"` and `provisionError`.

**BVN for fixed-account (user) flows:** Prefer **`COMPLIANCE_SERVICE_URL`** + **`COMPLIANCE_WALLET_INTERNAL_TOKEN`** so wallet-ms can load the first shareholder BVN from compliance-ms (`/api/v1/kyc/internal/payonus/first-shareholder-bvn/:userId`). Alternatively set **`PAYONUS_VA_BVN`**, or for sandbox only **`PAYONUS_VA_USE_TEST_PLACEHOLDERS=true`**.

**Merchant wallet metadata:** Optional fields on create (or on `POST /api/v1/wallets/merchant/all` body) include **`appName`**, **`payonusSubaccountCode`**, and **`complianceShareholderUserId`** (defaults to the authenticated JWT `userId` when omitted). These support labeling and BVN resolution for the merchant owner.

### Environment variables

See **`.env.example`** for a full template. Commonly used:

| Variable | Description |
|----------|-------------|
| `WALLET_INTERNAL_TOKEN` | Shared secret for `POST /api/v1/internal/wallets/user`; caller sends `X-Internal-Token`. **Same value** as **client-auth-ms** `WALLET_INTERNAL_TOKEN`. If unset, internal wallet routes are disabled (**503**). |
| `PAYONUS_NUBAN_ENABLED` | Turn integration on or off |
| `PAYONUS_BASE_URL` | API base URL (no trailing slash), e.g. PayOnUs core or API host |
| `PAYONUS_OAUTH_BASE_URL` | Optional OAuth host when it differs from `PAYONUS_BASE_URL` |
| `PAYONUS_API_KEY` / `PAYONUS_SECRET_KEY` | Credential for `bearer` / `api-key`, or OAuth id fallback |
| `PAYONUS_AUTH_MODE` | `bearer` (default), `api-key`, `basic`, or `oauth` |
| `PAYONUS_CLIENT_ID` / `PAYONUS_CLIENT_SECRET` | OAuth `apiClientId` / `apiClientSecret` when `authMode=oauth` |
| `PAYONUS_TOKEN_PATH` | OAuth token path (default `/api/v1/access-token`) |
| `PAYONUS_MERCHANT_NUBAN_PATH` / `PAYONUS_USER_NUBAN_PATH` | Relative paths for fixed-account style creates (defaults documented above) |
| `PAYONUS_VA_BUSINESS_ID` | PayOnUs Business ID (required for dynamic merchant VA and fixed-account bodies) |
| `PAYONUS_VA_DOB` | DOB for fixed-account payload (default `1990-01-01`) |
| `PAYONUS_VA_NOTIFICATION_URL` / `PAYONUS_VA_CALLBACK_URL` | Callback / notification URLs for dynamic VA |
| `PAYONUS_NUBAN_CURRENCIES` | Comma-separated ISO codes (default `NGN`) |
| `PAYONUS_VA_USE_TEST_PLACEHOLDERS` | Sandbox-only BVN placeholder when unset |
| `COMPLIANCE_SERVICE_URL` | compliance-ms base URL for internal BVN lookup |
| `COMPLIANCE_WALLET_INTERNAL_TOKEN` | Sent as `X-Internal-Token` to compliance-ms |
| `PAYONUS_WEBHOOK_VERIFICATION_KEY` | Validates webhook `hash` (see `src/config/payonusWebhook.ts`) |
| `PAYONUS_WEBHOOK_ENFORCE_SIGNATURE` | Reject webhooks with missing/invalid hash when `true` |
| `PAYONUS_DEFAULT_MERCHANT_WALLET_TYPE` | Fallback `merchantWalletType` when normalizing PayOnUs payloads |

Implementation: `src/config/payonusNuban.ts`, `src/services/payonusNubanClient.ts`, `src/services/payonusNubanProvisioning.ts`, `src/config/payonusWebhook.ts`, `src/middleware/internalWalletAuth.ts`, `src/routes/internalWalletRoutes.ts`.

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
  complianceShareholderUserId?: string; // JWT userId for compliance / BVN lookup
  appId?: string;
  appName?: string;
  payonusSubaccountCode?: string;
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
  complianceShareholderUserId?: string;
  walletType: 'USER';
  name: string;
}
```

### Base Wallet
```typescript
interface BaseWallet {
  id: string;
  balance: number; // alias for mainBalance
  mainBalance: number;
  ledgerBalance: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
  status: WalletStatus;
  virtualNuban?: {
    accountType: 'static' | 'reserved' | 'dynamic';
    provisionStatus: 'active' | 'failed';
    accountNumber?: string;
    bankName?: string;
    bankCode?: string;
    providerReference?: string;
    provisionError?: string;
    provisionedAt?: Date;
  };
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

Webhook endpoint for funding notifications from payment providers. This endpoint will be called by external payment providers when a funding transaction is completed. For **PayOnUs**, send normalized fields (`accountNumber` / `virtual_account_number`, `onusReference`, `paymentStatus`, `hash` header, etc.); see **Funding Callbacks** and **Payonus virtual NUBAN** above.

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

2. Configure environment variables (copy `.env.example` to `.env` and modify). For retail signup wallets from **client-auth-ms**, set **`WALLET_INTERNAL_TOKEN`** to the same value on both services.

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

`src/__tests__/walletService.test.ts` exercises the service against **MongoDB** (`MONGODB_URI` must be reachable). To avoid calling PayOnUs during local runs, keep **`PAYONUS_NUBAN_ENABLED`** unset or `false`.

Run user wallet feature tests:
```bash
npm run test:user-wallet
```

## Implementation Status

- [ ] Transaction processing
- [x] Transaction history
- [ ] Security enhancements
- [ ] Database integration