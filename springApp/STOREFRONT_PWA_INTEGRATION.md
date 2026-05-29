# Storefront PWA integration (tenant subdomain)

Guide for the **end-user app** served on a merchant subdomain (e.g. `https://www.{subdomain}.tryspring.io`). All API calls use **the same origin as the PWA** — **account-ms** acts as the gateway and proxies to create-app-ms, client-auth-ms, product-ms, compliance-ms, wallet-ms, etc.

## Host and API base URL

| Environment | Example storefront origin | API base |
|-------------|---------------------------|----------|
| Production | `https://www.crbc.tryspring.io` | Same origin (empty path prefix) |
| Local (if tenant DNS points here) | `http://localhost:4008` with `Host: www.crbc.tryspring.io` | `http://localhost:4008` |

**Subdomain label:** `crbc` in `www.crbc.tryspring.io` (prefix from `APP_SUBDOMAIN_PREFIX`, domain from `APP_PLATFORM_BASE_DOMAIN`).

**Tenant headers:** When the browser calls account-ms on a tenant host, the gateway sets `x-tenant-app-id`, `x-tenant-merchant-id`, and `x-tenant-subdomain` on proxied requests. The frontend does **not** need to send these manually if it uses same-origin requests.

**Auth header (after login):**

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
```

---

## Shared types

### Product (`type` field)

One of: `LOAN` | `MORTGAGE` | `SAVINGS` | `INVESTMENT` | `COMMODITY`.

### Standard success envelope

```json
{ "success": true, "data": { } }
```

### Standard error envelope

```json
{ "success": false, "error": "Human-readable message" }
```

---

## Screen 0 — App bootstrap (splash / shell)

Runs on every cold start before or after login.

### Resolve tenant → `appId`, branding, PWA

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/v1/apps/resolve/{subdomain}` |
| **Auth** | None |

**Example:** `GET /api/v1/apps/resolve/crbc`

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "id": "674a1b2c3d4e5f6789012345",
    "merchantId": "merchant-uuid",
    "subdomain": "crbc",
    "status": "active",
    "defaultAppUrl": "https://www.crbc.tryspring.io/",
    "pwaManifest": {
      "name": "CRBC Store",
      "short_name": "CRBC",
      "description": "Your financial app",
      "start_url": "https://www.crbc.tryspring.io/",
      "scope": "https://www.crbc.tryspring.io/",
      "display": "standalone",
      "theme_color": "#6B46C1",
      "background_color": "#E5E7EB",
      "icons": [
        {
          "src": "https://cdn.example/logo.png",
          "sizes": "192x192",
          "type": "image/png",
          "purpose": "any maskable"
        }
      ]
    },
    "pwaInstall": {
      "manifestUrl": "https://gateway.example/api/v1/apps/674a…/pwa/manifest.webmanifest",
      "serviceWorkerUrl": "https://gateway.example/api/v1/apps/674a…/pwa/sw.js",
      "pwaEntryUrl": "https://www.crbc.tryspring.io/",
      "version": "2026-05-19T12:00:00.000Z"
    }
  }
}
```

`pwaManifest` / `pwaInstall` are omitted until the merchant has **published** the PWA at least once.

**Errors:** `404` unknown subdomain · `410` app suspended

**Frontend state to persist:**

```ts
interface TenantContext {
  appId: string;        // data.id
  merchantId: string;   // data.merchantId
  subdomain: string;
  pwaManifest?: WebAppManifest;
}
```

**Optional same-origin manifest:** `GET /manifest.webmanifest` on the tenant host returns the same JSON as `pwaManifest` (cached up to 60s).

---

## Screen 1 — Login / register

### Register (retail user on subdomain)

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/v1/registration/user` or `/api/v1/auth/register` |
| **Auth** | None |

**Request body:**

```json
{
  "first_name": "Jane",
  "last_name": "Smith",
  "email": "jane@example.com",
  "phone": "+2348012345678",
  "country": "NG",
  "password": "SecurePass123!"
}
```

On a tenant host, omit `user_merchant_id` (gateway fills from tenant). `app_id` is stored from `x-tenant-app-id`, not from the JSON body.

**Response `201`/`200`:** includes `user`, optional `accessToken`, `wallet`, `fuspayProfileCreated`, etc. (see client-auth-ms README).

### Login

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/v1/auth/login` |
| **Auth** | None |

**Request:**

```json
{
  "email": "jane@example.com",
  "password": "SecurePass123!"
}
```

**Response `200`:**

```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIs…",
  "refreshToken": "…",
  "sessionId": "…",
  "emailVerified": true,
  "user": {
    "id": "user-uuid",
    "email": "jane@example.com",
    "first_name": "Jane",
    "last_name": "Smith",
    "user_type": "user",
    "user_merchant_id": "merchant-uuid",
    "country": "NG",
    "status": "active",
    "email_verified": true,
    "app_id": "674a1b2c3d4e5f6789012345"
  }
}
```

**Response `401`:** `{ "success": false, "error": "Invalid email or password" }`

### Refresh session

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/v1/auth/refresh` |

**Request:** `{ "refreshToken": "…" }`  
**Response:** `{ "success": true, "data": { "accessToken", "refreshToken" } }`

### Current profile

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/v1/user/profile` |
| **Auth** | Bearer required |

**Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "jane@example.com",
      "first_name": "Jane",
      "last_name": "Smith",
      "app_id": "674a1b2c3d4e5f6789012345"
    }
  }
}
```

Prefer this over `GET /api/v1/auth/me` (not fully implemented).

---

## Screen 2 — Home / product catalog

Shows products the **merchant turned on** for this app (not the global Plata catalog).

### List app products

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/v1/products/app/{appId}` |
| **Alias** | `/api/v1/products/merchant/{appId}` |
| **Auth** | Optional (public today) |

**Example:** `GET /api/v1/products/app/674a1b2c3d4e5f6789012345`

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": "6790abc123def45678901234",
      "upstreamProductId": "upstream-plata-id",
      "referenceNumber": "PRD-123456-ABCD",
      "name": "Quick Loan",
      "description": "Short-term personal loan",
      "type": "LOAN",
      "subType": "Personal",
      "appId": "674a1b2c3d4e5f6789012345",
      "status": "complete",
      "isActive": true,
      "isFeatured": true,
      "createdAt": "2026-03-23T09:53:34.130Z",
      "updatedAt": "2026-05-19T10:00:00.000Z",
      "structure": {
        "interestRate": 12,
        "loanAmount": { "min": 10000, "max": 500000 }
      },
      "about": { "tenure": { "min": 3, "max": 12 } },
      "requirements": {},
      "feesAndCharges": {
        "fees": [{ "name": "Processing", "feeType": "percentage", "value": "2" }]
      }
    }
  ]
}
```

**Client filtering (required):**

```ts
const activeProducts = (data ?? []).filter((p) => p.isActive === true);
const featuredProducts = activeProducts.filter((p) => p.isFeatured === true);
```

Merchants set featured products via **`PUT /api/v1/products/featured/{appId}`** with body `{ "productIds": ["<local id>", ...] }` (only turned-on products; replaces the previous featured set). Alternatively **`PUT /api/v1/products/config/{appId}/{productId}`** with **`isFeatured`**.

**UI mapping (suggested):**

| UI field | API field |
|----------|-----------|
| Title | `name` |
| Subtitle | `subType` or `type` |
| Description | `description` |
| Badge | `type` |
| “Featured” / hero | `isFeatured === true` (subset of turned-on products) |
| Navigate to detail | `id` (local Mongo id) |

**Do not use** `GET /api/v1/products` on this screen — that returns the **full upstream catalog**, not app-enabled products.

**Fee display on list:** Prefer fetching detail per card, or only show `feesAndCharges` and ignore `baseFeesAndCharges` / `merchantFeeAdditions` if present on list items.

---

## Screen 3 — Product detail

Full product configuration for apply flow.

### Get product by id

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/v1/products/{productId}` |
| **Auth** | Optional |

Use **`id` from the catalog list** (local app product id).

**Response `200`:** Same product shape; **customer-safe** — `baseFeesAndCharges` and `merchantFeeAdditions` are removed; use `feesAndCharges` only.

```json
{
  "success": true,
  "data": {
    "id": "6790abc123def45678901234",
    "name": "Quick Loan",
    "description": "Short-term personal loan",
    "type": "LOAN",
    "subType": "Personal",
    "appId": "674a1b2c3d4e5f6789012345",
    "status": "complete",
    "isActive": true,
    "structure": {
      "interestRate": 12,
      "repaymentFrequency": "monthly",
      "loanAmount": { "min": 10000, "max": 500000 }
    },
    "about": {
      "tenure": { "min": 3, "max": 12 },
      "loanTypes": [{ "name": "Personal", "description": "…" }]
    },
    "requirements": {
      "security": { "guarantor": true },
      "documentsToDownload": [{ "name": "ID", "fileUrl": "https://…" }]
    },
    "feesAndCharges": {
      "fees": [{ "name": "Processing", "feeType": "percentage", "value": "2" }],
      "lateRepayment": { "enabled": true, "penalties": [] }
    }
  }
}
```

**Response `404`:** `{ "success": false, "error": "Product not found" }`

**Type-specific UI hints:**

| `type` | Show from `structure` / `about` |
|--------|----------------------------------|
| `LOAN` | `loanAmount`, `interestRate`, `repaymentFrequency`, tenure |
| `MORTGAGE` | `properties[]`, equity, rates |
| `SAVINGS` | `savingsAmount`, withdrawal rules |
| `INVESTMENT` | `investmentAmount`, yield, unit purchase |
| `COMMODITY` | `price`, `unitOfMeasure`, `commodityPrices` |

---

## Screen 4 — Apply / enroll

Use **`user.id`** from login and **`product.id`** from detail.

### Common apply body

```json
{
  "userId": "user-uuid",
  "productId": "6790abc123def45678901234",
  "amount": 50000,
  "currency": "NGN",
  "email": "jane@example.com",
  "applicantName": "Jane Smith",
  "phone": "+2348012345678",
  "bvn": "22123456789",
  "country": "NG",
  "requirementSubmissions": [
    {
      "requirementId": "valid-id",
      "requirementType": "identity",
      "label": "Valid ID",
      "type": "document",
      "fileUrl": "https://springtd-product-documents.nyc3.digitaloceanspaces.com/id.pdf",
      "fileName": "id.pdf",
      "fileType": "application/pdf",
      "fileSize": 123456
    }
  ]
}
```

For loan and mortgage products, render the product detail `requirements` as the end-user application checklist. Upload binaries first through `/api/v1/applications/upload`, then send the returned URL as `fileUrl` in `requirementSubmissions`.

**Application document upload:**

```http
POST /api/v1/applications/upload
Content-Type: multipart/form-data
```

Use `file` for the binary field. You can also include `userId` as a form field so `product-ms` namespaces the Spaces object key by user. The response is:

```json
{
  "success": true,
  "url": "https://springtd-product-documents.nyc3.digitaloceanspaces.com/product-applications/user-uuid/file.pdf",
  "key": "product-applications/user-uuid/file.pdf",
  "fileName": "id.pdf",
  "fileType": "application/pdf",
  "fileSize": 123456
}
```

Any `requirements.otherRequirements[]` item with `uploadRequired: true` or `required: true` must have a matching submission. Matching is by `requirementId`, `requirementType`, or `label`.

### By product type

| `type` | Method | Path | Notes |
|--------|--------|------|--------|
| `LOAN` | `POST` | `/api/v1/applications/apply` | Canonical apply path; proxied to `product-ms` |
| `MORTGAGE` | `POST` | `/api/v1/applications/apply` | Canonical apply path; proxied to `product-ms` |
| `COMMODITY` | `POST` | `/api/v1/commodities/buy` | Validates commodity type |
| `SAVINGS` | `POST` | `/api/v1/savings-accounts` | See body below |
| `INVESTMENT` | `POST` | `/api/v1/applications/apply` | Not supported by the product application table today; use product-specific flow |

`/api/v1/applications/*` is proxied by `account-ms` to `product-ms`. Submitted loan/mortgage applications live in the `product-ms` `product_applications` collection. `/api/v1/loans/apply` and `/api/v1/mortgages/apply` remain gateway aliases, but new storefront clients should use `/api/v1/applications/apply`.

For Plata upstream sync (`POST /api/v1/products/external-applications` via account-ms), include **`applicantName`**, **`phone`**, **`bvn`** (11 digits), and a valid **`email`**. The product must be activated from the Plata catalog (`upstreamProductId` on the local product).

**Merchant roles:** Spring is the Plata integrator (`merchantId` from server env `PLATA_INTEGRATOR_MERCHANT_ID`). The tenant from login/app (`merchantId` on the apply body from gateway) is the **sub-merchant** (`offeringMerchantId`). Optionally send `subMerchant` or `subMerchantContactEmail` + `subMerchantContactPhone` for the usage event.

**Savings body:**

```json
{
  "userId": "user-uuid",
  "currency": "NGN",
  "productId": "6790abc123def45678901234",
  "email": "jane@example.com"
}
```

### Success — pending application (`LOAN` / `MORTGAGE`)

**Response `201`:**

```json
{
  "success": true,
  "message": "Application submitted successfully. Pending approval.",
  "data": {
    "id": "application-id",
    "userId": "user-uuid",
    "productId": "6790abc123def45678901234",
    "productName": "Quick Loan",
    "productType": "LOAN",
    "amount": 50000,
    "currency": "NGN",
    "status": "PENDING",
    "appId": "674a1b2c3d4e5f6789012345",
    "merchantId": "merchant-uuid",
    "requirementsSnapshot": {
      "security": { "guarantor": true }
    },
    "requirementSubmissions": [
      {
        "requirementId": "valid-id",
        "type": "document",
        "fileUrl": "https://springtd-product-documents.nyc3.digitaloceanspaces.com/id.pdf"
      }
    ],
    "createdAt": "2026-05-19T12:00:00.000Z",
    "updatedAt": "2026-05-19T12:00:00.000Z"
  }
}
```

### Success — instant account (e.g. `SAVINGS`, some others)

```json
{
  "success": true,
  "message": "Product account created successfully.",
  "data": {
    "type": "account",
    "account": {
      "id": "acc_1",
      "userId": "user-uuid",
      "accountType": "savings",
      "balance": 0,
      "currency": "NGN",
      "status": "active"
    }
  }
}
```

### Errors

| Status | Meaning |
|--------|---------|
| `400` | Missing `userId`, `productId`, `amount`, or `currency` |
| `400` | Missing required product requirement submission |
| `403` | Product not active for this app |
| `404` | Product not found |
| `500` | Server error — show `error` message |

---

## Screen 5 — My applications (optional)

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/v1/applications/user/{userId}` |
| **Auth** | None required by route today; send Bearer in production |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "app_1",
      "userId": "user-uuid",
      "productId": "6790abc123def45678901234",
      "productName": "Quick Loan",
      "productType": "LOAN",
      "amount": 50000,
      "currency": "NGN",
      "status": "PENDING",
      "appId": "674a1b2c3d4e5f6789012345",
      "requirementsSnapshot": {},
      "requirementSubmissions": [],
      "createdAt": "…",
      "updatedAt": "…"
    }
  ]
}
```

**Filtered lists:**  
- `GET /api/v1/loans/user/{userId}`  
- `GET /api/v1/mortgages/user/{userId}`  

**Single application:** `GET /api/v1/applications/{id}` or `GET /api/v1/loans/{id}`

---

## Screen 6 — Wallet & KYC (post-signup)

Often required before disbursement or funding.

### User wallet

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/v1/wallets/user/{userId}` |
| **Auth** | Bearer |

Poll after KYC completes to show `virtualNuban` when provisioned.

### Fuspay modular KYC (retail)

Proxied under `/api/v1/kyc/…` (compliance-ms). Typical flow:

1. `POST /api/v1/kyc/modular/verification` — start verification (Bearer)
2. `GET /api/v1/kyc/modular/verification-url` — URL for iframe / redirect
3. `GET /api/v1/kyc/modular/status/{verificationId}` — poll status
4. After webhook → wallet NUBAN available via wallet GET above

See **compliance-ms** README for full modular KYC payloads.

---

## End-to-end navigation map

```text
[Bootstrap]
  GET /api/v1/apps/resolve/{subdomain}
       → store appId, merchantId, apply theme from pwaManifest

[Auth gate]
  POST /api/v1/auth/login  OR  POST /api/v1/registration/user
       → store accessToken, user.id, user.app_id

[Home]
  GET /api/v1/products/app/{appId}
       → filter isActive === true
       → tap product → Detail

[Product detail]
  GET /api/v1/products/{productId}
       → render type-specific fields
       → CTA → Apply

[Apply]
  POST by type (loans / mortgages / commodities / savings / applications)
       → success → Applications list or Wallet

[My applications]
  GET /api/v1/applications/user/{userId}
```

---

## Reference client (TypeScript)

```ts
const API_BASE = ''; // same origin

async function resolveTenant(subdomain: string) {
  const res = await fetch(`${API_BASE}/api/v1/apps/resolve/${encodeURIComponent(subdomain)}`);
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'Tenant not found');
  return json.data as { id: string; merchantId: string; subdomain: string; pwaManifest?: object };
}

async function login(email: string, password: string) {
  const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json as { accessToken: string; user: { id: string; app_id?: string } };
}

async function listActiveProducts(appId: string, token?: string) {
  const res = await fetch(`${API_BASE}/api/v1/products/app/${appId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return (json.data as Array<{ id: string; isActive: boolean }>).filter((p) => p.isActive);
}

async function getProduct(productId: string, token?: string) {
  const res = await fetch(`${API_BASE}/api/v1/products/${productId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'Not found');
  return json.data;
}

async function applyForLoan(
  body: { userId: string; productId: string; amount: number; currency: string; email?: string },
  token: string
) {
  const res = await fetch(`${API_BASE}/api/v1/loans/apply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}
```

---

## Gateway route index (account-ms)

| Prefix | Backend |
|--------|---------|
| `/api/v1/apps/*` | create-app-ms |
| `/api/v1/auth/*`, `/api/v1/registration/*`, `/api/v1/user/*` | client-auth-ms |
| `/api/v1/products/*`, `/api/v1/configurations/*` | product-ms |
| `/api/v1/applications/*`, `/api/v1/loans/*`, `/api/v1/mortgages/*`, `/api/v1/savings-accounts/*`, `/api/v1/commodities/*` | account-ms (local) |
| `/api/v1/kyc/*`, `/api/v1/compliance/*` | compliance-ms |
| `/api/v1/wallets/*` | wallet-ms |


