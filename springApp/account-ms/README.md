# Account Management Microservice

This microservice handles account management functionality for the SpringTD platform.

## Features

- Create and manage user accounts
- Track account balances
- Handle account transactions
- Support multiple account types
- Process product applications
- Handle billing checks and account pricing calculations
- Act as API Gateway for all SpringTD microservices

**Tenant storefront (subdomain PWA):** See [STOREFRONT_PWA_INTEGRATION.md](../STOREFRONT_PWA_INTEGRATION.md) for per-screen API contracts (resolve tenant, login, product catalog, detail, apply, wallet/KYC).

## Tech Stack

- Node.js with Express
- TypeScript
- MongoDB (via Mongoose)
- Jest for testing

## Deployment

The service is deployed on Fly.io and is accessible at: https://account-ms.fly.dev

Health check endpoint: https://account-ms.fly.dev/health

**Plata merchant catalog:** If you are calling **`GET /api/v1/products`** with **`PLATA_PUBLIC_KEY`** / **`PLATA_SECRET_KEY`** (keys issued on Plata), use **`https://account-ms-plata.fly.dev`**, not `account-ms.fly.dev`. This Spring deployment is a separate Fly app; using Plata keys against `account-ms.fly.dev` can fail (e.g. 502) if that route proxies to an unavailable backend or is not configured for Plata gateway verification.

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB

### Installation

1. Clone the repository
2. Navigate to the account-ms directory
3. Install dependencies:
   ```
   npm install
   ```

### Running the Service

#### Development Mode
```
npm run dev
```

#### Production Mode
```
npm run build
npm start
```

## API Endpoints

### Account Management
- `POST /api/v1/accounts` - Create a new account
- `GET /api/v1/accounts/:id` - Get account by ID
- `GET /api/v1/users/:userId/accounts` - Get accounts by user ID
- `PATCH /api/v1/accounts/:id/balance` - Update account balance
- `DELETE /api/v1/accounts/:id` - Delete an account

### Application Processing
These routes are gateway routes only. `account-ms` proxies `/api/v1/applications/*` to `product-ms`, where submitted loan/mortgage applications are stored.

- `POST /api/v1/applications/apply` - Apply for a product
- `POST /api/v1/applications/:id/approve` - Approve application (Admin)
- `POST /api/v1/applications/:id/reject` - Reject application (Admin)
- `GET /api/v1/applications/` - Get all applications (Admin)
- `GET /api/v1/applications/pending` - Get pending applications (Admin)
- `GET /api/v1/applications/user/:userId` - Get user applications
- `GET /api/v1/applications/:id` - Get application by ID

### Account Services
- `POST /api/v1/users/:userId/billing-check` - Check billing status
- `GET /api/v1/users/:userId/app-ownership` - Get app ownership information
- `POST /api/v1/pricing/calculate` - Calculate account pricing based on product
- `POST /api/v1/pricing/calculate` - Calculate account pricing based on product
- `GET /api/v1/pricing/product/:productId` - Get product pricing

### Loan Services
- `POST /api/v1/loans/apply` - Apply for a loan (gateway alias; submitted applications are stored in `product-ms`)
- `GET /api/v1/loans/:id` - Get loan details (application)
- `GET /api/v1/loans/user/:userId` - Get all user's loans

### Mortgage Services
- `POST /api/v1/mortgages/apply` - Apply for a mortgage (gateway alias; submitted applications are stored in `product-ms`)
- `GET /api/v1/mortgages/blacklisted` - Get blacklisted mortgage applications (Admin or merchant-scoped)
- `POST /api/v1/mortgages/:id/blacklist` - Blacklist a mortgage application (Admin)
- `GET /api/v1/mortgages/:id` - Get mortgage details (application)
- `GET /api/v1/mortgages/user/:userId` - Get all user's mortgages

### Commodity Services
- `POST /api/v1/commodities/buy` - Buy a commodity
- `GET /api/v1/commodities/:productId` - Get commodity details

### Savings Services
- `POST /api/v1/savings-accounts` - Create a savings account

## API Gateway

This service acts as the API Gateway for the SpringTD platform. It proxies requests to the following microservices:

- `/api/v1/products/*` -> Product Service
- `/api/v1/configurations/*` -> Product Service
- `/api/v1/applications/*` -> Product Service
- `/api/v1/compliance/*` -> Compliance Service
- `/api/v1/wallets/*` -> Wallet Service
- `/api/v1/billing/*` -> Billing Service
- `/api/v1/apps/*` -> Create App Service
- `/api/v1/payments/*` -> Payment Service
- `/api/v1/auth/*` -> Client Auth Service
- `/api/v1/registration/*` -> Client Auth Service
- `/api/v1/otp/*` -> Client Auth Service
- `/api/v1/password/*` -> Client Auth Service
- `/api/v1/user/*` -> Client Auth Service
- `/verify-email/*` -> Client Auth Service

### Running Gateway Tests
To verify the gateway configuration:
```bash
npx ts-node scripts/test-gateway.ts
```

## Environment Variables

NODE_ENV=development
PORT= xxxxxxxxxxxx
MONGO_URI= xxxxxxxxxxxx
CORS_ORIGINS= xxxxxxxxxxxx
LOG_LEVEL= xxxxxxxxxxxxx

## Testing

Run tests with:
```
npm test
```

# 📘 External APIs

## **🛍️ Product APIs**

| Function                  | Method | API Endpoint                                               |
| ------------------------- | ------ | ---------------------------------------------------------- |
| Fetch all FI products     | GET    | `https://account-ms.fly.dev/api/v1/products`               |
| Get product details by ID | GET    | `https://account-ms.fly.dev/api/v1/products/:id`           |
| Get commodity details     | GET    | `https://account-ms.fly.dev/api/v1/commodities/:productId` |

### Merchant API Key Requirement for Full Product List

For `GET /api/v1/products` (unscoped full catalog), gateway authentication is enforced using merchant API keys:

- `X-Public-Key: pk_live_...` (or `pk_test_...`)
- `X-Secret-Key: sk_live_...` (or `sk_test_...`)

The key pair is validated by `service-auth-ms`, and caller IP allowlist checks are applied.  
Without valid headers (or when IP is not whitelisted), the gateway returns `401`.

---

## **🏦 Application & Account APIs**

| Function               | Method | API Endpoint                                          | Body Parameters (Example)                     |
| ---------------------- | ------ | ----------------------------------------------------- | --------------------------------------------- |
| Apply for loan         | POST   | `https://account-ms.fly.dev/api/v1/loans/apply`       | `{ userId, productId, amount, currency, requirementSubmissions }` |
| Apply for mortgage     | POST   | `https://account-ms.fly.dev/api/v1/mortgages/apply`   | `{ userId, productId, amount, currency, requirementSubmissions }` |
| Apply directly         | POST   | `https://account-ms.fly.dev/api/v1/applications/apply` | Same body; proxied to `product-ms` |
| Create savings account | POST   | `https://account-ms.fly.dev/api/v1/savings-accounts/` | `{ product_id, user_id, initial_deposit... }` |
| Buy commodity          | POST   | `https://account-ms.fly.dev/api/v1/commodities/buy`   | `{ product_id, user_id, amount }`             |

Submitted loan/mortgage applications are persisted by `product-ms` in its `product_applications` collection. `account-ms` only proxies `/api/v1/applications/*` as the gateway.

For requirement files, upload first to `POST https://account-ms.fly.dev/api/v1/applications/upload` as multipart form-data with the file in the `file` field. The gateway proxies the upload to `product-ms`, which stores the object in its DigitalOcean Spaces bucket and returns `{ url, key, fileName, fileType, fileSize }`.

Example application body:

```json
{
  "userId": "user-uuid",
  "productId": "local-product-id",
  "amount": 50000,
  "currency": "NGN",
  "email": "jane@example.com",
  "requirementSubmissions": [
    {
      "requirementId": "valid-id",
      "label": "Valid ID",
      "type": "document",
      "fileUrl": "https://example.com/id.pdf"
    }
  ]
}
```

---

## **📊 Query APIs (Loans & Commodities)**

| Function                    | Method | API Endpoint                                           |
| --------------------------- | ------ | ------------------------------------------------------ |
| Get loan details by loan_id | GET    | `https://account-ms.fly.dev/api/v1/loans/:id`          |
| Get all user loans          | GET    | `https://account-ms.fly.dev/api/v1/loans/user/:userId` |

---

## **🔐 Authentication & Registration APIs**

| Function                   | Method | API Endpoint                                              |
| -------------------------- | ------ | --------------------------------------------------------- |
| API Authentication (Login) | POST   | `https://account-ms.fly.dev/api/v1/auth/login`            |
| Create Merchant Account    | POST   | `https://account-ms.fly.dev/api/v1/registration/merchant` |
| Create Merchant Customer   | POST   | `https://account-ms.fly.dev/api/v1/registration/user`     |

Authentication and registration routes above are proxied to `client-auth-ms`. Full request/response examples: `springApp/client-auth-ms/README.md`.

---

## **👤 User profile & account settings (via gateway)**

All endpoints require `Authorization: Bearer <jwt-token>` unless noted. Replace the host with your gateway URL (e.g. local `http://localhost:4008`).

| Function            | Method | API Endpoint                                                       | Notes |
| ------------------- | ------ | ------------------------------------------------------------------ | ----- |
| Get profile         | GET    | `https://account-ms.fly.dev/api/v1/user/profile`                   | — |
| Update profile      | PUT    | `https://account-ms.fly.dev/api/v1/user/profile`                   | Optional: `first_name`, `last_name`, `phone`, `country` |
| Update email        | PUT    | `https://account-ms.fly.dev/api/v1/user/email`                     | Body: `newEmail`, `confirmEmail`, `currentPassword` |
| Change password     | PUT    | `https://account-ms.fly.dev/api/v1/password/change`                | Body: `currentPassword`, `newPassword` |
| Deactivate account  | POST   | `https://account-ms.fly.dev/api/v1/user/deactivate`                | No body |

---

## **💼 Wallet APIs**

| Function                      | Method | API Endpoint                                                                  | Notes                                          |
| ----------------------------- | ------ | ----------------------------------------------------------------------------- | ---------------------------------------------- |
| Create Merchant Wallet        | POST   | `https://account-ms.fly.dev/api/v1/wallets/merchant`                          | —                                              |
| Create User Wallet            | POST   | `https://account-ms.fly.dev/api/v1/wallets/user`                              | —                                              |
| Fetch Merchant wallet details | GET    | `https://account-ms.fly.dev/api/v1/wallets/merchant/:merchantId/all`          | Returns Treasury, Operation, & KYC wallets     |
| Fetch Merchant wallet history | GET    | `https://account-ms.fly.dev/api/v1/wallets/treasury/:merchantId/transactions` | Replace **treasury** with `operation` or `kyc` |
| Fetch user wallet details     | GET    | `https://account-ms.fly.dev/api/v1/wallets/user/:userId`                      | Poll after Fuspay KYC for `virtualNuban`       |
| Fetch user wallet history     | GET    | `https://account-ms.fly.dev/api/v1/wallets/user/:userId/transactions`         | —                                              |

Wallet routes proxy to **wallet-ms**. **Retail user PayOnUs (fixed) NUBAN** is **not** created at `POST /api/v1/registration/user`; it is provisioned after Fuspay modular KYC completes (`POST /api/v1/kyc/modular/webhook` → compliance-ms → wallet-ms). See `springApp/wallet-ms/README.md` and `springApp/compliance-ms/README.md`.

| Fuspay KYC webhook (configure in Fuspay dashboard) | POST | `https://account-ms.fly.dev/api/v1/kyc/modular/webhook` | Proxied to compliance-ms; triggers NUBAN for `individual` profiles |

