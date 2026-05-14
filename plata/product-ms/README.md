# Product Management Microservice

## Overview
This microservice handles product creation and management for the SpringTD platform. When triggered, it receives a create-app ID and uses it to create a product with the required information.

### Data model (current)
- **Products collection** (`products`) with **Mongoose discriminators**; the stored **`type`** field is the discriminator key.
- **User application snapshots** (`user_product_applications`): written when an end user applies via a merchant offering. **`merchantId` / `merchantName`** = product creator; **`offeringMerchantId` / `offeringMerchantName`** = merchant that enabled the product. Holds **`contractSnapshot`** (frozen global + merchant terms), **`payoutSplit`** (creator vs offering merchant, basis points per revenue line), **`productType`**, **`globalProductId`**, optional **`merchantProductId`**, **`status`** (application lifecycle: draft / submitted / signed / cancelled / withdrawn), **`loanWorkflowStatus`** (LOAN and MORTGAGE only: `requested` \| `under_review` \| `approved` \| `declined` \| `blacklisted`; set to `requested` on create; older documents without the field are treated as `requested` in API responses and in the “requested” list filter), **`snapshotVersion`**, optional **`snapshotHash`**. Timestamps: **`createdAt`** only (no **`updatedAt`** on the document). **HTTP (unauthenticated unless noted):** `POST /api/v1/products/applications`, `GET /api/v1/products/applications`, `GET /api/v1/products/applications/:applicationId`. **Loan workflow (JWT, creator only):** `GET /api/v1/products/applications/me/loan-workflow`, `PATCH /api/v1/products/applications/:applicationId/loan-workflow` — see [Loan workflow (originating merchant)](#loan-workflow-originating-merchant). Model: `UserProductApplicationModel` (`src/models/UserProductApplicationModel.ts`).
- **Canonical `type` values:** `LOAN`, `MORTGAGE`, `SAVINGS`, `INVESTMENT`, `COMMODITY`. Requests may still send legacy Title Case (`Loan`, `Savings`, …); the API normalizes to the canonical value before save.
- **Base fields (all products):** `referenceNumber`, `name`, `description`, `isActive`, `type`, `subType`, `appId`, `status` (`complete` | `incomplete`), `createdAt`, `updatedAt`, optional `metadata`.
- **LOAN / MORTGAGE shared tabs:** `about` (tenure; **LOAN:** `loanTypes[]`; **MORTGAGE:** `mortgageTypes[]` — each `{ name, description }`; `previewAssetUrl`), `structure` (interest, **`allowMoratorium`** toggle, `moratorium` payload when allowed, repayment workflow, amounts, schedules, NPA, equity rule), `requirements` (security toggles, documents, other requirements, AirSign fields), `feesAndCharges` (fees list, charge toggles, late repayment penalties). **MORTGAGE** also has `properties[]` (`name`, `propertyType`, `value`, `location`, `propertyDescription`, `facilities[]`, `customFacilities[]`, `imageUrls[]`, `videoUrl`) and top-level `equityContribution`, `propertyValue`. Downstream loan engines should treat moratorium as **off** unless `structure.allowMoratorium === true`, then read `structure.moratorium` (and/or product tenure options).
- **SAVINGS:** `about` (`duration`, `savingsTypes[]`, `previewAssetUrl`), `structure` (interest rate/method, **`savingsType`** from `GET /options/savings-type` — Fixed Savings vs Flexible Savings, withdrawal flexibility, `savingsAmount` min/max, terms & conditions text, AirSign/contract fields), `feesAndCharges` (fees list; **forceful withdrawal:** `chargeForForcefulWithdrawal` toggle, then `forcefulWithdrawalPenalties[]` with **`name`**, **`penaltyType`** from `GET /options/penalty-type` — Flat vs Percent, **`value`**). No embedded `config` on the SAVINGS discriminator.
- **Partial updates:** `PUT` deep-merges `structure`, `about`, `requirements`, `feesAndCharges`, `config`, and `metadata`. **`properties`** (MORTGAGE) is replaced in full when sent. Other **arrays** inside merged objects follow `deepMerge` (replaced when provided at that key).
- **Existing databases:** migrate old documents so `type` uses the canonical enum and add `isActive` if missing. Remove any legacy **`configuration`** field if present; the API no longer reads or writes it. **SAVINGS** products that used the old discriminator `config` (`compoundingFrequency`, etc.) should be migrated into `about` / `structure` / `feesAndCharges` or the data will not appear in the new schema.

Deployment URL: https://product-ms.fly.dev/

## Deploying environment variables to Fly.io

App name (from `fly.toml`): **`product-ms-plata`**.

1. Install the [Fly CLI](https://fly.io/docs/hands-on/install-flyctl/) and log in: `fly auth login`.
2. From the `product-ms` directory, set **secrets** (encrypted at rest; not in `fly.toml`):

```bash
cd product-ms

fly secrets set \
  MONGODB_URI="your-mongodb-connection-string" \
  NODE_ENV=production \
  CORS_ORIGINS="https://your-frontend.com,https://app.your-frontend.com" \
  LOG_LEVEL=info \
  CLIENT_AUTH_URL="https://your-client-auth-ms.internal-or-public-url" \
  CREATE_APP_SERVICE_URL="https://your-create-app-ms.internal-or-public-url" \
  NOTIFICATIONS_SERVICE_URL="https://your-notifications-ms.internal-or-public-url"
```

**PowerShell (one line):**

```powershell
fly secrets set MONGODB_URI="your-uri" NODE_ENV=production CORS_ORIGINS="https://your-app.com" LOG_LEVEL=info CLIENT_AUTH_URL="https://your-client-auth-url" CREATE_APP_SERVICE_URL="https://your-create-app-url" NOTIFICATIONS_SERVICE_URL="https://your-notifications-ms-url"
```

3. Add any extra keys the same way (e.g. `JWT_SECRET`, `DO_SPACES_*`, `NOTIFICATIONS_SERVICE_URL`) once your code reads them in `environment.ts`.
4. Redeploy so machines pick up new secrets: `fly deploy`
5. List what’s set (values hidden): `fly secrets list`

### Email and in-app notifications (optional)

Product-ms can notify merchants via **notifications-ms** when **`notifyRecipient`** is present on the request body:

- **`POST /api/v1/products`** (and flows that end in a full product create): include optional `notifyRecipient`:
  ```json
  "notifyRecipient": {
    "userId": "<Mongo user id>",
    "email": "merchant@example.com",
    "merchantName": "Acme Ltd"
  }
  ```
  On success, sends template **`product-created`** (email + in-app).

- **`PUT` (update product)** — same optional `notifyRecipient`. If **`isActive`** changes after the update, sends template **`merchant-product-status`** with `statusLabel` **`live`** or **`deactivated`**.

If `notifyRecipient` is omitted, no notification is sent (backward compatible).

Local default for `NOTIFICATIONS_SERVICE_URL` is `http://localhost:4009` when unset; set it explicitly in production.

**Notes**

- Do **not** commit real `.env` values. Use `.env.example` as a template.
- Fly sets **`PORT`** automatically to match `internal_port` in `fly.toml` (3005).
- Fix local `.env` lines like `KEY = value` — use `KEY=value` (no spaces) or dotenv may not load them correctly.

## New Workflow
The product creation workflow has been updated to require product type selection as the first step after receiving the create-app ID:
1. Receive create-app ID
2. Select product type (`LOAN`, `MORTGAGE`, `SAVINGS`, `COMMODITY`, or `INVESTMENT`, or legacy Title Case)
3. (Frontend) Fetch and select product subtype; use canonical `type` in paths where applicable
4. Provide product name and description
5. Configure discriminator fields (LOAN/MORTGAGE tabs as above; **SAVINGS**, **INVESTMENT**, and **COMMODITY** `about` / `structure` / `feesAndCharges`; **COMMODITY** also `commodityPrices[]`; optional legacy **`config`** / top-level `price` fields on COMMODITY)

## API Endpoints

### Select Product Type
Selects the product type after receiving the create-app ID.

**Endpoint:** `POST /api/v1/products/select-type`

**Request Body:**
```json
{
  "appId": "string",           // Required: Create-app ID (1-100 characters)
  "type": "string"             // Required: LOAN | MORTGAGE | SAVINGS | COMMODITY | INVESTMENT (or legacy Loan, …)
}
```

**Response:**
```json
{
  "success": true,
  "message": "Product type selected successfully",
  "data": {
    "id": "string",
    "referenceNumber": "string",  // Auto-generated unique reference number
    "name": "",                   // Will be set later
    "description": "",            // Will be set later
    "type": "LOAN",
    "subType": "string|null",
    "appId": "string",
    "status": "incomplete",
    "isActive": true,
    "createdAt": "string",
    "updatedAt": "string"
  }
}
```

### Create Product After Type Selection
Creates the product with name and description after selecting the type.

**Endpoint:** `POST /api/v1/products/create-after-type`

**Request Body:**
```json
{
  "productId": "string",        // Required: Product ID from type selection
  "name": "string",             // Required: Product name (1-200 characters)
  "description": "string"       // Required: Product description (1-1000 characters)
}
```

**Response:**
```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "id": "string",
    "referenceNumber": "string",  // Auto-generated unique reference number
    "name": "string",
    "description": "string",
    "type": "string",
    "subType": "string|null",     // Optional: Specific subtype within the main type
    "appId": "string",
    "status": "incomplete",       // Initial status (complete or incomplete)
    "createdAt": "string",        // ISO timestamp
    "updatedAt": "string"         // ISO timestamp
  }
}
```

### Create Product (Legacy Endpoint)
Creates a new product with all information at once (maintained for backward compatibility).

**Endpoint:** `POST /api/v1/products`

**Request Body:**
```json
{
  "name": "string",
  "description": "string",
  "type": "LOAN",
  "subType": "string",
  "appId": "string",
  "isActive": true,
  "metadata": {},
  "structure": {},
  "about": {},
  "requirements": {},
  "feesAndCharges": {},
  "properties": [],
  "config": {}
}
```

All keys except `name`, `description`, `type`, and `appId` are optional. Use **`about` / `structure` / `requirements` / `feesAndCharges`** for **LOAN** (admin UI tabs). **SAVINGS** and **INVESTMENT** use **`about` / `structure` / `feesAndCharges`** (three tabs). **COMMODITY** uses top-level fields plus optional **`config`**. **MORTGAGE** adds **`properties[]`** and **`equityContribution` / `propertyValue`**.

**Product types (discriminators):**
- **LOAN** — borrowing; nested LOAN shape above
- **MORTGAGE** — same tabbed shape as LOAN plus **`about.mortgageTypes[]`** (instead of `loanTypes[]` for mortgage-specific lines), `properties[]` (including per-property facilities, custom facilities, and multiple image URLs), and `equityContribution`, `propertyValue`
- **SAVINGS** — `about`, `structure`, `feesAndCharges` (three admin tabs; see data model above)
- **COMMODITY** — `about` (`duration`, `commodityTypes[]`, `previewAssetUrl`), `structure` (yield method, offer yield toggle/value, `unitAmount`, withdrawal flexibility, min quantity / max amount, terms, moratorium, AirSign on Structure tab), `feesAndCharges` (fees, forceful withdrawal penalties), `commodityPrices[]` (`price`, `date`, `source`); optional legacy `price` / `minimumQuantity` / `unitOfMeasure` / `config`
- **INVESTMENT** — `about` (name/description live on the product; tab fields: `duration`, `investmentTypes[]`, `previewAssetUrl`), `structure` (ROI, interest method, **`investmentType`** dropdown, withdrawal flexibility, investment amount min/max, terms, unit purchase toggle, moratorium, conditional unit amount), `feesAndCharges` (fees, forceful withdrawal penalties, optional AirSign: `contractId`, `airSignSecretKey`, `airSignUid`)
  - **`structure.investmentType`** values: **`lump_sum`** or **`unit_based`**.
  - **`lump_sum`**: do **not** send `structure.unitAmount`; use `structure.investmentAmount.min/max` only.
  - **`unit_based`**: `structure.unitAmount` is allowed (for per-unit setup) plus optional `structure.investmentAmount.min/max`.

**Response:**
```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "id": "string",
    "referenceNumber": "string",  // Auto-generated unique reference number
    "name": "string",
    "description": "string",
    "type": "string",
    "subType": "string|null",     // Optional: Specific subtype within the main type
    "appId": "string",
    "status": "incomplete",       // Initial status (complete or incomplete)
    "createdAt": "string",        // ISO timestamp
    "updatedAt": "string"         // ISO timestamp
  }
}
```

### Get Product by ID
Retrieves a product by its ID.

**Endpoint:** `GET /api/v1/products/:id`

### Get Product Types
Returns allowed product discriminators for dropdowns. **`value`** is the canonical stored enum; **`label`** is display text.

**Endpoint:** `GET /api/v1/products/types`

**Response:**
```json
{
  "success": true,
  "data": [
    { "value": "LOAN", "label": "Loan" },
    { "value": "MORTGAGE", "label": "Mortgage" },
    { "value": "SAVINGS", "label": "Savings" },
    { "value": "COMMODITY", "label": "Commodity" },
    { "value": "INVESTMENT", "label": "Investment" }
  ]
}
```

### Update Product
Updates an existing product.

**Endpoint:** `PUT /api/v1/products/:id`

**Request Body:**
```json
{
  "name": "string",
  "description": "string",
  "type": "LOAN",
  "subType": "string",
  "status": "complete",
  "isActive": true,
  "metadata": {},
  "structure": {},
  "about": {},
  "requirements": {},
  "feesAndCharges": {},
  "properties": [],
  "config": {},
  "equityContribution": 0,
  "propertyValue": 0,
  "price": 0,
  "minimumQuantity": 0,
  "unitOfMeasure": "string"
}
```

All fields are optional; only include fields relevant to the product discriminator.

### Delete Product
Deletes a product by its ID.

**Endpoint:** `DELETE /api/v1/products/:id`

### Get ALL Products
Retrieves all products.

**Endpoint:** `GET /api/v1/products`

### Loan workflow (originating merchant)

Underwriting states for **LOAN** and **MORTGAGE** user applications are stored as **`loanWorkflowStatus`** on the snapshot. Only the **originating product merchant** (`merchantId` on the application — the creator of the global product) may list or update these states. The **offering** merchant (`offeringMerchantId`) is rejected unless they are the same account.

**Auth:** `Authorization: Bearer <access_token>` from client-auth (merchant user). Product-ms verifies the token by calling **`POST {CLIENT_AUTH_URL}/api/v1/auth/verify-token`** (see `src/config/environment.ts` and `.env.example`). Set **`CLIENT_AUTH_URL`** (or **`SERVICE_AUTH_URL`**) in production so product-ms can reach client-auth-ms.

**List (dashboard tabs):** omit `loanWorkflowStatus` to return all LOAN/MORTGAGE applications for the authenticated creator; or filter by tab.

**Endpoint:** `GET /api/v1/products/applications/me/loan-workflow`

**Query parameters (optional):**

| Parameter | Values |
|-----------|--------|
| `loanWorkflowStatus` | `requested`, `under_review`, `approved`, `declined`, `blacklisted` |
| `limit` | 1–100 (default 50) |
| `skip` | default 0 |

For **`requested`**, the service includes rows where `loanWorkflowStatus` is missing (legacy data).

**Update status (e.g. action menu):**

**Endpoint:** `PATCH /api/v1/products/applications/:applicationId/loan-workflow`

**Request body:**
```json
{
  "loanWorkflowStatus": "under_review"
}
```

**Responses:** `403` if the JWT merchant is not `merchantId` on the snapshot; `400` if the application is not LOAN/MORTGAGE; `404` if the id is invalid or not found.

Through the API gateway, paths are the same under **`/api/v1/products/...`**.

### Get Products by App ID
Retrieves all products associated with a specific app ID.

**Endpoint:** `GET /api/v1/products/app/:appId`

### Product Overview (dashboard aggregates)
Single endpoint for dashboard headline + category cards.

**Endpoint:** `GET /api/v1/products/app/:appId/product-overview`

**Auth:** `Authorization: Bearer <access_token>` (merchant creator).

#### Headline semantics (`data.headline`)

- `requestedAmount`: LOAN + MORTGAGE principal in requested pipeline (`requested`, `under_review`, plus legacy missing `loanWorkflowStatus`).
- `approvedAmount`: LOAN + MORTGAGE principal with `loanWorkflowStatus = approved`.
- `totalTransactions`: canonical source only — create-app-ms `GET /api/v1/apps/:id/transaction-stats`, computed as `totalCreditAmount + totalDebitAmount`.
- `totalSavings`: sum of SAVINGS + INVESTMENT deposit/balance values from `contractSnapshot`.
- `totalInterest`: sum of SAVINGS + INVESTMENT cumulative interest paid values from `contractSnapshot`.

#### Category semantics (`data.byCategory[]`)

`configuredProductCount` is the total number of products created for that app + type (`products` collection), and `customerCount` is distinct `userId` count in `user_product_applications` for that app + type.

- **LOAN / MORTGAGE**
  - `capitalAmount` = requested/under_review principal
  - `issuedAmount` = approved principal
  - `repaymentAmount` = repayments on approved applications
- **SAVINGS / INVESTMENT**
  - `capitalAmount` = deposits / current balances
  - `issuedAmount` = cumulative interest paid to savers/investors
  - `repaymentAmount` = cumulative withdrawals
- **COMMODITY**
  - `inventoryAmount` = inventory value held
  - `salesAmount` = gross sales income
  - `repaymentAmount` = COGS (cost of goods sold)

#### Frontend field mapping

Use this mapping for the current dashboard UI labels.

| UI label | API field |
|---|---|
| Requested | `data.headline.requestedAmount` |
| Approved | `data.headline.approvedAmount` |
| Total Transactions | `data.headline.totalTransactions` |
| Total Savings | `data.headline.totalSavings` |
| Total Interest | `data.headline.totalInterest` |
| Mortgage / Loan / Saving / Investment / Commodity card count | `data.byCategory[i].configuredProductCount` (match by `type`) |
| Customers (all cards) | `data.byCategory[i].customerCount` |
| Capital (loan/mortgage) | `data.byCategory[i].capitalAmount` |
| Issued (loan/mortgage) | `data.byCategory[i].issuedAmount` |
| Repayment (loan/mortgage) | `data.byCategory[i].repaymentAmount` |
| Deposits (savings/investment) | `data.byCategory[i].capitalAmount` |
| Interest Paid (savings/investment) | `data.byCategory[i].issuedAmount` |
| Withdrawals (savings/investment) | `data.byCategory[i].repaymentAmount` |
| Inventory (commodity) | `data.byCategory[i].inventoryAmount` |
| Sales (commodity) | `data.byCategory[i].salesAmount` |
| Cost of Goods Sold (COGS, commodity) | `data.byCategory[i].repaymentAmount` |

#### Example response (trimmed)

```json
{
  "success": true,
  "data": {
    "schemaVersion": 1,
    "generatedAt": "2026-04-09T10:00:00.000Z",
    "appId": "app-123",
    "headline": {
      "requestedAmount": 5000000,
      "approvedAmount": 4000000,
      "lendingApplicationsRequestedCount": 12,
      "lendingApplicationsApprovedCount": 8,
      "totalTransactions": 4000000,
      "totalSavings": 4000000,
      "totalInterest": 1200000
    },
    "byCategory": [
      {
        "type": "MORTGAGE",
        "configuredProductCount": 3,
        "applicationCount": 25,
        "customerCount": 20,
        "capitalAmount": 12233000,
        "issuedAmount": 12023300,
        "repaymentAmount": 10233300,
        "inventoryAmount": 0,
        "salesAmount": 0
      }
    ]
  }
}
```

### Product overview by type (drill-down table)

Use this when a merchant clicks a **category card** on the General Info / product overview screen (e.g. “Loan Products”). It returns one **table row per configured product** of that type for the app, with the same money semantics as the aggregated card for that `type`.

**Endpoint:** `GET /api/v1/products/app/:appId/product-overview/by-type/:productType`

**Auth:** Same as the overview — `Authorization: Bearer <access_token>` (merchant creator). Reuse the token you already send to `product-overview`.

**Path parameters**

| Parameter | Description |
|-----------|-------------|
| `appId` | Same app id as the dashboard (`data.appId` from the overview response, or your route param). |
| `productType` | One of: `LOAN`, `MORTGAGE`, `SAVINGS`, `INVESTMENT`, `COMMODITY`. Legacy UI labels are accepted where `normalizeProductType` maps them (e.g. `Loan` → `LOAN`). |

**When to call**

1. Load the dashboard with `GET .../product-overview` (unchanged).
2. On card click, read the card’s discriminator (`byCategory[i].type`) and request:
   `GET .../product-overview/by-type/${encodeURIComponent(type)}` with the same `appId` and `Authorization` header.

**Response shape** (`200`, `success: true`)

| Field | Meaning |
|-------|---------|
| `data.schemaVersion` | `1` — bump handled on the frontend if we ship breaking changes. |
| `data.generatedAt` | ISO timestamp. |
| `data.appId` | Echo of the app. |
| `data.type` | Same discriminator you passed. |
| `data.products` | Array of rows (one per product in `products` collection for this app + type). |
| `data.totals` | Footer / summary numbers (see below). |

**Each `data.products[]` row**

| Field | Meaning |
|-------|---------|
| `productId` | Product `_id` (string). Use for deep links to product detail if needed. |
| `referenceNumber` | Merchant reference. |
| `name` | Product name (rows are sorted by name). |
| `customerCount` | Distinct applicants (`userId`) for **this product only**. |
| `applicationCount` | Count of applications linked to this product (`globalProductId`). |

Money fields follow the **same rules as `byCategory`** for that `type`:

- **LOAN / MORTGAGE:** `capitalAmount` (requested / under-review principal), `issuedAmount` (approved principal), `repaymentAmount` (repaid on approved). `inventoryAmount` and `salesAmount` are `0`.
- **SAVINGS / INVESTMENT:** `capitalAmount` (deposits / balances), `issuedAmount` (interest paid), `repaymentAmount` (withdrawals). `inventoryAmount` and `salesAmount` are `0`.
- **COMMODITY:** `inventoryAmount`, `salesAmount`, `repaymentAmount` (COGS). `capitalAmount` and `issuedAmount` are `0`.

**`data.totals`**

| Field | Meaning |
|-------|---------|
| `distinctCustomerCount` | Distinct `userId` across **all** applications of this `type` for the app (use for a “total unique customers” footer — do **not** sum row `customerCount`s for this; one user can apply to multiple products). |
| `applicationCount` | Sum of row `applicationCount`s. |
| `capitalAmount`, `issuedAmount`, `repaymentAmount`, `inventoryAmount`, `salesAmount` | Sums of the corresponding row fields. |

**Errors**

| Status | When |
|--------|------|
| `400` | Missing `appId` or invalid / unknown `productType`. |
| `401` | Missing or invalid Bearer token. |
| `403` | Authenticated user is not allowed as merchant creator for this operation. |

**Example: loan products table** (`GET .../product-overview/by-type/LOAN`)

```json
{
  "success": true,
  "data": {
    "schemaVersion": 1,
    "generatedAt": "2026-04-13T12:00:00.000Z",
    "appId": "app-123",
    "type": "LOAN",
    "products": [
      {
        "productId": "674a1b2c3d4e5f6789012345",
        "referenceNumber": "LN-001",
        "name": "SME Working Capital",
        "customerCount": 12,
        "applicationCount": 18,
        "capitalAmount": 5000000,
        "issuedAmount": 3200000,
        "repaymentAmount": 800000,
        "inventoryAmount": 0,
        "salesAmount": 0
      }
    ],
    "totals": {
      "distinctCustomerCount": 12,
      "applicationCount": 18,
      "capitalAmount": 5000000,
      "issuedAmount": 3200000,
      "repaymentAmount": 800000,
      "inventoryAmount": 0,
      "salesAmount": 0
    }
  }
}
```

**Frontend table columns (suggested)**

| Card / `type` | Columns from each `products[]` row |
|---------------|-----------------------------------|
| LOAN, MORTGAGE | Name (or reference), Customers → `customerCount`, Capital → `capitalAmount`, Issued → `issuedAmount`, Repayment → `repaymentAmount` |
| SAVINGS, INVESTMENT | Name, Customers → `customerCount`, Deposits → `capitalAmount`, Interest paid → `issuedAmount`, Withdrawals → `repaymentAmount` |
| COMMODITY | Name, Customers → `customerCount`, Inventory → `inventoryAmount`, Sales → `salesAmount`, COGS → `repaymentAmount` |

Through the API gateway, paths stay under **`/api/v1/products/...`**.

### Sub-merchant activation (gateway PK/SK flow)

External integrator services should call this through the API gateway.

**Endpoint:** `POST /api/v1/products/sub-merchant-activations`

**Headers (required at gateway):**
- `PLATA_PUBLIC_KEY`
- `PLATA_SECRET_KEY`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "appId": "app_123",
  "productId": "product_abc",
  "productName": "Optional product snapshot",
  "merchantId": "merchant_parent_1",
  "merchantName": "Parent Merchant Name",
  "subMerchant": {
    "id": "subm_1001",
    "name": "Sub Merchant",
    "email": "submerchant@example.com",
    "phone": "+2348012345678"
  },
  "status": "active",
  "complianceStatus": "completed",
  "complianceDocuments": [
    {
      "url": "https://integrator.example.com/files/kyc.pdf",
      "name": "KYC pack",
      "uploadedAt": "2026-04-15T12:00:00.000Z"
    }
  ]
}
```

Set `status` to `deactivated` when turned off. Storage is scoped by `plataMerchantId + appId + productId + merchantId + subMerchantId`.

**Compliance (optional):** Integrators report whether the **sub-merchant** has finished compliance on **their** platform and optionally a list of **compliance document** references for the Plata merchant UI.

- `complianceStatus`: `not_started` \| `pending` \| `completed` (defaults to `not_started` if omitted on first write).
- `complianceDocuments`: up to 50 items; each requires `url` (HTTPS URL or other locator string); optional `name`, `uploadedAt` (ISO 8601).

When `complianceStatus` and/or `complianceDocuments` are sent, they are **synced to every activation row** for the same `appId`, `merchantId`, and `subMerchant.id` (all catalog products), so dashboard aggregates stay consistent.

The JSON response for this endpoint includes `complianceStatus` and `complianceDocuments` on the saved activation document.

### Sub-merchant external-user usage start (gateway PK/SK flow)

External integrator services should call this through the API gateway.

**Endpoint:** `POST /api/v1/products/sub-merchant-usage-events`

**Headers (required at gateway):**
- `PLATA_PUBLIC_KEY`
- `PLATA_SECRET_KEY`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "appId": "app_123",
  "productId": "product_abc",
  "productName": "Optional product snapshot",
  "merchantId": "merchant_parent_1",
  "merchantName": "Parent Merchant Name",
  "subMerchant": {
    "id": "subm_1001",
    "name": "Sub Merchant",
    "email": "submerchant@example.com",
    "phone": "+2348012345678"
  },
  "externalUser": {
    "id": "user_7788",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "+2348099991111"
  },
  "startedAt": "2026-04-15T12:00:00.000Z"
}
```

`startedAt` is optional (defaults to current server time). Product-ms stores source-of-truth usage data and mirrors an identity projection to `client-auth-ms` via internal endpoint (`/internal/api/v1/external-users/usage-events`) using internal token auth.


### Sub-merchant dashboards (merchant UI, JWT)

Plata merchant users (product creator) read aggregated sub-merchant data for an app. **Auth:** `Authorization: Bearer <access_token>` (same pattern as `product-overview` — product-ms verifies via client-auth).

**Merchant dashboard** — one aggregated row per sub-merchant (activation + usage metrics).

**Endpoint:** `GET /api/v1/products/sub-merchants/merchant-dashboard`  
**Handler:** `subMerchantProductActivationController.getMerchantDashboard` (`router.get` in `productRoutes.ts`).

**Query:** `appId` (required). Optional: `status` (`active` \| `deactivated`), `search`, `limit` (1–100, default `20`), `skip` (default `0`).

**Response (`data.items[]`):** Each row includes sub-merchant identity, catalog activation rollup (`status`, `activeProductsCount`, `products[]`, …), plus integrator compliance:

- `complianceStatus` — `not_started` \| `pending` \| `completed` (whether the sub-merchant completed compliance on the integrator’s platform).
- `complianceDocuments` — array of `{ url, name?, uploadedAt? }` for **View uploads** / compliance document links in the merchant UI.

**Customers dashboard** — rows for external users (usage events) under sub-merchants for the authenticated merchant’s app.

**Endpoint:** `GET /api/v1/products/sub-merchants/customers-dashboard`  
**Handler:** `subMerchantProductUsageEventController.getCustomerDashboard` (`router.get` in `productRoutes.ts`).

**Query:** `appId` (required). Optional: `subMerchantId`, `search`, `limit` (1–100, default `20`), `skip` (default `0`).

**Response (`data.items[]`):** Same usage-event fields as before, plus **`complianceStatus`** and **`complianceDocuments`** for the row’s `subMerchantId` (resolved from sub-merchant activations so the Customers tab can show compliance without an extra call).

Through the API gateway, paths stay under **`/api/v1/products/...`**.

### Check Product Action
Determines what action is allowed for a product based on its status.

**Endpoint:** `GET /api/v1/products/:id/action`

**Response:**
```json
{
  "success": true,
  "data": {
    "productId": "string",
    "status": "string",         // complete or incomplete
    "allowedAction": "string",  // manage or configure
    "message": "string"
  }
}
```

When a product's status is "complete", the allowed action is "manage".
When a product's status is "incomplete", the allowed action is "configure".

### Manage Product
Allows editing/updating all product information for complete products.

**Endpoint:** `PUT /api/v1/products/:id/manage`

**Request Body:** Same optional fields as **Update Product** (including LOAN `about` / `structure` / `requirements` / `feesAndCharges`).

**Response:**
```json
{
  "success": true,
  "message": "Product managed successfully",
  "data": {
    "id": "string",
    "referenceNumber": "string",  // Auto-generated unique reference number
    "name": "string",
    "description": "string",
    "type": "string",
    "subType": "string|null",
    "appId": "string",
    "status": "string",           // Product status (complete or incomplete)
    "createdAt": "string",        // ISO timestamp
    "updatedAt": "string"         // ISO timestamp
  }
}
```

Only products with "complete" status can be managed. Attempting to manage an incomplete product will result in a 403 Forbidden error.

## Form dropdown options

Typed product data lives on **discriminator paths** (e.g. **LOAN/MORTGAGE** `about`, `structure`, `requirements`, `feesAndCharges`; **SAVINGS**, **INVESTMENT**, and **COMMODITY** `about`, `structure`, `feesAndCharges`; **COMMODITY** also **`commodityPrices[]`**). There is no `configuration` blob on the product document.

- **Read / write:** `GET` and `PUT /api/v1/products/:id` return and accept those paths; nested objects are **deep-merged** on update. Sending **`commodityPrices`**, **`properties`**, or full **fee / penalty arrays** replaces those arrays (same pattern as mortgage `properties`).
- **Dropdown helpers** (response shapes unchanged) are at:
  - **Preferred:** `GET /api/v1/products/options/...` (e.g. `/options/moratorium`, `/options/moratorium-type`, `/options/loan-tenure`, `/options/interest-method`, `/options/savings-interest-method`, `/options/withdrawal-flexibility`, `/options/amortization`, `/options/repayment-cycle`, `/options/repayment-schedule`, `/options/equity-requirement`, `/options/acceptable-npa`, `/options/loan-other-requirement-content-type`, `/options/fee-type`, `/options/penalty-type`, `/options/savings-type`, `/options/savings-tenure`, `/options/repayment-workflow`)
  - **Legacy mount:** `GET /api/v1/configurations/options/...` (same handlers)

The sections below document each options endpoint. Map each option’s `value` (and `unit` where applicable) into the correct field on your product type (e.g. moratorium **length** → LOAN `structure.moratorium`; moratorium **type** → `structure.moratoriumType`).

### Get Moratorium Options
Retrieves moratorium **duration** (1–12 months) for Loan and Mortgage products — not the moratorium **type** (principal vs interest grace). For type, use **Get Moratorium Type Options** below.

**Endpoints:** `GET /api/v1/products/options/moratorium` (legacy: `GET /api/v1/configurations/options/moratorium`)

**Response:**
```json
{
  "success": true,
  "data": [
    { "value": 1, "label": "1 month" },
    { "value": 2, "label": "2 months" },
    { "value": 3, "label": "3 months" },
    { "value": 4, "label": "4 months" },
    { "value": 5, "label": "5 months" },
    { "value": 6, "label": "6 months" },
    { "value": 7, "label": "7 months" },
    { "value": 8, "label": "8 months" },
    { "value": 9, "label": "9 months" },
    { "value": 10, "label": "10 months" },
    { "value": 11, "label": "11 months" },
    { "value": 12, "label": "12 months" }
  ]
}
```

### Get Moratorium Type Options
Retrieves **Type of moratorium** choices for Loan and Mortgage: grace on principal, grace on interest, or grace on both.

**Endpoints:** `GET /api/v1/products/options/moratorium-type` (legacy: `GET /api/v1/configurations/options/moratorium-type`)

**Response:**
```json
{
  "success": true,
  "data": [
    { "value": "grace_on_principal", "label": "Grace on principal" },
    { "value": "grace_on_interest", "label": "Grace on interest" },
    { "value": "grace_on_both", "label": "Grace on both interest and Principal" }
  ]
}
```

Store the selected **`value`** on **`structure.moratoriumType`**. Use **`/options/moratorium`** for how long (months), **`allowMoratorium`** for the master toggle.

### Get Repayment Cycle Options
Retrieves how **often** repayments fall due (cadence) for Loan and Mortgage products. Map the selected **`value`** to **`structure.repaymentFrequency`** (not the repayment *schedule* pattern — use **Get Repayment Schedule Options** below).

**Endpoint:** `GET /api/v1/products/options/repayment-cycle` (legacy: `GET /api/v1/configurations/options/repayment-cycle`)

**Response:**
```json
{
  "success": true,
  "data": [
    { "value": "Daily", "label": "Daily" },
    { "value": "Monthly", "label": "Monthly" },
    { "value": "Quarterly", "label": "Quarterly" },
    { "value": "Bi-annually", "label": "Bi-annually" },
    { "value": "Annually", "label": "Annually" }
  ]
}
```

### Get Repayment Schedule Options
Retrieves **repayment schedule** patterns (how principal and interest are structured over the loan) for LOAN / MORTGAGE **Structure** (`structure.repaymentSchedule`). This is separate from **repayment cycle** (`/options/repayment-cycle` → `structure.repaymentFrequency`).

**Endpoint:** `GET /api/v1/products/options/repayment-schedule` (legacy: `GET /api/v1/configurations/options/repayment-schedule`)

**Response:**
```json
{
  "success": true,
  "data": [
    { "value": "equal_monthly_instalments", "label": "Equal Monthly Installments (EMI)" },
    { "value": "bullet_repayment", "label": "Bullet Repayment" },
    { "value": "interest_only", "label": "Interest Only" },
    { "value": "principal_only_fixed_principal", "label": "Principal Only (Fixed Principal)" },
    { "value": "balloon_payment", "label": "Balloon Payment" }
  ]
}
```

### Get Equity Requirement Options
Retrieves **equity requirement** choices for LOAN / MORTGAGE **Structure** (`structure.equityRequirement`).

**Endpoint:** `GET /api/v1/products/options/equity-requirement` (legacy: `GET /api/v1/configurations/options/equity-requirement`)

**Response:**
```json
{
  "success": true,
  "data": [
    { "value": "zero_down", "label": "Zero Down" },
    { "value": "fixed_amount", "label": "Fixed Amount" },
    { "value": "percentage_based", "label": "Percentage-based" }
  ]
}
```

### Get Acceptable NPA Options
Retrieves **acceptable non-performing asset (NPA)** thresholds (days past due before classifying as NPA) for LOAN / MORTGAGE **Structure** (`structure.acceptableNPA`). Each **`value`** is a string day count for storage parity with the product schema.

**Endpoint:** `GET /api/v1/products/options/acceptable-npa` (legacy: `GET /api/v1/configurations/options/acceptable-npa`)

**Response:**
```json
{
  "success": true,
  "data": [
    { "value": "30", "label": "30 Days" },
    { "value": "60", "label": "60 Days" },
    { "value": "90", "label": "90 Days" },
    { "value": "120", "label": "120 Days" },
    { "value": "180", "label": "180 Days" }
  ]
}
```

### Get Loan Other Requirement Content Type Options
Retrieves the **Content type** dropdown for LOAN / MORTGAGE **Requirements** → **Other requirements** (`requirements.otherRequirements[].contentType`). Each row may also include **`description`**, **`requirementType`**, **`uploadRequired`**, and **`templateFileUrl`**.

**Endpoint:** `GET /api/v1/products/options/loan-other-requirement-content-type` (legacy: `GET /api/v1/configurations/options/loan-other-requirement-content-type`)

**Response:**
```json
{
  "success": true,
  "data": [
    { "value": "document_upload", "label": "Document upload" },
    { "value": "document_template", "label": "Document template" }
  ]
}
```

**How `contentType` drives UI (product admin and loan applicants)**  
Product-ms only **persists** each row on `requirements.otherRequirements[]`; it does not render forms. Implementations should behave as follows:

- **`document_upload`** — **Applicant** (loan application): show a **file upload** control for the document described in **`description`** (and use **`requirementType`** as the short label / title for the row, e.g. “Account Statement”). **`description` is required when `contentType` is `document_upload`**. Respect **`uploadRequired`** when deciding if the upload is mandatory. The **merchant** configures the requirement text here; the applicant’s completed file is stored by your **loan / application** service, not on the product document.
- **`document_template`** — **Applicant**: show a template-driven document flow. **`templateFileUrl` is required when `contentType` is `document_template`** and should point to the uploaded template file that applicants download, fill, and submit during application.

**Merchant product builder:** The admin form should **react to `contentType`**: after the merchant chooses **Document upload**, show configuration aimed at defining what the applicant must upload (title / **`requirementType`**, **`description`**, **`uploadRequired`**). After they choose **Document template**, require template upload and persist the returned URL/key as **`templateFileUrl`** on the `otherRequirements` row.

### Get Loan Tenure Options
Retrieves the available loan tenure options (value, unit, label) for Loan and Mortgage product configuration dropdowns.

**Endpoint:** `GET /api/v1/products/options/loan-tenure`

**Response:**
```json
{
  "success": true,
  "data": [
    { "value": 3, "unit": "month", "label": "3 months" },
    { "value": 6, "unit": "month", "label": "6 months" },
    { "value": 12, "unit": "month", "label": "12 months" },
    { "value": 24, "unit": "month", "label": "24 months" },
    { "value": 36, "unit": "month", "label": "36 months" },
    { "value": 48, "unit": "month", "label": "48 months" },
    { "value": 60, "unit": "month", "label": "60 months" },
    { "value": 72, "unit": "month", "label": "72 months" },
    { "value": "custom", "unit": "month", "label": "Custom", "allowManualEntry": true }
  ]
}
```
Use each item’s `value` and `unit` in LOAN `about.tenure` or `structure` (however your admin maps tenure).  
When `value` is `"custom"` and `allowManualEntry` is `true`, the frontend should prompt for a user-defined tenure value that is not restricted to the preset dropdown list.

### Get Interest Method Options
Retrieves the **Interest method** dropdown for LOAN / MORTGAGE **Structure** (`structure.interestMethod`). This is separate from **amortization** (`structure.amortizationSchedule`).

**Endpoint:** `GET /api/v1/products/options/interest-method` (legacy: `GET /api/v1/configurations/options/interest-method`)

**Response:**
```json
{
  "success": true,
  "data": [
    { "value": "fixed_amount", "label": "Fixed amount" },
    { "value": "reducing_balance", "label": "Reducing balance" }
  ]
}
```

### Get Savings Interest Method Options
Same **`value` / `label`** pairs as **Get Interest Method Options** (`fixed_amount`, `reducing_balance`), exposed for **SAVINGS** **Structure** (`structure.interestMethod`). Use this endpoint from the Savings admin UI; LOAN/MORTGAGE should continue to use **`/options/interest-method`**.

**Endpoint:** `GET /api/v1/products/options/savings-interest-method` (legacy: `GET /api/v1/configurations/options/savings-interest-method`)

**Response:** Same JSON shape as **Get Interest Method Options** above.

### Get Withdrawal Flexibility Options
Retrieves **withdrawal flexibility** for **SAVINGS**, **INVESTMENT**, and **COMMODITY** **Structure** (`structure.withdrawalFlexibility`).

**Endpoint:** `GET /api/v1/products/options/withdrawal-flexibility` (legacy: `GET /api/v1/configurations/options/withdrawal-flexibility`)

**Response:**
```json
{
  "success": true,
  "data": [
    { "value": "anytime", "label": "Anytime" },
    { "value": "weekly", "label": "Weekly" },
    { "value": "monthly", "label": "Monthly" },
    { "value": "yearly", "label": "Yearly" },
    { "value": "by_schedule", "label": "By schedule" }
  ]
}
```

### Get Amortization Options
Retrieves the **amortization schedule** options for LOAN / MORTGAGE **Structure** (`structure.amortizationSchedule`). This is separate from **interest method** (`structure.interestMethod` — see **Get Interest Method Options**).

**Endpoint:** `GET /api/v1/products/options/amortization` (legacy: `GET /api/v1/configurations/options/amortization`)

**Response:**
```json
{
  "success": true,
  "data": [
    { "value": "equal_instalment", "label": "Equal Instalment" },
    { "value": "equal_principal", "label": "Equal Principal Repayment" },
    { "value": "reducing_balance", "label": "Reducing Balance" }
  ]
}
```
Use each item’s `value` in LOAN / MORTGAGE `structure.amortizationSchedule` (or equivalent path).

**Note:** Older integrations may have stored `straight_line` for amortization; treat that as **`equal_instalment`** when reading legacy data.

### Get Repayment Workflow Options
Defines the three **Repayment workflow** patterns (order in which repayments apply to principal, interest, and charges). Map the selected option to LOAN / MORTGAGE `structure.repaymentWorkflow` using each item’s **`value`**. Only one workflow should be active per product (the frontend toggles enforce that in the UI).

**Endpoint:** `GET /api/v1/products/options/repayment-workflow` (legacy: `GET /api/v1/configurations/options/repayment-workflow`)

**Response:**
```json
{
  "success": true,
  "data": [
    { "value": "principal_interest_charges", "label": "Principal → Interest → Charges" },
    { "value": "charges_principal_interest", "label": "Charges → Principal → Interest" },
    { "value": "interest_charges_principal", "label": "Interest → Charges → Principal" }
  ]
}
```

`product-ms` **persists** this setting on the product document; **repayment allocation at transaction time** must be implemented in the service that applies payments (e.g. loan engine), using `structure.repaymentWorkflow` from the product linked to the loan.

### Get Currency Options
Retrieves the available currency options for Loan, Mortgage, and other product configuration dropdowns.

**Endpoint:** `GET /api/v1/products/options/currency`

**Response:**
```json
{
  "success": true,
  "data": [
    { "value": "NGN", "label": "NGN - Nigerian Naira" },
    { "value": "USD", "label": "USD - US Dollar" },
    { "value": "EUR", "label": "EUR - Euro" }
  ]
}
```
Use the `value` in `metadata` or an appropriate typed field if you add currency to the schema.

### Get Fee Type Options
Retrieves **Flat** vs **Percent** for **Fees & Charges** line items: **`fees[].feeType`** on LOAN / MORTGAGE / SAVINGS / INVESTMENT / COMMODITY (`feesAndCharges.fees`).

**Merchant flow:** The admin names each fee (**`name`**), picks **`feeType`** from this endpoint, then enters **`value`**: for **Flat**, a fixed amount (numeric string; currency display is a UI concern); for **Percent**, a percentage (e.g. `"5"` or `"5%"` — store consistently in your app). Persist rows on **`feesAndCharges.fees`** via `PUT /api/v1/products/:id` (sending **`fees`** replaces the whole list when provided).

**Endpoint:** `GET /api/v1/products/options/fee-type` (legacy: `GET /api/v1/configurations/options/fee-type`)

**Response:**
```json
{
  "success": true,
  "data": [
    { "value": "Flat", "label": "Flat" },
    { "value": "Percent", "label": "Percent" }
  ]
}
```

**Note:** Older data may have **`feeType`: `"Percentage"`**; treat that as **Percent** when reading or migrate to **`Percent`**.

### Get Penalty Type Options
Same option list as **fee type**, for **`penaltyType`** on late-repayment and forceful-withdrawal penalty rows (`feesAndCharges.lateRepayment.penalties[]`, `feesAndCharges.forcefulWithdrawalPenalties[]`).

**Endpoint:** `GET /api/v1/products/options/penalty-type` (legacy: `GET /api/v1/configurations/options/penalty-type`)

**Response:** Identical to **Get Fee Type Options** above.

**SAVINGS — “Charge for Forceful Withdrawal” block (admin UI):**

1. Persist **`feesAndCharges.chargeForForcefulWithdrawal`** as the master toggle. When it is **false** or omitted, the product should not apply forceful-withdrawal penalties; the admin UI should **hide or disable** the penalty form.
2. When the toggle is **on**, each penalty row maps to **`feesAndCharges.forcefulWithdrawalPenalties[]`** with:
   - **Name of penalty** → **`name`**
   - **Type** (next to name) → **`penaltyType`**, using **`GET /options/penalty-type`**: **`Flat`** or **`Percent`**
   - **Value** → **`value`**: for **Flat**, a numeric / money amount (store as string, e.g. `"10000"`); for **Percent**, a percentage (e.g. `"5"` — formatting with `%` in the UI is optional; stay consistent on read/write)

The API does not validate flat vs percent formatting; that is enforced in your **frontend** (and in downstream ledger/savings engines).

### Get Collateral Type Options
Retrieves the available collateral type options for Loan product configuration (e.g. "Add More Collateral" — Select Type dropdown).

**Endpoint:** `GET /api/v1/products/options/collateral-type`

**Response:**
```json
{
  "success": true,
  "data": [
    { "value": "property", "label": "Property" },
    { "value": "car", "label": "Car / Vehicle" },
    { "value": "land", "label": "Land" },
    { "value": "equipment", "label": "Equipment" },
    { "value": "other", "label": "Other" }
  ]
}
```
Use the `value` when modeling collateral inside LOAN `requirements` / `structure` as your product design requires.

### Get Mortgage Facility Options
Retrieves **Mortgage Facilities** choices for the **MORTGAGE** Properties tab. Persist selected values on each property entry at **`properties[].facilities`** as a string array. Values from this endpoint are suggested defaults; custom values are also accepted. Use **`properties[].customFacilities`** for free-text facility entries from "Add custom facility". Options are defined in `src/types/productConfiguration.ts` (`MORTGAGE_FACILITY_OPTIONS`).

**Endpoint:** `GET /api/v1/products/options/mortgage-facilities`

**Response:**
```json
{
  "success": true,
  "data": [
    { "value": "solar_energy_system", "label": "Solar energy system" },
    { "value": "reliable_water_supply", "label": "Reliable water supply" },
    { "value": "gated_estate", "label": "Gated estate" },
    { "value": "security_24_7", "label": "24/7 security" },
    { "value": "cctv_surveillance", "label": "CCTV surveillance" },
    { "value": "estate_park_playground", "label": "Estate park/ playground" },
    { "value": "estate_gym", "label": "Estate gym" },
    { "value": "outdoor_pool", "label": "Outdoor pool" },
    { "value": "car_garage", "label": "Car garage" },
    { "value": "estate_waste_management", "label": "Estate Waste management" },
    { "value": "boys_quarter", "label": "Boys quarter" },
    { "value": "gateman_quarter", "label": "Gateman quarter" },
    { "value": "indoor_cinema", "label": "Indoor Cinema" }
  ]
}
```

### Get Commodity Trading Cycle Options
Retrieves the available trading cycle options for **Commodity** product configuration dropdowns.

**Endpoint:** `GET /api/v1/products/options/commodity-trading-cycle`

**Response:**
```json
{
  "success": true,
  "data": [
    { "value": "Daily", "label": "Daily" },
    { "value": "Weekly", "label": "Weekly" },
    { "value": "Monthly", "label": "Monthly" },
    { "value": "Quarterly", "label": "Quarterly" },
    { "value": "Seasonally", "label": "Seasonally" }
  ]
}
```

### Get Commodity Tenure Options
Retrieves the available commodity tenure options for **Commodity** product configuration dropdowns.

**Endpoint:** `GET /api/v1/products/options/commodity-tenure`

**Response:**
```json
{
  "success": true,
  "data": [
    { "value": 3, "unit": "month", "label": "3 months" },
    { "value": 6, "unit": "month", "label": "6 months" },
    { "value": 12, "unit": "month", "label": "12 months" },
    { "value": 24, "unit": "month", "label": "24 months" },
    { "value": "open_ended", "unit": "open", "label": "Open-ended" }
  ]
}
```

### Get Investment Trading Cycle Options
Same option set as commodity trading cycle; use for **Investment** configuration dropdowns.

**Endpoint:** `GET /api/v1/products/options/investment-trading-cycle`

**Response:** Same shape as commodity trading cycle (Daily, Weekly, Monthly, Quarterly, Seasonally).

### Get Investment Tenure Options
Same option set as commodity tenure; use for **Investment** configuration dropdowns.

**Endpoint:** `GET /api/v1/products/options/investment-tenure`

**Response:** Same shape as commodity tenure (3, 6, 12, 24 months, Open-ended).

### Get Investment Type Options
Returns allowed values for **Investment** Structure **Investment Type** (`structure.investmentType`).

**Endpoint:** `GET /api/v1/products/options/investment-type`

**Response:**
```json
{
  "success": true,
  "data": [
    { "value": "lump_sum", "label": "Lump sum" },
    { "value": "unit_based", "label": "Unit based" }
  ]
}
```

**Frontend mapping rule (important):**
- If user selects **Lump sum** (`lump_sum`), do not send `structure.unitAmount`.
- If user selects **Unit based** (`unit_based`), you may send `structure.unitAmount` (for example `{ "amount": 1000, "minQuantity": 5 }`).

### Get Savings Type Options
Returns **Fixed Savings** vs **Flexible Savings** for **SAVINGS** **Structure** (`structure.savingsType`).

**Endpoint:** `GET /api/v1/products/options/savings-type` (legacy: `GET /api/v1/configurations/options/savings-type`)

**Response:**
```json
{
  "success": true,
  "data": [
    { "value": "fixed_savings", "label": "Fixed Savings" },
    { "value": "flexible_savings", "label": "Flexible Savings" }
  ]
}
```

**Note:** Older documents may use legacy strings such as `"fixed"`; prefer **`fixed_savings`** / **`flexible_savings`** for new products.

### Get Savings Tenure Options
Returns allowed **Savings Tenure** values for the Savings product configuration dropdown.

**Endpoint:** `GET /api/v1/products/options/savings-tenure`

**Response:**
```json
{
  "success": true,
  "data": [
    { "value": 3, "unit": "month", "label": "3 months" },
    { "value": 6, "unit": "month", "label": "6 months" },
    { "value": 12, "unit": "month", "label": "12 months" },
    { "value": 24, "unit": "month", "label": "24 months" },
    { "value": 36, "unit": "month", "label": "36 months" },
    { "value": "no_fixed_tenure", "unit": "none", "label": "No fixed tenure" }
  ]
}
```

### Get Savings Repayment / Deposit Cycle Options
Returns **Daily, Weekly, Monthly, Quarterly, Annually** for the Savings **Deposit Cycle** (or repayment-frequency) dropdown.

**Endpoints** (same response):

- `GET /api/v1/products/options/savings-repayment-cycle`
- `GET /api/v1/products/options/savings-deposit-cycle`

**Response:**
```json
{
  "success": true,
  "data": [
    { "value": "Daily", "label": "Daily" },
    { "value": "Weekly", "label": "Weekly" },
    { "value": "Monthly", "label": "Monthly" },
    { "value": "Quarterly", "label": "Quarterly" },
    { "value": "Annually", "label": "Annually" }
  ]
}
```

## Typed product payloads (no `configuration` blob)

Products persist **discriminator-specific paths** only (see `src/models/ProductModel.ts` and `src/types/product.ts`). TypeScript interfaces in `src/types/productConfiguration.ts` (`LoanProductConfiguration`, `SavingsProductConfiguration`, etc.) are **reference-only** for naming and validation ideas—they are **not** written as a single embedded JSON field.

When reading the option endpoints below, map each `value` into the correct path (e.g. moratorium options → LOAN `structure.moratorium`; loan tenure → LOAN `about.tenure` or `structure` as your UI defines).

## Product Subtypes

Each top-level product type also has predefined subtypes that are exposed by the backend for use in dropdowns. API paths accept **canonical** types (`LOAN`, …) or legacy Title Case (`Loan`, …).

- **LOAN**:
  - Personal Loan
  - Business Loan
  - Mortgage
  - Auto Loan
- **MORTGAGE**:
  - Fixed Rate Mortgage
  - Adjustable Rate Mortgage
  - FHA Loan
  - VA Loan
- **SAVINGS**:
  - Fixed Deposit
  - Regular Savings
  - Target Savings
  - Group Savings
- **COMMODITY**:
  - Agricultural Commodity
  - Energy Commodity
  - Metal Commodity
  - Precious Metal
- **INVESTMENT**:
  - Agricultural Commodity
  - Energy Commodity
  - Metal Commodity
  - Precious Metal

### Get Product Subtypes
Returns the list of allowed **subtypes** for a given product type. This is typically called by the frontend after a main type is selected, to populate a second dropdown.

**Endpoint:** `GET /api/v1/products/types/{type}/subtypes`

**Path Parameters:**
- `type`: One of `LOAN`, `MORTGAGE`, `SAVINGS`, `COMMODITY`, `INVESTMENT` (or legacy `Loan`, …)

**Response:**
```json
{
  "success": true,
  "data": [
    { "value": "Personal Loan", "label": "Personal Loan" }
  ]
}
```

## Validation
All requests are validated using Joi schemas to ensure data integrity:
- Product name: 1-200 characters, required for creation
- Product description: 1-1000 characters, required for creation
- Product type: Canonical `LOAN`, `MORTGAGE`, `SAVINGS`, `COMMODITY`, `INVESTMENT`, or legacy Title Case (normalized on write)
- Product subtype: Optional string field for more specific categorisation
- App ID: 1-100 characters, required for creation
- Status: Must be either "complete" or "incomplete"

## Example Usage

To select a product type after receiving the create-app ID:
```bash
curl -X POST http://localhost:3005/api/v1/products/select-type \
  -H "Content-Type: application/json" \
  -d '{
    "appId": "app-12345",
    "type": "LOAN"
  }'
```

To create a product after selecting the type:
```bash
curl -X POST http://localhost:3005/api/v1/products/create-after-type \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "product-id-123",
    "name": "Personal Loan",
    "description": "A personal loan for home improvement"
  }'
```

To create a product using the legacy endpoint (all information at once):
```bash
curl -X POST http://localhost:3005/api/v1/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Premium Subscription",
    "description": "Premium access to all features",
    "type": "SAVINGS",
    "appId": "app-12345"
  }'
```

To update a product's status to complete:
```bash
curl -X PUT http://localhost:3005/api/v1/products/product-id-123 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "complete"
  }'
```

To get the list of product types (e.g. for a dropdown):
```bash
curl -X GET http://localhost:3005/api/v1/products/types
```

To check what action is allowed for a product:
```bash
curl -X GET http://localhost:3005/api/v1/products/product-id-123/action
```

To manage a complete product:
```bash
curl -X PUT http://localhost:3005/api/v1/products/product-id-123/manage \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Product Name",
    "description": "Updated product description"
  }'
```

To partially update a **LOAN** product (discriminator fields):
```bash
curl -X PUT http://localhost:3005/api/v1/products/product-id-123 \
  -H "Content-Type: application/json" \
  -d '{
    "structure": {
      "interestRate": 10.5,
      "interestMethod": "reducing_balance",
      "repaymentWorkflow": "principal_interest_charges",
      "loanAmount": { "min": 1000, "max": 50000 },
      "repaymentSchedule": "equal_monthly_instalments",
      "amortizationSchedule": "equal_instalment",
      "repaymentFrequency": "Monthly",
      "acceptableNPA": "90",
      "equityRequirement": "percentage_based"
    },
    "about": {
      "tenure": { "value": 36, "unit": "month", "label": "36 months" },
      "loanTypes": [{ "name": "House Loan", "description": "Housing finance" }],
      "previewAssetUrl": "https://cdn.example.com/preview.pdf"
    }
  }'
```

To partially update a **MORTGAGE** product — use **`about.mortgageTypes[]`** for multiple mortgage types (name + description per row). Property details/facilities are stored per item inside **`properties[]`**:

```bash
curl -X PUT http://localhost:3005/api/v1/products/mortgage-product-id \
  -H "Content-Type: application/json" \
  -d '{
    "about": {
      "tenure": { "value": 240, "unit": "month", "label": "240 months" },
      "mortgageTypes": [
        { "name": "House Loan", "description": "Suitable for different types of personal housing finance" },
        { "name": "Commercial", "description": "Owner-occupied commercial property" }
      ],
      "previewAssetUrl": "https://cdn.example.com/mortgage-preview.pdf"
    },
    "properties": [
      {
        "name": "Sunset Estate Block A",
        "propertyType": "3 bedroom flat bungalow",
        "value": 75000000,
        "location": "Lagos, Nigeria",
        "propertyDescription": "Three-bedroom detached bungalow with guest parking and fitted kitchen.",
        "facilities": ["solar_energy_system", "gated_estate", "cctv_surveillance"],
        "customFacilities": ["EV charging point", "Smart door lock"],
        "imageUrls": [
          "https://cdn.example.com/mortgage/property-1/front-view.jpg",
          "https://cdn.example.com/mortgage/property-1/living-room.jpg"
        ],
        "videoUrl": "https://www.youtube.com/watch?v=example"
      }
    ]
  }'
```

To partially update a **SAVINGS** product:
```bash
curl -X PUT http://localhost:3005/api/v1/products/product-id-456 \
  -H "Content-Type: application/json" \
  -d '{
    "about": {
      "duration": { "value": 12, "unit": "month", "label": "12 months" },
      "savingsTypes": [{ "name": "House Savings", "description": "Housing savings" }],
      "previewAssetUrl": "https://cdn.example.com/savings-preview.pdf"
    },
    "structure": {
      "interestRate": 4.5,
      "interestMethod": "reducing_balance",
      "savingsType": "fixed_savings",
      "withdrawalFlexibility": "monthly",
      "savingsAmount": { "min": 100, "max": 1000000 },
      "savingsTermsAndCondition": "Terms text…",
      "contractId": "…",
      "airSignSecretKey": "…",
      "airSignUid": "…"
    },
    "feesAndCharges": {
      "fees": [
        { "name": "Processing Fee", "feeType": "Flat", "value": "10000" },
        { "name": "Search Fee", "feeType": "Percent", "value": "5" }
      ],
      "chargeForForcefulWithdrawal": true,
      "forcefulWithdrawalPenalties": [
        { "name": "Penalty 1", "penaltyType": "Flat", "value": "20000", "triggerDurationDays": 7 }
      ]
    }
  }'
```