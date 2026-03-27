# Product Management Microservice

## Overview
This microservice handles product creation and management for the SpringTD platform. When triggered, it receives a create-app ID and uses it to create a product with the required information.

### Data model (current)
- **Products collection** (`products`) with **Mongoose discriminators**; the stored **`type`** field is the discriminator key.
- **User application snapshots** (`user_product_applications`): written when an end user applies via a merchant offering. **`merchantId` / `merchantName`** = product creator; **`offeringMerchantId` / `offeringMerchantName`** = merchant that enabled the product. Holds **`contractSnapshot`** (frozen global + merchant terms), **`payoutSplit`** (creator vs offering merchant, basis points per revenue line), **`productType`**, **`globalProductId`**, optional **`merchantProductId`**, **`status`**, **`snapshotVersion`**, optional **`snapshotHash`**. Timestamps: **`createdAt`** only (no **`updatedAt`** — treat updates as new versions or a separate workflow). **HTTP:** `POST /api/v1/products/applications` (create snapshot; validates **`globalProductId`** exists and **`productType`** matches the global product), `GET /api/v1/products/applications` (list; **requires** at least one of `appId`, `userId`, `offeringMerchantId`, `merchantId`, `globalProductId`; optional `productType`, `status`, `limit`, `skip`), `GET /api/v1/products/applications/:applicationId` (single). Model: `UserProductApplicationModel` (`src/models/UserProductApplicationModel.ts`).
- **Canonical `type` values:** `LOAN`, `MORTGAGE`, `SAVINGS`, `INVESTMENT`, `COMMODITY`. Requests may still send legacy Title Case (`Loan`, `Savings`, …); the API normalizes to the canonical value before save.
- **Base fields (all products):** `referenceNumber`, `name`, `description`, `isActive`, `type`, `subType`, `appId`, `status` (`complete` | `incomplete`), `createdAt`, `updatedAt`, optional `metadata`.
- **LOAN / MORTGAGE shared tabs:** `about` (tenure; **LOAN:** `loanTypes[]`; **MORTGAGE:** `mortgageTypes[]` — each `{ name, description }`; `previewAssetUrl`), `structure` (interest, **`allowMoratorium`** toggle, `moratorium` payload when allowed, repayment workflow, amounts, schedules, NPA, equity rule), `requirements` (security toggles, documents, other requirements, AirSign fields), `feesAndCharges` (fees list, charge toggles, late repayment penalties). **MORTGAGE** also has `properties[]` (name, property type, value, location, preview URL) and top-level `equityContribution`, `propertyValue`. Downstream loan engines should treat moratorium as **off** unless `structure.allowMoratorium === true`, then read `structure.moratorium` (and/or product tenure options).
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
  LOG_LEVEL=info
```

**PowerShell (one line):**

```powershell
fly secrets set MONGODB_URI="your-uri" NODE_ENV=production CORS_ORIGINS="https://your-app.com" LOG_LEVEL=info
```

3. Add any extra keys the same way (e.g. `JWT_SECRET`, `DO_SPACES_*`) once your code reads them in `environment.ts`.
4. Redeploy so machines pick up new secrets: `fly deploy`
5. List what’s set (values hidden): `fly secrets list`

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
- **MORTGAGE** — same tabbed shape as LOAN plus **`about.mortgageTypes[]`** (instead of `loanTypes[]` for mortgage-specific lines), `properties[]`, and `equityContribution`, `propertyValue`
- **SAVINGS** — `about`, `structure`, `feesAndCharges` (three admin tabs; see data model above)
- **COMMODITY** — `about` (`duration`, `commodityTypes[]`, `previewAssetUrl`), `structure` (yield method, offer yield toggle/value, `unitAmount`, withdrawal flexibility, min quantity / max amount, terms, moratorium, AirSign on Structure tab), `feesAndCharges` (fees, forceful withdrawal penalties), `commodityPrices[]` (`price`, `date`, `source`); optional legacy `price` / `minimumQuantity` / `unitOfMeasure` / `config`
- **INVESTMENT** — `about` (name/description live on the product; tab fields: `duration`, `investmentTypes[]`, `previewAssetUrl`), `structure` (ROI, interest method, investment type, withdrawal flexibility, investment amount min/max, terms, unit purchase toggle, moratorium, unit amount), `feesAndCharges` (fees, forceful withdrawal penalties, optional AirSign: `contractId`, `airSignSecretKey`, `airSignUid`)

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

### Get Products by App ID
Retrieves all products associated with a specific app ID.

**Endpoint:** `GET /api/v1/products/app/:appId`

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
Retrieves the **Content type** dropdown for LOAN / MORTGAGE **Requirements** → **Other requirements** (`requirements.otherRequirements[].contentType`). Each row may also include **`description`**, **`requirementType`**, and **`uploadRequired`** (free-form / boolean; not covered by this endpoint).

**Endpoint:** `GET /api/v1/products/options/loan-other-requirement-content-type` (legacy: `GET /api/v1/configurations/options/loan-other-requirement-content-type`)

**Response:**
```json
{
  "success": true,
  "data": [
    { "value": "information", "label": "Information" },
    { "value": "document_upload", "label": "Document upload" }
  ]
}
```

**How `contentType` drives UI (product admin and loan applicants)**  
Product-ms only **persists** each row on `requirements.otherRequirements[]`; it does not render forms. Implementations should behave as follows:

- **`document_upload`** — **Applicant** (loan application): show a **file upload** control for the document described in **`description`** (and use **`requirementType`** as the short label / title for the row, e.g. “Account Statement”). Respect **`uploadRequired`** when deciding if the upload is mandatory. The **merchant** configures the requirement text here; the applicant’s completed file is stored by your **loan / application** service, not on the product document.
- **`information`** — **Applicant**: show **text inputs** (single or multiple fields, depending on your app design) so they can type and submit the requested information; use **`description`** as the prompt / instructions. Again, captured answers belong on the application side.

**Merchant product builder:** The admin form should **react to `contentType`**: after the merchant chooses **Document upload**, show configuration aimed at defining what the applicant must upload (title / **`requirementType`**, **`description`**, **`uploadRequired`**). After they choose **Information**, show configuration for typed answers (**`description`** as the prompt; add more fields in your UI if you need multiple prompts—only **`description`** is stored on the product today). Optionally default or require **`uploadRequired`: `true`** when **`contentType`** is **`document_upload`** and a file is mandatory.

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
    { "value": 72, "unit": "month", "label": "72 months" }
  ]
}
```
Use each item’s `value` and `unit` in LOAN `about.tenure` or `structure` (however your admin maps tenure).

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

To partially update a **MORTGAGE** product — use **`about.mortgageTypes[]`** for multiple mortgage types (name + description per row):

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
    }
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