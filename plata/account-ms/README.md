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

## Tech Stack

- Node.js with Express
- TypeScript
- MongoDB (via Mongoose)
- Jest for testing

## Deployment

The service is deployed on Fly.io and is accessible at: https://account-ms.fly.dev

Health check endpoint: https://account-ms.fly.dev/health

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
- `POST /api/v1/loans/apply` - Apply for a loan
- `GET /api/v1/loans/:id` - Get loan details (application)
- `GET /api/v1/loans/user/:userId` - Get all user's loans

### Mortgage Services
- `POST /api/v1/mortgages/apply` - Apply for a mortgage
- `GET /api/v1/mortgages/:id` - Get mortgage details (application)
- `GET /api/v1/mortgages/user/:userId` - Get all user's mortgages

### Commodity Services
- `POST /api/v1/commodities/buy` - Buy a commodity
- `GET /api/v1/commodities/:productId` - Get commodity details

### Savings Services
- `POST /api/v1/savings-accounts` - Create a savings account

## API documentation (Swagger)

Interactive docs (StockOp-style):

| URL | Purpose |
|-----|---------|
| [https://account-ms-plata.fly.dev/docs](https://account-ms-plata.fly.dev/docs) | Integrator index — pick a product |
| [https://account-ms-plata.fly.dev/docs/loan](https://account-ms-plata.fly.dev/docs/loan) | Loan — products, apply, status, offer accept/decline, loan account, repayment schedule |
| [https://account-ms-plata.fly.dev/docs/mortgage](https://account-ms-plata.fly.dev/docs/mortgage) | Mortgage — products, apply, status, mortgage account, repayment schedule |
| [https://account-ms-plata.fly.dev/docs/commodity](https://account-ms-plata.fly.dev/docs/commodity) | Commodity |
| [https://account-ms-plata.fly.dev/docs/savings](https://account-ms-plata.fly.dev/docs/savings) | Savings |
| [https://account-ms-plata.fly.dev/docs/investment](https://account-ms-plata.fly.dev/docs/investment) | Investment |
| [https://account-ms-plata.fly.dev/frontendplata](https://account-ms-plata.fly.dev/frontendplata) | Merchant dashboard — Treasury & Settlements (JWT) |
| [https://account-ms-plata.fly.dev/frontendplata/openapi.json](https://account-ms-plata.fly.dev/frontendplata/openapi.json) | Frontend Plata OpenAPI JSON |
| `/api-docs` | Same UI + dropdown for per-microservice specs (Wallet, Product, Compliance, …) |

**Regenerate** `openapi.json` after spec changes:

```bash
npm run export-swagger
```

The primary spec (`/docs`) is split into product sections: **1. Loan**, **2. Mortgage**, **3. Commodity**, **4. Savings**, **5. Investment**. Shared API-key routes are repeated in every section that uses them. Merchant JWT routes are on `/frontendplata`.

Loan / mortgage servicing routes (API keys; `{applicationId}` = Plata id or the integrator's `localApplicationId`; only applications submitted with the same merchant's keys are visible):

- `GET /api/v1/products/external-applications/{applicationId}` — status, `stage`, `nextAction`
- `GET|POST /api/v1/products/external-applications/{applicationId}/offer` — loan offer letter / accept or decline
- `GET /api/v1/products/external-applications/{applicationId}/account` — loan account summary
- `GET /api/v1/products/external-applications/{applicationId}/repayment-schedule` — instalments (after disbursement)

Wallet reads (API keys; `{merchantId}` must match the key’s merchant; user wallets must belong to that merchant):

- `GET /api/v1/wallets/merchant/{merchantId}/all` — Treasury, Billing, Repayment
- `GET /api/v1/wallets/merchant/{merchantId}/type/{walletType}` — one wallet (`TREASURY` | `BILLING` | `REPAYMENT`)
- `GET /api/v1/wallets/treasury|billing|repayment/{merchantId}/transactions` — merchant history
- `GET /api/v1/wallets/user/{userId}` — customer wallet
- `GET /api/v1/wallets/user/{userId}/transactions` — customer history

---

## API Gateway

This service acts as the API Gateway for the SpringTD platform. It proxies requests to the following microservices:

- `/api/v1/products/*` -> Product Service (discriminator-typed fields: LOAN `about`/`structure`/…; `PUT /api/v1/products/:id` merges those paths)
- `/api/v1/configurations/options/*` -> Product Service (legacy alias for configuration dropdowns; same as `/api/v1/products/options/*`)
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

---

## **🏦 Application & Account APIs**

| Function               | Method | API Endpoint                                          | Body Parameters (Example)                     |
| ---------------------- | ------ | ----------------------------------------------------- | --------------------------------------------- |
| Apply for loan         | POST   | `https://account-ms.fly.dev/api/v1/loans/apply`       | `{ product_id, merchant_id, user_id }`        |
| Apply for mortgage     | POST   | `https://account-ms.fly.dev/api/v1/mortgages/apply`   | `{ product_id, merchant_id, user_id }`        |
| Create savings account | POST   | `https://account-ms.fly.dev/api/v1/savings-accounts/` | `{ product_id, user_id, initial_deposit... }` |
| Buy commodity          | POST   | `https://account-ms.fly.dev/api/v1/commodities/buy`   | `{ product_id, user_id, amount }`             |

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

---

## **💼 Wallet APIs**

| Function                      | Method | API Endpoint                                                                  | Notes                                          |
| ----------------------------- | ------ | ----------------------------------------------------------------------------- | ---------------------------------------------- |
| Create Merchant Wallet        | POST   | `https://account-ms.fly.dev/api/v1/wallets/merchant`                          | —                                              |
| Create User Wallet            | POST   | `https://account-ms.fly.dev/api/v1/wallets/user`                              | —                                              |
| Fetch Merchant wallet details | GET    | `https://account-ms.fly.dev/api/v1/wallets/merchant/:merchantId/all`          | Returns Treasury, Operation, & KYC wallets     |
| Fetch Merchant wallet history | GET    | `https://account-ms.fly.dev/api/v1/wallets/treasury/:merchantId/transactions` | Replace **treasury** with `operation` or `kyc` |
| Fetch user wallet details     | GET    | `https://account-ms.fly.dev/api/v1/wallets/user/:userId`                      | —                                              |
| Fetch user wallet history     | GET    | `https://account-ms.fly.dev/api/v1/wallets/user/:userId/transactions`         | —                                              |

