# Wallet Microservice

This microservice handles wallet functionality for merchants and their users.

Deployment URL: https://wallet-ms-plata.fly.dev

## Features

- Merchant Wallets (Treasury, Operation, KYC)
- User Wallets (associated with merchants)
- Wallet transactions
- Balance management with Main Balance and Ledger Balance
- Transaction history
- 3rd Party API Integration
- External Funding Callbacks
- Optional **Payonus** virtual **NUBAN** provisioning for **NGN** wallets (static accounts for merchant wallets, reserved accounts for user wallets) when enabled via environment variables

## API Endpoints

### Merchant Wallets
- `POST /api/v1/wallets/merchant` - Create merchant wallet (`appId` optional; use for app-scoped merchant wallets)
- `POST /api/v1/wallets/merchant/all` - Create all merchant wallets (Treasury, Operation, KYC) for a merchant or a specific app via `appId`
- `GET /api/v1/wallets/merchant/:merchantId/type/:walletType?appId=<appId>` - Get specific merchant wallet by type (optionally app-scoped)
- `GET /api/v1/wallets/merchant/:merchantId/all?appId=<appId>` - Get all merchant wallets (optionally app-scoped)
- `PUT /api/v1/wallets/merchant/balance` - Update merchant wallet balance

#### Merchant Wallet appId usage

When `appId` is provided, merchant wallets are scoped to that app. If `appId` is omitted, endpoints use merchant-level scope.

**Create all merchant wallets for a specific app**
```bash
curl -X POST "http://localhost:3004/api/v1/wallets/merchant/all" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "currency": "USD",
    "appId": "app-123"
  }'
```

**Create one merchant wallet for a specific app**
```bash
curl -X POST "http://localhost:3004/api/v1/wallets/merchant" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Treasury Wallet",
    "currency": "USD",
    "merchantWalletType": "TREASURY",
    "appId": "app-123"
  }'
```

**Fetch a specific merchant wallet for an app**
```bash
curl -X GET "http://localhost:3004/api/v1/wallets/merchant/merchant-123/type/TREASURY?appId=app-123" \
  -H "Authorization: Bearer <token>"
```

**Fetch all merchant wallets for an app**
```bash
curl -X GET "http://localhost:3004/api/v1/wallets/merchant/merchant-123/all?appId=app-123" \
  -H "Authorization: Bearer <token>"
```

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
  - **PayOnUs webhook signature verification**: validates `hash` header using `accountNumber + onusReference + paymentStatus + PAYONUS_WEBHOOK_VERIFICATION_KEY`
  - **PayOnUs payload normalization**: accepts native PayOnUs fields (`onusReference`, `paymentStatus`, `paymentChannel`, `transactionAmount`, `businessId`) and maps them to existing funding flow
  - **Persistent idempotency**: deduplicates webhook processing with MongoDB on `onusReference`/`transactionId`
  - **Supports merchant wallet funding**: Use `merchantId` + `merchantWalletType` (TREASURY, OPERATION, or KYC)
  - **Optional app-scoped merchant funding**: Include `appId` to resolve merchant wallet by app
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

**Example 2b: Fund Merchant Treasury Wallet for a specific app (app-scoped)**
```bash
curl -X POST "https://wallet-ms.fly.dev/api/v1/wallets/funding/callback" \
  -H "Content-Type: application/json" \
  -d '{
    "merchantId": "merchant-123",
    "appId": "app-123",
    "merchantWalletType": "TREASURY",
    "amount": 250.00,
    "currency": "USD",
    "transactionId": "txn-ext-002b",
    "paymentMethod": "BANK_TRANSFER",
    "status": "SUCCESS",
    "description": "App-scoped treasury funding"
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

## Payonus virtual NUBAN

When `PAYONUS_NUBAN_ENABLED` is set to a truthy value (`true`, `1`, `yes`) and `PAYONUS_BASE_URL` plus credentials are set, the service attempts to provision a PayOnUs virtual account after each successful wallet create:

| Wallet | Payonus flow | Stored `virtualNuban.accountType` |
|--------|----------------|-----------------------------------|
| Merchant (Treasury, Operation, KYC) | Static virtual NUBAN | `static` |
| User | Reserved virtual NUBAN | `reserved` |

Provisioning only runs for currencies listed in `PAYONUS_NUBAN_CURRENCIES` (default **`NGN`**). Other currencies skip the Payonus call. If Payonus returns an error or no account number, the wallet is still created; the response includes `virtualNuban` with `provisionStatus: "failed"` and `provisionError`.

### Environment variables

| Variable | Description |
|----------|-------------|
| `PAYONUS_NUBAN_ENABLED` | Turn integration on or off |
| `PAYONUS_BASE_URL` | API base URL (no trailing slash), e.g. `https://api.payonus.com/v1` or `https://core.payonus.com` |
| `PAYONUS_OAUTH_BASE_URL` | Optional OAuth host when it differs from `PAYONUS_BASE_URL` (defaults: sandbox → `https://core-sandbox.payonus.com`, otherwise `https://core.payonus.com`) |
| `PAYONUS_API_KEY` / `PAYONUS_SECRET_KEY` | API credential (often used as `Bearer` secret key, or as OAuth `apiClientId` fallback) |
| `PAYONUS_AUTH_MODE` | `bearer` (default), `api-key`, `basic`, or `oauth` |
| `PAYONUS_API_SECRET` | Password for `basic` mode |
| `PAYONUS_CLIENT_ID` | OAuth client id for `oauth` mode (`apiClientId`) |
| `PAYONUS_CLIENT_SECRET` | OAuth client secret for `oauth` mode (`apiClientSecret`) |
| `PAYONUS_TOKEN_PATH` | OAuth token endpoint path (default `/api/v1/access-token`) |
| `PAYONUS_API_KEY_HEADER` | Header name when using `api-key` mode (default `x-api-key`) |
| `PAYONUS_MERCHANT_NUBAN_PATH` | Relative path for merchant virtual account create (default `/api/v1/virtual-accounts/fixed-account`) |
| `PAYONUS_USER_NUBAN_PATH` | Relative path for user virtual account create (default `/api/v1/virtual-accounts/fixed-account`) |
| `PAYONUS_VA_EMAIL_DOMAIN` | Synthetic email domain for required `email` field when provisioning from wallet rows (default `wallet.local`) |
| `PAYONUS_VA_BVN` | BVN for virtual account creation (required unless test placeholders enabled) |
| `PAYONUS_VA_PHONE_PREFIX` | Phone prefix for synthetic `phone` (default `080`) |
| `PAYONUS_VA_BUSINESS_ID` | PayOnUs Business ID required for fixed-account create |
| `PAYONUS_VA_DOB` | Date of birth sent for fixed-account create (default `1990-01-01`) |
| `PAYONUS_VA_NOTIFICATION_URL` | Optional callback URL sent as `notificationUrl` on fixed-account create |
| `PAYONUS_VA_ADDRESS_LINE1` | Customer address line1 sent to PayOnUs |
| `PAYONUS_VA_ADDRESS_CITY` | Customer address city (default `Lagos`) |
| `PAYONUS_VA_ADDRESS_STATE` | Customer address state (default `Lagos`) |
| `PAYONUS_VA_ADDRESS_POSTAL_CODE` | Customer address postal code (default `100001`) |
| `PAYONUS_VA_ADDRESS_COUNTRY_CODE` | Customer address country code (default `NG`) |
| `PAYONUS_VA_PREFERRED_BANK` | Optional `preferred_bank` (e.g. `WEMA`) |
| `PAYONUS_VA_USE_TEST_PLACEHOLDERS` | If `true`, uses `00000000000` as BVN when `PAYONUS_VA_BVN` is unset (sandbox-only; not for production) |
| `PAYONUS_NUBAN_CURRENCIES` | Comma-separated ISO codes (default `NGN`) |
| `PAYONUS_TIMEOUT_MS` | HTTP timeout in ms (default `30000`) |
| `PAYONUS_MERCHANT_EXTRA_JSON` | JSON object merged into the merchant create request body |
| `PAYONUS_USER_EXTRA_JSON` | JSON object merged into the user create request body |
| `PAYONUS_RESPONSE_ACCOUNT_NUMBER_PATHS` | Comma-separated dot paths to parse account number from responses (optional overrides) |
| `PAYONUS_RESPONSE_BANK_NAME_PATHS` | Same for bank name |
| `PAYONUS_RESPONSE_BANK_CODE_PATHS` | Same for bank / NIP code |
| `PAYONUS_RESPONSE_PROVIDER_REFERENCE_PATHS` | Same for provider reference id |
| `PAYONUS_WEBHOOK_ENABLED` | Toggle PayOnUs webhook processing behavior (default `true`) |
| `PAYONUS_WEBHOOK_VERIFICATION_KEY` | Secret key used to validate webhook `hash` signatures |
| `PAYONUS_WEBHOOK_ENFORCE_SIGNATURE` | Reject webhook when signature is missing/invalid (default `true`) |
| `PAYONUS_DEFAULT_MERCHANT_WALLET_TYPE` | Fallback merchant wallet type for normalized PayOnUs payloads (`TREASURY` default) |

### Wallet API shape

Successful or attempted provisioning is reflected on the wallet as `virtualNuban` (mapped from Mongo fields `payonusNuban*`): `accountNumber`, `bankName`, `bankCode`, `providerReference`, `accountType`, `provisionStatus`, `provisionError`, `provisionedAt`.

Implementation lives under `src/config/payonusNuban.ts`, `src/services/payonusNubanClient.ts`, and `src/services/payonusNubanProvisioning.ts`.

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

`src/__tests__/walletService.test.ts` uses **NGN** as the wallet currency so it matches the default `PAYONUS_NUBAN_CURRENCIES` behavior. Each test run sets `PAYONUS_NUBAN_ENABLED=false` so Jest does not call Payonus over the network (restore your env after the suite via `afterAll`). Running these tests still requires a reachable **MongoDB** instance (`MONGODB_URI`).

Run user wallet feature tests:
```bash
npm run test:user-wallet
```

## Implementation Status

- [ ] Transaction processing
- [x] Transaction history
- [ ] Security enhancements
- [ ] Database integration