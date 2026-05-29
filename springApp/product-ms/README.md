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

### Optional: notifications (email + in-app)

Merchant-facing flows can trigger **notifications-ms** `POST /api/v1/notifications/send-dual` when all of the following are true:

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
5. End users apply for active loan/mortgage products through `/api/v1/applications/apply` (or gateway aliases such as `/api/v1/loans/apply`). Submitted applications are saved in `product_applications`.

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
- `requirementSubmissions`: user-submitted answers/files for those requirements

`requirementsSnapshot` is intentionally persisted so later product configuration edits do not change the requirements attached to an already-submitted application.

### Fees and Charges Model (Additive)

For app-scoped products, fees now follow an additive model:

- `baseFeesAndCharges`: the immutable fee values copied from upstream when the product is first turned on.
- `merchantFeeAdditions`: merchant-provided extra values (non-negative only).
- `feesAndCharges`: computed totals saved by the service and shown to customers.

Computation rule per matching fee/penalty item:

- **Total value = base value + merchant addition**
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

For fees, merchants should send additions under `merchantFeeAdditions` only. The service recalculates and persists total `feesAndCharges` using base + additions.

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
- `POST /api/v1/applications/apply` — public/gateway-facing application endpoint
- `POST /api/v1/product-applications` — lower-level product application endpoint

`account-ms` proxies `/api/v1/applications/*` to this service. Loan and mortgage aliases in the gateway still call the same application creation flow.

After a successful local save and wallet provisioning, loan/mortgage applies are forwarded to Plata when `PLATA_PUBLIC_KEY` and `PLATA_SECRET_KEY` are set:

`POST {PLATA_ACCOUNT_SERVICE_URL}/api/v1/products/external-applications`

Call **only through account-ms** (API gateway) with `PLATA_PUBLIC_KEY` and `PLATA_SECRET_KEY` — do not call product-ms directly.

Body mapping (Spring → Plata):

| Plata field | Spring source |
|-------------|----------------|
| `appId` | Plata global product `appId` (from catalog / `upstreamAppId`) |
| `productId` | `upstreamProductId` on the local product |
| `merchantId` | **Spring on Plata** — `PLATA_INTEGRATOR_MERCHANT_ID` (required) or `integratorMerchantId` |
| `offeringMerchantId` | **Your tenant** — apply `merchantId` from create-app (sub-merchant on Plata) |
| `subMerchant` | Auto-built from tenant when `subMerchantContactEmail` + `subMerchantContactPhone` are set, or pass `subMerchant` |
| `externalUser` | `userId`, `applicantName`, `email`, `phone`, `bvn` (BVN required, 11 digits) |
| `application.contractSnapshot` | Frozen terms + `requirementSubmissions` |
| `application.merchantProductId` | Local Mongo product `_id` |

Optional: `subMerchant`, `country` (default `NG`), `productCreatorMerchantName`, `offeringMerchantName`.

If upstream is temporarily unavailable (HTTP 5xx), the local application is still saved and `upstreamSyncError` is set. HTTP 4xx from Plata fails the apply with 502.

Test script: `scripts/loan-external-application-curl.ps1`

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

- `GET /api/v1/applications` — admin or merchant list. Send `x-admin-id` for admin, or merchant `Authorization: Bearer <access JWT>` for merchant-scoped results.
- `GET /api/v1/applications/pending` — pending applications, with the same admin/merchant access rules.
- `GET /api/v1/applications/user/:userId` — applications for an end user.
- `GET /api/v1/applications/:id` — application detail.
- `POST /api/v1/applications/:id/approve` — admin approval using `x-admin-id`.
- `POST /api/v1/applications/:id/reject` — admin rejection using `x-admin-id` and `{ "reason": "..." }`.

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
          "name": "Processing Fee",
          "feeType": "Flat",
          "value": "10000"
        }
      ],
      "lateRepayment": {
        "penalties": [
          {
            "name": "Late Repayment Penalty",
            "penaltyType": "Percentage",
            "value": "2",
            "triggerDurationDays": 30
          }
        ]
      }
    },
    "metadata": {
      "source": "merchant-config-ui"
    }
  }'
```

If the base `Processing Fee (Flat)` is `20000` and merchant addition is `10000`, the saved total in `feesAndCharges` becomes `30000`.

Check allowed action for a product:

```bash
curl -X GET http://localhost:4005/api/v1/products/{productId}/action
```

## Notes

- Product creation, updates, and deletions for the master catalog still belong to the upstream Plata product service.
- This service is responsible for app-specific product persistence (per-app copies in the local `products` collection).
- The local `products` collection is the source of truth for which catalog products an app has activated at least once; each document’s **`isActive`** field indicates whether that product is currently turned on (`false` means it was turned off but the row is still returned by `GET .../app/:appId`).