# Product Management Microservice

## Overview
`product-ms` exposes the shared Plata product catalog and manages app-specific enabled products.

It now has four responsibilities:

1. Fetch the full upstream product catalog from Plata.
2. Persist products that an app has turned on into this service's local MongoDB `products` collection.
3. Store submitted loan/mortgage applications, including requirement submissions, in the local MongoDB `product_applications` collection.
4. Upload application requirement documents to DigitalOcean Spaces before application submission.

When an app turns on a product, `product-ms` clones the upstream Plata product into its own `products` collection using the Plata product document structure. Turning the product off keeps the local app product but marks `isActive` as `false`.

`account-ms` is the public gateway. Requests to `https://account-ms.fly.dev/api/v1/applications` are proxied to this service, so application ownership and storage stay in `product-ms`.

### Investment accounts (storefront)

Mirrors savings enrollment:

| Step | Method | Path |
|------|--------|------|
| Provision | `POST` | `/api/v1/investment-accounts` |
| Deposit details | `GET` | `/api/v1/investment-accounts/:applicationId/deposit-details?userId=` |
| Fund (wallet debit) | `POST` | `/api/v1/investment-accounts/:applicationId/deposits` |

Gateway: `https://account-ms.fly.dev` (proxied). Body for create matches savings (`userId`, `productId`, `currency` required, plus Plata platform fields `isPoliticallyExposedPerson`, `monthlyIncome`, `repaymentSource`, `maritalStatus`). Idempotent per user/product/app/merchant. Funding uses investment purchase settlement (PRIMARY debit + REPAYMENT split + Plata creator principal). Env fallbacks: `PLATA_INTEGRATOR_MERCHANT_ID`, `PLATA_INTEGRATOR_APP_ID`. Do **not** call `POST /api/v1/applications/apply` for `INVESTMENT`.

Deployment URL: https://product-ms.fly.dev/

## Plata Authentication

Upstream calls use **`PLATA_ACCOUNT_SERVICE_URL`** (see env) plus **`GET /api/v1/products`** (and related paths). The Plata gateway expects **only** these headers (it does not use `Authorization` or Bearer):

- `PLATA_PUBLIC_KEY`
- `PLATA_SECRET_KEY`

Values come from the same-named environment variables in this service. The gateway forwards them to service-auth verification (`public_key` / `secret_key` plus IP policy).

When clients call **`GET https://account-ms.fly.dev/api/v1/products`**, Spring **account-ms** proxies to this **`product-ms`** service, which then performs the upstream request above to Plata.

### Required Environment Variables

- `PLATA_PUBLIC_KEY`
- `PLATA_SECRET_KEY`
- `MONGODB_URI` or `DATABASE_URL`

### Optional: application document uploads

Loan/mortgage application documents are uploaded by `product-ms` to DigitalOcean Spaces through `POST /api/v1/applications/upload` (also available through `/api/v1/product-applications/upload`). `account-ms` proxies `/api/v1/applications/upload` to this service.

Required for uploads:

```env
DO_SPACES_REGION=nyc3
DO_SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
DO_SPACES_BUCKET=springtd-product-documents
DO_SPACES_ACCESS_KEY_ID=your-access-key
DO_SPACES_SECRET_ACCESS_KEY=your-secret-key
```

Optional:

```env
DO_SPACES_CDN_URL=https://springtd-product-documents.nyc3.cdn.digitaloceanspaces.com
PRODUCT_APPLICATION_MAX_DOCUMENT_SIZE=10
```

Upload flow:

1. `POST` multipart form-data to `/api/v1/applications/upload` with the file in the `file` field. Include optional `userId` as a form field to namespace the object key.
2. Read the response `{ success, url, key, fileName, fileType, fileSize }`.
3. Send that `url` and metadata as the matching `requirementSubmissions[].fileUrl` in `/api/v1/applications/apply`.

### Optional: notifications (email + in-app + Web Push)

Storefront and merchant flows can trigger **notifications-ms** `POST /api/v1/notifications/send-dual`:

- **Storefront product applications** — always send **in-app** (+ **Web Push** when the user subscribed) to the applicant `userId`; include **email** when the application has an email. Templates: `product-application-submitted`, `product-application-workflow-updated`, `guarantor-kyc-approved`.
- **Merchant product configuration** — when all of the following are true:

- The request includes **`Authorization: Bearer <access token>`** issued by **client-auth-ms** (`type: access` in the JWT payload).
- This service has **`JWT_SECRET`** set to the **same value** as client-auth-ms (used only to read `userId` / `email` from the token).
- **`NOTIFICATIONS_SERVICE_URL`** points at a running notifications-ms (default in code: `http://localhost:4009` in development, `https://springtd-notifications-ms.fly.dev` in production).

**When it fires:** successful **`PUT /api/v1/products/toggle/:appId/:productId`**, **`PUT /api/v1/products/config/:appId/:productId`**, and **`POST|PUT|DELETE /api/v1/configurations/...`** (legacy configuration API). If there is no valid Bearer token, the API still succeeds; no notification is sent.

### Optional upstream URL

- `PLATA_ACCOUNT_SERVICE_URL` — preferred base URL for account-ms (no trailing slash), e.g. `https://account-ms-plata.fly.dev`
- `SERVER_PRODUCT_SERVICE_URL` — same role if `PLATA_ACCOUNT_SERVICE_URL` is unset

If both are unset but `PLATA_PUBLIC_KEY` and `PLATA_SECRET_KEY` are set, the service defaults to `https://account-ms-plata.fly.dev` so Fly deployments only need the key secrets. For local development without Plata keys, the default is `http://localhost:3005`.

### Fly.io

- **`PORT`** / **`internal_port`**: `fly.toml` and the app use **4005**. The process listens on **`0.0.0.0`** (required for the Fly proxy). Invalid `PORT` values fall back to **4005** so `listen()` never receives `NaN`.
- **`MONGODB_URI` or `DATABASE_URL`**: Set a reachable MongoDB URL as a Fly secret. If Mongo is missing or wrong, the app **keeps running** and retries the connection (so the machine does not crash-loop); `/health` still responds while the DB is disconnected.
- **`[[http_service.checks]]`** on **`GET /health`** (with a generous **`grace_period`**) tells Fly when the machine is ready. The **Dockerfile does not define a Docker `HEALTHCHECK`** — only Fly’s checks are used, to avoid two competing health systems.
- **`min_machines_running = 1`**: Keeps one machine in the primary region so the proxy usually has a target (reduces “Proxy not finding machines” when scale-to-zero and restarts interact badly). You can lower to `0` to save cost if stable.

## Current Flow

1. Frontend fetches the full selectable catalog from `GET /api/v1/products`.
2. User turns on a product for an app using `PUT /api/v1/products/toggle/:appId/:productId`.
3. `product-ms` fetches that product from upstream and stores a local copy in MongoDB `products`.
4. Frontend lists app-scoped products saved locally using `GET /api/v1/products/app/:appId`. That response includes **every** local row for the app (both `isActive: true` and `isActive: false`). Filter client-side to `isActive === true` when you only want products that are still turned on.
5. End users apply for active loan/mortgage products through `/api/v1/applications/apply`. Submitted applications are saved in `product_applications`.

## Storage Model

Per-app product copies (active or inactive) live in the local MongoDB `products` collection, not in `MerchantProductConfiguration`.

The local document shape follows the Plata product model, including fields such as:

- `referenceNumber`
- `name`
- `description`
- `isActive`
- `isFeatured` (merchant storefront: multiple turned-on products may be highlighted)
- `type`
- `subType`
- `appId`
- `status`
- `metadata`
- `about`
- `structure`
- `requirements`
- `feesAndCharges`

This means each app’s products are stored as full product documents (with `isActive`), not as lightweight activation-only records.

### Product Applications

Submitted loan and mortgage applications live in the local MongoDB `product_applications` collection. This keeps applicant submissions beside the product configuration they refer to.

Each application stores:

- `userId`, `productId`, `productName`, `productType`
- `amount`, `currency`, optional `email`
- `status`: `PENDING`, `APPROVED`, `REJECTED`, or `BLACKLISTED`
- `appId` and optional `merchantId`
- `requirementsSnapshot`: the product `requirements` at the time the user applied
- `applicationProgress`: resumable storefront draft state saved before final requirements submission
- `requirementSubmissions`: user-submitted answers/files for those requirements

`requirementsSnapshot` is intentionally persisted so later product configuration edits do not change the requirements attached to an already-submitted application.

`POST /api/v1/applications/init` is idempotent for initialized lending applications. If the same user starts the same product again and there is already a `PENDING` application for that product, merchant, and app with a provisioned upstream account number, the endpoint returns the existing application with `200` instead of creating another one.

Storefronts can save incomplete loan/mortgage application progress with `PATCH /api/v1/applications/:id/progress`. This endpoint does not validate required documents or fields; it only stores the user's draft tab/form/upload state so the application can be resumed later. Use `PATCH /api/v1/applications/:id/requirements` only when the user has completed the configured requirements and is ready for validation.

### Fees and Charges Model (Additive)

For app-scoped products, fees follow an additive model:

- `baseFeesAndCharges`: the immutable fee values copied from upstream when the product is first turned on.
- `merchantFeeAdditions`: **Management Fee mark-up only** (non-negative). Other fee names, late-repayment penalties, forceful-withdrawal penalties, and charge toggles are rejected with `400`.
- `feesAndCharges`: computed totals saved by the service and shown to customers.

Computation rule for Management Fee:

- **Total value = base Management Fee + merchant Management Fee addition**
- If the base value is a percentage, the merchant addition is also treated as additive percentage.
- Negative merchant additions are rejected.

Visibility rules:

- Merchant/Admin views (`GET /api/v1/products/app/:appId`, `GET /api/v1/products/merchant/:appId`, `GET /api/v1/products/config/:appId/:productId`) include all three layers.
- Customer-facing product reads (`GET /api/v1/products`, `GET /api/v1/products/:id`) expose only total `feesAndCharges` (base/addition layers are hidden).

## API Endpoints

### Get All Products

Fetch the full upstream catalog.

**Endpoint:** `GET /api/v1/products`

### Get Product By ID

Fetch a product by ID. Local app product documents are resolved first; if none exists locally, the service falls back to the upstream catalog.

**Endpoint:** `GET /api/v1/products/:id`

### Get Products For An App

Fetch **all** product documents that have been saved locally for a specific app (same data as stored in MongoDB for that `appId`). This is **not** filtered to “enabled only”: documents that were turned off remain in the collection with `isActive: false`. To show only products that are still on, filter the array where **`isActive` is `true`** (or handle missing `isActive` according to your client rules).

**Endpoints:**

- `GET /api/v1/products/app/:appId`
- `GET /api/v1/products/merchant/:appId`

The `/merchant/:appId` route currently exists as a compatibility alias.

### Featured products (storefront)

Merchants can mark multiple **turned-on** products (`isActive: true`) as featured using the boolean **`isFeatured`** on each local product row.

**Replace the whole featured set for an app**

**Endpoint:** `PUT /api/v1/products/featured/:appId`

**Request body:**

```json
{
  "productIds": ["6790abc123def45678901234", "6790abc123def45678905678"]
}
```

- Each id must be a **local** product document id for that `appId` (same as returned from `GET /api/v1/products/app/:appId`).
- Each listed product must currently be **turned on** (`isActive: true`). Otherwise the request fails with **400**.
- Any turned-on product **not** listed is set to **`isFeatured: false`**. Use **`productIds: []`** to clear all featured flags.

**Per-product toggle (optional)**

**Endpoint:** `PUT /api/v1/products/config/:appId/:productId` with **`"isFeatured": true`** or **`false`** in the body (with other allowed fields). You cannot set **`isFeatured: true`** while the product is inactive.

**Automatic clear:** `PUT .../toggle` with **`activate: false`**, or **`isActive: false`** via config, clears **`isFeatured`** for that product.

### Toggle Product Activation

Turn a product on or off for a specific app.

**Endpoint:** `PUT /api/v1/products/toggle/:appId/:productId`

**Request Body:**

```json
{
  "activate": true
}
```

**Behavior:**

- If `activate` is `true` and the app does not already have a local copy, the product is cloned from upstream into the local `products` collection.
- If the app already has a local copy, `isActive` is updated.
- If `activate` is `false`, the existing local app product is marked inactive.

**Response:**

```json
{
  "success": true,
  "message": "Product activated successfully",
  "data": {
    "id": "local-product-id",
    "referenceNumber": "PRD-123456-ABCD",
    "name": "Demo Investment Product",
    "description": "Investment product",
    "type": "INVESTMENT",
    "subType": "Metal Commodity",
    "appId": "app-id",
    "status": "incomplete",
    "isActive": true,
    "createdAt": "2026-03-23T09:53:34.130Z",
    "updatedAt": "2026-03-23T09:53:34.130Z"
  }
}
```

### Update App Product

Update the locally stored app product document.

**Endpoint:** `PUT /api/v1/products/config/:appId/:productId`

This endpoint now updates the Plata-shaped local product document for that app.

For fees, merchants should send **Management Fee** additions under `merchantFeeAdditions` only. The service recalculates and persists total `feesAndCharges` using base + that addition. Attempts to change other fees or charges return `400`.

With a valid **client-auth access** JWT, a **`product-configuration`** notification (email + in-app) is sent after a successful update (failures logged only).

### Legacy product configuration routes

Mounted at **`/api/v1/configurations`** (also proxied by account-ms). Create, update, and delete can emit the same **`product-configuration`** **send-dual** notification when a valid Bearer access token is present.

### Get App Product

Get the locally stored app product document.

**Endpoint:** `GET /api/v1/products/config/:appId/:productId`

### Check Product Action

Checks what action is allowed for an upstream product based on its status.

**Endpoint:** `GET /api/v1/products/:id/action`

### Manage Product

Not supported in this service.

**Endpoint:** `PUT /api/v1/products/:id/manage`

### Product Applications

Applications are owned by `product-ms` and exposed at both:

- `POST /api/v1/applications/upload` — upload one requirement document to this service's DigitalOcean Spaces bucket
- `PATCH /api/v1/applications/:id/progress` — save partial requirement/form/upload progress for a resumable storefront draft
- `POST /api/v1/applications/apply` — public/gateway-facing application endpoint
- `POST /api/v1/product-applications` — lower-level product application endpoint

`account-ms` proxies `/api/v1/applications/*` to this service. Loan and mortgage aliases in the gateway still call the same application creation flow.

After a successful local save and wallet provisioning, loan/mortgage applies create a Plata bank account when `PLATA_PUBLIC_KEY` and `PLATA_SECRET_KEY` are set:

`POST {PLATA_ACCOUNT_SERVICE_URL}/api/v1/products/external-accounts`

Call **only through account-ms** (API gateway) with `PLATA_PUBLIC_KEY` and `PLATA_SECRET_KEY`; no Bearer token is sent.

Body mapping (Spring → Plata):

| Plata field | Spring source |
|-------------|----------------|
| `appId` | Plata global product `appId` (from catalog / `upstreamAppId`) |
| `productId` | `upstreamProductId` on the local product |
| `user` | `userId`, `applicantName`, `email`, `phone`, `bvn` (BVN required, 11 digits) |
| `currency` | Apply `currency` (defaults upstream to `NGN`) |
| `country` | Apply `country` (defaults locally to `NG`) |

Read the account number from `data.wallet.virtualNuban.accountNumber` or `data.wallet.payonusNubanAccountNumber`.

If upstream is temporarily unavailable (HTTP 5xx), the local application is still saved and `upstreamSyncError` is set. HTTP 4xx from Plata fails the apply with 502.

For initialized loan/mortgage applications, `POST /api/v1/applications/{applicationId}/submit` also creates or reuses the upstream Plata application snapshot:

`POST {PLATA_ACCOUNT_SERVICE_URL}/api/v1/products/external-applications`

The payload sends `loanWorkflowCallbackUrl`, product/contract terms in `application.contractSnapshot`, and uploaded requirement documents in `application.submittedRequirements[]` using product requirement indexes. Product-ms sets the local workflow to `under_review` only after that upstream final-submit sync succeeds. If Plata sync fails, the endpoint returns `502` and stores the failure in `upstreamSyncError` for retry.

Configure the callback with:

- `LOAN_WORKFLOW_CALLBACK_URL` — full public gateway URL sent to Plata. Defaults locally to `http://localhost:4005/api/v1/applications/webhooks/plata/loan-workflow`; production should set a reachable gateway URL such as `https://account-ms.fly.dev/api/v1/applications/webhooks/plata/loan-workflow`.
- `ACCOUNT_SERVICE_PUBLIC_URL` — optional account-ms gateway base URL fallback when `LOAN_WORKFLOW_CALLBACK_URL` is not set. `PRODUCT_SERVICE_PUBLIC_URL` is still accepted for direct product-ms deployments.
- `PLATA_LOAN_WORKFLOW_WEBHOOK_SECRET` — optional shared secret. When set, `POST /api/v1/applications/webhooks/plata/loan-workflow` and `POST /api/v1/products/webhooks/plata/product-updated` verify `X-Plata-Signature` as an HMAC-SHA256 signature over the raw JSON body (`sha256=<digest>` or the digest alone).
- Plata product catalog sync: when a Plata creator updates a product, Plata posts `product.updated` to Spring `POST /api/v1/products/webhooks/plata/product-updated` (via account-ms). Spring refreshes **all local clones** with that `upstreamProductId` while preserving merchant interest/equity overlays, `isActive`, and `isFeatured`. Existing applications’ contract snapshots are not rewritten.
- Catalog reconcile cron (safety net): enabled in production by default (`PRODUCT_CATALOG_SYNC_ENABLED`, interval `PRODUCT_CATALOG_SYNC_INTERVAL_MS` default 15m). Compares each local clone’s `metadata.upstreamCatalogUpdatedAt` to Plata `updatedAt` and re-syncs on drift. Ops: `GET /api/v1/products/internal/catalog-sync/status`, `POST /api/v1/products/internal/catalog-sync/reconcile` with `X-Internal-Token` (optional body `{ "force": true }`).

Plata posts `loan_workflow_status.updated` to the callback when the product creator changes the upstream status to `under_review`, `approved`, `declined`, or `blacklisted`. The webhook is idempotent by event id and current status, returns 2xx quickly, and updates SpringApp's read model from the upstream workflow (`declined` maps to local `REJECTED`).

Test script: `scripts/loan-external-application-curl.ps1`

### Commodity Accounts

Commodity products use the account flow, not an instant buy/settle-only flow.

- `POST /api/v1/commodity-accounts/apply` — creates an auto-approved commodity account after validating requirements, provisions/reuses the Plata product account, and funds immediately.
- `GET /api/v1/commodity-accounts/:applicationId?userId={userId}` — reads the user's commodity account and holding status.
- `POST /api/v1/commodity-accounts/:applicationId/withdraw` — pays out after the moratorium period has ended.

Immediate funding means the applicant's PRIMARY wallet is debited for `principal + commission`. The commission is credited to the storefront/offering merchant's SETTLEMENT wallet, and the principal is credited to the SETTLEMENT wallet for the app of the merchant that created the commodity product. If that creator SETTLEMENT wallet is not present on Spring, product-ms uses the Plata gateway settlement endpoint for the principal after the Spring wallet debit succeeds.

`POST /api/v1/applications/apply` rejects direct `COMMODITY` applications; use `/api/v1/commodity-accounts/apply` instead.

**Apply request body:**

```json
{
  "userId": "user-uuid",
  "productId": "6790abc123def45678901234",
  "amount": 50000,
  "currency": "NGN",
  "email": "jane@example.com",
  "applicantName": "Jane Smith",
  "phone": "+2348012345678",
  "bvn": "22222222590",
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

For `requirements.otherRequirements[]`, any item with `uploadRequired: true` or `required: true` must have a matching submission. Matching is by `requirementId`, `requirementType`, or `label`. Upload requirements must include `fileUrl`.

**Save draft progress:**

Use this after `POST /api/v1/applications/init` when the user is filling the requirements or file-upload tabs but has not completed the full checklist yet.

```http
PATCH /api/v1/applications/{applicationId}/progress
Content-Type: application/json
```

```json
{
  "userId": "user-uuid",
  "currentStep": "apply",
  "currentTab": "requirement",
  "requirementDrafts": [
    {
      "requirementType": "Employment",
      "label": "Employment",
      "type": "json",
      "value": {
        "occupation": "Engineer",
        "placeOfWork": "Example Ltd",
        "hrName": "",
        "hrEmail": ""
      }
    }
  ],
  "uploadedDrafts": [
    {
      "requirementType": "Bank Statement",
      "label": "Bank Statement",
      "type": "document",
      "fileUrl": "https://springtd-product-documents.nyc3.digitaloceanspaces.com/product-applications/user-uuid/statement.pdf",
      "fileName": "statement.pdf",
      "fileType": "application/pdf",
      "fileSize": 123456
    }
  ]
}
```

The endpoint merges omitted fields with the existing `applicationProgress` and updates `lastSavedAt` on the server. Send an empty array for a draft collection if the user intentionally clears it.

Resume by reading the same application through `GET /api/v1/applications/{applicationId}`, `GET /api/v1/applications/user/{userId}`, or `GET /api/v1/applications/user/{userId}/products/{productId}/init-status`. The response includes `applicationProgress`, `requirementsSnapshot`, and any completed `requirementSubmissions`.

**Apply response:**

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
    "requirementsSnapshot": {},
    "requirementSubmissions": []
  }
}
```

**Other application endpoints:**

- `GET /api/v1/applications` — admin or merchant list. Send `x-admin-id` for admin, or merchant `Authorization: Bearer <access JWT>` for merchant-scoped results. Optional query: `userId`, `appId`, `status`, `productType`.
- `GET /api/v1/applications/summary` — status counts (`total`, `pending`, `approved`, `rejected`, `blacklisted`) with the same auth and query filters as the list (except `status` is not applied to the summary).
- `GET /api/v1/applications/pending` — pending applications, with the same admin/merchant access rules.
- `GET /api/v1/applications/user/:userId` — applications for an end user. Optional query: `appId`, `status`, `productType` (no merchant scoping unless you also send a merchant JWT on `GET /api/v1/applications?userId=…`).
- `GET /api/v1/applications/user/:userId/approved-amount-summary?appId=:appId` — backend-calculated totals and application counts by product type. Only applications whose canonical Spring status is `APPROVED` are included; omitted types return zero. Storefronts should use `data.summary.LOAN.totalAmount` for the Total Loan card rather than summing the application list.
- `GET /api/v1/applications/:id` — application detail.

Loan and mortgage approval/rejection is not performed locally by SpringApp. Submit completed applications upstream to Plata, then update underwriting state in Plata's loan workflow.

**Merchant customer application list (direct gateway contract):**

Use this lower-level product-ms route when the caller already has a merchant JWT and wants applications for one customer on one app. For the merchant dashboard UI, prefer the create-app route `GET /api/v1/apps/{appId}/customers/{userId}/applications`, which also verifies app ownership.

```http
GET /api/v1/applications?userId={userId}&appId={appId}
Authorization: Bearer <merchant-jwt>
```

Optional query: `productType` (`LOAN`, `MORTGAGE`, `SAVINGS`, `INVESTMENT`, `COMMODITY`, ...), `status` (`PENDING`, `APPROVED`, `REJECTED`, `BLACKLISTED`).

**Success response**

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
      "email": "customer@example.com",
      "status": "PENDING",
      "appId": "674a1b2c3d4e5f6789012345",
      "merchantId": "merchant-uuid",
      "requirementsSnapshot": {},
      "requirementSubmissions": [],
      "createdAt": "2026-05-19T12:00:00.000Z",
      "updatedAt": "2026-05-19T12:00:00.000Z"
    }
  ]
}
```

**Merchant customer application summary (direct gateway contract):**

```http
GET /api/v1/applications/summary?userId={userId}&appId={appId}
Authorization: Bearer <merchant-jwt>
```

Optional query: `productType`. Do not send `status` for dashboard summary cards.

**Success response**

```json
{
  "success": true,
  "data": {
    "total": 4,
    "pending": 1,
    "approved": 2,
    "rejected": 1,
    "blacklisted": 0
  }
}
```

## Product Overview Dashboard

Single endpoint for the app-wide product dashboard headline and category cards.

**Endpoint:** `GET /api/v1/products/app/:appId/product-overview`

**Optional header:** `Authorization: Bearer <access_token>` is forwarded to create-app-ms when loading canonical transaction stats.

**Headline mapping:**

| UI label | API field |
|---|---|
| Requested | `data.headline.requestedAmount` |
| Approved | `data.headline.approvedAmount` |
| Total Transactions | `data.headline.totalTransactions` |
| Total Savings | `data.headline.totalSavings` |
| Total Interest | `data.headline.totalInterest` |

**Category mapping:** match `data.byCategory[]` by `type` (`LOAN`, `MORTGAGE`, `SAVINGS`, `INVESTMENT`, `COMMODITY`).

| UI label | API field |
|---|---|
| Product count | `configuredProductCount` |
| Customers | `customerCount` |
| Capital / Deposits | `capitalAmount` |
| Issued / Interest Paid | `issuedAmount` |
| Repayment / Withdrawals / COGS | `repaymentAmount` |
| Inventory (commodity) | `inventoryAmount` |
| Sales (commodity) | `salesAmount` |

Per-product drill-down for one category:

**Endpoint:** `GET /api/v1/products/app/:appId/product-overview/by-type/:productType`

`productType` accepts `LOAN`, `MORTGAGE`, `SAVINGS`, `INVESTMENT`, or `COMMODITY`.

## Example Usage

Fetch the full product catalog:

```bash
curl -X GET http://localhost:4005/api/v1/products
```

Fetch all app-scoped products for an app (includes inactive; filter by `isActive` for only turned-on):

```bash
curl -X GET http://localhost:4005/api/v1/products/app/{appId}
```

Fetch the app-wide product overview dashboard:

```bash
curl -X GET http://localhost:4005/api/v1/products/app/{appId}/product-overview \
  -H "Authorization: Bearer YOUR_JWT"
```

Turn on a product for an app:

```bash
curl -X PUT http://localhost:4005/api/v1/products/toggle/{appId}/{productId} \
  -H "Content-Type: application/json" \
  -d '{
    "activate": true
  }'
```

Turn off a product for an app:

```bash
curl -X PUT http://localhost:4005/api/v1/products/toggle/{appId}/{productId} \
  -H "Content-Type: application/json" \
  -d '{
    "activate": false
  }'
```

Get an app-specific product:

```bash
curl -X GET http://localhost:4005/api/v1/products/config/{appId}/{productId}
```

Update an app-specific product:

```bash
curl -X PUT http://localhost:4005/api/v1/products/config/{appId}/{productId} \
  -H "Content-Type: application/json" \
  -d '{
    "merchantFeeAdditions": {
      "fees": [
        {
          "name": "Management Fee",
          "feeType": "Flat",
          "value": "5000"
        }
      ]
    },
    "metadata": {
      "source": "merchant-config-ui"
    }
  }'
```

If the base `Management Fee (Flat)` is `0` and merchant addition is `5000`, the saved total in `feesAndCharges` becomes `5000`.

Check allowed action for a product:

```bash
curl -X GET http://localhost:4005/api/v1/products/{productId}/action
```

## Notes

- Product creation, updates, and deletions for the master catalog still belong to the upstream Plata product service.
- This service is responsible for app-specific product persistence (per-app copies in the local `products` collection).
- The local `products` collection is the source of truth for which catalog products an app has activated at least once; each document’s **`isActive`** field indicates whether that product is currently turned on (`false` means it was turned off but the row is still returned by `GET .../app/:appId`).