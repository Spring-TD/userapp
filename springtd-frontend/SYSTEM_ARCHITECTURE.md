# System Architecture & Integration Status

> **Last Updated:** February 11, 2026

---

## Table of Contents

1. [System Overview](#system-overview)
2. [The Three Applications](#the-three-applications)
3. [Backend Microservices](#backend-microservices)
4. [Data Flow Architecture](#data-flow-architecture)
5. [API Endpoints](#api-endpoints)
6. [Implementation Status](#implementation-status)
7. [Priority Listing](#priority-listing)

---

## System Overview

The platform consists of three main frontend applications and multiple backend microservices that work together to enable merchants to create and manage financial products, and end users to consume them.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND LAYER                                  │
├─────────────────────┬─────────────────────┬─────────────────────────────────┤
│       PLATTER       │     SPRING APP      │         USER APP V1/V2          │
│   Product Builder   │  Merchant Dashboard │      End User Mobile App        │
│  /dashboard/create- │  /dashboard/        │     /mobile/ & /mobile-v2/      │
│  app/               │  merchant/          │                                 │
└─────────┬───────────┴─────────┬───────────┴─────────────────┬───────────────┘
          │                     │                             │
          ▼                     ▼                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API LAYER                                       │
│                         /api/* (Next.js Routes)                             │
└─────────┬───────────────────────┬───────────────────────────┬───────────────┘
          │                       │                           │
          ▼                       ▼                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MICROSERVICES LAYER                                 │
├──────────────┬──────────────┬──────────────┬──────────────┬─────────────────┤
│  product-ms  │ create-app-ms│ service-auth │  account-ms  │    wallet-ms    │
│  (Products)  │    (Apps)    │   (Auth)     │  (Accounts)  │    (Wallets)    │
└──────────────┴──────────────┴──────────────┴──────────────┴─────────────────┘
          │                       │
          ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            STORAGE LAYER                                     │
│                    JSON Files on Fly.dev Volumes                            │
│              (products.json, configurations.json, apps.json)                │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## The Three Applications

### 1. PLATTER - Product Builder

**Location:** `/app/dashboard/create-app/`

**Purpose:** Create and configure products for merchant apps

**Features:**
| Feature | Route | Description |
|---------|-------|-------------|
| All Apps | `/create-app/all-apps/` | View all created apps |
| New Apps | `/create-app/new-apps/` | Create new app |
| Products | `/create-app/products/` | Create products (Loan, Mortgage, Savings, Commodity) |
| Drive | `/create-app/drive/` | Document management |
| Transactions | `/create-app/transactions/` | View transactions |
| Wallet | `/create-app/wallet/` | Wallet management |
| Scam Alert | `/create-app/scam-alert/` | Fraud detection |

**App Builder** (located in `/create-app/[id]/app-builder/`):
- Template selection
- Asset management (logo, splash)
- Onboarding screens
- App Profile (colors, fonts)
- Policy & Terms
- Support configuration
- DNS settings
- Publish/Version control

**Product Creation Flow:**
```
Create Product → Select Type (Loan/Mortgage/Savings/Commodity)
      ↓
Type-specific Drawer (name, description)
      ↓
Configuration Drawer (rates, terms, amounts)
      ↓
API Call to product-ms
      ↓
Product Stored
```

---

### 2. SPRING APP - Merchant Dashboard

**Location:** `/app/dashboard/merchant/`

**Purpose:** Merchants manage their products, customers, and business operations

**Features:**
| Feature | Route | Description |
|---------|-------|-------------|
| Overview | `/merchant/` | Dashboard home |
| Products | `/merchant/products/` | View & toggle products |
| Customers | `/merchant/customer/` | Customer management |
| Applications | `/merchant/applications/` | User applications |
| Transactions | `/merchant/transactions/` | Transaction history |
| Wallets | `/merchant/wallets/` | Wallet management |
| Billing | `/merchant/billing/` | Billing & invoices |
| App Builder | `/merchant/app-builder/` | Configure app |
| Settings | `/merchant/settings/` | Account settings |
| Admin | `/merchant/admin/` | Team management |
| Compliance | `/merchant/compliance/` | Compliance docs |
| Developer | `/merchant/developer/` | API keys, webhooks |

**Product Management:**
```
/merchant/products/all/
├── loan/       → View loan products with ON/OFF toggle
├── mortgage/   → View mortgage products with ON/OFF toggle
├── savings/    → View savings products with ON/OFF toggle
├── commodity/  → View commodity products with ON/OFF toggle
└── investment/ → View investment products with ON/OFF toggle

/merchant/products/active/
└── Shows only products that are toggled ON
```

**Toggle Visibility Flow (INTENDED):**
```
Merchant views products → Toggles product ON/OFF
           ↓
API updates product.isActive in product-ms
           ↓
User App only shows products where isActive=true
```

---

### 3. USER APP V1 & V2 - End User Mobile

**Location:** `/app/mobile/` (V1) and `/app/mobile-v2/` (V2)

**Purpose:** End users browse products, apply for loans, save money, buy commodities

**Features:**
| Feature | Route | Description |
|---------|-------|-------------|
| Home | `/mobile(-v2)/home/` | Dashboard with wallet balance |
| Products | `/mobile(-v2)/products/` | Browse all product types |
| Loan | `/mobile(-v2)/products/loan/` | Loan products |
| Mortgage | `/mobile(-v2)/products/mortgage/` | Mortgage listings |
| Savings | `/mobile(-v2)/products/savings/` | Savings options |
| Commodity | `/mobile(-v2)/products/commodity/` | Commodities |
| Profile | `/mobile(-v2)/profile/` | User profile |
| KYC | `/mobile(-v2)/kyc/` | Identity verification |
| Checkout | `/mobile(-v2)/checkout/` | Payment processing |

**App Identification:**
- Mobile app receives `appId` via URL parameter: `?appId=xxx`
- Uses `useMobileConfig({ appId })` hook to fetch app branding
- Should use appId to fetch products for that specific merchant

---

## Backend Microservices

### 1. product-ms

**URL:** `https://product-ms.fly.dev`

**Purpose:** Product CRUD and configuration management

**Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/products` | Create product |
| GET | `/api/v1/products/:id` | Get product by ID |
| PUT | `/api/v1/products/:id` | Update product |
| DELETE | `/api/v1/products/:id` | Delete product |
| GET | `/api/v1/apps/:appId/products` | Get products by app |
| POST | `/api/v1/products/select-type` | Select product type |
| POST | `/api/v1/configurations` | Create configuration |
| GET | `/api/v1/configurations/:id` | Get configuration |
| PUT | `/api/v1/configurations/:id` | Update configuration |

**Data Models:**
```typescript
interface Product {
  id: string;
  referenceNumber: string;
  name: string;
  description: string;
  type: "Loan" | "Mortgage" | "Savings" | "Commodity";
  appId: string;
  status: "complete" | "incomplete";
  isActive?: boolean;  // For visibility toggle
  createdAt: string;
  updatedAt: string;
}

interface ProductConfiguration {
  productId: string;
  type: string;
  // Type-specific fields (rates, terms, amounts, etc.)
}
```

---

### 2. create-app-ms

**URL:** `https://create-app-ms.fly.dev`

**Purpose:** App management, configuration, and special API access

**Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/apps` | Create app |
| GET | `/api/v1/apps` | List all apps |
| GET | `/api/v1/apps/:id` | Get app by ID |
| PUT | `/api/v1/apps/:id` | Update app |
| DELETE | `/api/v1/apps/:id` | Delete app |
| POST | `/api/v1/apps/:id/products` | Add product to app |
| GET | `/api/v1/apps/:id/transactions` | Get app transactions |
| POST/GET | `/api/v1/configuration/*` | App configuration |

**Special API (requires API key):**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/special/products` | Get all products |
| GET | `/api/v1/special/products/:id` | Get product by ID |
| GET | `/api/v1/special/subscriptions` | Get user subscriptions |
| POST | `/api/v1/special/products/:id/apply` | Apply to product |

---

### 3. service-auth-ms

**URL:** `https://service-auth-ms.fly.dev`

**Purpose:** Authentication and authorization

**Features:** Login, signup, password reset, email verification, OTP

---

### 4. account-ms (Planned)

**Purpose:** User account management, KYC, subscriptions

---

### 5. wallet-ms (Planned)

**Purpose:** Wallet management, balances, transactions

---

## Data Flow Architecture

### Product Creation Flow (Platter → product-ms)

```
┌──────────────────────────────────────────────────────────────────┐
│ PLATTER: /dashboard/create-app/products/                         │
│                                                                  │
│ 1. Click "Create Product"                                        │
│ 2. Select type (Loan/Mortgage/Savings/Commodity)                │
│ 3. Fill product details (name, description)                     │
│ 4. Configure settings (rates, terms, amounts)                   │
│ 5. Submit                                                        │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ API CALLS:                                                       │
│                                                                  │
│ POST /api/products                                               │
│   → productApi.createProduct({ name, type, appId })             │
│   → product-ms creates product record                           │
│                                                                  │
│ POST /api/products/[id]/configuration                            │
│   → productApi.saveProductConfiguration(productId, config)      │
│   → product-ms saves configuration                              │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ product-ms:                                                      │
│                                                                  │
│ products.json: [                                                 │
│   {                                                              │
│     id: "prod_123",                                              │
│     name: "Quick Loan",                                          │
│     type: "Loan",                                                │
│     appId: "app_456",                                            │
│     status: "complete",                                          │
│     isActive: true                                               │
│   }                                                              │
│ ]                                                                │
└──────────────────────────────────────────────────────────────────┘
```

### Product Visibility Flow (Spring App → product-ms → User App)

```
┌──────────────────────────────────────────────────────────────────┐
│ SPRING APP: /dashboard/merchant/products/all/loan/               │
│                                                                  │
│ 1. Fetch products from product-ms (by appId)                    │
│ 2. Display products with toggle switch                          │
│ 3. Merchant toggles product ON/OFF                              │
│ 4. API updates product.isActive                                 │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ product-ms:                                                      │
│                                                                  │
│ PUT /api/v1/products/:id                                         │
│   { isActive: true/false }                                       │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ USER APP: /mobile-v2/products/loan/                              │
│                                                                  │
│ 1. Fetch products: GET /api/mobile/[appId]/products?type=loan  │
│ 2. API returns only products where isActive=true                │
│ 3. Display real products to users                               │
└──────────────────────────────────────────────────────────────────┘
```

### App Configuration Flow (App Builder → create-app-ms → User App)

```
┌──────────────────────────────────────────────────────────────────┐
│ PLATTER/SPRING: App Builder                                      │
│                                                                  │
│ 1. Configure branding (logo, colors, fonts)                     │
│ 2. Set up onboarding screens                                    │
│ 3. Configure policies and support                               │
│ 4. Publish configuration                                        │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ create-app-ms:                                                   │
│                                                                  │
│ POST /api/v1/configuration/app-elements                         │
│ POST /api/v1/configuration/onboarding                           │
│ POST /api/v1/configuration/app-profile                          │
│ POST /api/v1/configuration/publish                              │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ USER APP: useMobileConfig({ appId })                             │
│                                                                  │
│ 1. Fetch config: GET /api/apps/[appId]/configuration/public     │
│ 2. Apply branding (splash screen, colors, fonts)                │
│ 3. Show customized onboarding                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Next.js API Routes (Proxy Layer)

| Route | Proxies To | Status |
|-------|------------|--------|
| `/api/products` | product-ms | ✅ Working |
| `/api/products/[id]` | product-ms | ✅ Working |
| `/api/products/[id]/configuration` | product-ms | ✅ Working |
| `/api/apps/[id]` | create-app-ms | ✅ Working |
| `/api/apps/[id]/configuration/*` | create-app-ms | ✅ Working |
| `/api/apps/[id]/products` | product-ms | ✅ Working |
| `/api/products/active` | product-ms | ✅ NEW - Active products for mobile |

### Frontend Service Layers

| File | Purpose | Status |
|------|---------|--------|
| `lib/product-api.ts` | Basic product CRUD + toggle | ✅ Working (Updated) |
| `lib/productService.ts` | Extended product ops | ✅ Working |
| `lib/appService.ts` | App management | ✅ Working |
| `lib/specialApi.ts` | Cross-merchant access | ✅ Working |
| `hooks/useMobileConfig.ts` | Mobile app config | ✅ Working |
| `hooks/useMobileProducts.ts` | Mobile products | ✅ NEW - Created |

---

## Implementation Status

### ✅ COMPLETE

| Feature | Location | Notes |
|---------|----------|-------|
| Merchant Onboarding | `/app/spring/` | 7-step wizard, auth, KYC |
| Product Creation UI | `/app/dashboard/create-app/products/` | All 4 types with config |
| Product API (CRUD) | product-ms | Create, read, update, delete |
| App Creation | create-app-ms | Full app lifecycle |
| App Builder UI | `/components/app-builder/` | All tabs implemented |
| App Builder Context | `contexts/AppBuilderContext.tsx` | Global state management |
| App Config API | create-app-ms | All configuration endpoints |
| Mobile Config Hook | `hooks/useMobileConfig.ts` | Fetches app branding |
| Mobile V1 UI | `/app/mobile/` | All pages/layouts |
| Mobile V2 UI | `/app/mobile-v2/` | All pages/layouts |
| Authentication | service-auth-ms | Login, signup, verify |
| Publish/Version Control | App Builder Publish Tab | Create/restore versions |
| DNS Configuration UI | App Builder DNS Tab | Add domain, verification |
| **Product isActive Field** | product-ms | ✅ **NEW** - Added to model, validation, service |
| **Product Toggle Persistence** | components/product-cards.tsx | ✅ **NEW** - Toggle calls API to persist |
| **Active Products API** | product-ms `/api/products/active` | ✅ **NEW** - Returns only active+complete products |
| **Mobile Products Hook** | hooks/useMobileProducts.ts | ✅ **NEW** - Fetches real products for mobile |
| **Mobile Products Page** | /app/mobile/products/ | ✅ **NEW** - Uses real data with fallback |

### ⚠️ INCOMPLETE (Partially Done)

| Feature | Location | What's Missing |
|---------|----------|----------------|
| App Builder Save | Various tabs | Some tabs don't auto-save to backend |
| Product Cards in Spring | `components/product-cards.tsx` | Fetches from API but needs appId context |

### ❌ NOT DONE

| Feature | Location | Description |
|---------|----------|-------------|
| Mobile Products API | `/api/mobile/[appId]/products/` | API route to get products by specific appId |
| Mobile V2 Products Integration | `/app/mobile-v2/products/` | V2 still uses hardcoded data |
| Mobile Home Products | `/app/mobile-v2/home/` | Home page shows mock products |
| Product Subscription API | account-ms | Users subscribing to products |
| Product Application Flow | Mobile → Backend | Apply for loan/mortgage |
| Wallet Integration | wallet-ms | Real wallet balances |
| Transaction History | Mobile | Real transaction data |
| Push Notifications | - | Product updates to users |
| Analytics Dashboard | Merchant | Product performance metrics |

---

## Priority Listing

### 🔴 P0 - Critical (Do First)

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 1 | **Create `useMobileProducts` hook** | 2h | Enables all mobile product integration |
| 2 | **Create `/api/mobile/[appId]/products` API route** | 2h | Backend for mobile products |
| 3 | **Fix Spring product-cards.tsx to fetch real data** | 3h | Merchants see real products |
| 4 | **Add isActive field to product model in product-ms** | 1h | Enable product toggle |
| 5 | **Connect toggle switch to API** | 2h | Toggle persists to backend |

### 🟠 P1 - High Priority (Do Second)

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 6 | Integrate Loan tab with real products | 3h | Users see real loans |
| 7 | Integrate Mortgage tab with real products | 3h | Users see real mortgages |
| 8 | Integrate Savings tab with real products | 3h | Users see real savings |
| 9 | Integrate Commodity tab with real products | 3h | Users see real commodities |
| 10 | Update Mobile Home to show real products | 2h | Home dashboard functional |

### 🟡 P2 - Medium Priority (Do Third)

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 11 | Product application/subscription flow | 8h | Users can apply for products |
| 12 | Wallet balance integration | 4h | Real wallet data |
| 13 | Transaction history integration | 4h | Real transaction data |
| 14 | Product detail pages with real data | 4h | Detailed product views |
| 15 | Survey/eligibility check integration | 3h | Eligibility workflows |

### 🟢 P3 - Lower Priority (Do Later)

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 16 | Analytics dashboard for merchants | 8h | Business insights |
| 17 | Push notifications | 6h | User engagement |
| 18 | Product search/filtering | 4h | Better UX |
| 19 | Product recommendations | 6h | Personalization |
| 20 | Real-time DNS verification | 4h | Custom domain validation |

---

## Estimated Timeline

| Phase | Tasks | Duration |
|-------|-------|----------|
| **Phase 1** | P0 tasks (1-5) | 2-3 days |
| **Phase 2** | P1 tasks (6-10) | 3-4 days |
| **Phase 3** | P2 tasks (11-15) | 5-7 days |
| **Phase 4** | P3 tasks (16-20) | 5-7 days |

**Total Estimated Time:** 3-4 weeks for full integration

---

## Quick Start Commands

```bash
# Run development server
pnpm dev

# Check product-ms health
curl https://product-ms.fly.dev/health

# Check create-app-ms health
curl https://create-app-ms.fly.dev/health

# Test product API
curl http://localhost:3000/api/products
```

---

## Environment Variables Required

```env
NEXT_PUBLIC_PRODUCT_SERVICE_URL=https://product-ms.fly.dev
NEXT_PUBLIC_CREATE_APP_SERVICE_URL=https://create-app-ms.fly.dev
NEXT_PUBLIC_AUTH_SERVICE_URL=https://service-auth-ms.fly.dev
NEXT_PUBLIC_SPECIAL_API_KEY=<your-api-key>
```

---

## Files to Modify for Integration

### Priority Files:

1. **`/hooks/useMobileProducts.ts`** - CREATE NEW
2. **`/app/api/mobile/[appId]/products/route.ts`** - CREATE NEW
3. **`/components/product-cards.tsx`** - MODIFY (fetch real data)
4. **`/server/product-ms/src/types/product.ts`** - MODIFY (add isActive)
5. **`/app/mobile-v2/products/loan/page.tsx`** - MODIFY (use hook)
6. **`/app/mobile-v2/products/mortgage/page.tsx`** - MODIFY (use hook)
7. **`/app/mobile-v2/products/savings/page.tsx`** - MODIFY (use hook)
8. **`/app/mobile-v2/products/commodity/page.tsx`** - MODIFY (use hook)

---

*This document should be updated as implementation progresses.*
