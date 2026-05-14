# Session Report — 20 February 2026

## Overview
This session focused on fixing the full product flow across both the **Spring App** (merchant dashboard) and the **Product Builder (Plata)**. All frontend fixes are deployed to Vercel. Backend persistence is pending backend engineer action.

---

## ✅ Fixes Deployed (Frontend / Vercel)

### 1. JWT Token Passthrough — Create App Auth Fix
**Commit:** `58939df`
**Problem:** The `/api/apps` proxy was re-signing the JWT with a different secret, breaking authentication between the frontend and `create-app-ms`.
**Fix:** Removed token re-signing. Now passes the original token from `service-auth-ms` through unchanged.
**Why it works:** All Fly.io services share the same `JWT_SECRET`, so the original token is valid everywhere.
**File:** `app/api/apps/route.ts`

---

### 2. Products Route 404 Fix — Remove Backup File
**Commit:** `681018e`
**Problem:** `app/api/products/route.ts.backup` was tracked in git, which may have confused Next.js routing and caused 404s on `/api/products`.
**Fix:** Removed the backup file from the repository.
**File:** `app/api/products/route.ts.backup` (deleted)

---

### 3. Wrong Backend URL for Fetching Products by App
**Commit:** `0762b2f`
**Problem:** The products route was calling `/api/v1/products/merchant/:appId` but the actual Plata product-ms endpoint is `/api/v1/products/app/:appId`.
**Fix:** Corrected the URL path from `/merchant/` to `/app/`.
**File:** `app/api/products/route.ts`

---

### 4. Loan Product Status Not Updating After Configuration
**Commit:** `c4b6693`
**Problem:** After configuring a loan product, the status remained "incomplete". The `updateProduct({ status: 'complete' })` call was commented out with a TODO.
**Fix:** Uncommented the status update call. Loan products now correctly update to "complete" after configuration (consistent with Mortgage, Savings, Commodity which already had this enabled).
**File:** `app/dashboard/create-app/all-apps/[id]/products/page.tsx`

---

### 5. Spring App — Products Not Fetching from Correct Backend
**Commit:** `d6d7696`
**Problem:** `/api/spring-products` route pointed to `product-ms.fly.dev` (Spring's own empty product-ms). Products are created in Product Builder and stored in `product-ms-plata.fly.dev`.
**Fix:** Changed Spring products proxy to fetch from `product-ms-plata.fly.dev`.
**Also fixed:** App-specific endpoint changed from `?appId=` query param to `/app/:appId` path.
**File:** `app/api/spring-products/route.ts`

---

### 6. Products Empty on Spring Dashboard — AppId Filter Bug
**Commit:** `a1e2d0f`
**Problem:** Spring app navigates to `/products/all/loan?appId=<springAppId>`. The product-cards component then filters Plata products by that Spring appId — but Plata products have **their own appIds** (Plata app IDs), which never match Spring app IDs. Result: always empty.
**Fix:** Removed the appId filter from product-cards. Now shows ALL products from Plata's catalog, filtered only by product type (Loan/Mortgage/Savings/Commodity).
**Also added:** `interestRate` and `duration` extraction from `configuration` object as fallback.
**File:** `components/product-cards.tsx`

---

### 7. Mobile App Products Page Empty
**Commit:** `c701b75`
**Problem:** `/api/products/active` (used by the mobile products page at `/mobile/products` and `/mobile-v2/products`) was pointing to `product-ms.fly.dev` — Spring's empty service.
**Fix:** Changed to fetch from `product-ms-plata.fly.dev`. Type filtering now done server-side. Added 30s cache to reduce cold-start impact.
**File:** `app/api/products/active/route.ts`

---

## 🏗️ Architecture Clarification (Documented)

The system has **two separate frontend apps** served from the same codebase:

| Branch | URL | Purpose |
|--------|-----|---------|
| Product Builder | `product-builder-platter.vercel.app` | Merchant creates/configures products |
| Spring App | `the-new-spring-dashboard.vercel.app` | Merchant dashboard + Mobile app |

### Backend Services Mapping

| Service | URL | Used By |
|---------|-----|---------|
| `service-auth-ms.fly.dev` | Auth / JWT signing | Both |
| `create-app-ms.fly.dev` | Create/manage Spring apps | Spring App |
| `create-app-ms-plata.fly.dev` | Create/manage Plata apps | Product Builder |
| `product-ms-plata.fly.dev` | Product catalog | Product Builder (write) + Spring App (read) |
| `product-ms.fly.dev` | Spring product-ms | Currently empty — unused |
| `account-ms-plata.fly.dev` | Accounts | Product Builder |
| `account-ms.fly.dev` | Accounts | Spring App |
| `compliance-ms.fly.dev` | KYC | Both |
| `wallet-ms.fly.dev` | Wallets | Both |

### Key Data Flow
```
Product Builder → Creates products → product-ms-plata.fly.dev
Spring App → Reads products → product-ms-plata.fly.dev (same source)
Spring Dashboard → Activates/deactivates products → toggle switch
Mobile App → Displays activated products → /mobile/products
```

---

## ⚠️ Critical Pending Issue — Backend Persistence

### Services Using In-Memory Storage (Data Lost on Restart)

| Service | Storage Type | Data Lost |
|---------|-------------|-----------|
| `service-auth-ms` | `MockDatabase` (Map in RAM) | All user accounts, sessions, API keys |
| `create-app-ms` | `static apps: App[]` (array in RAM) | All Spring apps |
| `create-app-ms-plata` | `static apps: App[]` (array in RAM) | All Plata apps |
| `product-ms-plata` | `private products: Product[]` (array in RAM) | All products & configurations |
| `wallet-ms` | `Map()` in mockDB.ts (RAM) | All wallets & transactions |
| `billing-ms` | No DB | Billing records |
| `payment-ms` | No DB | Payment records |

### Services With Real Persistence ✅
- `account-ms` → MongoDB (Mongoose)
- `client-auth-ms` → MongoDB (Mongoose)
- `compliance-ms` → MongoDB + Redis
- `notifications-ms` → MongoDB (Mongoose)

### Solution Required (Backend Engineer Action)

**Recommended: MongoDB Atlas (Free Tier)**
All 4 in-memory services need to:
1. Add `mongoose` as a dependency
2. Replace in-memory arrays/Maps with Mongoose models
3. Set `MONGODB_URI` as a Fly.io secret (one Atlas cluster can serve all services with different collections)

**Services and what they need:**
- `service-auth-ms` — Already has `MONGODB_URI` in `config/environment.ts`, already has `mockDatabase.ts`. Just needs Mongoose User/Session/Role models to replace the Map-based MockDatabase.
- `create-app-ms` — Replace `AppModel` (static array) with a Mongoose App model
- `product-ms-plata` — Replace `ProductService` arrays with Mongoose Product/Configuration models
- `wallet-ms` — Replace `mockDB.ts` Maps with Mongoose Wallet/Transaction models

**Fly.io secrets to set per service:**
```bash
fly secrets set MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/plata" --app <app-name>
```

---

## 🔜 What's Next

### Immediate (Blocked on Backend DB)
- [ ] Backend engineer to set up MongoDB Atlas and set `MONGODB_URI` on all Fly.io services
- [ ] Once DB is live: test that apps/products/users persist across restarts

### Frontend (Can Do Now)

#### Spring App
- [ ] **Toggle product activation**: The toggle switch in `product-cards.tsx` calls `springProductService.toggleProductActivation()` → `/api/spring-products/toggle/:merchantId/:productId`. Verify this endpoint exists and works on `product-ms-plata.fly.dev`
- [ ] **App-specific product filtering**: Currently shows ALL Plata products regardless of which Spring app the user clicked. Consider linking Plata apps to Spring apps so merchants see only their products.
- [ ] **Products disappearing**: Will continue until DB persistence is set up

#### Mobile App
- [ ] **Product detail pages**: `/mobile/loan/:id`, `/mobile/mortgage/:id`, `/mobile/savings/:id` — verify they load product details from Plata correctly
- [ ] **Mobile-v2 products**: Verify `/mobile-v2/products` Loan/Savings/Mortgage tabs display correctly after the `/api/products/active` fix

#### Product Builder (Plata)
- [ ] Verify product configuration (loan, mortgage, savings, commodity) all save correctly after the status update fix
- [ ] Verify product list persists within a session (will still disappear on restart until DB is set up)

---

## 🧪 Verified Working (End-to-End Tests Run)

```
✅ POST product-ms-plata.fly.dev/api/v1/products → Creates product
✅ GET  product-ms-plata.fly.dev/api/v1/products → Returns all products
✅ GET  the-new-spring-dashboard.vercel.app/api/spring-products → Proxies from Plata correctly
✅ POST create-app-ms.fly.dev/api/v1/apps → Creates app (Spring)
✅ POST create-app-ms-plata.fly.dev/api/v1/apps → Creates app (Plata)
✅ GET  create-app-ms.fly.dev/api/v1/apps → Returns apps (Spring)
```

---

## 📋 Git Commits This Session

| Commit | Description |
|--------|-------------|
| `58939df` | fix: pass through original JWT — shared JWT_SECRET on Fly.io |
| `681018e` | chore: remove route.ts.backup that confused Next.js routing |
| `0762b2f` | fix: correct product-ms endpoint from /merchant/ to /app/:appId |
| `c4b6693` | fix: enable product status update to 'complete' after loan configuration |
| `d6d7696` | fix: Spring App now fetches products from Plata's product-ms |
| `a1e2d0f` | fix: show all Plata products in Spring dashboard without appId filter |
| `c701b75` | fix: mobile products page now fetches from Plata's product-ms |

---

*Report generated: 2026-02-20 13:08 WAT*
