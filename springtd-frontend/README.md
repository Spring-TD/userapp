# SpringTD Dashboard — Frontend

> A multi-tenant fintech platform built with **Next.js 15**, hosting three distinct frontend applications under one codebase.

[![Next.js](https://img.shields.io/badge/Next.js-15.x-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.x-38BDF8?logo=tailwindcss)](https://tailwindcss.com/)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Getting Started](#3-getting-started)
4. [Repository Structure](#4-repository-structure)
5. [The Three Sub-Applications](#5-the-three-sub-applications)
6. [Routing Map](#6-routing-map)
7. [Authentication System](#7-authentication-system)
8. [State Management & Contexts](#8-state-management--contexts)
9. [API Layer & Service Files](#9-api-layer--service-files)
10. [Component Library](#10-component-library)
11. [Key Feature Areas](#11-key-feature-areas)
12. [Environment Variables](#12-environment-variables)
13. [Backend Microservices](#13-backend-microservices)
14. [What's Done vs. What's Pending](#14-whats-done-vs-whats-pending)
15. [Code Conventions & Patterns](#15-code-conventions--patterns)
16. [Common Gotchas & Tips](#16-common-gotchas--tips)

---

## 1. Project Overview

This codebase hosts **three separate frontend applications** under one Next.js monorepo:

| App | Path Prefix | Who Uses It | Purpose |
|-----|-------------|-------------|---------|
| **Platter** (Product Builder) | `/dashboard/create-app/` | Platform Operators | Create & configure financial product apps (Loan, Mortgage, Savings, Commodity) |
| **Spring App** (Merchant Dashboard) | `/dashboard/merchant/` | Merchants | Manage apps, toggle products, view customers, handle billing |
| **User Mobile App** | `/mobile/` and `/mobile-v2/` | End Users | Browse and apply for financial products |

A shared `/dashboard/` area (Overview, Compliance, Developer, Settings) sits outside the merchant/platter context.

---

## 2. Tech Stack

| Technology | Version | Role |
|------------|---------|------|
| **Next.js** | 15.x | Full-stack framework (App Router) |
| **React** | 19.x | UI library |
| **TypeScript** | 5.x | Type safety |
| **Tailwind CSS** | 4.x | Utility-first styling |
| **Shadcn/UI** | Latest | Base UI components (Radix UI) |
| **Framer Motion** | 11.x | Animations |
| **React Hook Form** | 7.x | Form state management |
| **Zod** | 3.x | Schema validation |
| **Axios** | 1.x | HTTP client (centralized in `lib/api.ts`) |
| **Recharts** | 2.x | Charts & data visualization |
| **TipTap** | 3.x | Rich text editor (Policy/Terms builder) |
| **Sonner** | 1.x | Toast notifications |
| **Vaul** | 1.x | Drawer/Sheet primitives |
| **Geist** | 1.x | Default sans font |
| **date-fns** | 4.x | Date manipulation |
| **Drizzle ORM** | 0.45 | (Server-side) SQL ORM for local microservices |
| **better-sqlite3** | 12.x | (Server-side) SQLite driver |

---

## 3. Getting Started

### Prerequisites

- **Node.js** v18+
- **npm** or **pnpm**
- Access to backend microservices on Fly.dev — or run local servers from `/server/`

### Installation

```bash
cd springtd-frontend
npm install
# or: pnpm install
```

### Environment Setup

```bash
cp .env.local.example .env.local
```

Fill in `.env.local` with real values — see [Section 12](#12-environment-variables) for all keys.

> **Critical:** `NEXT_PUBLIC_API_URL` must be set — without it, all API calls fail at the proxy layer.

### Running the Dev Server

```bash
npm run dev
# or: pnpm dev
```

App runs at **http://localhost:3000**

### Dev Login Credentials

A seed user is auto-created in the `service-auth-ms` SQLite database:

| Email | Password | Role |
|-------|----------|------|
| `dev@test.com` | `dev123` | Merchant |

### Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| Dev server | `npm run dev` | Starts local Next.js dev server |
| Build | `npm run build` | Production build |
| Start | `npm run start` | Runs production build |
| Lint | `npm run lint` | ESLint check |
| Test services | `npm run test:services` | Pings all microservices (`test-services.mjs`) |

---

## 4. Repository Structure

```
springtd-frontend/
├── app/                        # Next.js App Router pages
│   ├── api/                    # API Routes (Next.js proxy layer)
│   │   ├── apps/               # → create-app-ms
│   │   ├── auth/               # → service-auth-ms
│   │   ├── products/           # → product-ms
│   │   ├── product-builder/
│   │   └── spring-products/
│   │
│   ├── dashboard/              # Dashboard shell
│   │   ├── layout.tsx          # Adds Sidebar + DashboardHeader
│   │   ├── create-app/         # ← PLATTER (Product Builder)
│   │   └── merchant/           # ← SPRING APP (Merchant Dashboard)
│   │
│   ├── mobile/                 # ← USER APP V1
│   ├── mobile-v2/              # ← USER APP V2
│   ├── spring/                 # Merchant onboarding flow
│   │   ├── signup/
│   │   ├── signin/
│   │   ├── onboarding/         # 7-step KYC/onboarding wizard
│   │   ├── verify-email/
│   │   ├── verify-progress/
│   │   └── verify-success/
│   │
│   ├── signin/                 # Platform-level sign in
│   ├── signup/                 # Platform-level sign up
│   ├── forgot-password/
│   ├── reset-password/
│   ├── admin/                  # Platform super-admin pages
│   ├── page.tsx                # Root landing page (app selector)
│   ├── layout.tsx              # Root layout (wraps with AuthProvider)
│   └── globals.css
│
├── components/
│   ├── ui/                     # Shadcn UI primitives (57 files)
│   ├── drawers/                # 44 drawer/sheet components
│   ├── app-builder/            # App Builder tab components (13 files)
│   ├── mobile-templates/       # Mobile preview templates (V1/V2)
│   ├── forms/                  # Form components
│   ├── compliance-forms/       # KYC/compliance form components
│   ├── onboarding/             # Onboarding wizard steps
│   ├── billing/
│   ├── admin/
│   ├── developer/
│   ├── create-app/
│   ├── modals/
│   └── [many standalone .tsx]  # Sidebar, Header, Cards, Tables...
│
├── contexts/
│   ├── AuthContext.tsx          # Global auth state
│   └── AppBuilderContext.tsx    # App Builder tab state (all 8 tabs)
│
├── hooks/
│   ├── useAuth.ts
│   ├── useMobileConfig.ts
│   ├── useMobileProducts.ts
│   ├── useWalletBalance.ts
│   ├── use-mobile.ts
│   └── use-toast.ts
│
├── lib/
│   ├── api.ts                  # Central Axios instance (base URL = /api)
│   ├── tokenManager.ts         # JWT storage (httpOnly cookies + localStorage)
│   ├── accountService.ts       # account-ms wrapper (~900 lines)
│   ├── appService.ts           # create-app-ms wrapper
│   ├── productService.ts       # product-ms wrapper
│   ├── walletService.ts        # wallet-ms wrapper
│   ├── paymentService.ts       # payment-ms wrapper
│   ├── kycService.ts           # compliance-ms wrapper
│   ├── adminService.ts
│   ├── specialApiService.ts    # Cross-merchant privileged API
│   ├── springProductService.ts
│   ├── sanitize.ts
│   ├── session.ts
│   ├── devBypass.ts
│   └── services/
│       └── billing-service.ts
│
├── types/                      # Shared TypeScript types
├── styles/                     # Additional stylesheets
├── providers/
├── public/                     # Static assets
├── server/                     # Local microservice source code
│   ├── product-ms/
│   ├── service-auth-ms/
│   └── create-app-ms/
│
├── next.config.mjs
├── tsconfig.json
├── package.json
└── .env.local                  # ← YOUR LOCAL ENV (never commit this)
```

---

## 5. The Three Sub-Applications

### 5.1 Platter — Product Builder (`/dashboard/create-app/`)

Platform operators use this to create fintech apps and products.

**Entry Point:** `app/dashboard/create-app/page.tsx`

**Key Pages:**
- `all-apps/` — List of all created apps
- `all-apps/[id]/` — Individual app detail
- `all-apps/[id]/app-builder/` — App customization wizard (8 tabs)
- `all-apps/[id]/products/` — Product creation & management
- `new-apps/` — Create a new app
- `wallet/`, `transactions/`, `drive/`, `scam-alert/`

**Product Creation Flow:**
```
Click "Create Product"
  → Select type: Loan | Mortgage | Savings | Commodity | Investment
  → Fill details in type-specific Create Drawer
  → Configure settings in Configure Drawer
  → API call to product-ms
  → Product created with status: 'complete', isActive: true
```

**App Builder Tabs:**

| Tab | Component | Saves To |
|-----|-----------|----------|
| Template | `template-tab.tsx` | AppBuilderContext |
| Assets | `asset-tab.tsx` | create-app-ms |
| Onboarding | `onboarding-tab.tsx` | create-app-ms |
| App Profile | `app-profile-tab.tsx` | create-app-ms |
| Policy | `policy-tab.tsx` | create-app-ms |
| Support | `support-tab.tsx` | create-app-ms |
| DNS | `dns-tab.tsx` | create-app-ms |
| Publish | `publish-tab.tsx` | create-app-ms (versioning) |

---

### 5.2 Spring App — Merchant Dashboard (`/dashboard/merchant/`)

Merchants manage their business: apps, products, customers, billing, team, compliance.

**Entry Point:** `app/dashboard/merchant/page.tsx`

**Key Pages:**
- `/dashboard/merchant/` — App list
- `products/all/` — Product tabs by type (loan, mortgage, savings, commodity)
- `products/active/` — Active products overview
- `customer/` — Customer list
- `customer/[id]/applications/` — Per-customer applications
- `applications/` — All applications (Approve/Reject)
- `applications/pending/` — Pending review queue
- `transactions/`, `wallets/`, `billing/`, `app-builder/`, `settings/`, `admin/`, `compliance/`, `developer/`

**Layouts:** The merchant layout (`app/dashboard/merchant/layout.tsx`) conditionally switches between:
- `MerchantAppsSidebar` — for the main app list page
- `MerchantSidebar` + `MerchantHeader` — for all other merchant pages

---

### 5.3 User Mobile App (`/mobile/` and `/mobile-v2/`)

End users browse and apply for financial products.

- `/mobile/` — V1 (Classic banking style)
- `/mobile-v2/` — V2 (Modern fintech style)

Both share the same structure but have different visual designs. Layout enforces `max-w-md` to simulate a phone screen.

**Key Pages:** `home/`, `products/`, `products/[id]/`, `profile/`, `kyc/`, `checkout/`, `auth/`, `savings/`, `loan/`, `mortgage/`

**App Identification:** Uses an `appId` query param (`?appId=xxx`) to identify which merchant's app is rendering. Drives:
- Branding: `useMobileConfig({ appId })`
- Products: `useMobileProducts({ appId, type })`

---

## 6. Routing Map

```
/                           → Root landing (app selector)
├── /signin, /signup, /forgot-password, /reset-password
├── /verify-email, /verify-otp, /verify-progress, /verify-success
├── /welcome

/spring/                    → Merchant onboarding
│   ├── signin/, signup/
│   └── onboarding/         → 7-step wizard

/dashboard/
│   ├── overview/, compliance/, developer/, settings/, billing/
│   │
│   ├── create-app/                             → PLATTER
│   │   └── all-apps/[id]/
│   │       ├── app-builder/
│   │       ├── products/
│   │       ├── wallet/
│   │       ├── transactions/
│   │       └── drive/
│   │
│   └── merchant/                               → SPRING APP
│       ├── products/all/{loan,mortgage,savings,commodity}
│       ├── products/active/
│       ├── customer/[customerId]/applications/
│       ├── applications/pending/
│       ├── transactions/, wallets/, billing/
│       ├── app-builder/, settings/
│       ├── admin/, compliance/, developer/

/mobile/                    → USER APP V1
/mobile-v2/                 → USER APP V2
    Both: home/, products/, products/[id]/, profile/, kyc/, checkout/

/admin/                     → Super admin (users, product, wallet-and-balances)
/api/                       → Next.js API proxy routes
```

---

## 7. Authentication System

### Login Flow

1. User enters credentials on `/signin` or `/spring/signin`
2. Frontend calls `POST /api/auth/login` → proxied to `service-auth-ms`
3. Backend returns `{ accessToken, refreshToken, user }`
4. `AuthContext.signin()` calls `setSecureTokens()` from `lib/tokenManager.ts`
5. Tokens stored in **httpOnly cookies** (via `/api/auth/set-tokens`) AND `localStorage` (for client-side decoding only)
6. `getUserFromToken()` decodes JWT payload from `localStorage` to populate UI (never for auth)
7. On logout, `clearSecureTokens()` clears both, redirects to `/signin`

### The Axios Instance (`lib/api.ts`)

- **Base URL:** `/api` — all calls proxied through Next.js
- **Request interceptor:** Attaches `Authorization: Bearer <token>` from `localStorage`
- **Response interceptor:** On 401, attempts token refresh. On failure, clears tokens and redirects to `/signin`

### AuthContext

```typescript
const { user, loading, signin, logout, isAuthenticated } = useContext(AuthContext)
```

| Property | Type | Description |
|----------|------|-------------|
| `user` | `User \| null` | Current user (id, email, firstName, lastName, role) |
| `loading` | `boolean` | True while checking auth on mount |
| `isAuthenticated` | `boolean` | Shorthand for `!!user` |
| `signin(email, password)` | `Promise<void>` | Calls login API, sets tokens |
| `logout()` | `void` | Clears tokens, redirects to `/signin` |

### Token Storage Strategy

| Storage | What's Stored | Why |
|---------|--------------|-----|
| httpOnly Cookie | `accessToken`, `refreshToken` | Secure (XSS-proof), actual auth |
| localStorage | `accessToken` (copy) | Client-side JWT decode for display info only |

---

## 8. State Management & Contexts

The app uses **React Context** — no Redux or Zustand.

### `AuthContext` (`contexts/AuthContext.tsx`)
- Scope: Root layout (wraps entire app)
- Purpose: User authentication state and methods

### `AppBuilderContext` (`contexts/AppBuilderContext.tsx`)
- Scope: App Builder section only
- Purpose: Manages all 8 App Builder tab states in one place
- Handles: `appElements`, `onboarding`, `appProfile`, `policy`, `support`, `dns`, version history, save/publish
- **Key pattern:** Every App Builder tab reads from and writes to this context. Configuration auto-saves via `saveSection(sectionName)`

---

## 9. API Layer & Service Files

### Architecture

```
UI Component
    ↓
lib/someService.ts          ← Typed service function
    ↓
lib/api.ts (Axios)          ← Adds auth headers, base URL = /api
    ↓
/api/some-route/route.ts    ← Next.js API Route (proxy)
    ↓
https://some-ms.fly.dev     ← Backend microservice
```

> **Why the proxy?** All requests through `/api/*` avoid CORS issues when deployed to Vercel.

### Service Files

| File | Microservice | Coverage |
|------|-------------|----------|
| `lib/api.ts` | — | Auth headers, token refresh |
| `lib/accountService.ts` | `account-ms` | Accounts, Loans, Mortgages, Savings, Commodities, Customer management, Application approval |
| `lib/appService.ts` | `create-app-ms` | App CRUD, App Builder config |
| `lib/productService.ts` | `product-ms` | Product CRUD, configuration |
| `lib/product-api.ts` | `product-ms` | Lower-level product API functions |
| `lib/walletService.ts` | `wallet-ms` | Wallet balances, transactions |
| `lib/paymentService.ts` | `payment-ms` | Payment initiation and verification |
| `lib/kycService.ts` | `compliance-ms` | KYC submission, document upload |
| `lib/adminService.ts` | Multiple | Admin-facing data endpoints |
| `lib/specialApiService.ts` | `create-app-ms` | Cross-merchant privileged API (requires API key) |
| `lib/springProductService.ts` | `product-ms` | Spring-specific activation actions |
| `lib/services/billing-service.ts` | `billing-ms` | Billing & subscription management |

### Special API Service

`lib/specialApiService.ts` exposes advanced cross-merchant capabilities requiring both a JWT and an additional `X-Special-Key` header. Covers: `specialAppApi`, `specialProductApi`, `specialWalletApi`, `specialUserApi`, `specialTransactionApi`, `specialDriveApi`, `specialSubscriptionApi`, `specialApplicationApi`.

---

## 10. Component Library

### UI Primitives (`components/ui/`)
57 Shadcn/UI component files — the raw building blocks (`Button`, `Input`, `Select`, `Dialog`, `Drawer`, `Card`, `Badge`, `Table`, `Tabs`, `Toast`, etc.). **Do not edit these directly.**

### Drawer Components (`components/drawers/`)
Drawers are the **primary UI pattern** for forms and actions. 44 drawers covering:

| Category | Examples |
|----------|---------|
| Product creation | `create-loan-drawer.tsx`, `create-mortgage-drawer.tsx`, `create-savings-drawer.tsx`, `create-commodity-drawer.tsx` |
| Product configuration | `configure-loan-drawer.tsx`, `configure-mortgage-drawer.tsx`, etc. |
| User applications | `loan-application-drawer.tsx`, `mortgage-application-drawer.tsx`, etc. |
| App management | `create-app-drawer.tsx`, `info-on-app-drawer.tsx`, `app-created-success-drawer.tsx` |
| Account management | `account-detail-drawer.tsx`, `suspend-account-drawer.tsx` |
| Security | `developer-security-drawer.tsx`, `two-factor-drawer.tsx` |

**Standard drawer anatomy:**
```tsx
<Drawer open={isOpen} onOpenChange={setIsOpen}>
  <DrawerContent>
    {/* Multi-step form with currentStep state */}
  </DrawerContent>
</Drawer>
```

### Sidebars

| Component | File | Used In |
|-----------|------|---------|
| Main Dashboard Sidebar | `components/sidebar.tsx` | `/dashboard/` general pages |
| Merchant Sidebar | `components/merchant-sidebar.tsx` | Merchant product, customer, billing pages |
| Merchant Apps Sidebar | `components/merchant-apps-sidebar.tsx` | Merchant main dashboard (app list) |
| Admin Sidebar | `components/admin-sidebar.tsx` | `/admin/` pages |

### App Builder Components (`components/app-builder/`)
Each of the 8 tabs has its own component. All consume `AppBuilderContext` for state. Also includes:
- `mobile-preview-screen.tsx` — Real-time mobile preview
- `mobile-template-preview.tsx` — V1/V2 template previews
- `mobile-iframe-preview.tsx` — Iframe-based preview

---

## 11. Key Feature Areas

### Product Lifecycle

```
[Platter]    Create App
                ↓
[Platter]    Create Products (Loan/Mortgage/Savings/Commodity)
             status: 'complete', isActive: true
                ↓
[Spring App] Merchant toggles isActive ON/OFF per product
                ↓
[Mobile App] useMobileProducts() fetches isActive=true products only
             Users see only activated products
```

### App Builder Configuration Flow

1. Merchant visits `/dashboard/merchant/app-builder/` or `/dashboard/create-app/all-apps/[id]/app-builder/`
2. `AppBuilderContext` loads existing config from create-app-ms
3. Each tab auto-saves via `saveSection(sectionName)` → `POST /api/apps/[id]/configuration/[section]`
4. Publish tab creates a versioned snapshot
5. Mobile app fetches config via `useMobileConfig({ appId })`

### Mobile App Branding (White-labeling)

The mobile app is not hardcoded to one merchant. It:
1. Reads `appId` from URL query params
2. Calls `GET /api/apps/[appId]/configuration/public`
3. Applies merchant's custom colors, fonts, logo, onboarding screens
4. Any mobile app URL can be white-labeled by changing `?appId=`

### KYC Flow (Mobile, 4-step)

Located at `app/mobile/kyc/page.tsx`:
1. **Personal Info** — Name, DOB, nationality
2. **Address** — Street, city, state, postal code, country
3. **Documents** — Government ID (required), proof of address (optional); files as base64
4. **Review** — Full summary → submit to `kycService.submitIndividualKyc()` → `compliance-ms`

### Customer Application Management

Merchants can approve or reject customer applications:
- All Applications: `app/dashboard/merchant/applications/page.tsx`
- Pending Queue: `app/dashboard/merchant/applications/pending/page.tsx`
- Per-Customer: `app/dashboard/merchant/customer/[customerId]/applications/page.tsx`
- API: `accountService.applications.approve()` / `.reject()`

### Billing (`/dashboard/merchant/billing/`)

- `components/billing/billing-overview-tab.tsx`
- `components/billing/billing-usage-tab.tsx`
- `components/billing/billing-payment-methods-tab.tsx`
- `lib/services/billing-service.ts` → `billing-ms.fly.dev`
- Note: Only bank transfer is supported (card payment button intentionally removed)

---

## 12. Environment Variables

```env
# ── Backend Microservice URLs ─────────────────────────────────────────────────
NEXT_PUBLIC_API_URL=https://service-auth-ms.fly.dev
NEXT_PUBLIC_CREATE_APP_SERVICE_URL=https://create-app-ms.fly.dev
NEXT_PUBLIC_PRODUCT_SERVICE_URL=https://product-ms.fly.dev
NEXT_PUBLIC_COMPLIANCE_URL=https://compliance-ms.fly.dev
NEXT_PUBLIC_WALLET_SERVICE_URL=https://wallet-ms.fly.dev
NEXT_PUBLIC_PAYMENT_SERVICE_URL=https://payment-ms.fly.dev
NEXT_PUBLIC_BILLING_SERVICE_URL=https://billing-ms.fly.dev

# ── Special API Keys ──────────────────────────────────────────────────────────
NEXT_PUBLIC_SPECIAL_API_KEY=your-special-api-key-here
NEXT_PUBLIC_PUBLIC_KEY=your-public-key-here

# ── JWT Configuration (server-side only) ─────────────────────────────────────
JWT_SECRET=your-super-secure-secret-key-minimum-32-characters

# ── App Configuration ─────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_NAME=SpringTD Dashboard
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ── Spring App Identification ─────────────────────────────────────────────────
# The Spring App's appId — used by the mobile app to filter products
NEXT_PUBLIC_SPRING_APP_ID=wdpgeo0o0
```

> `NEXT_PUBLIC_*` variables are exposed to the browser. Non-prefixed variables (`JWT_SECRET`) are server-side only.

---

## 13. Backend Microservices

All services run on **Fly.dev** and use **SQLite** with **better-sqlite3**. Source code is in `/server/`.

### Service Registry

| Service | Base URL | Purpose |
|---------|----------|---------|
| `service-auth-ms` | `https://service-auth-ms.fly.dev` | Login, signup, OTP, email verify, token refresh |
| `create-app-ms` | `https://create-app-ms.fly.dev` | App CRUD, App Builder config, Special API |
| `product-ms` | `https://product-ms.fly.dev` | Product CRUD, configurations, toggle |
| `account-ms` | `https://account-ms.fly.dev` | User accounts, KYC, loan/savings/mortgage/commodity applications, customers |
| `wallet-ms` | `https://wallet-ms.fly.dev` | Wallet balances, transaction history |
| `payment-ms` | `https://payment-ms.fly.dev` | Payment initiation & verification |
| `billing-ms` | `https://billing-ms.fly.dev` | Merchant billing, subscriptions, invoices |
| `compliance-ms` | `https://compliance-ms.fly.dev` | KYC submission, document compliance |

### Key API Endpoints

**service-auth-ms:**
```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/verify-account
POST /api/v1/auth/resend-otp
```

**product-ms:**
```
GET    /api/v1/products
POST   /api/v1/products
GET    /api/v1/products/:id
PUT    /api/v1/products/:id          (incl. isActive toggle)
DELETE /api/v1/products/:id
GET    /api/v1/products/active       (status=complete AND isActive=true)
GET    /api/v1/apps/:appId/products
```

**create-app-ms:**
```
GET    /api/v1/apps
POST   /api/v1/apps
GET    /api/v1/apps/:id
PUT    /api/v1/apps/:id
DELETE /api/v1/apps/:id
GET    /api/v1/apps/:id/configuration/public
POST   /api/v1/configuration/*
```

### Health Checks

```bash
curl https://service-auth-ms.fly.dev/health
curl https://create-app-ms.fly.dev/health
curl https://product-ms.fly.dev/health
```

### Running Services Locally

```bash
# product-ms (port 3001)
cd server/product-ms && npm install && npm run dev

# service-auth-ms (port 3002)
cd server/service-auth-ms && npm install && npm run dev

# create-app-ms (port 3003)
cd server/create-app-ms && npm install && npm run dev
```

Then update `.env.local` to point to `localhost` instead of Fly.dev URLs.

---

## 14. What's Done vs. What's Pending

### ✅ Fully Implemented

| Feature | Location |
|---------|----------|
| Merchant onboarding (7-step wizard) | `app/spring/` |
| Platform auth (login, signup, OTP, password reset) | `app/signin/`, `app/signup/`, etc. |
| Platter — App creation & management | `app/dashboard/create-app/` |
| Platter — Product creation (all 4 types + config drawers) | `components/drawers/` |
| App Builder (all 8 tabs with auto-save) | `components/app-builder/` |
| AppBuilderContext global state | `contexts/AppBuilderContext.tsx` |
| Publish/version control | `publish-tab.tsx` |
| DNS configuration UI | `dns-tab.tsx` |
| Spring App — Product list & toggle | `app/dashboard/merchant/products/` |
| Spring App — Customer & Application management | `app/dashboard/merchant/customer/`, `applications/` |
| Spring App — Billing, Developer, Admin, Compliance | `app/dashboard/merchant/` |
| Mobile V1 — All pages | `app/mobile/` |
| Mobile V2 — All pages | `app/mobile-v2/` |
| Mobile — KYC (4-step, wired to compliance-ms) | `app/mobile/kyc/` |
| Mobile hooks — `useMobileConfig`, `useMobileProducts`, `useWalletBalance` | `hooks/` |
| Product `isActive` toggle persisting to backend | `product-api.ts`, `product-cards.tsx` |
| Admin panel (real API) | `app/admin/` |
| SQLite persistence on all local microservices | `server/*/src/db/` |

### ⚠️ Partially Implemented

| Feature | Gap |
|---------|-----|
| App Builder tabs — full save coverage | Some tabs still have incomplete auto-save |
| Mobile V2 products — real data | V2 still has some hardcoded/mock data |

### ❌ Not Yet Implemented

| Feature | Priority |
|---------|----------|
| `/api/mobile/[appId]/products` API route | **P0** |
| Mobile V2 — all tabs using real data | P1 |
| Mobile home — real product showcase | P1 |
| Product subscription flow (user subscribes) | P2 |
| Real wallet balances in mobile | P2 |
| Real transaction history in mobile | P2 |
| Product application end-to-end (mobile) | P2 |
| Analytics dashboard for merchants | P3 |
| Push notifications | P3 |

---

## 15. Code Conventions & Patterns

### File Naming

- **Pages:** `page.tsx`
- **Layouts:** `layout.tsx`
- **Components:** `kebab-case.tsx` (e.g., `merchant-sidebar.tsx`)
- **Hooks:** `camelCase.ts` prefixed with `use` (e.g., `useMobileConfig.ts`)
- **Services:** `camelCase.ts` (e.g., `accountService.ts`)

### Path Aliases

`@/` maps to the project root:
```typescript
import { Button } from "@/components/ui/button"
import api from "@/lib/api"
import { AuthContext } from "@/contexts/AuthContext"
```

### Design System — Color Palette

| Usage | Value |
|-------|-------|
| Spring App primary | Purple — `#7C3AED` / `#48229F` |
| Spring App background | Light gray — `#F3F4F6` |
| Active status badge | `bg-purple-100 text-purple-700` |

### Toast Notifications

Two systems exist — **prefer Sonner for new code:**
```typescript
// Preferred (new code)
import { toast } from 'sonner'

// Legacy (some older components)
import { toast } from 'react-toastify'
```

### API Error Handling Pattern

```typescript
try {
  const response = await fetch('/api/some-endpoint', { ... })
  const result = await response.json()

  if (result.success && result.data) {
    // handle success
  } else {
    console.warn('API error:', result.error)
    // show fallback/empty state
  }
} catch (error) {
  console.error('Fetch failed:', error)
  toast.error('Something went wrong')
}
```

### Multi-Step Form Pattern (Drawers)

```typescript
const [currentStep, setCurrentStep] = useState(1)
const totalSteps = 3

// Back:   setCurrentStep(prev => prev - 1)
// Next:   validate, then setCurrentStep(prev => prev + 1)
// Submit: on final step, call API
```

---

## 16. Common Gotchas & Tips

### 1. TypeScript Errors Are Suppressed in Build
`next.config.mjs` has `typescript: { ignoreBuildErrors: true }`. TypeScript errors won't break the build — always fix them before a PR.

### 2. `devBypass.ts` in Root Layout
`import "@/lib/devBypass"` is in the root layout for local testing convenience. Safe to leave in place.

### 3. Dual Token Storage
Tokens live in both httpOnly cookies (secure auth) and `localStorage` (display info only). Never use the `localStorage` copy for actual authentication.

### 4. `appId` vs `springAppId`
- `appId` — The Product Builder's app ID (the app that **created** the product)
- `springAppId` — The Merchant app ID that **activated** the product

Mobile apps fetch products by `springAppId`, not `appId`.

### 5. Products Must Be `complete` AND `isActive: true`
`useMobileProducts` only returns products where **both** `status === 'complete'` and `isActive === true`. If products aren't appearing on mobile, check these two fields first.

### 6. Merchant Layout Conditional Sidebar
`app/dashboard/merchant/layout.tsx` switches sidebars based on the current pathname. When adding a new page under `/dashboard/merchant/`, check if it needs to be added to the `isAppsSidebarPage` list.

### 7. Mobile Max Width
The mobile layout enforces `max-w-md` (448px). Do not set widths that break this constraint.

### 8. Two Toast Libraries
Do not mix `sonner` and `react-toastify` within the same feature. New code should use `sonner`.

### 9. Images Not Optimized
`next.config.mjs` has `images: { unoptimized: true }`. Suitable for the current Fly.dev/Vercel hosting setup.

### 10. TipTap Template Literal Spacing
TipTap has caused template literal spacing build issues in the past. If you see string interpolation build errors, check for extra spaces inside template literals.

---

## Useful Shell Scripts

| Script | Purpose |
|--------|---------|
| `health-check.sh` | Pings all microservice health endpoints |
| `test-services.sh` / `test-services.mjs` | Comprehensive API test suite |
| `test-product-api.sh` | Tests product-ms CRUD endpoints |
| `test-complete-flow.sh` | End-to-end flow test |
| `diagnose-product-issue.sh` | Diagnoses product display issues |
| `check-services.sh` | Checks if all services are online |

---

*Last updated: March 2026. For latest changes on a specific feature, refer to `CHANGELOG.md` and the individual feature docs (`SYSTEM_ARCHITECTURE.md`, `ACCOUNT_MS_INTEGRATION.md`, `CREATE_APP_MS_INTEGRATION.md`, etc.).*
