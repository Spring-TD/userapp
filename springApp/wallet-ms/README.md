# Wallet Microservice

This microservice handles wallet functionality for merchants and their users.

Deployment URL: https://walletms-2026.fly.dev/

## Features

- Merchant Wallets (Billing, KYC, Settlement)
- User Wallets (associated with merchants)
- Wallet transactions
- Balance management with Main Balance and Ledger Balance
- Transaction history
- 3rd Party API Integration
- External Funding Callbacks
- Optional **Payonus** virtual **NUBAN** provisioning for wallets whose currency matches `PAYONUS_NUBAN_CURRENCIES` (default **NGN**): **dynamic** virtual accounts when **merchant** wallets are created; **reserved (fixed)** virtual accounts for **retail user** wallets **after Fuspay modular KYC completes** (not at signup)

## MongoDB indexes (user vs merchant wallets)

Retail **USER** wallets store `merchantId` (tenant) but do not set `merchantWalletType`. The compound unique index on `(merchantId, appId, merchantWalletType)` is defined with **`partialFilterExpression: { walletType: 'MERCHANT' }`**, so only **merchant** treasury/operation/KYC rows participate in that uniqueness. Many user wallets can therefore share the same `merchantId`.

**If you upgraded from an older build** that used a non-partial index, MongoDB may still have the old index. Drop it once, then redeploy so the new index can be created:

```text
db.wallets.dropIndex("merchantId_1_appId_1_merchantWalletType_1")
```

(Or use Compass / `mongosh` against your `wallet_ms` database.) After that, restart **wallet-ms** (or run your usual index sync) so the partial index is created.

## API Endpoints

### Merchant Wallets
- `POST /api/v1/wallets/merchant` - Create merchant wallet (optional body: `appId`, `appName`, `payonusSubaccountCode`, `complianceShareholderUserId`, plus `name`, `currency`, `merchantWalletType`)
- `POST /api/v1/wallets/merchant/all` - Create all merchant wallets (Billing, KYC, Settlement). Body may include `currency`, `appId`, `appName`, `payonusSubaccountCode`, `complianceShareholderUserId` (defaults shareholder id from JWT when omitted)
- `GET /api/v1/wallets/merchant/:merchantId/type/:walletType` - Get specific merchant wallet by type
- `GET /api/v1/wallets/merchant/:merchantId/all` - Get all merchant wallets
- `PUT /api/v1/wallets/merchant/balance` - Update merchant wallet balance

### Billing Wallet Operations
- `GET /api/v1/wallets/billing/:merchantId/transactions` - Get Billing wallet transactions (legacy: `/operation/...`)
- `POST /api/v1/wallets/billing-to-kyc` - Transfer money from Billing Wallet to KYC Wallet (legacy: `/operation-to-kyc`)
- `POST /api/v1/wallets/kyc-to-billing` - Transfer money from KYC Wallet to Billing Wallet (legacy: `/kyc-to-operation`)
- `POST /api/v1/wallets/billing/debit` - Debit the merchant's own Billing Wallet (legacy: `/operation/debit`)

### KYC Wallet Operations
- `GET /api/v1/wallets/kyc/:merchantId/transactions` - Get KYC wallet transactions
- `POST /api/v1/wallets/kyc/debit` - Debit the merchant's own KYC Wallet
- `POST /api/v1/wallets/kyc/fee` - Process KYC fee by debiting the merchant's KYC Wallet

### Settlement Wallet Operations
- `GET /api/v1/wallets/settlement/:merchantId/transactions` - Get Settlement wallet transactions (legacy: `/treasury/...`)
- `POST /api/v1/wallets/settlement/transfer` - Transfer money from Settlement Wallet to another wallet (legacy: `/treasury/transfer`)
- `POST /api/v1/wallets/treasury/debit` - Debit a user wallet
- `POST /api/v1/wallets/settlement/debit-merchant` - Debit the merchant's own Settlement Wallet (legacy: `/treasury/debit-merchant`)

### User Wallets
- `POST /api/v1/wallets/user` - Create user wallet (requires **Bearer** JWT; user must be `userType` user with `merchantId`)
- `GET /api/v1/wallets/user/:userId` - Get user wallet
- `PUT /api/v1/wallets/user/:userId/balance` - Update user wallet balance
- `GET /api/v1/wallets/user/:userId/transactions` - Get user wallet transactions with filtering options (by date range and type)
- `POST /api/v1/wallets/user/:userId/transfer` - Transfer money out from user wallet to another wallet
- `POST /api/v1/wallets/user/:userId/payout` - Send money from the user's active PayOnUs virtual account wallet to an external bank account
- `POST /api/v1/wallets/user/:userId/api-call` - Make a 3rd party API call from user wallet
- `GET /api/v1/wallets/merchant/:merchantId/users` - Get all user wallets for a merchant

#### User bank payout

`POST /api/v1/wallets/user/:userId/payout` requires a Bearer token for the same user. The wallet must be active, funded, and have an active PayOnUs `virtualNuban`.

```json
{
  "accountNumber": "0123456789",
  "bankCode": "044",
  "bankName": "Access Bank",
  "accountName": "Jane Smith",
  "amount": 5000,
  "currency": "NGN",
  "narration": "Withdrawal to bank",
  "reference": "optional-client-reference"
}
```

PayOnUs payout configuration uses the existing PayOnUs auth/base URL settings plus `PAYONUS_PAYOUT_PATH` (default `/api/v1/transfers/bank`), optional `PAYONUS_PAYOUT_EXTRA_JSON`, and optional response path overrides via `PAYONUS_PAYOUT_RESPONSE_REFERENCE_PATHS` / `PAYONUS_PAYOUT_RESPONSE_STATUS_PATHS`.

If `PAYMENT_SERVICE_URL` and `PAYMENT_INTERNAL_TOKEN` are configured, wallet-ms also posts a best-effort **DEBIT** ledger entry to payment-ms after PayOnUs confirms the payout. The wallet payout still succeeds if the payment-ms ledger hook is unavailable; wallet-ms logs the ledger failure for retry/support.

### Internal (service-to-service)

Used by **client-auth-ms** (signup) and **compliance-ms** (post–KYC). **Header:** `X-Internal-Token: <WALLET_INTERNAL_TOKEN>` (must match **client-auth-ms** / **compliance-ms** `WALLET_INTERNAL_TOKEN`).

| Endpoint | When | PayOnUs |
|----------|------|---------|
| `POST /api/v1/internal/wallets/user` | Retail **registration** (client-auth-ms) | **No** — creates wallet row only |
| `POST /api/v1/internal/wallets/user/:userId/provision-nuban` | **Fuspay KYC webhook** `verification.completed` (compliance-ms) | **Yes** — fixed reserved VA |

**Create user wallet body:** `userId`, `merchantId`, optional `name`, `currency`, `complianceShareholderUserId` (merchant owner id for legacy shareholder BVN fallback).

**Provision NUBAN:** empty body; idempotent if NUBAN already `active`. Uses the retail user's BVN from compliance-ms (`GET /api/v1/kyc/internal/payonus/user-bvn/:userId`) when present, else merchant shareholder BVN.

### Funding Callbacks
- `POST /api/v1/wallets/funding/callback` - Webhook endpoint for funding notifications from payment providers
  - **Supports merchant wallet funding**: Use `merchantId` + `merchantWalletType` (`BILLING`, `KYC`, or `SETTLEMENT`; legacy `TREASURY` / `OPERATION` accepted). For **app-scoped** merchant wallets, include **`appId`** so the correct wallet row is resolved.
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

When `PAYONUS_NUBAN_ENABLED` is truthy and `PAYONUS_BASE_URL` plus credentials are configured, PayOnUs provisioning runs as follows:

| Wallet | When PayOnUs is called | API | `virtualNuban.accountType` |
|--------|------------------------|-----|----------------------------|
| **Merchant** (Billing, KYC, Settlement) | Immediately on **merchant wallet create** | Dynamic VA (`POST /api/v1/virtual-accounts/dynamic`) | `dynamic` |
| **Retail user** | After **Fuspay modular KYC** completes (`verification.completed` webhook → compliance-ms → `POST .../provision-nuban`) | Fixed / reserved VA (`POST /api/v1/virtual-accounts/fixed-account`) | `reserved` |

Retail users **do not** get a PayOnUs call at registration. Signup only creates the wallet row via `POST /api/v1/internal/wallets/user`. The mobile app should show “complete KYC” before expecting a bank account number, then refresh `GET /api/v1/wallets/user/:userId` after KYC.

```text
Register → wallet created (no NUBAN)
     → user completes Fuspay KYC on device
     → Fuspay → compliance-ms webhook
     → compliance-ms → POST /internal/wallets/user/:userId/provision-nuban
     → PayOnUs fixed VA + virtualNuban on wallet
```

Provisioning runs only when the wallet **currency** is in `PAYONUS_NUBAN_CURRENCIES` (default **`NGN`**). On failure the wallet still exists; `virtualNuban` has `provisionStatus: "failed"` and `provisionError`.

**BVN for retail fixed-account flows (resolution order):**

1. Retail user's Fuspay KYC BVN — `COMPLIANCE_SERVICE_URL` + `COMPLIANCE_WALLET_INTERNAL_TOKEN` → `GET /api/v1/kyc/internal/payonus/user-bvn/:userId` (populated from Fuspay webhook `data.details.bvn` when 11 digits are available)
2. Merchant shareholder BVN — `GET /api/v1/kyc/internal/payonus/first-shareholder-bvn/:ownerUserId`
3. `PAYONUS_VA_BVN` env, or sandbox `PAYONUS_VA_USE_TEST_PLACEHOLDERS=true`

Masked BVN in webhooks (e.g. `222********`) is stored on the KYC profile but cannot provision PayOnUs until a full 11-digit value is available.

**Merchant wallet metadata:** Optional fields on create include **`appName`**, **`payonusSubaccountCode`**, and **`complianceShareholderUserId`** (defaults to JWT `userId` when omitted).

### Environment variables

See **`.env.example`** for a full template. Commonly used:

| Variable | Description |
|----------|-------------|
| `WALLET_INTERNAL_TOKEN` | Shared secret for internal wallet routes; callers send `X-Internal-Token`. **Same value** as **client-auth-ms** and **compliance-ms** `WALLET_INTERNAL_TOKEN`. If unset, internal routes return **503**. |
| `COMPLIANCE_SERVICE_URL` | compliance-ms base URL (no trailing slash) for retail + shareholder BVN lookup |
| `COMPLIANCE_WALLET_INTERNAL_TOKEN` | Same as compliance-ms `COMPLIANCE_WALLET_INTERNAL_TOKEN`; sent as `X-Internal-Token` |
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
| `PAYONUS_WEBHOOK_VERIFICATION_KEY` | Validates funding webhook `hash` (see `src/config/payonusWebhook.ts`) |
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
  merchantWalletType: MerchantWalletType; // BILLING, KYC, or SETTLEMENT
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