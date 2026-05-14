# API Integration Status

**Last Updated:** December 29, 2025

This document tracks all backend microservices, their endpoints, frontend integration status, and what needs to be connected.

---

## Deployment Overview

All 8 microservices are **deployed and healthy** on Fly.dev:

| Service | URL | Health Status |
|---------|-----|---------------|
| service-auth-ms | https://service-auth-ms.fly.dev | ✅ Healthy |
| client-auth-ms | https://client-auth-ms.fly.dev | ✅ Healthy |
| create-app-ms | https://create-app-ms.fly.dev | ✅ Healthy |
| product-ms | https://product-ms.fly.dev | ✅ Healthy |
| wallet-ms | https://wallet-ms.fly.dev | ✅ Healthy |
| compliance-ms | https://compliance-ms.fly.dev | ✅ Healthy |
| payment-ms | https://payment-ms.fly.dev | ✅ Healthy |
| billing-ms | https://billing-ms.fly.dev | ✅ Healthy |

---

## Integration Summary

| Status | Count | Services |
|--------|-------|----------|
| ✅ Fully Integrated | 8 | service-auth-ms, client-auth-ms, create-app-ms, product-ms, compliance-ms, wallet-ms, payment-ms, billing-ms |

---

## Detailed API Documentation

---

### 1. service-auth-ms ✅ FULLY INTEGRATED

**Purpose:** Main authentication service for merchants/service accounts

**Backend Location:** `server/service-auth-ms/`

**Deployed URL:** https://service-auth-ms.fly.dev

#### Backend Endpoints

| Route File | Endpoint | Method | Description |
|------------|----------|--------|-------------|
| authRoutes.ts | `/api/v1/auth/register` | POST | Register new user |
| authRoutes.ts | `/api/v1/auth/login` | POST | Login user |
| authRoutes.ts | `/api/v1/auth/logout` | POST | Logout user |
| authRoutes.ts | `/api/v1/auth/refresh` | POST | Refresh access token |
| otpRoutes.ts | `/api/v1/otp/send` | POST | Send OTP |
| otpRoutes.ts | `/api/v1/otp/verify` | POST | Verify OTP |
| passwordRoutes.ts | `/api/v1/password/forgot` | POST | Forgot password |
| passwordRoutes.ts | `/api/v1/password/reset` | POST | Reset password |
| verifyEmailRoutes.ts | `/api/v1/verify-email/send` | POST | Send email verification |
| verifyEmailRoutes.ts | `/api/v1/verify-email/verify` | POST | Verify email |
| userRoutes.ts | `/api/v1/users/me` | GET | Get current user |
| userRoutes.ts | `/api/v1/users/:id` | GET/PUT | Get/Update user |
| adminVerifyRoutes.ts | `/api/v1/admin/verify/*` | * | Admin verification routes |
| credentialRoutes.ts | `/api/v1/credentials/*` | * | API credentials management |

#### Frontend Integration

| Frontend File | Usage |
|---------------|-------|
| `lib/api.ts` | Main API client for auth |
| `contexts/AuthContext.tsx` | Auth state management |
| `components/signin-form.tsx` | Login form |
| `components/registration-form.tsx` | Registration form |
| `app/verify-email/*` | Email verification flow |
| `app/verify-otp/*` | OTP verification flow |

**Status:** ✅ **FULLY WORKING**

---

### 2. client-auth-ms ✅ FULLY INTEGRATED

**Purpose:** Authentication for end-users/clients of apps

**Backend Location:** `server/client-auth-ms/`

**Deployed URL:** https://client-auth-ms.fly.dev

#### Backend Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/auth/register` | POST | Register client |
| `/api/v1/auth/login` | POST | Login client |
| `/api/v1/auth/verify` | POST | Verify token |
| `/health` | GET | Health check |

#### Frontend Integration

| Frontend File | Usage |
|---------------|-------|
| `contexts/AuthContext.tsx` | Client auth handling |
| `.env.local` | `NEXT_PUBLIC_CLIENT_AUTH_URL` |

**Status:** ✅ **FULLY WORKING**

---

### 3. create-app-ms ✅ FULLY INTEGRATED

**Purpose:** App/application management for merchants

**Backend Location:** `server/create-app-ms/`

**Deployed URL:** https://create-app-ms.fly.dev

#### Backend Endpoints

| Route File | Endpoint | Method | Description |
|------------|----------|--------|-------------|
| appRoutes.ts | `/api/v1/apps` | POST | Create new app |
| appRoutes.ts | `/api/v1/apps` | GET | List all apps |
| appRoutes.ts | `/api/v1/apps/:id` | GET | Get app by ID |
| appRoutes.ts | `/api/v1/apps/:id` | PUT | Update app |
| appRoutes.ts | `/api/v1/apps/:id` | DELETE | Delete app |
| appRoutes.ts | `/api/v1/apps/:id/stats` | GET | Get app stats |
| appRoutes.ts | `/api/v1/apps/:id/transactions` | GET | Get app transactions |
| specialRoutes.ts | `/api/v1/special/*` | * | Special operations |

#### Frontend Integration

| Frontend File | Usage |
|---------------|-------|
| `lib/appService.ts` | Complete app API wrapper (538 lines) |
| `app/dashboard/create-app/*` | App creation flow |
| `app/dashboard/create-app/all-apps/*` | All apps listing |
| `components/create-app/*` | App creation components |
| `components/drawers/app-created-success-drawer.tsx` | Success drawer |

**Status:** ✅ **FULLY WORKING**

---

### 4. product-ms ✅ FULLY INTEGRATED

**Purpose:** Product management (Loans, Savings, Mortgages, Commodities)

**Backend Location:** `server/product-ms/`

**Deployed URL:** https://product-ms.fly.dev

**Persistent Storage:** Fly.dev volume at `/data`

#### Backend Endpoints

| Route File | Endpoint | Method | Description |
|------------|----------|--------|-------------|
| productRoutes.ts | `/api/v1/products` | POST | Create product |
| productRoutes.ts | `/api/v1/products` | GET | List products |
| productRoutes.ts | `/api/v1/products/:id` | GET | Get product by ID |
| productRoutes.ts | `/api/v1/products/:id` | PUT | Update product |
| productRoutes.ts | `/api/v1/products/:id` | DELETE | Delete product |
| productRoutes.ts | `/api/v1/products/app/:appId` | GET | Get products by app |
| productRoutes.ts | `/api/v1/products/app/:appId/type/:type` | GET | Get products by app and type |
| configurationRoutes.ts | `/api/v1/configurations` | POST | Create configuration |
| configurationRoutes.ts | `/api/v1/configurations/:id` | GET | Get configuration |
| configurationRoutes.ts | `/api/v1/configurations/:id` | PUT | Update configuration |
| configurationRoutes.ts | `/api/v1/configurations/product/:productId` | GET | Get config by product |

#### Frontend Integration

| Frontend File | Usage |
|---------------|-------|
| `lib/productService.ts` | Complete product API wrapper |
| `lib/product-api.ts` | Additional product utilities |
| `app/dashboard/create-app/all-apps/[id]/products/*` | Product pages |
| `components/drawers/configure-loan-drawer.tsx` | Loan configuration |
| `components/drawers/configure-savings-drawer.tsx` | Savings configuration |
| `components/drawers/configure-mortgage-drawer.tsx` | Mortgage configuration |
| `components/drawers/configure-commodity-drawer.tsx` | Commodity configuration |

**Status:** ✅ **FULLY WORKING**

---

### 5. compliance-ms ✅ FULLY INTEGRATED

**Purpose:** KYC/compliance management

**Backend Location:** `server/compliance-ms/`

**Deployed URL:** https://compliance-ms.fly.dev

#### Backend Endpoints

| Route File | Endpoint | Method | Description |
|------------|----------|--------|-------------|
| kycRoutes.ts | `/api/v1/kyc/status/:userId` | GET | Get KYC status |
| individualKycRoutes.ts | `/api/v1/kyc/individual/submit` | POST | Submit individual KYC |
| businessKycRoutes.ts | `/api/v1/kyc/business/submit` | POST | Submit business KYC |
| complianceAdminRoutes.ts | `/api/v1/kyc/admin/users` | GET | List all KYC users |
| complianceAdminRoutes.ts | `/api/v1/kyc/admin/documents` | GET | List all documents |
| complianceAdminRoutes.ts | `/api/v1/kyc/admin/approve/:id` | POST | Approve KYC |
| complianceAdminRoutes.ts | `/api/v1/kyc/admin/reject/:id` | POST | Reject KYC |
| livenessRoutes.ts | `/api/v1/liveness/*` | * | Liveness check routes |

#### Frontend Integration

| Frontend File | Usage |
|---------------|-------|
| `lib/kycService.ts` | KYC API wrapper (135 lines) |
| `components/forms/BusinessDocument.tsx` | Business document form |
| `components/forms/ShareholderInfo.tsx` | Shareholder info form |
| `components/CreateShareholderDrawer.tsx` | Create shareholder |
| `app/dashboard/compliance/*` | Compliance pages |

**Status:** ✅ **FULLY WORKING**

---

### 6. wallet-ms ✅ FULLY INTEGRATED

**Purpose:** Wallet management, transactions, funding

**Backend Location:** `server/wallet-ms/`

**Deployed URL:** https://wallet-ms.fly.dev

#### Backend Endpoints

| Route File | Endpoint | Method | Description |
|------------|----------|--------|-------------|
| walletRoutes.ts | `/api/v1/wallets/merchant` | POST | Create merchant wallet |
| walletRoutes.ts | `/api/v1/wallets/merchant/all` | POST | Create all merchant wallets |
| walletRoutes.ts | `/api/v1/wallets/merchant/:merchantId/type/:walletType` | GET | Get merchant wallet by type |
| walletRoutes.ts | `/api/v1/wallets/merchant/:merchantId/all` | GET | Get all merchant wallets |
| walletRoutes.ts | `/api/v1/wallets/treasury/:merchantId/transactions` | GET | Get treasury transactions |
| walletRoutes.ts | `/api/v1/wallets/operation/:merchantId/transactions` | GET | Get operation transactions |
| walletRoutes.ts | `/api/v1/wallets/kyc/:merchantId/transactions` | GET | Get KYC transactions |
| walletRoutes.ts | `/api/v1/wallets/user` | POST | Create user wallet |
| walletRoutes.ts | `/api/v1/wallets/user/:userId` | GET | Get user wallet |
| walletRoutes.ts | `/api/v1/wallets/user/:userId/transactions` | GET | Get user transactions |
| fundingRoutes.ts | `/api/v1/wallets/funding/callback` | POST | Funding webhook callback |
| fundingRoutes.ts | `/api/v1/wallets/funding/status/:transactionId` | GET | Check funding status |

#### Frontend Integration

| Frontend File | Status | Notes |
|---------------|--------|-------|
| `lib/walletService.ts` | ✅ CONNECTED | 600 lines, comprehensive wrapper |
| `app/dashboard/.../wallets/treasury/page.tsx` | ✅ CONNECTED | Fetches real balance & transactions |
| `app/dashboard/.../wallets/repayment/page.tsx` | ✅ CONNECTED | Fetches real balance & transactions |
| `components/wallet-balance-card.tsx` | ✅ AVAILABLE | Reusable balance card component |

**Status:** ✅ **FULLY WORKING**

---

### 7. payment-ms ✅ FULLY INTEGRATED

**Purpose:** Payment processing (card, bank transfer, wallet)

**Backend Location:** `server/payment-ms/`

**Deployed URL:** https://payment-ms.fly.dev

#### Backend Endpoints

| Route File | Endpoint | Method | Description |
|------------|----------|--------|-------------|
| paymentRoutes.ts | `/api/v1/payments` | POST | Process payment |
| paymentRoutes.ts | `/api/v1/payments/:id` | GET | Get payment |
| paymentRoutes.ts | `/api/v1/payments` | GET | List payments |
| paymentRoutes.ts | `/api/v1/payments/:id/verify` | POST | Verify payment |
| paymentRoutes.ts | `/api/v1/payments/:id/refund` | POST | Refund payment |
| paymentRoutes.ts | `/api/v1/payments/methods` | GET | Get payment methods |
| paymentRoutes.ts | `/api/v1/payments/methods` | POST | Add payment method |
| paymentRoutes.ts | `/api/v1/payments/methods/:id` | DELETE | Remove payment method |
| recordRoutes.ts | `/api/v1/records/*` | * | Payment records |

#### Frontend Integration

| Frontend File | Status | Notes |
|---------------|--------|-------|
| `lib/paymentService.ts` | ✅ CONNECTED | 673 lines, comprehensive wrapper |
| `lib/examples/paymentExamples.ts` | ✅ EXISTS | Usage examples |
| `components/CardPaymentDrawer.tsx` | ✅ CONNECTED | Uses paymentService |
| `components/BankTransferPaymentDrawer.tsx` | ✅ CONNECTED | Uses paymentService |
| `components/forms/PaymentMethodTab.tsx` | ✅ CONNECTED | Full payment flow integration |
| `components/billing/drawers/add-card-drawer.tsx` | ✅ CONNECTED | Uses paymentService.methods |
| `components/billing/drawers/select-card-drawer.tsx` | ✅ CONNECTED | Loads cards from API |
| `components/billing/billing-payment-methods-tab.tsx` | ✅ CONNECTED | Lists payment methods |

#### What Exists (Frontend Wrapper)
```typescript
// lib/paymentService.ts - Available methods:
paymentService.initiation.initiateCardPayment(data)
paymentService.initiation.initiateBankTransfer(data)
paymentService.initiation.initiateWalletPayment(data)
paymentService.verification.verifyPayment(data)
paymentService.verification.getPaymentStatus(id)
paymentService.history.getPayments(filter)
paymentService.history.getPayment(id)
paymentService.history.getPaymentStats(filter)
paymentService.methods.getPaymentMethods()
paymentService.methods.addPaymentMethod(data)
paymentService.methods.deletePaymentMethod(id)
paymentService.methods.setDefaultPaymentMethod(id)
```

#### What's Integrated
- Payment drawers calling real API
- Card payment form with API submission
- Bank transfer fully integrated
- Payment methods management connected
- Add/select card drawers connected

**Status:** ✅ **FULLY WORKING**

---

### 8. billing-ms ✅ FULLY INTEGRATED

**Purpose:** Billing, invoicing, subscriptions, pricing

**Backend Location:** `server/billing-ms/`

**Deployed URL:** https://billing-ms.fly.dev

#### Backend Endpoints

| Route File | Endpoint | Method | Description |
|------------|----------|--------|-------------|
| billingRoutes.ts | `/api/v1/billing/invoices` | CRUD | Invoice management |
| billingRoutes.ts | `/api/v1/billing/payments` | CRUD | Payment processing |
| billingRoutes.ts | `/api/v1/billing/subscriptions` | CRUD | Subscription management |
| billingRoutes.ts | `/api/v1/billing/transactions` | GET | Transaction list |
| billingRoutes.ts | `/api/v1/billing/recurring-billings` | CRUD | Recurring billing |
| billingRoutes.ts | `/api/v1/billing/one-time-billings` | CRUD | One-time billing |
| billingRoutes.ts | `/api/v1/billing/transfers` | POST | Process transfer |
| billingRoutes.ts | `/api/v1/billing/withdrawals` | POST | Process withdrawal |
| billingRoutes.ts | `/api/v1/billing/payouts` | POST | Process payout |
| billingRoutes.ts | `/api/v1/billing/check-billing-status` | POST | Check billing status |
| pricingRoutes.ts | `/api/v1/billing/pricing/pricing-schedules` | CRUD | Pricing schedules |
| triggerRoutes.ts | `/api/v1/billing/billing/*` | * | Billing triggers |

#### Frontend Integration

| Frontend File | Status | Notes |
|---------------|--------|-------|
| `lib/api/billing-client.ts` | ✅ CONNECTED | Axios client |
| `lib/services/billing-service.ts` | ✅ CONNECTED | Service wrapper (149 lines) |
| `types/billing.ts` | ✅ EXISTS | Type definitions |
| `components/billing/billing-summary-card.tsx` | ✅ CONNECTED | Uses billingService |
| `components/billing/billing-history-table.tsx` | ✅ CONNECTED | Uses billingService |
| `components/billing/billing-overview-tab.tsx` | ✅ CONNECTED | Fetches invoices & stats |
| `components/billing/billing-payment-methods-tab.tsx` | ✅ CONNECTED | Uses paymentService |
| `components/billing/billing-usage-tab.tsx` | ✅ CONNECTED | Displays usage metrics |

#### What's Integrated
- Billing summary card fetches one-time billings
- Billing history table fetches transactions
- Billing overview with invoices and stats
- Billing usage tab with transaction metrics
- Payment methods tab connected to payment-ms
- Add card and select card drawers

#### Optional Future Enhancements
- Subscription management UI (if needed)
- Invoice creation/management UI (if needed)
- Pricing schedules admin UI (if needed)
- Recurring billing management (if needed)

**Status:** ✅ **FULLY WORKING**

---

## Action Items

### ✅ Completed
- [x] Update `CardPaymentDrawer` to use `paymentService`
- [x] Update `BankTransferPaymentDrawer` to use real API
- [x] Connect payment methods to backend
- [x] Review and update billing component connections
- [x] Connect billing-overview-tab, billing-usage-tab, billing-payment-methods-tab

### Optional Future Enhancements
- [ ] Add subscription management UI (if needed)
- [ ] Add invoice creation/management UI (if needed)
- [ ] Add pricing schedules admin UI (if needed)

---

## Environment Variables Required

```bash
# .env.local
NEXT_PUBLIC_API_URL=https://service-auth-ms.fly.dev
NEXT_PUBLIC_AUTH_SERVICE_URL=https://service-auth-ms.fly.dev
NEXT_PUBLIC_CLIENT_AUTH_URL=https://client-auth-ms.fly.dev
NEXT_PUBLIC_CREATE_APP_SERVICE_URL=https://create-app-ms.fly.dev
NEXT_PUBLIC_PRODUCT_SERVICE_URL=https://product-ms.fly.dev
NEXT_PUBLIC_WALLET_SERVICE_URL=https://wallet-ms.fly.dev
NEXT_PUBLIC_COMPLIANCE_URL=https://compliance-ms.fly.dev
NEXT_PUBLIC_PAYMENT_SERVICE_URL=https://payment-ms.fly.dev
NEXT_PUBLIC_BILLING_SERVICE_URL=https://billing-ms.fly.dev
```

---

## Testing Endpoints

```bash
# Health checks
curl https://service-auth-ms.fly.dev/health
curl https://client-auth-ms.fly.dev/health
curl https://create-app-ms.fly.dev/health
curl https://product-ms.fly.dev/health
curl https://wallet-ms.fly.dev/health
curl https://compliance-ms.fly.dev/health
curl https://payment-ms.fly.dev/health
curl https://billing-ms.fly.dev/health
```

---

## File Structure Reference

```
lib/
├── api.ts                    # ✅ Main auth API client
├── appService.ts             # ✅ create-app-ms wrapper (538 lines)
├── productService.ts         # ✅ product-ms wrapper
├── product-api.ts            # ✅ product utilities
├── walletService.ts          # ✅ wallet-ms wrapper (600 lines)
├── paymentService.ts         # ✅ payment-ms wrapper (673 lines)
├── kycService.ts             # ✅ compliance-ms wrapper (135 lines)
├── api/
│   └── billing-client.ts     # ✅ billing-ms client
└── services/
    └── billing-service.ts    # ✅ billing-ms service (149 lines)

server/
├── service-auth-ms/          # ✅ Authentication
├── client-auth-ms/           # ✅ Client auth
├── create-app-ms/            # ✅ App management
├── product-ms/               # ✅ Product management
├── wallet-ms/                # ✅ Wallet management
├── compliance-ms/            # ✅ KYC/Compliance
├── payment-ms/               # ✅ Payment processing
└── billing-ms/               # ✅ Billing & invoicing
```
