# System Architecture Analysis

**Last Updated:** February 10, 2026

This document provides a comprehensive analysis of the SpringTD system architecture, clarifying the role of each component and their integrations.

---

## System Overview

The SpringTD platform consists of **three main frontend applications** and **8 backend microservices**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SPRINGTD PLATFORM                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐  │
│  │   SPRING APP     │  │     PLATTER      │  │    USER APP V1 / V2      │  │
│  │ Merchant Portal  │  │  Product Builder │  │    Mobile Consumer       │  │
│  │   /app/spring/   │  │  /app/dashboard/ │  │  /app/mobile[-v2]/       │  │
│  └────────┬─────────┘  └────────┬─────────┘  └────────────┬─────────────┘  │
│           │                      │                         │                 │
│           └──────────────────────┼─────────────────────────┘                 │
│                                  ▼                                           │
│                        ┌─────────────────┐                                   │
│                        │   /app/api/     │                                   │
│                        │  (Next.js API)  │                                   │
│                        └────────┬────────┘                                   │
│                                 ▼                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                         BACKEND MICROSERVICES                                │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │service-auth  │ │client-auth   │ │create-app-ms │ │ product-ms   │       │
│  │     -ms      │ │    -ms       │ │              │ │              │       │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘       │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │  wallet-ms   │ │compliance-ms │ │  payment-ms  │ │  billing-ms  │       │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Spring App (Merchant Dashboard)

**Location:** `/app/spring/`

**Purpose:** Onboarding portal for merchants to register and set up their business on the platform.

### Features

| Feature | Location | Description |
|---------|----------|-------------|
| Onboarding Flow | `/app/spring/onboarding/` | 7-step merchant onboarding wizard |
| Sign In | `/app/spring/signin/` | Merchant authentication |
| Sign Up | `/app/spring/signup/` | New merchant registration |
| Email Verification | `/app/spring/verify-email/` | Email verification for new accounts |

### Onboarding Steps (7 steps)

1. **Intent** - Business intent/type selection
2. **Survey** - Business survey/questionnaire  
3. **Profile** - Business profile setup
4. **Documents** - Document upload (KYC)
5. **Agreement** - Terms acceptance
6. **Continue Agreement** - Additional agreements
7. **Success** - Completion redirect to `/dashboard/merchant`

### Current State

- ✅ Onboarding flow implemented
- ✅ Authentication pages exist
- ✅ Redirects to Platter (`/dashboard/merchant`) after completion
- ⚠️ Spring App is primarily for **initial setup** - most merchant work happens in Platter

### API Integration

- Uses `service-auth-ms` for merchant authentication
- Integrates with `compliance-ms` for KYC during onboarding

---

## 2. Platter (Product Builder / Merchant Operations)

**Location:** `/app/dashboard/`

**Purpose:** The main operational hub where merchants:
- Create and manage applications (apps)
- Build and configure products (Loans, Savings, Mortgages, Commodities)
- Manage customers and applications
- Configure mobile app appearance

### Key Areas

#### 2.1 Create-App Module (`/app/dashboard/create-app/`)

| Path | Purpose |
|------|---------|
| `/all-apps/` | List all merchant applications |
| `/new-apps/` | Create new applications |
| `/products/` | Create products (Loan, Mortgage, Savings, Commodity) |
| `/drive/` | Document management |
| `/wallet/` | Wallet management |
| `/transactions/` | Transaction history |

#### 2.2 Merchant Module (`/app/dashboard/merchant/`)

| Path | Purpose |
|------|---------|
| `/page.tsx` | Main merchant dashboard (list of apps) |
| `/app-builder/` | Visual app builder with tabs: Template, Asset, Splash, Onboarding, Profile, Policy, Support, DNS, Publish |
| `/products/active/` | View activated products |
| `/products/all/` | All products list |
| `/customer/` | Customer management |
| `/applications/` | Product application management |
| `/transactions/` | Transaction history |
| `/wallets/` | Merchant wallets |
| `/developer/` | Developer settings / API keys |
| `/compliance/` | Compliance/KYC management |
| `/billing/` | Billing and subscriptions |

### Product Creation Flow

```
1. Select Product Type (Loan/Mortgage/Savings/Commodity)
          ↓
2. Fill Basic Info (Name, Description, App ID)
          ↓
3. Configure Product Settings (Interest rates, terms, etc.)
          ↓
4. Save to product-ms backend
          ↓
5. Product appears in Active Products
```

### App Builder Flow

The App Builder allows merchants to customize how their mobile app appears:

| Tab | Configuration |
|-----|---------------|
| Template | Select base template |
| Asset | Upload logo, splash image |
| Splash | Configure splash screen colors |
| Onboarding | Set onboarding screens (3 steps) |
| Profile | App colors and theming |
| Policy | Privacy policy, Terms of service |
| Support | Contact info, support links |
| DNS | Custom domain setup |
| Publish | Deploy changes |

### Current State

- ✅ App creation/management working
- ✅ Product creation (Loan, Mortgage, Savings, Commodity) implemented
- ✅ App Builder fully functional
- ✅ Customer management UI exists
- ✅ Application management UI exists
- ⚠️ Some sections use mock/fallback data when API unavailable

### API Integration

- `create-app-ms` - App CRUD, configuration storage
- `product-ms` - Product CRUD, product configurations
- `account-ms` - Customer and application management
- `wallet-ms` - Wallet operations
- `billing-ms` - Subscription and billing

---

## 3. User App V1 & V2 (Mobile Consumer Apps)

**Locations:** 
- V1: `/app/mobile/`
- V2: `/app/mobile-v2/`

**Purpose:** Consumer-facing mobile applications where end users can:
- Browse products (Loans, Mortgages, Savings, Commodities)
- View their accounts and transactions
- Apply for products
- Manage their profile

### V1 Mobile (`/app/mobile/`)

| Path | Purpose |
|------|---------|
| `/page.tsx` | Splash → Onboarding entry |
| `/home/` | Dashboard with wallet balance, quick actions |
| `/products/` | Product catalog (Commodity, Mortgage, Loan, Savings) |
| `/products/[id]/` | Product detail page |
| `/checkout/` | Purchase flow |
| `/loan/` | Loan application |
| `/mortgage/` | Mortgage application |
| `/savings/` | Savings products |
| `/profile/` | User profile |
| `/kyc/` | KYC verification |
| `/auth/` | Login/signup |

### V2 Mobile (`/app/mobile-v2/`)

| Path | Purpose |
|------|---------|
| `/page.tsx` | Animated splash → Onboarding |
| `/home/` | Enhanced dashboard with account details |
| `/products/` | Product categories |
| `/products/loan/` | Loan products |
| `/products/mortgage/` | Mortgage products |
| `/products/savings/` | Savings products (Flex Naira, Target Savings) |
| `/products/commodity/` | Commodity products |
| `/products/invest/` | Investment products |
| `/accounts/` | Account management |
| `/transactions/` | Transaction history |
| `/profile/` | User profile |
| `/auth/` | Authentication |

### Configuration System

Mobile apps fetch configuration dynamically based on `appId`:

```typescript
// URL format: /mobile?appId=xxx or /mobile-v2?appId=xxx

const { config, loading } = useMobileConfig({ appId });
// Fetches from: /api/apps/[appId]/configuration/public
```

Configuration includes:
- App name and branding
- Splash screen (logo, colors)
- Onboarding steps (titles, descriptions, images)
- Theme colors (primary, secondary, buttons)
- Font settings

### Current State: Real vs Mock Data

| Feature | V1 Status | V2 Status |
|---------|-----------|-----------|
| Splash/Onboarding | 🟢 Dynamic (from config) | 🟢 Dynamic (from config) |
| Home Dashboard | 🟡 Mock balance data | 🟡 Mock balance data |
| Product Listings | 🔴 **Hardcoded mock** | 🔴 **Hardcoded mock** |
| Product Details | 🔴 **Static mock** | 🔴 **Static mock** |
| Transactions | 🔴 **Mock data** | 🔴 **Mock data** |
| User Profile | 🟡 Partially dynamic | 🟡 Partially dynamic |

### API Integration

- `client-auth-ms` - End user authentication
- `useMobileConfig` hook → `/api/apps/[id]/configuration/public`
- No direct product-ms integration yet (products are hardcoded)

---

## 4. How Systems Connect

### Data Flow: Merchant → Product → User

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          DATA FLOW DIAGRAM                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   MERCHANT (Platter)                                                     │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ 1. Creates App → create-app-ms                                   │   │
│   │ 2. Configures App (branding, onboarding) → create-app-ms         │   │
│   │ 3. Creates Products (Loan/Savings/etc) → product-ms              │   │
│   │ 4. Publishes App                                                 │   │
│   └──────────────────────────────┬──────────────────────────────────┘   │
│                                  │                                       │
│                                  ▼                                       │
│   ┌──────────────────────────────────────────────────────────────────┐  │
│   │                        BACKEND SERVICES                           │  │
│   │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐          │  │
│   │  │create-app-ms│───▶│ product-ms  │───▶│ account-ms  │          │  │
│   │  │ (App config)│    │ (Products)  │    │(Applications)│          │  │
│   │  └─────────────┘    └─────────────┘    └─────────────┘          │  │
│   └──────────────────────────────┬──────────────────────────────────┘  │
│                                  │                                       │
│                                  ▼                                       │
│   END USER (Mobile V1/V2)                                               │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ 1. Loads app config (branding/colors) ← /api/apps/[id]/config   │   │
│   │ 2. Views products (⚠️ CURRENTLY HARDCODED)                       │   │
│   │ 3. Applies for products → account-ms                             │   │
│   │ 4. Manages account → account-ms / wallet-ms                      │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Relationships

| Relationship | Link Mechanism |
|--------------|----------------|
| Merchant → App | `merchantId` in JWT token → Apps belong to merchant |
| App → Products | `appId` stored in product record |
| Products → User App | `appId` query param in mobile URL loads app config |
| User → Applications | `userId` + `productId` + `merchantId` in application |

### API Endpoints Summary

| API Route | Backend Service | Purpose |
|-----------|-----------------|---------|
| `/api/apps` | create-app-ms | App CRUD |
| `/api/apps/[id]/configuration` | create-app-ms | App config (branding) |
| `/api/apps/[id]/configuration/public` | create-app-ms | Public config for mobile |
| `/api/products` | product-ms | Product CRUD |
| `/api/products?appId=xxx` | product-ms | Products by app |
| `/api/auth/*` | service-auth-ms | Merchant auth |
| (client-side) | client-auth-ms | End user auth |

---

## 5. Current Integration Gaps

### Critical Issues

1. **Mobile Apps Don't Fetch Real Products**
   - Products in `/app/mobile/products/` are hardcoded
   - Need to integrate with `product-ms` via `/api/products?appId=xxx`

2. **No App-Specific Product Filtering**
   - Mobile apps should only show products for their `appId`
   - Currently showing generic product listings

3. **Product Apply Flow Incomplete**
   - Product detail pages exist but don't connect to application creation
   - Need integration with `account-ms` for applications

### What's Working

✅ Merchant onboarding (Spring App)  
✅ App creation and configuration (Platter)  
✅ Product creation in backend (Platter → product-ms)  
✅ App configuration fetch for mobile styling  
✅ Basic mobile UI shells  

### What Needs Work

❌ Dynamic product listing in mobile apps  
❌ Product application submission  
❌ Real transaction data display  
❌ Account balance integration  
❌ Complete checkout flow  

---

## 6. Microservices Reference

| Service | URL | Purpose |
|---------|-----|---------|
| `service-auth-ms` | https://service-auth-ms.fly.dev | Merchant authentication |
| `client-auth-ms` | https://client-auth-ms.fly.dev | End user authentication |
| `create-app-ms` | https://create-app-ms.fly.dev | App management & configuration |
| `product-ms` | https://product-ms.fly.dev | Product management |
| `account-ms` | https://account-ms.fly.dev | Account/application management |
| `wallet-ms` | https://wallet-ms.fly.dev | Wallet operations |
| `compliance-ms` | https://compliance-ms.fly.dev | KYC/compliance |
| `payment-ms` | https://payment-ms.fly.dev | Payment processing |
| `billing-ms` | https://billing-ms.fly.dev | Billing & subscriptions |

---

## 7. Recommended Next Steps

### Priority 1: Connect Mobile Apps to Real Products

```typescript
// In mobile products page:
const { products, loading } = useProducts({ appId });
// Should fetch from /api/products?appId=xxx
```

### Priority 2: Implement Product Application Flow

```typescript
// User clicks "Apply" on product:
await accountService.applications.create({
  userId: currentUser.id,
  productId: product.id,
  merchantId: appConfig.merchantId,
  applicationType: product.type,
  applicationData: formData
});
```

### Priority 3: Real-Time Data Integration

- Connect wallet balance to `wallet-ms`
- Connect transaction history to actual transactions
- Implement WebSocket for real-time updates

---

## Summary Table

| System | Location | Role | Users | Status |
|--------|----------|------|-------|--------|
| **Spring App** | `/app/spring/` | Merchant Onboarding | Merchants | ✅ Working |
| **Platter** | `/app/dashboard/` | Product Builder & Operations | Merchants | ✅ Working |
| **User App V1** | `/app/mobile/` | Consumer Mobile App | End Users | 🟡 Partial (mock products) |
| **User App V2** | `/app/mobile-v2/` | Consumer Mobile App (New) | End Users | 🟡 Partial (mock products) |
