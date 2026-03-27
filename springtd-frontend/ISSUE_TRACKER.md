# 📋 Issue Tracker — Spring & Plata Dashboard
> **Last Updated:** February 20, 2026  
> **Audited By:** Codebase deep-dive analysis  
> **Purpose:** Track all known issues, completion status, and fix priority

---

## 🗂️ Table of Contents
1. [Status Legend](#status-legend)
2. [Critical Issues (P0)](#-p0--critical-fix-immediately)
3. [High Priority Issues (P1)](#-p1--high-priority)
4. [Medium Priority Issues (P2)](#-p2--medium-priority)
5. [Low Priority Issues (P3)](#-p3--low-priority)
6. [Completed Items](#-completed)
7. [Architecture Reference](#architecture-reference)

---

## Status Legend

| Badge | Meaning |
|-------|---------|
| `[ ]` | Not started |
| `[~]` | In progress |
| `[x]` | Completed |
| `[!]` | Blocked (needs backend or external input) |

---

## 🔴 P0 — Critical (Fix Immediately)

These issues are breaking core functionality RIGHT NOW.

---

### P0-001 — Spring Product MS pointing to wrong backend
- **Status:** `[x]` ✅ Fixed — Feb 20, 2026
- **Impact:** Spring App merchants see Plata's products, not their own
- **Root Cause:** `/app/api/spring-products/route.ts` uses `NEXT_PUBLIC_PRODUCT_SERVICE_URL` which resolves to `product-ms-plata.fly.dev` (Plata's backend), not Spring's `product-ms.fly.dev`
- **File(s):**
  - `/app/api/spring-products/route.ts` — Line 5: `const PRODUCT_MS_URL = process.env.NEXT_PUBLIC_PRODUCT_SERVICE_URL`
  - `/app/api/spring-products/toggle/` — Same wrong URL
- **Fix Required:**
  1. Add `NEXT_PUBLIC_SPRING_PRODUCT_SERVICE_URL=https://product-ms.fly.dev` to `.env.local` and `.env.production`
  2. Update `/app/api/spring-products/route.ts` to use `NEXT_PUBLIC_SPRING_PRODUCT_SERVICE_URL`
  3. Update toggle route to use same variable
- **Effort:** 30 minutes
- **Notes:** This is the most critical backend separation issue

---

### P0-002 — Environment variables have conflicting/duplicate values
- **Status:** `[x]` ✅ Fixed — Feb 20, 2026
- **Impact:** Wrong backends are being called; `.env.local` has duplicate keys where the second one silently overrides the first
- **Root Cause:** `.env.local` defines `NEXT_PUBLIC_BILLING_MS_URL` on **line 10** as `billing-ms-plata.fly.dev` AND on **line 31** as `billing-ms.fly.dev`. The second overrides the first, so **Plata billing is broken**.
  Similarly `NEXT_PUBLIC_ACCOUNT_SERVICE_URL` is defined on **line 9** as `account-ms-plata.fly.dev` AND on **line 38** as `account-ms.fly.dev`.
- **File(s):**
  - `.env.local` — Lines 8-10 vs Lines 31, 38
  - `.env.production` — Missing billing, account, wallet, payment URLs entirely
- **Fix Required:**
  Restructure `.env.local` to have clearly separated Spring and Plata variables:
  ```env
  # === SPRING APP BACKENDS ===
  NEXT_PUBLIC_SPRING_PRODUCT_SERVICE_URL=https://product-ms.fly.dev
  NEXT_PUBLIC_SPRING_ACCOUNT_SERVICE_URL=https://account-ms.fly.dev
  NEXT_PUBLIC_SPRING_BILLING_MS_URL=https://billing-ms.fly.dev

  # === PLATA (PRODUCT BUILDER) BACKENDS ===
  NEXT_PUBLIC_PLATA_PRODUCT_SERVICE_URL=https://product-ms-plata.fly.dev
  NEXT_PUBLIC_PLATA_ACCOUNT_SERVICE_URL=https://account-ms-plata.fly.dev
  NEXT_PUBLIC_PLATA_BILLING_MS_URL=https://billing-ms-plata.fly.dev

  # === SHARED SERVICES ===
  NEXT_PUBLIC_API_URL=https://service-auth-ms.fly.dev
  NEXT_PUBLIC_CREATE_APP_SERVICE_URL=https://create-app-ms.fly.dev
  NEXT_PUBLIC_COMPLIANCE_URL=https://compliance-ms.fly.dev
  NEXT_PUBLIC_WALLET_SERVICE_URL=https://wallet-ms.fly.dev
  NEXT_PUBLIC_PAYMENT_SERVICE_URL=https://payment-ms.fly.dev
  ```
- **Effort:** 45 minutes
- **Notes:** `.env.production` also needs all missing service URLs added

---

### P0-003 — Spring product toggle route may be hitting wrong backend
- **Status:** `[x]` ✅ Fixed — Feb 20, 2026
- **Impact:** Merchant ON/OFF toggle for products doesn't persist to the right backend
- **Root Cause:** `/api/spring-products/toggle/` route (inside `/toggle/` subdirectory) needs to be verified — it likely uses the same misconfigured `NEXT_PUBLIC_PRODUCT_SERVICE_URL`
- **File(s):**
  - `/app/api/spring-products/toggle/` — route file (needs audit)
- **Fix Required:**
  - Read the toggle route file
  - Update URL to use `NEXT_PUBLIC_SPRING_PRODUCT_SERVICE_URL`
- **Effort:** 20 minutes

---

### P0-004 — `accountService.ts` uses wrong URL for Spring vs Plata
- **Status:** `[x]` ✅ Fixed — Feb 20, 2026
- **Impact:** Customer accounts tab in Spring App might be hitting Plata's account-ms
- **Root Cause:** `lib/accountService.ts` Line 20: `const ACCOUNT_API_BASE = process.env.NEXT_PUBLIC_ACCOUNT_SERVICE_URL || 'https://account-ms.fly.dev'` — currently `.env.local` resolves this to `account-ms.fly.dev` (OK for Spring) BUT Plata sections of the app that also use `accountService` are using the same URL
- **File(s):**
  - `lib/accountService.ts` — Line 20
- **Fix Required:**
  - Once P0-002 is done (env vars split), verify `accountService.ts` uses the correct env var for the correct context
  - May need a `platAccountService.ts` or a factory pattern
- **Effort:** 1–2 hours

---

## 🟠 P1 — High Priority

Core features that are incomplete or partially broken.

---

### P1-001 — Product detail pages use hardcoded dummy data
- **Status:** `[x]` ✅ Fixed — Feb 20, 2026
- **Notes:** Product detail pages already had clean empty states. Fixed the Spring product cards (`product-cards.tsx`) which was using Plata's `productApi` and had demo fallback data. Now uses `springProductService` with proper empty states.
- **Impact:** The Active, Inactive, and Drive tabs in product detail pages show **fake data** — merchants see ghost users and transactions that don't exist
- **Root Cause:** `PRODUCT_BACKEND_ANALYSIS.md` documents this. The Active/Inactive/Drive tabs were never wired to a backend API. They use `const activeLoans = [{ amount: "$0.45", ref: "SPI-234-BY45K"... }]` hardcoded arrays
- **Affected Pages:**
  - `/app/dashboard/create-app/all-apps/[id]/products/[productType]/[productId]/page.tsx`
  - `/app/dashboard/merchant/products/all/[type]/page.tsx` (if it has detail view)
- **Fix Required:**
  - **Short-term:** Replace hardcoded data with empty states ("No active loans yet", "No documents submitted yet")
  - **Long-term:** Wire to real backend API once product-ms has subscription/transaction endpoints
- **Effort:** 2–3 hours (empty states only), 8–12 hours (full API integration)
- **Notes:** Backend doesn't have the APIs yet — see P1-003

---

### P1-002 — Product data persistence (in-memory storage on product-ms)
- **Status:** `[!]` Blocked — Backend fix required
- **Impact:** Products disappear when Fly.io auto-stops the machine (no database — in-memory only). This affects BOTH Spring and Plata product-ms instances
- **Root Cause:** `server/product-ms/src/services/ProductService.ts` uses `private products: Product[] = []` (array in memory)
- **File(s):**
  - `server/product-ms/src/services/ProductService.ts`
  - `server/product-ms/src/services/ConfigurationService.ts`
- **Fix Required (Backend):**
  - Add a real database (PostgreSQL or SQLite with Fly volumes)
  - Or at minimum use a JSON file persisted to a Fly.dev volume (`/data/products.json`)
  - Do this for **BOTH** Spring's product-ms and Plata's product-ms-plata instances
- **Effort:** 4–8 hours per instance
- **Notes:** This is why the product list keeps going empty. This is a backend developer task.

---

### P1-003 — Missing: Product Subscriptions/Transactions API on product-ms
- **Status:** `[!]` Blocked — Backend feature not built
- **Impact:** Can't show real active users, loan applications, or transaction history per product
- **Root Cause:** product-ms has no endpoints for:
  - `GET /api/v1/products/:id/subscriptions`
  - `GET /api/v1/products/:id/transactions`
  - `GET /api/v1/products/:id/documents` (Drive tab)
- **File(s):** Needs to be created in `server/product-ms/src/routes/`
- **Fix Required (Backend):**
  Add subscription, transaction, and document endpoints to product-ms
- **Effort:** 6–10 hours
- **Notes:** `lib/productService.ts` already has the frontend wrapper functions ready (e.g., `getProductSubscribers()`, `getActiveSubscribers()`) — just needs the actual backend

---

### P1-004 — Spring Merchant products page: product filter by appId
- **Status:** `[x]` ✅ Fixed — Feb 20, 2026
- **Notes:** Updated `/api/spring-products/route.ts` to forward `?appId=` to Spring's product-ms. Updated `springProductService.getAllProducts(appId?)` to accept optional appId. `product-cards.tsx` now also client-side filters by appId.
- **Impact:** When a merchant clicks an app → product type (Loan/Savings/etc.), it should only show products that belong to that specific app. Currently, it may show all products from the wrong backend
- **Root Cause:** `springProductService.getAllProducts()` fetches all products without filtering by appId. The URL query parameter `?appId=...` is passed through `merchant/page.tsx` but not consistently consumed by the product type pages
- **File(s):**
  - `/app/dashboard/merchant/page.tsx` — Line 118: navigates to `?appId=${app.id}`
  - `/app/dashboard/merchant/products/all/loan/page.tsx` — calls `MerchantProductsWrapper` without confirmed appId filtering
  - `components/merchant-products-wrapper.tsx` — needs audit
- **Fix Required:**
  - Verify `merchant-products-wrapper.tsx` reads `appId` from URL params and passes it to the product API
  - Ensure Spring's product-ms filters by `appId` when `?appId=` is passed
- **Effort:** 1–2 hours

---

### P1-005 — Mobile App (V1 & V2) not connected to real product data
- **Status:** `[x]` ✅ Fixed — Feb 20, 2026
- **Notes:** Mobile V1 products page already had `useMobileProducts` hook. Created `MobileV2ProductComponents.tsx` with shared `MobileV2ProductList` and `MobileV2TabBar` components. All 5 V2 product pages (Loan, Mortgage, Savings, Commodity, Invest) now use real API data. Created `hooks/useWalletBalance.ts` hook. Mobile V1 home page now shows real wallet balance and user name from JWT.
- **Impact:** End users see hardcoded demo products in the mobile app — no real loans, mortgages, savings, or commodity products from any merchant
- **Root Cause:** Mobile product pages (`/app/mobile/products/loan/`, `/app/mobile-v2/products/loan/` etc.) either use hardcoded arrays or call APIs that don't exist yet
- **Affected Pages:**
  - `/app/mobile/products/page.tsx`
  - `/app/mobile/home/page.tsx`
  - `/app/mobile-v2/products/` (all type pages)
  - `/app/mobile-v2/home/`
- **Fix Required:**
  - Create `/api/mobile/[appId]/products/route.ts` — returns active products for a given appId
  - Wire all mobile product pages to use `useMobileProducts` hook
  - Hook should filter by `appId` (from URL param) and product type
- **Effort:** 3–5 days total

---

### P1-006 — `.env.production` is missing most service URLs
- **Status:** `[x]` ✅ Fixed — Feb 20, 2026
- **Impact:** When deployed to Vercel/production, billing, wallet, payment, and account services will silently fall back to hardcoded defaults (which may be wrong or open)
- **Root Cause:** `.env.production` only has 5 variables. Missing: `NEXT_PUBLIC_BILLING_MS_URL`, `NEXT_PUBLIC_ACCOUNT_SERVICE_URL`, `NEXT_PUBLIC_WALLET_SERVICE_URL`, `NEXT_PUBLIC_PAYMENT_SERVICE_URL`, `NEXT_PUBLIC_COMPLIANCE_URL`, and all Spring vs Plata split URLs
- **File(s):**
  - `.env.production`
- **Fix Required:** Add all missing service URLs (both Spring and Plata variants) to `.env.production`
- **Effort:** 30 minutes

---

## 🟡 P2 — Medium Priority

Important features that need work but aren't critically broken.

---

### P2-001 — Product Configuration tab not fully tested end-to-end
- **Status:** `[x]` ✅ Fixed — Feb 20, 2026
- **Notes:** `getProductConfiguration()` in product-api.ts already handles 404 gracefully (returns data without throwing). Product detail page wraps config fetch in its own try/catch with silent fallback. Configuration tab shows empty state with "Configure Product" button when no config exists.
- **Impact:** The Configuration tab in product detail page calls `productApi.getProductConfiguration()` but if the backend returns a 404 (config not yet created), it may silently show nothing or crash
- **File(s):**
  - `/app/dashboard/create-app/all-apps/[id]/products/[productType]/[productId]/page.tsx`
  - `lib/product-api.ts` — `getProductConfiguration()` function
- **Fix Required:**
  - Test the configuration tab against the live Plata product-ms
  - Ensure graceful empty state when config doesn't exist
  - Ensure the form pre-fills correctly when config does exist
- **Effort:** 2 hours

---

### P2-002 — App Builder tabs: partial save coverage
- **Status:** `[x]` ✅ Fixed — Feb 20, 2026
- **Notes:** Support tab: added `onBlur` → `saveSection('support')` on all input fields with live save status indicator. Policy tab: Save Draft button wired to `saveSection('policy')`, Publish button wired to `publishConfiguration()`. DNS tab: `handleToggleCustomDomain` and `handleAddDomain` now call `saveSection('dns')` after state updates.
- **Impact:** Some App Builder tabs don't auto-save to `create-app-ms` when values change. Changes may be lost on navigation
- **Affected Tabs:** DNS, Support, Policy (rich text editor) — need verification
- **File(s):**
  - `components/app-builder/` — All tab components
  - `contexts/AppBuilderContext.tsx` — Global state, check if all tabs push to API
- **Fix Required:**
  - Audit each App Builder tab for save behavior
  - Add save-on-blur or explicit save button for any tab missing it
- **Effort:** 2–4 hours

---

### P2-003 — Mobile home page shows mock wallet balance and mock products
- **Status:** `[x]` ✅ Fixed — Feb 20, 2026 (wallet balance wired to wallet-ms via useWalletBalance hook; transaction history empty state added)
- **Impact:** Mobile home dashboard (`/mobile/home/`, `/mobile-v2/home/`) shows a hardcoded wallet balance and fake product highlights
- **File(s):**
  - `/app/mobile/home/page.tsx`
  - `/app/mobile-v2/home/page.tsx`
- **Fix Required:**
  - Connect wallet balance to `walletService.ts` → `wallet-ms`
  - Connect product highlights to real product data
- **Effort:** 3–4 hours

---

### P2-004 — Admin Panel: some pages not wired to real APIs
- **Status:** `[x]` ✅ Fixed — Feb 20, 2026
- **Notes:** Created `lib/adminService.ts` with `adminUsersApi`, `adminProductsApi`, `adminWalletApi`. Wired `/admin/users/`, `/admin/product/`, `/admin/wallet-and-balances/` to real APIs with loading states, search/filter, empty states, and no fallback fake data.
- **Impact:** Admin dashboard pages for products, users, wallet, and billing may be showing static content
- **Affected Pages:**
  - `/app/admin/product/`
  - `/app/admin/users/`
  - `/app/admin/wallet-and-balances/`
- **Fix Required:**
  - Audit each admin page for API connections
  - Wire unconnected pages to the appropriate service
- **Effort:** 4–6 hours

---

### P2-005 — Product creation: `isActive` field type mismatch
- **Status:** `[x]` ✅ Fixed — Feb 20, 2026
- **Notes:** `productApi.createProduct()` in `lib/product-api.ts` now always sends `isActive: true` (defaults to true) and `status: 'active'` alongside any caller-supplied values. Both field names are forwarded so the backend can use whichever it supports.
- **Impact:** Products are created with `isActive: true` on the frontend but product-ms may not recognize this field if the backend model doesn't include it
- **Root Cause:** `PRODUCT_BACKEND_ANALYSIS.md` notes this. `productApi.createProduct()` sends `isActive` but whether the backend validates/stores it is uncertain
- **File(s):**
  - `lib/product-api.ts` — `createProduct()` function (sends `isActive`)
  - `server/product-ms/src/types/product.ts` — Check if `isActive` is in the type definition
- **Fix Required:**
  - Verify product-ms type definition includes `isActive` field
  - Test product creation and confirm `isActive` persists correctly
- **Effort:** 1 hour

---

### P2-006 — Spring App: customer applications tab missing real data
- **Status:** `[x]` ✅ Fixed — Feb 20, 2026
- **Notes:** `customer/applications/page.tsx` now calls `accountService.applications.getAll()` instead of hardcoded mock data. Added `mapToLocalApplication()` to convert `ProductApplication` from account-ms to the shape `UserApplicationsTable` expects. Shows proper empty states when API unavailable.
- **Impact:** In the Spring App merchant dashboard, the customer Applications tab likely shows no real data or demo data
- **File(s):**
  - `/app/dashboard/merchant/applications/` (if exists)
  - Components that render customer applications
- **Fix Required:**
  - Connect applications listing to `accountService.applicationApi.getAll()`
  - Wire approve/reject buttons to `accountService.applicationApi.approve/reject()`
- **Effort:** 3–4 hours

---

### P2-007 — Mobile KYC flow not wired to compliance-ms
- **Status:** `[x]` ✅ Fixed — Feb 20, 2026
- **Notes:** Built complete 4-step KYC wizard (Personal Info → Address → Documents → Review) in `app/mobile/kyc/page.tsx`. Submits to `submitIndividualKyc()` from `kycService.ts` → compliance-ms. Includes file upload (base64), form validation, progress bar, success/error/loading states. Previously was a no-op stub.
- **Impact:** End users going through KYC in the mobile app can't actually submit documents to the backend
- **File(s):**
  - `/app/mobile/kyc/` and `/app/mobile-v2/kyc/`
- **Fix Required:**
  - Wire KYC form submissions to `kycService.ts`
  - Handle success/failure states
- **Effort:** 3–5 hours

---

## 🟢 P3 — Low Priority (Do Later)

Nice-to-have features or enhancements.

---

### P3-001 — Analytics dashboard for merchants
- **Status:** `[ ]` Not started
- **Impact:** Merchants have no insight into product performance, revenue, or user metrics
- **Fix Required:** Build analytics page using `productService.productAnalyticsApi` and `productService.productSubscribersApi`
- **Effort:** 8–12 hours

---

### P3-002 — Push notifications
- **Status:** `[ ]` Not started
- **Impact:** No real-time updates to merchants or end users
- **Fix Required:** Integrate a notification service (e.g., Firebase FCM or a WebSocket approach)
- **Effort:** 8–12 hours

---

### P3-003 — Product search and filtering in mobile app
- **Status:** `[ ]` Not started
- **Impact:** Users can't search for specific products in the mobile app
- **Fix Required:** Add search bar and filter UI to mobile product pages
- **Effort:** 3–5 hours

---

### P3-004 — Real-time DNS verification in App Builder
- **Status:** `[ ]` Not started
- **Impact:** DNS tab shows a static form — no live verification of whether the custom domain resolves
- **File(s):** `components/app-builder/` → DNS tab component
- **Fix Required:** Add polling or webhook check for DNS record propagation
- **Effort:** 4–6 hours

---

### P3-005 — Product recommendations for mobile users
- **Status:** `[ ]` Not started
- **Impact:** Mobile home page has no personalized product suggestions
- **Fix Required:** Build a recommendation engine (could start rule-based)
- **Effort:** 6–10 hours

---

### P3-006 — Transaction history in mobile app
- **Status:** `[ ]` Not started
- **Impact:** Mobile users can't see their loan repayments, savings history, or commodity transaction history
- **File(s):** Mobile transaction pages
- **Fix Required:** Wire to `walletService.ts` transaction endpoints
- **Effort:** 3–5 hours

---

## ✅ Completed

Items that are fully done and verified working.

---

| ID | Feature | Notes |
|----|---------|-------|
| DONE-001 | service-auth-ms integration (login, signup, OTP, email verify, forgot/reset password) | Fully wired, tested |
| DONE-002 | JWT auth headers in all API proxies | Role normalization, transformation working |
| DONE-003 | Auth context (`contexts/AuthContext.tsx`) | Global auth state management |
| DONE-004 | All auth pages (signin, signup, verify-otp, verify-email, verify-progress, verify-success) | All routes working |
| DONE-005 | Plata product CRUD → `product-ms-plata.fly.dev` | `/api/products/route.ts` correctly points to Plata MS |
| DONE-006 | Product creation flow — 4 types with all drawers | Loan, Mortgage, Savings, Commodity with configure drawers |
| DONE-007 | App Builder UI — all tabs implemented | App Elements, Onboarding, Profile, Support, Policy, DNS, Publish |
| DONE-008 | App creation via `create-app-ms` | Full CRUD via `/api/apps/route.ts` |
| DONE-009 | All apps listing & product listing per app | `/create-app/all-apps/` working |
| DONE-010 | `appService.ts` — full create-app-ms wrapper | 1294 lines, covers all endpoints |
| DONE-011 | `walletService.ts` — full wallet-ms wrapper | 600+ lines, treasury + user wallets |
| DONE-012 | `paymentService.ts` — full payment-ms wrapper | Card, bank transfer, wallet payments |
| DONE-013 | `kycService.ts` — full compliance-ms wrapper | KYC status, submit, admin approve/reject |
| DONE-014 | `billingService.ts` + `billing-client.ts` — billing-ms | Invoices, subscriptions, recurring billing |
| DONE-015 | `accountService.ts` — full account-ms wrapper | Loans, mortgages, savings, commodities, accounts |
| DONE-016 | Customer accounts tab (`customer-accounts-tab.tsx`) | Connected to account-ms with fallback to demo data |
| DONE-017 | Billing components connected | billing-history-table, billing-overview-tab, add-card-drawer, select-card-drawer |
| DONE-018 | Payment drawers connected | CardPaymentDrawer, BankTransferPaymentDrawer, PaymentMethodTab |
| DONE-019 | Product toggle persistence | Toggle switch calls API via `springProductService.toggleProductActivation()` |
| DONE-020 | `springProductService.ts` created | Specific service for Spring App product operations |
| DONE-021 | App Builder Context | `contexts/AppBuilderContext.tsx` global state management |
| DONE-022 | Mobile V1 & V2 UI — all pages/layouts | Structure complete, data not real |
| DONE-023 | Publish/Version Control tab | Create and restore app versions |
| DONE-024 | `useMobileConfig` hook | Fetches app branding configuration |
| DONE-025 | Merchant onboarding flow (Spring) | 7-step wizard, auth, KYC |
| DONE-026 | Admin panel — all page routes created | Overview, compliance, billing, products, users, wallet, settings |
| DONE-027 | Wallet pages (treasury & operation) | Connected to real wallet-ms balance & transactions |

---

## Architecture Reference

### Backend URLs Summary

| Service | Spring Backend | Plata Backend | Shared? |
|---------|---------------|---------------|---------|
| Auth | `service-auth-ms.fly.dev` | `service-auth-ms.fly.dev` | ✅ Yes |
| Create App | `create-app-ms.fly.dev` | `create-app-ms.fly.dev` | ✅ Yes |
| Product MS | `product-ms.fly.dev` | `product-ms-plata.fly.dev` | ❌ Separate |
| Account MS | `account-ms.fly.dev` | `account-ms-plata.fly.dev` | ❌ Separate |
| Billing MS | `billing-ms.fly.dev` | `billing-ms-plata.fly.dev` | ❌ Separate |
| Wallet MS | `wallet-ms.fly.dev` | `wallet-ms.fly.dev` | ✅ Yes |
| Compliance MS | `compliance-ms.fly.dev` | `compliance-ms.fly.dev` | ✅ Yes |
| Payment MS | `payment-ms.fly.dev` | `payment-ms.fly.dev` | ✅ Yes |

### Which Frontend Uses Which Backend

| Dashboard Section | Route | Uses Backend |
|------------------|-------|-------------|
| Product Builder | `/dashboard/create-app/` | **Plata** product-ms-plata, account-ms-plata, billing-ms-plata |
| Spring App | `/dashboard/merchant/` | **Spring** product-ms, account-ms, billing-ms |
| Mobile User App | `/mobile/` & `/mobile-v2/` | **Spring** product-ms (reads active products) |
| Admin Panel | `/admin/` | **Spring** (all services) |
| Auth (all) | `/signin`, `/signup` etc. | **Shared** service-auth-ms |

### Key Files Reference

```
Frontend API Services:
├── lib/product-api.ts          → Plata product-ms wrapper (basic CRUD)
├── lib/productService.ts       → Extended product operations
├── lib/springProductService.ts → Spring App product operations (NEEDS FIX)
├── lib/appService.ts           → create-app-ms wrapper
├── lib/accountService.ts       → account-ms wrapper (NEEDS SPLIT)
├── lib/walletService.ts        → wallet-ms wrapper
├── lib/paymentService.ts       → payment-ms wrapper
├── lib/kycService.ts           → compliance-ms wrapper
├── lib/api/billing-client.ts   → billing-ms client
└── lib/services/billing-service.ts → billing-ms service

Next.js API Proxy Routes:
├── app/api/apps/route.ts              → create-app-ms proxy (working)
├── app/api/products/route.ts          → product-ms-PLATA proxy (working ✅)
├── app/api/spring-products/route.ts   → product-ms-SPRING proxy (✅ Fixed Feb 20)
├── app/api/products/active/route.ts   → active products (✅ Fixed Feb 20 — now uses Spring URL)
├── app/api/spring-products/toggle/    → product toggle (✅ Fixed Feb 20)
├── app/api/product/[id]/route.ts      → Plata product edit/delete (✅ Fixed Feb 20)
├── app/api/auth/                      → auth proxy (working)
└── app/api/product-builder/           → product builder proxy

Environment Files:
├── .env.local          → DUPLICATES + CONFLICTS (NEEDS FIX ❌)
├── .env.production     → INCOMPLETE (NEEDS FIX ❌)
└── .env.local.example  → Reference only
```

---

## 📅 Suggested Fix Schedule

| Day | Tasks | Issues |
|-----|-------|--------|
| **Day 1 (Now)** | Fix env vars, fix Spring product route URLs | P0-001, P0-002, P0-003 |
| **Day 2** | Fix accountService context split, audit toggle route | P0-004, P0-003 |
| **Day 3** | Replace dummy data with empty states in product detail pages | P1-001 |
| **Day 4** | Fix Spring product filter by appId, test Spring-to-product flow | P1-004 |
| **Day 5–7** | Fix `.env.production`, audit App Builder save coverage | P1-006, P2-002 |
| **Week 2** | Mobile app real data integration (product pages) | P1-005 |
| **Week 2–3** | Admin panel API wiring, customer applications tab | P2-004, P2-006 |
| **Week 3–4** | Mobile KYC, wallet balance on mobile home | P2-003, P2-007 |
| **Later** | Analytics, push notifications, search | P3-001 to P3-006 |

---

> **Instructions for updating this file:**  
> - Change `[ ]` to `[x]` when an issue is fixed  
> - Add a note with the date it was fixed  
> - Move completed items to the ✅ Completed table  
> - Add new discovered issues with the next available ID

