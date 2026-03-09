# Spring TD Dashboard — Frontend Developer Guide

> **Last Updated:** March 2026  
> Purpose: Onboarding reference for new frontend developers joining the project.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Getting Started (Local Setup)](#3-getting-started-local-setup)
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

This is a **multi-tenant fintech platform** built with **Next.js 15**. It hosts three separate frontend applications under one codebase:

| App | Path Prefix | Who Uses It | Purpose |
|-----|------------|-------------|---------|
| **Platter** (Product Builder) | `/dashboard/create-app/` | Platform Operators | Create & configure financial product apps (Loan, Mortgage, Savings, Commodity) |
| **Spring App** (Merchant Dashboard) | `/dashboard/merchant/` | Merchants | Manage apps, toggle products ON/OFF, view customers, handle billing |
| **User Mobile App V1/V2** | `/mobile/` and `/mobile-v2/` | End Users | Browse and apply for financial products |

There is also a shared `/dashboard/` area with an Overview, Compliance, Developer, and Settings section that sits outside merchant/platter context.

---

## 2. Tech Stack

| Technology | Version | Role |
|------------|---------|------|
| **Next.js** | 15.x | Full-stack framework (App Router) |
| **React** | 19.x | UI library |
| **TypeScript** | 5.x | Type safety |
| **Tailwind CSS** | 4.x | Utility-first styling |
| **Shadcn/UI** | Latest | Base UI components (Radix UI under the hood) |
| **Framer Motion** | 11.x | Animations |
| **React Hook Form** | 7.x | Form state management |
| **Zod** | 3.x | Schema validation |
| **Axios** | 1.x | HTTP client (centralized in `lib/api.ts`) |
| **Recharts** | 2.x | Charts & data visualization |
| **TipTap** | 3.x | Rich text editor (Policy/Terms builder) |
| **Sonner** | 1.x | Toast notifications |
| **React Toastify** | 10.x | Additional toasts (legacy) |
| **Vaul** | 1.x | Drawer/Sheet primitives |
| **Geist** | 1.x | Font (used as the default sans font) |
| **date-fns** | 4.x | Date manipulation |
| **Drizzle ORM** | 0.45 | (Server-side) SQL ORM for local microservices |
| **better-sqlite3** | 12.x | (Server-side) SQLite driver |

---

## 3. Getting Started (Local Setup)

### Prerequisites

- **Node.js** v18+
- **npm** (or pnpm)
- Access to the backend microservices (deployed on Fly.dev), **or** you can run local servers from the `/server/` directory

### Installation

```bash
cd springtddashboard1
npm install        # or: pnpm install
```

### Environment Configuration

```bash
cp .env.local.example .env.local
```

Then fill in `.env.local` with real values (see [Section 12](#12-environment-variables) for all keys).

> **Quick start:** The most critical variable is `NEXT_PUBLIC_API_URL`. Without it, all API calls will fail at the proxy layer.

### Running the Dev Server

```bash
npm run dev
# or:
pnpm dev
```

The app runs on **http://localhost:3000**

### Dev Login Credentials

A dev seed user is auto-created in the `service-auth-ms` SQLite database:

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
| Test services | `npm run test:services` | Runs `test-services.mjs` (pings all microservices) |

---

## 4. Repository Structure

```
springtddashboard1/
├── app/                        # Next.js App Router pages
│   ├── api/                    # Next.js API Routes (proxy layer)
│   │   ├── apps/               # App CRUD → create-app-ms
│   │   ├── auth/               # Auth → service-auth-ms
│   │   ├── products/           # Products → product-ms
│   │   ├── product-builder/    # Product builder endpoints
│   │   └── spring-products/    # Spring-specific product routes
│   │
│   ├── dashboard/              # Dashboard shell (layout + sidebar)
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
│   └── globals.css             # Global styles
│
├── components/                 # Reusable components
│   ├── ui/                     # Shadcn UI primitives (57 files)
│   ├── drawers/                # 44 drawer/sheet components
│   ├── billing/                # Billing-related components
│   ├── app-builder/            # App Builder tab components (13 files)
│   ├── mobile-templates/       # Mobile preview templates (V1/V2)
│   ├── forms/                  # Form components
│   ├── compliance-forms/       # KYC/compliance form components
│   ├── onboarding/             # Onboarding wizard steps
│   ├── admin/                  # Admin panel components
│   ├── developer/              # Developer section components
│   ├── create-app/             # Create App sub-components
│   ├── modals/                 # Modal components
│   └── [many standalone .tsx]  # Sidebar, Header, Cards, Tables...
│
├── contexts/
│   ├── AuthContext.tsx          # Global auth state (user, signin, logout)
│   └── AppBuilderContext.tsx    # App Builder global state (all 8 tabs)
│
├── hooks/
│   ├── useAuth.ts              # Convenience hook (wraps AuthContext)
│   ├── useMobileConfig.ts      # Fetches branding config for a given appId
│   ├── useMobileProducts.ts    # Fetches active products for mobile app
│   ├── useWalletBalance.ts     # Fetches wallet balance with fallback
│   ├── use-mobile.ts           # Responsive mobile detection
│   └── use-toast.ts            # Toast helpers
│
├── lib/
│   ├── api.ts                  # Central Axios instance (base URL = /api)
│   ├── tokenManager.ts         # JWT token storage (httpOnly cookies + localStorage)
│   ├── accountService.ts       # account-ms API wrapper (~900 lines)
│   ├── appService.ts           # create-app-ms API wrapper
│   ├── productService.ts       # product-ms API wrapper
│   ├── product-api.ts          # Lower-level product API functions
│   ├── walletService.ts        # wallet-ms API wrapper
│   ├── paymentService.ts       # payment-ms API wrapper
│   ├── kycService.ts           # compliance-ms KYC API wrapper
│   ├── adminService.ts         # Admin-facing service wrapper
│   ├── specialApiService.ts    # Special API (requires API key; cross-merchant)
│   ├── springProductService.ts # Spring-specific product actions
│   ├── sanitize.ts             # HTML sanitisation (DOMPurify)
│   ├── session.ts              # Session utilities
│   ├── devBypass.ts            # Dev bypass mode (imported in root layout)
│   └── services/
│       └── billing-service.ts  # Billing API service
│
├── types/                      # Shared TypeScript types
├── styles/                     # Additional stylesheets
├── providers/                  # Root providers
├── public/                     # Static assets
├── server/                     # Local microservice source code (Node.js)
│   ├── product-ms/             # Product management microservice
│   ├── service-auth-ms/        # Auth microservice
│   └── create-app-ms/          # App management microservice
│
├── next.config.mjs             # Next.js config (security headers, image config)
├── tsconfig.json               # TypeScript config
├── package.json
└── .env.local                  # ← YOUR LOCAL ENVIRONMENT (never commit)
```

---

## 5. The Three Sub-Applications

### 5.1 Platter — Product Builder (`/dashboard/create-app/`)

The platform operator uses this to **create fintech apps and products**.

**Entry Point:** `/dashboard/create-app/` → `app/dashboard/create-app/page.tsx`

**Key Pages:**
- `all-apps/` — List of all created apps (clickable)
- `all-apps/[id]/` — Individual app detail view
- `all-apps/[id]/app-builder/` — App customization wizard (8 tabs)
- `all-apps/[id]/products/` — Product creation & management for an app
- `new-apps/` — Create a new app
- `wallet/` — Wallet management
- `transactions/` — Transaction history
- `drive/` — Document storage (Drive)
- `scam-alert/` — Fraud alert tools

**Product Creation Flow:**
```
Click "Create Product"
  → Select type: Loan | Mortgage | Savings | Commodity | Investment
  → Fill details in type-specific Create Drawer
    (e.g., create-loan-drawer.tsx)
  → Configure settings in Configure Drawer
    (e.g., configure-loan-drawer.tsx)
  → API call to product-ms
  → Product is created with status: 'complete', isActive: true
```

**App Builder Tabs** (at `/all-apps/[id]/app-builder/`):
| Tab | Component | Saves To |
|-----|-----------|---------|
| Template | `template-tab.tsx` | AppBuilderContext |
| Assets | `asset-tab.tsx` | create-app-ms |
| Onboarding | `onboarding-tab.tsx` | create-app-ms |
| App Profile | `app-profile-tab.tsx` | create-app-ms |
| Policy | `policy-tab.tsx` | create-app-ms |
| Support | `support-tab.tsx` | create-app-ms |
| DNS | `dns-tab.tsx` | create-app-ms |
| Publish | `publish-tab.tsx` | create-app-ms (versioning) |

All App Builder tab state is managed globally via `AppBuilderContext`.

---

### 5.2 Spring App — Merchant Dashboard (`/dashboard/merchant/`)

Merchants use this to **manage their business**: app products, customers, billing, team, compliance.

**Entry Point:** `/dashboard/merchant/` → `app/dashboard/merchant/page.tsx`

**Key Pages:**
- `/dashboard/merchant/` — App list (click an app to manage its products)
- `products/all/` — Product tabs (loan, mortgage, savings, commodity)
- `products/active/` — Product overview (active products only)
- `customer/` — Customer list
- `customer/[id]/applications/` — Per-customer applications
- `applications/` — All applications (with Approve/Reject)
- `applications/pending/` — Pending review queue
- `transactions/` — All transactions
- `wallets/` — Wallet management
- `billing/` — Billing, invoices, payment methods
- `app-builder/` — Configure the mobile app look & feel
- `settings/` — Account settings
- `admin/` — Team management (add staff/admin)
- `compliance/` — KYC/compliance docs
- `developer/` — API keys, webhooks, security

**Layouts:** The merchant section uses a conditional layout:
- For the main dashboard pages: `MerchantAppsSidebar` + minimal top bar
- For all other pages (products, customers, etc.): `MerchantSidebar` + `MerchantHeader`

This logic lives in `app/dashboard/merchant/layout.tsx`.

---

### 5.3 User Mobile App (`/mobile/` and `/mobile-v2/`)

End users browse and apply for financial products.

**Two versions exist:**
- `/mobile/` — V1 (Classic banking style)
- `/mobile-v2/` — V2 (Modern fintech style with updated design)

Both apps share the same overall structure but have different visual designs.

**Layout:** `app/mobile/layout.tsx` wraps everything in `max-w-md` to simulate a mobile device width.

**Key Pages:**
- `home/` — Dashboard with wallet balance and quick actions
- `products/` — Product type tabs (Loan, Savings, Mortgage, Commodity)
- `products/[id]/` — Individual product detail
- `profile/` — User profile & settings
- `kyc/` — 4-step KYC wizard (wired to compliance-ms)
- `checkout/` — Payment processing
- `auth/` — Auth flows (signup, login, OTP)
- `savings/` — Savings detail pages
- `loan/` — Loan detail pages
- `mortgage/` — Mortgage detail pages

**App Identification:** The mobile app uses an `appId` query param (`?appId=xxx`) to identify which merchant's app it is rendering. This `appId` drives:
- Fetching branding config via `useMobileConfig({ appId })`
- Fetching the right products via `useMobileProducts({ appId, type })`

---

## 6. Routing Map

```
/                           → Root landing page (selects which sub-app to go to)
├── /signin                 → Platform login
├── /signup                 → Platform signup
├── /forgot-password
├── /reset-password
├── /verify-email
├── /verify-otp
├── /verify-progress
├── /verify-success
├── /welcome

/spring/                    → Merchant onboarding
│   ├── signin/
│   ├── signup/
│   ├── onboarding/         → 7-step wizard
│   ├── verify-email/
│   ├── verify-progress/
│   └── verify-success/

/dashboard/                 → Shared dashboard shell
│   ├── overview/
│   ├── compliance/
│   ├── developer/
│   ├── settings/
│   ├── billing/
│   │
│   ├── create-app/                         → PLATTER
│   │   ├── page.tsx
│   │   ├── all-apps/
│   │   │   └── [id]/
│   │   │       ├── app-builder/
│   │   │       ├── products/
│   │   │       │   └── overview/
│   │   │       ├── wallet/
│   │   │       ├── transactions/
│   │   │       └── drive/
│   │   ├── new-apps/
│   │   ├── scam-alert/
│   │   └── wallet/
│   │
│   └── merchant/                           → SPRING APP
│       ├── page.tsx                        (app list)
│       ├── products/
│       │   ├── all/
│       │   │   ├── loan/
│       │   │   ├── mortgage/
│       │   │   ├── savings/
│       │   │   ├── commodity/
│       │   │   └── investment/
│       │   └── active/
│       ├── customer/
│       │   └── [customerId]/applications/
│       ├── applications/
│       │   └── pending/
│       ├── transactions/
│       ├── wallets/
│       ├── billing/
│       ├── app-builder/
│       ├── settings/
│       ├── admin/
│       ├── compliance/
│       └── developer/

/mobile/                    → USER APP V1
│   ├── home/
│   ├── products/
│   │   └── [id]/
│   ├── savings/
│   ├── loan/
│   ├── mortgage/
│   ├── profile/
│   ├── kyc/
│   └── checkout/

/mobile-v2/                 → USER APP V2
│   └── (same structure as /mobile/)

/admin/                     → Super admin (platform-level)
│   ├── users/
│   ├── product/
│   └── wallet-and-balances/

/api/                       → Next.js API Routes (proxy layer)
```

---

## 7. Authentication System

### Flow

1. User enters credentials on `/signin` or `/spring/signin`
2. Frontend calls `POST /api/auth/login` → proxied to `service-auth-ms`
3. Backend returns `{ accessToken, refreshToken, user }`
4. `AuthContext.signin()` calls `setSecureTokens()` from `lib/tokenManager.ts`
5. Tokens are stored in **httpOnly cookies** (via `/api/auth/set-tokens` API route) AND in `localStorage` (for client-side decoding only)
6. `getUserFromToken()` decodes the JWT payload from `localStorage` to populate the UI (never for auth purposes)
7. On logout, `clearSecureTokens()` clears both cookies and localStorage, then redirects to `/signin`

### The Axios Instance (`lib/api.ts`)

- **Base URL:** `/api` (all calls go through the Next.js proxy)
- **Request interceptor:** Attaches `Authorization: Bearer <token>` from `localStorage` for non-public endpoints
- **Response interceptor:** On 401, attempts to refresh token via `/api/auth/refresh`. If refresh fails, clears tokens and redirects to `/signin`

### AuthContext (`contexts/AuthContext.tsx`)

```typescript
const { user, loading, signin, logout, isAuthenticated } = useContext(AuthContext)
```

| Property | Type | Description |
|----------|------|-------------|
| `user` | `User \| null` | Current user (id, email, firstName, lastName, role) |
| `loading` | `boolean` | True while checking auth on mount |
| `isAuthenticated` | `boolean` | Shorthand for `!!user` |
| `signin(email, password)` | `Promise<void>` | Calls login API, sets tokens |
| `logout()` | `void` | Clears tokens, redirects to /signin |

### Token Storage Strategy

| Storage | What's Stored | Why |
|---------|--------------|-----|
| httpOnly Cookie | `accessToken`, `refreshToken` | Secure (XSS-proof), used for actual auth |
| localStorage | `accessToken` (copy) | Client-side JWT decode for user display info only |

---

## 8. State Management & Contexts

The app uses **React Context** for global state. There are no Redux or Zustand stores.

### AuthContext

- **File:** `contexts/AuthContext.tsx`
- **Scope:** Root layout (wraps entire app)
- **Purpose:** User authentication state and methods

### AppBuilderContext

- **File:** `contexts/AppBuilderContext.tsx`
- **Scope:** App Builder section only
- **Purpose:** Manages all 8 App Builder tab states in one place. Handles:
  - `appElements` (logo, splash screen assets)
  - `onboarding` (onboarding screen configs)
  - `appProfile` (colors, fonts, branding)
  - `policy` (rich text policy/terms content)
  - `support` (contact info, social links)
  - `dns` (custom domain config)
  - Version history
  - Save/publish operations

**Key pattern:** Every App Builder tab reads from and writes to this context instead of local state. Configuration auto-saves via `saveSection(sectionName)`.

---

## 9. API Layer & Service Files

### Architecture Pattern

```
UI Component
    ↓
lib/someService.ts         ← Typed service function
    ↓
lib/api.ts (Axios)         ← Adds auth headers
    ↓
/api/some-route/route.ts   ← Next.js API Route (proxy)
    ↓
https://some-ms.fly.dev    ← Backend microservice
```

> **Why the proxy?** All requests through `/api/*` avoid CORS issues when deployed to Vercel, since the Next.js server-side routes can forward with the correct auth headers.

### Service Files Quick Reference

| File | Microservice Target | Coverage |
|------|--------------------|----|
| `lib/api.ts` | (base Axios instance) | Auth headers, token refresh |
| `lib/accountService.ts` | `account-ms.fly.dev` | Accounts, Loans, Mortgages, Savings, Commodities, Customer management, Application approval |
| `lib/appService.ts` | `create-app-ms.fly.dev` | App CRUD, app configuration |
| `lib/productService.ts` | `product-ms.fly.dev` | Product CRUD, product configuration |
| `lib/product-api.ts` | `product-ms.fly.dev` | Lower-level product API functions |
| `lib/walletService.ts` | `wallet-ms.fly.dev` | Wallet balances, transactions |
| `lib/paymentService.ts` | `payment-ms.fly.dev` | Payment initiation and verification |
| `lib/kycService.ts` | `compliance-ms.fly.dev` | KYC submission, document upload |
| `lib/adminService.ts` | `account-ms`, `product-ms`, `wallet-ms` | Admin-facing data endpoints |
| `lib/specialApiService.ts` | `create-app-ms.fly.dev` | Special/privileged API (requires API key) |
| `lib/springProductService.ts` | `product-ms.fly.dev` | Spring-specific activation actions |
| `lib/services/billing-service.ts` | `billing-ms.fly.dev` | Billing & subscription management |

### Special API Service (`lib/specialApiService.ts`)

This service exposes **advanced cross-merchant capabilities** that require both a JWT and an additional `X-Special-Key` header. It covers:

- `specialAppApi` — View all apps across merchants
- `specialProductApi` — View/search all products, get subscribers
- `specialWalletApi` — Full wallet management (merchant & user)
- `specialUserApi` — Create users, list all users
- `specialTransactionApi` — Transaction history by user/product/app
- `specialDriveApi` — Document upload/retrieval per user or product
- `specialSubscriptionApi` — Subscribe users to products
- `specialApplicationApi` — Apply users to products, list applications

---

## 10. Component Library

### UI Primitives (`components/ui/`)

All Shadcn/UI components are here (57 files). These are the raw building blocks:
`Button`, `Input`, `Select`, `Dialog`, `Drawer`, `Sheet`, `Card`, `Badge`, `Table`, `Tabs`, `Switch`, `Checkbox`, `Tooltip`, `Toast`, `Sonner`, etc.

Do **not** edit these directly — they are managed by Shadcn conventions.

### Drawer Components (`components/drawers/`)

The drawer pattern is the **primary UI pattern** for forms and actions in this project. There are **44 drawers** covering:

| Category | Examples |
|----------|---------|
| Product creation | `create-loan-drawer.tsx`, `create-mortgage-drawer.tsx`, `create-savings-drawer.tsx`, `create-commodity-drawer.tsx` |
| Product configuration | `configure-loan-drawer.tsx`, `configure-mortgage-drawer.tsx`, `configure-savings-drawer.tsx`, `configure-commodity-drawer.tsx` |
| User applications | `loan-application-drawer.tsx`, `mortgage-application-drawer.tsx`, `savings-application-drawer.tsx`, `commodity-purchase-drawer.tsx` |
| App management | `create-app-drawer.tsx`, `info-on-app-drawer.tsx`, `app-created-success-drawer.tsx` |
| Account management | `account-detail-drawer.tsx`, `application-detail-drawer.tsx`, `suspend-account-drawer.tsx` |
| Success states | `success-drawer.tsx`, `application-success-drawer.tsx`, `invite-successful-drawer.tsx` |
| Security | `developer-security-drawer.tsx`, `two-factor-drawer.tsx` |

**Anatomy of a drawer:**
```tsx
<Drawer open={isOpen} onOpenChange={setIsOpen}>
  <DrawerContent>
    {/* Step-based multi-step form or single content panel */}
  </DrawerContent>
</Drawer>
```

Most drawers follow a multi-step pattern with a `currentStep` state variable.

### Sidebar Components

| Component | File | Used In |
|-----------|------|---------|
| Main Dashboard Sidebar | `components/sidebar.tsx` | `/dashboard/` general pages |
| Merchant Sidebar | `components/merchant-sidebar.tsx` | Merchant product, customer, billing pages |
| Merchant Apps Sidebar | `components/merchant-apps-sidebar.tsx` | Merchant main dashboard (app list) |
| Admin Sidebar | `components/admin-sidebar.tsx` | `/admin/` pages |

### App Builder Components (`components/app-builder/`)

Each tab of the App Builder has its own component file. They all consume `AppBuilderContext` for state.

Additionally:
- `mobile-preview-screen.tsx` — Real-time mobile preview rendered inside app builder
- `mobile-template-preview.tsx` — Shows V1/V2 template previews
- `mobile-iframe-preview.tsx` — Iframe-based preview

---

## 11. Key Feature Areas

### 11.1 Product Lifecycle

```
[Platter] Create App
    ↓
[Platter] Create Products (Loan/Mortgage/Savings/Commodity)
    Products created with: status: 'complete', isActive: true
    ↓
[Spring App] Merchant sees products via /merchant/products/all/
    Merchant can toggle isActive ON/OFF per product
    ↓
[Mobile App] useMobileProducts({ springAppId }) fetches isActive=true products
    Users see only activated products
```

### 11.2 Toggle Visibility Flow

1. Merchant visits `/dashboard/merchant/products/all/loan?appId=<id>`
2. Products are displayed with toggle switches
3. Toggling calls `PUT /api/products/[id]` with `{ isActive: true/false }`
4. product-ms persists the change
5. Mobile app's `useMobileProducts` hook fetches only `isActive=true && status=complete`

### 11.3 App Builder Configuration Flow

1. Merchant visits `/dashboard/merchant/app-builder/` or `/dashboard/create-app/all-apps/[id]/app-builder/`
2. `AppBuilderContext` loads existing configuration from create-app-ms
3. Merchant customizes tabs (template, assets, branding, onboarding, policy, support, DNS)
4. Each tab auto-saves via `saveSection(sectionName)` → `POST /api/apps/[id]/configuration/[section]`
5. Publish tab creates a versioned snapshot
6. Mobile app fetches configuration via `useMobileConfig({ appId })`

### 11.4 Mobile App Branding

The mobile app is not hardcoded to one look. It:
1. Reads `appId` from URL query params
2. Calls `GET /api/apps/[appId]/configuration/public`
3. `useMobileConfig` hook applies the merchant's custom colors, fonts, logo, onboarding screens
4. Any mobile app URL can be white-labeled just by changing the `appId`

### 11.5 KYC Flow (Mobile)

Full 4-step KYC wizard in `app/mobile/kyc/page.tsx`:
1. **Personal Info** — Name, DOB, nationality
2. **Address** — Street, city, state, postal code, country
3. **Documents** — Government ID (required), proof of address (optional); files uploaded as base64
4. **Review** — Full summary before submitting
Submits to `kycService.submitIndividualKyc()` → `compliance-ms`

### 11.6 Customer Application Management

Merchants can manage customer product applications:
- All Applications: `app/dashboard/merchant/applications/page.tsx`
- Pending Queue: `app/dashboard/merchant/applications/pending/page.tsx`
- Per-Customer: `app/dashboard/merchant/customer/[customerId]/applications/page.tsx`
- Approve/Reject via `accountService.applications.approve()` / `.reject()`

### 11.7 Billing

Located at `/dashboard/merchant/billing/`. Implemented via:
- `components/billing/billing-overview-tab.tsx`
- `components/billing/billing-usage-tab.tsx`
- `components/billing/billing-payment-methods-tab.tsx`
- `lib/services/billing-service.ts` → `billing-ms.fly.dev`
- **Note:** "Pay with Card" button is intentionally removed; only bank transfer is supported.

---

## 12. Environment Variables

Copy `.env.local.example` → `.env.local` and fill in:

```env
# ─── Backend Microservice URLs ───────────────────────────────────────────────
NEXT_PUBLIC_API_URL=https://service-auth-ms.fly.dev
NEXT_PUBLIC_CREATE_APP_SERVICE_URL=https://create-app-ms.fly.dev
NEXT_PUBLIC_PRODUCT_SERVICE_URL=https://product-ms.fly.dev
NEXT_PUBLIC_COMPLIANCE_URL=https://compliance-ms.fly.dev
NEXT_PUBLIC_WALLET_SERVICE_URL=https://wallet-ms.fly.dev
NEXT_PUBLIC_PAYMENT_SERVICE_URL=https://payment-ms.fly.dev
NEXT_PUBLIC_BILLING_SERVICE_URL=https://billing-ms.fly.dev

# ─── Special API Keys ─────────────────────────────────────────────────────────
# Required for specialApiService.ts (cross-merchant/privileged operations)
NEXT_PUBLIC_SPECIAL_API_KEY=your-special-api-key-here
NEXT_PUBLIC_PUBLIC_KEY=your-public-key-here

# ─── JWT Configuration ────────────────────────────────────────────────────────
# Used server-side for token validation in API routes
JWT_SECRET=your-super-secure-secret-key-minimum-32-characters

# ─── App Configuration ────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_NAME=SpringTD Dashboard
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ─── Spring App Identification ────────────────────────────────────────────────
# The Spring App's own appId — used by the mobile app to filter products
NEXT_PUBLIC_SPRING_APP_ID=wdpgeo0o0
```

> **Note:** All `NEXT_PUBLIC_*` variables are exposed to the browser. Non-prefixed variables (like `JWT_SECRET`) are server-side only.

---

## 13. Backend Microservices

All microservices are deployed on **Fly.dev** and use **SQLite** with **better-sqlite3** for persistence. Source code lives in `/server/`.

### Service Registry

| Service | URL | Purpose | Auth Required |
|---------|-----|---------|---------------|
| `service-auth-ms` | `https://service-auth-ms.fly.dev` | Login, signup, OTP, email verify, token refresh | No (for login/signup) |
| `create-app-ms` | `https://create-app-ms.fly.dev` | App CRUD, App Builder config, Special API | Yes |
| `product-ms` | `https://product-ms.fly.dev` | Product CRUD, configurations, toggle | Yes |
| `account-ms` | `https://account-ms.fly.dev` | User accounts, KYC, loan/savings/mortgage/commodity applications, customer management | Yes |
| `wallet-ms` | `https://wallet-ms.fly.dev` | Wallet balances, transaction history | Yes |
| `payment-ms` | `https://payment-ms.fly.dev` | Payment initiation, verification | Yes |
| `billing-ms` | `https://billing-ms.fly.dev` | Merchant billing, subscriptions, invoices | Yes |
| `compliance-ms` | `https://compliance-ms.fly.dev` | KYC submission, document compliance | Yes |

### Key API Endpoints

**service-auth-ms:**
```
POST /api/v1/auth/register       - Register new user
POST /api/v1/auth/login          - Login, returns tokens
POST /api/v1/auth/refresh        - Refresh access token
POST /api/v1/auth/verify-account - Verify email with OTP
POST /api/v1/auth/resend-otp     - Re-send OTP
```

**product-ms:**
```
GET    /api/v1/products              - List products
POST   /api/v1/products              - Create product
GET    /api/v1/products/:id          - Get product
PUT    /api/v1/products/:id          - Update product (incl. isActive toggle)
DELETE /api/v1/products/:id          - Delete product
GET    /api/v1/products/active       - Get active+complete products (for mobile)
GET    /api/v1/apps/:appId/products  - Get products by app
POST   /api/v1/configurations        - Create config
PUT    /api/v1/configurations/:id    - Update config
```

**create-app-ms:**
```
GET    /api/v1/apps              - List apps
POST   /api/v1/apps              - Create app
GET    /api/v1/apps/:id          - Get app
PUT    /api/v1/apps/:id          - Update app
DELETE /api/v1/apps/:id          - Delete app
GET    /api/v1/apps/:id/configuration/public  - Get public config (for mobile)
POST   /api/v1/configuration/*   - Save builder sections
```

### Health Checks

```bash
curl https://service-auth-ms.fly.dev/health
curl https://create-app-ms.fly.dev/health
curl https://product-ms.fly.dev/health
```

---

## 14. What's Done vs. What's Pending

### ✅ Fully Implemented

| Feature | Location |
|---------|----------|
| Merchant onboarding (7-step wizard) | `/app/spring/` |
| Platform auth (login, signup, OTP, password reset) | `/app/signin/`, `/app/signup/`, etc. |
| Platter — App creation & management | `/app/dashboard/create-app/` |
| Platter — Product creation (all 4 types + config drawers) | `/components/drawers/create-*.tsx`, `configure-*.tsx` |
| App Builder (all 8 tabs with auto-save) | `/components/app-builder/` |
| AppBuilderContext global state | `contexts/AppBuilderContext.tsx` |
| Publish/version control | `publish-tab.tsx` |
| DNS configuration UI | `dns-tab.tsx` |
| Spring App — Product list & toggle | `/dashboard/merchant/products/` |
| Spring App — Customer management | `/dashboard/merchant/customer/` |
| Spring App — Application management (approve/reject) | `/dashboard/merchant/applications/` |
| Spring App — Billing | `/dashboard/merchant/billing/` |
| Spring App — Developer section | `/dashboard/merchant/developer/` |
| Spring App — Admin/Team management | `/dashboard/merchant/admin/` |
| Spring App — Compliance | `/dashboard/merchant/compliance/` |
| Mobile V1 — All pages | `/app/mobile/` |
| Mobile V2 — All pages | `/app/mobile-v2/` |
| Mobile — KYC (4-step, wired to compliance-ms) | `/app/mobile/kyc/` |
| Mobile — `useMobileConfig` hook | `hooks/useMobileConfig.ts` |
| Mobile — `useMobileProducts` hook | `hooks/useMobileProducts.ts` |
| Mobile — `useWalletBalance` hook | `hooks/useWalletBalance.ts` |
| Product `isActive` toggle persisting to backend | `product-api.ts`, `product-cards.tsx` |
| Admin panel (users, products, wallet — real API) | `/app/admin/` |
| SQLite persistence on all 3 local microservices | `/server/*/src/db/` |

### ⚠️ Partially Implemented

| Feature | What's Missing |
|---------|---------------|
| App Builder tabs — full save coverage | Some tabs still have incomplete auto-save |
| Mobile V2 products — real data integration | V2 still uses some hardcoded/mock data |

### ❌ Not Yet Implemented

| Feature | Priority | Notes |
|---------|----------|-------|
| `/api/mobile/[appId]/products` API route | P0 | Mobile product filtering by specific appId |
| Mobile V2 product pages using real data | P1 | All V2 tabs use mock data |
| Mobile home — real product showcase | P1 | Home page shows static mock products |
| Product subscription flow (user subscribes to product) | P2 | account-ms integration needed |
| Real wallet balances in mobile | P2 | wallet-ms integration needed |
| Real transaction history in mobile | P2 | transaction API integration needed |
| Product application flow end-to-end | P2 | Apply for loan/mortgage on mobile |
| Analytics dashboard for merchants | P3 | Business metrics/insights |
| Push notifications | P3 | Product updates to users |

---

## 15. Code Conventions & Patterns

### File Naming

- **Pages:** `page.tsx` (Next.js App Router convention)
- **Layouts:** `layout.tsx`
- **Components:** `kebab-case.tsx` (e.g., `merchant-sidebar.tsx`)
- **Hooks:** `camelCase.ts` prefixed with `use` (e.g., `useMobileConfig.ts`)
- **Services:** `camelCase.ts` (e.g., `accountService.ts`)

### Import Aliases

The project uses `@/` as a path alias for the root directory:
```typescript
import { Button } from "@/components/ui/button"
import api from "@/lib/api"
import { AuthContext } from "@/contexts/AuthContext"
```

### Design System — Color Palette

| Usage | Color | Hex |
|-------|-------|-----|
| Spring App primary (purple) | Purple | `#7C3AED` / `#48229F` |
| Spring App background | Light gray | `#F3F4F6` |
| Merchant sidebar active | Purple | `#7C3AED` |
| Status badge — Active | Purple fill | `bg-purple-100 text-purple-700` |
| Success | Green | Tailwind green |
| Error/Danger | Red | Tailwind red |

### Toast Notifications

Two toast systems are used (both work):
1. **Sonner** (`import { toast } from 'sonner'`) — used on most new pages
2. **React Toastify** (`import { toast } from 'react-toastify'`) — used on some older components

Prefer **Sonner** for any new code.

### API Error Handling Pattern

```typescript
try {
  const response = await fetch('/api/some-endpoint', { ... })
  const result = await response.json()
  
  if (result.success && result.data) {
    // handle success
  } else {
    console.warn('API returned error:', result.error)
    // show fallback or empty state
  }
} catch (error) {
  console.error('Failed to fetch:', error)
  // show error toast
  toast.error('Something went wrong')
}
```

### Multi-Step Form Pattern (Drawers)

```typescript
const [currentStep, setCurrentStep] = useState(1)
const totalSteps = 3

// Step navigation buttons:
// Back: setCurrentStep(prev => prev - 1)
// Next: validate then setCurrentStep(prev => prev + 1)
// Submit: on final step, call API
```

---

## 16. Common Gotchas & Tips

### 1. TypeScript Build Errors Are Suppressed

In `next.config.mjs`:
```js
typescript: { ignoreBuildErrors: true }
```
This means TypeScript errors **won't break the build**. Always fix TypeScript errors before PR — don't rely on this escape hatch.

### 2. The `devBypass.ts` Import

`import "@/lib/devBypass"` is in the root layout. This enables a developer bypass mode for local testing. It's safe to leave as-is.

### 3. Token Storage is Dual

Tokens live in **both** httpOnly cookies (secure) and `localStorage` (for client decoding). The `localStorage` copy should only be used to display user info (name, email). All actual auth happens via the cookie.

### 4. AppId vs SpringAppId

These are different things:
- `appId` — The Product Builder's app ID (the app that **created** the product)
- `springAppId` — The Spring/Merchant app ID that **activated** the product for their users

Mobile apps fetch products by `springAppId`, not `appId`.

### 5. Products Must Be `complete` AND `isActive: true`

The `useMobileProducts` hook (and the `/api/products/active` endpoint) only returns products where **both** `status === 'complete'` **and** `isActive === true`. If products aren't showing on mobile, check these two fields.

### 6. Layout Conditional Logic

The merchant layout (`app/dashboard/merchant/layout.tsx`) switches between two sidebars based on the current pathname. If you add a new page under `/dashboard/merchant/`, check whether it needs to be added to the `isAppsSidebarPage` list.

### 7. Mobile Max Width

The mobile app layout enforces `max-w-md` (448px) width to simulate a phone screen. Do not set widths that break this constraint.

### 8. Template Literal Spacing Errors

TipTap and some other libraries have caused template literal spacing build issues in the past. If you see build errors related to string interpolation, check for extra spaces inside template literals.

### 9. Two Toast Libraries

Don't mix `sonner` and `react-toastify` within the same feature. New code should use `sonner`.

### 10. Image Config

```js
images: { unoptimized: true }
```
Images are not optimized via Next.js Image Optimization. Suitable for current Fly.dev/Vercel hosting setup.

---

## Quick Reference — Running Local Microservices

If you need to run the services locally (instead of using the Fly.dev URLs):

```bash
# product-ms
cd server/product-ms && npm install && npm run dev
# Runs on: http://localhost:3001

# service-auth-ms
cd server/service-auth-ms && npm install && npm run dev
# Runs on: http://localhost:3002

# create-app-ms
cd server/create-app-ms && npm install && npm run dev
# Runs on: http://localhost:3003
```

Then update `.env.local` to point to `localhost` instead of Fly.dev URLs.

---

## Useful Shell Scripts

The project root has several diagnostic shell scripts:

| Script | Purpose |
|--------|---------|
| `health-check.sh` | Pings all microservice health endpoints |
| `test-services.sh`/`.mjs` | Comprehensive API test suite |
| `test-product-api.sh` | Tests product-ms CRUD endpoints |
| `test-complete-flow.sh` | End-to-end flow test |
| `diagnose-product-issue.sh` | Diagnoses product display issues |
| `check-services.sh` | Checks if all services are online |

---

*This document was generated in March 2026 as a developer onboarding reference. For the very latest changes to any specific feature, refer to `CHANGELOG.md` and the individual feature documentation files (`SYSTEM_ARCHITECTURE.md`, `ACCOUNT_MS_INTEGRATION.md`, `CREATE_APP_MS_INTEGRATION.md`, etc.).*
