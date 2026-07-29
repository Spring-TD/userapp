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

### Loan / mortgage two-step flow

For loan and mortgage products, the mobile storefront should use the modal button to initialize the application before showing the requirements screen:

1. User taps **Go ahead, Create Bank account**.
2. Storefront calls `POST /api/v1/applications/init`.
3. Backend creates the local application, calls Plata upstream to create the application / bank account, then returns the account number created by Plata.
4. Storefront renders the requirements screen from `data.requirementsSnapshot` in the init response.
5. Storefront uploads files with `POST /api/v1/applications/upload`, then submits the completed requirement rows with `PATCH /api/v1/applications/{applicationId}/requirements`.
6. Storefront shows the final summary / mortgage “Buy More” screen, then calls `POST /api/v1/applications/{applicationId}/submit`.

### Post-approval mortgage flow (after merchant approves)

When Plata approves a **MORTGAGE**, the loan-workflow webhook includes `disbursementDeferred: true` and `postApprovalFulfillment` — the storefront **does not** receive wallet credit until disbursement completes. Drive these screens from the pending-approved-mortgage APIs (proxied by account-ms → product-ms):

| Screen | Method | Path |
|--------|--------|------|
| List active offers | `GET` | `/api/v1/applications/user/{userId}/pending-approved-mortgages` |
| Offer / step detail | `GET` | `/api/v1/applications/{id}/pending-approved-mortgage?userId=` |
| Accept / decline offer | `POST` | `/api/v1/applications/{id}/pending-approved-mortgage/offer` |
| Schedule inspection | `POST` | `/api/v1/applications/{id}/pending-approved-mortgage/appointment` |
| Start inspection | `POST` | `/api/v1/applications/{id}/pending-approved-mortgage/inspection/start` |
| Complete inspection | `POST` | `/api/v1/applications/{id}/pending-approved-mortgage/inspection/complete` |
| Pay down payment (wallet) | `POST` | `/api/v1/applications/{id}/pending-approved-mortgage/down-payment` |

Down-payment detail includes `requiredAmount`, `currency`, `centralWalletAvailable: true`, and `bankDetails.merchantReference` (`equity-payment:{upstreamApplicationId}`) for bank transfer. After disbursement, the standard loan-workflow webhook includes `loanDisbursement` and the PRODUCT wallet is credited.

**Initialize loan / mortgage application:**

```http
POST /api/v1/applications/init
Content-Type: application/json
```

```json
{
  "userId": "user-uuid",
  "productId": "6790abc123def45678901234",
  "merchantId": "merchant-uuid",
  "amount": 50000,
  "currency": "NGN",
  "email": "jane@example.com",
  "applicantName": "Jane Smith",
  "phone": "+2348012345678",
  "bvn": "22123456789",
  "country": "NG"
}
```

**Response `201`:** `data` is the application. Use:

- `data.id` as the `applicationId` for the requirements submit call.
- `data.requirementsSnapshot` to render the requirements screen. This is copied from the product DB `requirements` object, including `security`, `documentsToDownload`, and `otherRequirements`.
- `data.productWallet.upstreamAccount` for the Plata-created bank account. The init call now requires `upstreamAccount.accountNumber`; if Plata does not return an account number, the endpoint fails with `502`.

**Response `200`:** the user already has a pending initialized application for the same `userId`, `productId`, `merchantId`, and app. `data` is the existing application; skip the create-bank-account modal and continue from `data.id`.

For `requirements.documentsToDownload`, render each item as a **Download File** + **Upload File** row. The user downloads the configured `fileUrl`, fills the form, uploads the completed form through `/api/v1/applications/upload`, then includes that returned upload URL in `requirementSubmissions`. Match the submitted row by the document `name` using `requirementType` or `label`.

**Submit completed requirements:**

```http
PATCH /api/v1/applications/{applicationId}/requirements
Content-Type: application/json
```

```json
{
  "userId": "user-uuid",
  "requirementSubmissions": [
    {
      "requirementType": "Application Form",
      "label": "Application Form",
      "type": "document",
      "fileUrl": "https://springtd-product-documents.nyc3.digitaloceanspaces.com/product-applications/user-uuid/completed-application-form.pdf",
      "fileName": "completed-application-form.pdf",
      "fileType": "application/pdf",
      "fileSize": 123456,
      "metadata": {
        "source": "documentsToDownload",
        "downloadedFileUrl": "https://example.com/forms/application.pdf"
      }
    },
    {
      "requirementType": "Account Statement",
      "label": "Account Statement",
      "type": "document",
      "fileUrl": "https://springtd-product-documents.nyc3.digitaloceanspaces.com/id.pdf",
      "fileName": "statement.pdf",
      "fileType": "application/pdf",
      "fileSize": 123456
    },
    {
      "requirementType": "Employment",
      "label": "Employment",
      "type": "json",
      "value": {
        "occupation": "Engineer",
        "placeOfWork": "Example Ltd",
        "hrName": "Jane HR",
        "hrEmail": "hr@example.com"
      }
    }
  ]
}
```

Every `requirements.documentsToDownload[]` item must have a completed uploaded form submission with matching `requirementType` or `label` and a `fileUrl`.

Any `requirements.otherRequirements[]` item with `uploadRequired: true` or `required: true` must have a matching submission. Matching is by `requirementId`, `requirementType`, or `label`. Upload-style items with `contentType: "document"` or `contentType: "document_upload"` must include `fileUrl`.

If `data.requirementsSnapshot.security.guarantor === true`, show **+ Add a Guarantor**. When the user fills the guarantor form and taps **Generate KYC link**, call:

```http
POST /api/v1/applications/{applicationId}/guarantors
Content-Type: application/json
```

```json
{
  "userId": "user-uuid",
  "fullName": "Charles Avis",
  "email": "talktoavischales@gmail.com",
  "phone": "+23470452781",
  "occupation": "Trader",
  "relationship": "Brother",
  "country": "NG"
}
```

The backend creates the guarantor's upstream KYC verification link and stores the guarantor on the application.

**Response `201`:**

```json
{
  "success": true,
  "message": "Guarantor KYC verification link created.",
  "data": {
    "guarantor": {
      "id": "guarantor-id",
      "fullName": "Charles Avis",
      "email": "talktoavischales@gmail.com",
      "phone": "+23470452781",
      "kyc": {
        "verificationId": "verification-id",
        "verificationUrl": "https://transid2.fuspay.finance/?verificationId=..."
      }
    },
    "application": {}
  }
}
```

Display **Copy KYC URL** using `data.guarantor.kyc.verificationUrl`. The final submit endpoint requires at least one guarantor KYC URL when the product has `requirements.security.guarantor: true`.

The older one-shot endpoint, `POST /api/v1/applications/apply`, is still supported when a client wants to submit the application and requirements in one request.

**Final submit:**

```http
POST /api/v1/applications/{applicationId}/submit
Content-Type: application/json
```

For loan products, only terms acceptance is required:

```json
{
  "userId": "user-uuid",
  "acceptedTerms": true
}
```

For mortgage products, include the final mortgage selection shown on the last screen. `quantity` is the “Buy More” count selected by the user.

```json
{
  "userId": "user-uuid",
  "acceptedTerms": true,
  "mortgageSelection": {
    "propertyName": "Maize Investment",
    "propertyType": "Mortgage",
    "unitPrice": 60700000,
    "quantity": 1,
    "startDate": "2026-03",
    "investmentPeriod": "1 year",
    "total": 60830842,
    "metadata": {
      "roi": "3%",
      "duration": "06 months"
    }
  }
}
```

The submit call validates that all configured requirements have been uploaded, sends the Plata final application payload with `application.submittedRequirements[]`, then sets local `loanWorkflowStatus` to `under_review`. Mortgage final-screen details are stored in `contractSnapshot.finalSubmission.mortgageSelection`. If the Plata final-submit sync fails, the endpoint returns `502` and stores the message in `upstreamSyncError` so the user can retry.

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
| `SAVINGS` | `POST` | `/api/v1/savings-accounts` | Provision only; fund via `POST /api/v1/savings-accounts/:id/deposits` |
| `INVESTMENT` | `POST` | `/api/v1/investment-accounts` | Provision only (mirrors savings); fund via `POST /api/v1/investment-accounts/:id/deposits` |

`/api/v1/applications/*` is proxied by `account-ms` to `product-ms`. Submitted loan/mortgage applications live in the `product-ms` `product_applications` collection. `POST /api/v1/loans/apply` is disabled; storefront clients should use `/api/v1/applications/apply` or the two-step `/api/v1/applications/init` flow.

For Plata upstream account creation (`POST /api/v1/products/external-accounts` via account-ms), include **`applicantName`**, **`phone`**, **`bvn`** (11 digits), and a valid **`email`**. The product must be activated from the Plata catalog (`upstreamProductId` on the local product).

**Merchant roles:** Spring is the Plata integrator (`merchantId` from server env `PLATA_INTEGRATOR_MERCHANT_ID`). The tenant from login/app (`merchantId` on the apply body from gateway) is the **sub-merchant** (`offeringMerchantId`). Optionally send `subMerchant` or `subMerchantContactEmail` + `subMerchantContactPhone` for the usage event.

**Savings body:**

```json
{
  "userId": "user-uuid",
  "currency": "NGN",
  "productId": "6790abc123def45678901234",
  "email": "jane@example.com",
  "applicantName": "Jane Smith",
  "phone": "+2348012345678",
  "bvn": "22123456789"
}
```

The product must be activated from the Plata catalog (`upstreamProductId` on the local product). Enrollment is mirrored locally and synced to Plata under the **product creator** merchant/app via `POST /api/v1/products/external-applications` (same integrator keys as loans). `merchantId` on the request (or tenant header) is the **offering/sub-merchant** storefront id.

**Investment body** (same shape as savings):

```json
{
  "userId": "user-uuid",
  "currency": "NGN",
  "productId": "6790abc123def45678901234",
  "email": "jane@example.com",
  "applicantName": "Jane Smith",
  "phone": "+2348012345678",
  "bvn": "22123456789"
}
```

Provision: `POST /api/v1/investment-accounts` → returns `applicationId` and optional NUBAN on `account.productWallet`.  
Include platform fields required by Plata on submitted enrollments: `isPoliticallyExposedPerson`, `monthlyIncome`, `repaymentSource`, `maritalStatus`.  
Fund from user PRIMARY wallet: `POST /api/v1/investment-accounts/:applicationId/deposits` with `{ "userId", "amount", "currency?" }`. Debits principal once and splits storefront merchant charge + Plata creator principal (see wallet repayment docs). Do **not** use `POST /api/v1/applications/apply` for INVESTMENT.

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

### Savings deposit (after enrollment)

Enroll and deposit are **separate** calls. Commission on deposit is **0%** in v1.

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/v1/savings-accounts/{applicationId}/deposit-details?userId=` | Min/max, balance, bank-transfer `merchantReference` |
| `POST` | `/api/v1/savings-accounts/{applicationId}/deposits` | Debit user **PRIMARY** wallet and credit Plata creator |

**Wallet deposit body:**

```json
{
  "userId": "user-uuid",
  "amount": 5000,
  "currency": "NGN",
  "referenceId": "optional-idempotency-key"
}
```

**Bank transfer:** fund the user's PayOnUs NUBAN with `merchantReference` = `savings-deposit:{upstreamApplicationId}` (from `deposit-details`). PayOnUs funding webhook routes to product-ms without crediting PRIMARY first; principal is settled to the Plata product creator (`SAVINGS_DEPOSIT`).

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

Optional query filters: `status`, `productType`, `productId`, `appId`, and `merchantId`.

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

### Product-type wallet totals (dashboard tabs)

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/v1/wallets/user/{userId}/product-type-summary` |
| **Auth** | Bearer |

Returns totals for `MORTGAGE`, `LOAN`, `SAVINGS`, `INVESTMENT`, and `COMMODITY` from **PRODUCT** wallets only. The PRIMARY funding wallet is excluded. Product types with no wallets return `totalAmount: 0` and `accountCount: 0`.

### Fuspay modular KYC (retail)

Proxied under `/api/v1/kyc/…` (compliance-ms). Typical flow:

1. `POST /api/v1/kyc/modular/verification` — start verification (Bearer)
2. `GET /api/v1/kyc/modular/verification-url` — URL for iframe / redirect
3. `GET /api/v1/kyc/modular/status/{verificationId}` — poll status
4. After webhook → wallet NUBAN available via wallet GET above

See **compliance-ms** README for full modular KYC payloads. Individual retail verification requests **bio**, **phone**, **email**, **NIN**, **BVN**, and **liveliness** (`verification_types.liveliness`). Gov't ID upload (`document_verification`) is disabled.

**Hosted page branding:** compliance-ms and client-auth-ms pass Fuspay `branding` on signup and verification, resolved from the tenant PWA manifest (`theme_color` → `button_color`, `background_color` → `bg_color`, `name` → `brand_name`, first HTTPS icon → `brand_logo`, derived `text_color`). Tenant headers (`x-tenant-app-id`) or the user's `app_id` supply the app context; optional `branding` in the verification body overrides individual fields.

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
  POST by type (applications / mortgages / commodities / savings)
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
  const res = await fetch(`${API_BASE}/api/v1/applications/apply`, {
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
| `/api/v1/applications/*`, `/api/v1/loans/*`, `/api/v1/mortgages/*`, `/api/v1/savings-accounts/*`, `/api/v1/commodities/*` | account-ms → product-ms (proxied) |
| `/api/v1/kyc/*`, `/api/v1/compliance/*` | compliance-ms |
| `/api/v1/wallets/*` | wallet-ms |
| `/api/v1/notifications/*` | notifications-ms |

---

## Notifications (in-app inbox + Web Push)

Storefront users receive **email + in-app + browser push** (when subscribed) for account and application lifecycle events. The PWA uses the same origin (account-ms proxies to notifications-ms).

### Enable browser push (after login)

Requires HTTPS (or localhost), a registered service worker, and user permission.

**Step 1 — Get VAPID public key**

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/v1/notifications/push/vapid-public-key` |
| **Auth** | None |

**Step 2 — Subscribe in the PWA**

```ts
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function subscribeToWebPush(userId: string, appId: string, swUrl: string, accessToken: string) {
  const keyRes = await fetch('/api/v1/notifications/push/vapid-public-key');
  const { data } = await keyRes.json();
  if (!data?.publicKey) return;

  const registration = await navigator.serviceWorker.register(swUrl);
  await navigator.serviceWorker.ready;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(data.publicKey)
  });

  await fetch('/api/v1/notifications/push/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      userId,
      appId,
      subscription: subscription.toJSON()
    })
  });
}
```

Use `pwaInstall.serviceWorkerUrl` from app resolve/bootstrap. On logout, call `DELETE /api/v1/notifications/push/subscribe` with `{ userId, endpoint: subscription.endpoint }`.

**Note:** Merchants must **republish the PWA** after this feature so `sw.js` includes push event handlers.

### In-app inbox (authenticated)

All inbox routes require **`Authorization: Bearer <accessToken>`** (client-auth-ms access JWT). The server enforces that you only access **your own** inbox (`userId` from the token).

#### List inbox (preferred)

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/v1/notifications/inbox?limit=50&offset=0&unreadOnly=false` |
| **Auth** | Bearer **required** |

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "674a1b2c3d4e5f6789012345",
        "channel": "in_app",
        "template": "product-application-workflow-updated",
        "status": "sent",
        "createdAt": "2026-06-18T12:00:00.000Z",
        "sentAt": "2026-06-18T12:00:00.000Z",
        "readAt": null,
        "isRead": false,
        "data": {
          "inAppTitle": "Application Under review",
          "inAppBody": "Personal Loan for Jane Smith is now Under review.",
          "productName": "Personal Loan",
          "applicationId": "6790abc123def45678901234"
        }
      }
    ],
    "total": 12,
    "limit": 50,
    "offset": 0
  }
}
```

#### Unread count

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/v1/notifications/inbox/unread-count` |
| **Auth** | Bearer **required** |

**Response `200`:** `{ "success": true, "data": { "unreadCount": 3 } }`

#### Mark as read

**One item:**

```http
PATCH /api/v1/notifications/inbox/{id}/read
Authorization: Bearer <accessToken>
```

**Response `200`:** `{ "success": true, "data": { "id": "…", "isRead": true, "readAt": "2026-06-18T13:00:00.000Z", … } }`

**Bulk (omit `ids` to mark all unread):**

```http
PATCH /api/v1/notifications/inbox/read
Authorization: Bearer <accessToken>
Content-Type: application/json

{ "ids": ["id1", "id2"] }
```

**Response `200`:** `{ "success": true, "data": { "modifiedCount": 2, "readAt": "2026-06-18T13:00:00.000Z" } }`

#### Delete

**One item:**

```http
DELETE /api/v1/notifications/inbox/{id}
Authorization: Bearer <accessToken>
```

**Bulk:**

```http
DELETE /api/v1/notifications/inbox
Authorization: Bearer <accessToken>
Content-Type: application/json

{ "ids": ["id1", "id2"] }
```

**Response `200`:** `{ "success": true, "data": { "deletedCount": 2, "ids": ["id1", "id2"] } }`

#### Legacy list (still supported)

`GET /api/v1/notifications/user/{userId}?channel=in_app` — requires Bearer and `{userId}` must match the token.

---

### Real-time inbox (WebSocket)

Connect after login for live updates (new notifications, read/delete sync, unread count).

| | |
|---|---|
| **URL** | `wss://{storefront-origin}/api/v1/notifications/inbox/ws?token={accessToken}` |
| **Auth** | Access JWT in query param `token` (browser WebSocket cannot set headers reliably) |

**Server → client events:**

| `type` | When |
|--------|------|
| `inbox.connected` | On connect; includes `unreadCount` |
| `notification.new` | New in-app item; includes full `notification` object |
| `notification.read` | Single item marked read (`id`, `readAt`) |
| `notification.read_bulk` | Bulk mark read |
| `notification.deleted` | Single item deleted |
| `notification.deleted_bulk` | Bulk delete |
| `inbox.unread_count` | Unread badge update |

**Client → server:** `{ "type": "ping" }` → `{ "type": "pong" }`

**Example (browser):**

```ts
function connectInboxSocket(accessToken: string) {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(
    `${protocol}//${location.host}/api/v1/notifications/inbox/ws?token=${encodeURIComponent(accessToken)}`
  );
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'notification.new') {
      // prepend to inbox state
    }
    if (msg.type === 'inbox.unread_count') {
      // update badge
    }
  };
  return ws;
}
```

---

### Storefront events covered

| Event | Email | In-app | Web Push |
|-------|-------|--------|----------|
| Signup | OTP (`otp` template) | `user-registered` | if subscribed |
| OTP resend / password reset / change OTP | OTP email | `otp-prompt` | if subscribed |
| Password changed | `password-change` | `password-change` | if subscribed |
| Email address updated | `email-verification` | `email-verification` | if subscribed |
| Application submitted | `product-application-submitted` | same template | if subscribed |
| Application status update | `product-application-workflow-updated` | same template | if subscribed |
| Guarantor KYC approved | `guarantor-kyc-approved` | same template | if subscribed |

OTP codes are **never** included in in-app or push payloads.

### PWA integration notes

1. After login, store `accessToken` and `user.id`.
2. Connect **`connectInboxSocket(accessToken)`** for real-time updates (reconnect on token refresh).
3. Load inbox with **`GET /api/v1/notifications/inbox`** (not the legacy user path unless needed).
4. Optionally call `subscribeToWebPush` for browser alerts when the app is backgrounded.
5. Use **`GET /inbox/unread-count`** for badge on first paint; keep in sync via WebSocket `inbox.unread_count`.
6. Mark read / delete via PATCH/DELETE inbox routes; UI updates locally or from WebSocket events.


