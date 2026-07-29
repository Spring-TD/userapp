# Mobile Storefront — Product Application API Guide

Guide for the **end-user mobile / PWA storefront** (e.g. `https://crbc.tryspring.io`) applying for products turned on by a Spring merchant.

**API base:** same origin as the storefront, or `https://account-ms.fly.dev`  
(`account-ms` proxies `/api/v1/applications/*` and `/api/v1/products/*` to `product-ms`).

**Auth (after login):**

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
```

On a tenant host, the gateway sets `x-tenant-app-id` / `x-tenant-merchant-id` automatically. Prefer same-origin calls.

---

## Important: platform fields (PEP, reasons, etc.)

Plata now **requires** platform-mandated fields on loan/mortgage submit:

| Field | Type | When required |
|-------|------|----------------|
| `isPoliticallyExposedPerson` | `boolean` | Always (not a draft) — LOAN / MORTGAGE / INVESTMENT / COMMODITY (not SAVINGS) |
| `monthlyIncome` | `number` (≥ 0) | LOAN / MORTGAGE / INVESTMENT (not SAVINGS / COMMODITY) |
| `repaymentSource` | select | LOAN / MORTGAGE / INVESTMENT (not SAVINGS / COMMODITY) |
| `repaymentSourceOther` | string | When `repaymentSource` is `other` |
| `maritalStatus` | select | LOAN / MORTGAGE / INVESTMENT (not SAVINGS / COMMODITY) |
| `maritalStatusOther` | string | When `maritalStatus` is `other` |
| `loanReason` | select | LOAN / MORTGAGE |
| `loanReasonOther` | string | When `loanReason` is `other` |
| `repayingWithSpouse` | `boolean` | LOAN / MORTGAGE |
| `spouseFullName` / `spouseEmail` / `spousePhone` | string | When `repayingWithSpouse` is `true` |

**“PEP search” on apply = a Yes/No declaration (`isPoliticallyExposedPerson`), not a watchlist search API.** Prembly PEPs/sanctions screening may still run separately in KYC/AML; the apply form itself only persists the applicant’s answer.

### Spring platform fields (wired)

Spring `product-ms` accepts platform fields on:

- `POST /api/v1/applications/init`
- `POST /api/v1/applications/apply`
- `PATCH /api/v1/applications/:id/progress` (top-level or `metadata.platformFields`)
- `POST /api/v1/applications/:id/submit`

Fields are validated (draft vs submitted rules match Plata) and stored on the local application. On final submit they are forwarded on upstream `POST .../external-applications` to Plata (`application.isPoliticallyExposedPerson`, `loanReason`, etc.).

Send fields either at the **top level** of the request body or nested under `metadata.platformFields` on progress/submit. Top-level keys win when both are present.

Responses include a `platformFields` object when any values are stored.

Plata options for dropdowns (proxied by `account-ms` to Spring `product-ms`, same shapes as Plata):

- `GET /api/v1/products/options/platform-application-fields`
- `GET /api/v1/products/options/repayment-source`
- `GET /api/v1/products/options/marital-status`
- `GET /api/v1/products/options/loan-reason`

Legacy alias (same data): `GET /api/v1/configurations/options/{...}`.

Storefront base URL: `https://account-ms.fly.dev` (Bearer auth optional for these public option lists).

---

## Recommended mobile screen flow (LOAN / MORTGAGE)

```text
Product detail
  → Init bank account (POST /applications/init)
  → Platform questions (PEP, income, marital, repayment source, loan reason, spouse?)
  → Product requirements (uploads / forms from requirementsSnapshot)
  → Guarantor(s) if required
  → Terms + submit (POST /applications/:id/submit)
  → Track status / post-approval (mortgage workflows)
```

Save drafts with `PATCH /applications/:id/progress` between screens.

---

## 0) Auth prerequisites

### Login

`POST /api/v1/auth/login`

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response `200`:**

```json
{
  "success": true,
  "accessToken": "eyJ…",
  "refreshToken": "eyJ…",
  "sessionId": "…",
  "user": {
    "id": "6a2fa2c55e076aafcf32316a",
    "email": "user@example.com",
    "first_name": "David",
    "last_name": "Testimony",
    "user_type": "user",
    "user_merchant_id": "merchant_…",
    "app_id": "69f330b2a795ac77103a6d77"
  }
}
```

Use `user.id` as `userId` in all application calls.

---

## 1) Load product (before apply)

### Catalog (turned-on products only)

`GET /api/v1/products/app/{appId}`

Filter: `isActive === true`. Use local product `id` for apply.

### Detail

`GET /api/v1/products/{productId}`

Use `data.requirements` for the checklist. Customer responses hide fee layers; use `feesAndCharges` only.

---

## 2) Initialize application (create bank account)

### Endpoint

`POST /api/v1/applications/init`

### Request body

```json
{
  "userId": "6a2fa2c55e076aafcf32316a",
  "productId": "6a0bdb9a822e562e0c124193",
  "merchantId": "merchant_1774844182734_rm0g5u27l",
  "amount": 100000,
  "currency": "NGN",
  "email": "titusdavid39+d@gmail.com",
  "applicantName": "David Testimony",
  "phone": "+2348166175258",
  "bvn": "22123456789",
  "country": "NG",
  "appId": "69f330b2a795ac77103a6d77"
}
```

| Field | Required | Notes |
|-------|----------|--------|
| `userId` | Yes | Logged-in retail user |
| `productId` | Yes | Local app product id |
| `merchantId` | Yes | Offering merchant |
| `amount` | Yes | Positive number |
| `currency` | Yes | e.g. `NGN` |
| `email` | Yes | Applicant email |
| `applicantName` | Yes | Display name |
| `phone` | No | |
| `bvn` | No | 11 digits if sent |
| `country` | No | ISO-2 |
| `appId` | No | Filled from tenant when omitted |
| `requirementSubmissions` | Forbidden | Do not send on init |

### Responses

**`201` Created** — new application + upstream account:

```json
{
  "success": true,
  "message": "Application initialized successfully.",
  "data": {
    "id": "6a3517f9923261b0563b4aa7",
    "userId": "6a2fa2c55e076aafcf32316a",
    "productId": "6a0bdb9a822e562e0c124193",
    "productName": "Loan Test Product",
    "productType": "LOAN",
    "amount": 100000,
    "currency": "NGN",
    "status": "PENDING",
    "appId": "69f330b2a795ac77103a6d77",
    "merchantId": "merchant_1774844182734_rm0g5u27l",
    "requirementsSnapshot": {
      "security": { "guarantor": true },
      "documentsToDownload": [],
      "otherRequirements": []
    },
    "productWallet": {
      "upstreamAccount": {
        "accountNumber": "7975523287",
        "bankName": "Globus Bank",
        "bankCode": "…",
        "provisionStatus": "provisioned"
      }
    },
    "applicationProgress": null,
    "requirementSubmissions": [],
    "createdAt": "2026-…",
    "updatedAt": "2026-…"
  }
}
```

**Store:** `data.id` as `applicationId`. Show bank account from `data.productWallet.upstreamAccount`.

**`200` OK** — idempotent: same pending init already exists for this user/product/merchant/app. Use existing `data.id`.

**Errors:**

| Status | Meaning |
|--------|---------|
| `400` | Validation (missing fields, bad BVN) |
| `404` | Product not found / not enabled |
| `502` | Upstream Plata account number missing / gateway failure |

---

## 3) Platform questions (PEP, income, reasons, spouse)

### 3.1 Field catalog (hardcode until Spring options exist)

#### All product types (required on final submit)

| Key | Label | UI control |
|-----|-------|------------|
| `isPoliticallyExposedPerson` | Are you a Politically Exposed Person? | Yes / No (`true` / `false`) |
| `monthlyIncome` | How much do you earn monthly? | Number input (≥ 0) |
| `repaymentSource` | Source of repayment | Select |
| `repaymentSourceOther` | Please specify your source of repayment | Text (if `other`) |
| `maritalStatus` | Marital status | Select |
| `maritalStatusOther` | Please specify your marital status | Text (if `other`) |

#### LOAN / MORTGAGE only

| Key | Label | UI control |
|-----|-------|------------|
| `loanReason` | Reason for the loan | Select |
| `loanReasonOther` | Please specify your reason for the loan | Text (if `other`) |
| `repayingWithSpouse` | Are you repaying this loan with a spouse? | Yes / No |
| `spouseFullName` | Spouse full name | Text (if spouse = yes) |
| `spouseEmail` | Spouse email | Email |
| `spousePhone` | Spouse phone | Phone |

### 3.2 Select options

**Repayment source**

| `value` | `label` |
|---------|---------|
| `salary` | Salary |
| `business` | Business |
| `contract_earning` | Contract earning |
| `stocks` | Stocks |
| `crowdfunding` | Crowdfunding |
| `other` | Other |

**Marital status**

| `value` | `label` |
|---------|---------|
| `single` | Single |
| `married` | Married |
| `divorced` | Divorced |
| `widowed` | Widowed |
| `separated` | Separated |
| `other` | Other |

**Loan reason (LOAN / MORTGAGE)**

| `value` | `label` |
|---------|---------|
| `rent` | Rent |
| `hospital` | Hospital |
| `emergency` | Emergency |
| `business` | Business |
| `family_expenses` | Family expenses |
| `food_stuff` | Food stuff |
| `investment` | Investment |
| `other` | Other |

### 3.3 Draft save (recommended today)

`PATCH /api/v1/applications/{applicationId}/progress`

```json
{
  "userId": "6a2fa2c55e076aafcf32316a",
  "currentStep": "platform_fields",
  "currentTab": "pep_and_reason",
  "metadata": {
    "platformFields": {
      "isPoliticallyExposedPerson": false,
      "monthlyIncome": 450000,
      "repaymentSource": "salary",
      "maritalStatus": "married",
      "loanReason": "business",
      "repayingWithSpouse": true,
      "spouseFullName": "Jane Testimony",
      "spouseEmail": "spouse@example.com",
      "spousePhone": "+2348011111111"
    }
  }
}
```

**Response `200`:**

```json
{
  "success": true,
  "message": "Application progress saved successfully.",
  "data": {
    "id": "6a3517f9923261b0563b4aa7",
    "status": "PENDING",
    "applicationProgress": {
      "currentStep": "platform_fields",
      "currentTab": "pep_and_reason",
      "metadata": {
        "platformFields": { }
      },
      "lastSavedAt": "2026-07-14T13:00:00.000Z"
    }
  }
}
```

**Errors:** `403` wrong user · `400` if status is not `PENDING` · `404` missing application

On resume, read `GET /api/v1/applications/{applicationId}` and restore from `data.applicationProgress`.

### 3.4 Spouse flow (when `repayingWithSpouse: true`)

On **Plata**, spouse KYC is auto-started and the spouse receives Agree / Decline email links. Spring storefront should:

1. Collect spouse contact fields.
2. Persist them in progress / eventual submit payload.
3. After Spring+Plata wiring, surface spouse KYC status when available (`spouseKyc` on Plata reads — not yet mirrored on Spring documents).

---

## 4) Product requirements (uploads & forms)

Render from `requirementsSnapshot` returned by init (or GET application).

### Upload a file

`POST /api/v1/applications/upload`  
`Content-Type: multipart/form-data`

| Form field | Required | Notes |
|------------|----------|--------|
| `file` | Yes | Binary |
| `userId` | Recommended | Namespaces storage key |

**Response `200`:**

```json
{
  "success": true,
  "url": "https://springtd-product-documents.nyc3.digitaloceanspaces.com/product-applications/user-uuid/file.pdf",
  "key": "product-applications/user-uuid/file.pdf",
  "fileName": "statement.pdf",
  "fileType": "application/pdf",
  "fileSize": 123456
}
```

### Save draft requirements

`PATCH /api/v1/applications/{applicationId}/progress`

```json
{
  "userId": "6a2fa2c55e076aafcf32316a",
  "currentStep": "requirements",
  "currentTab": "documents",
  "requirementDrafts": [
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
  ],
  "uploadedDrafts": [
    {
      "requirementType": "Account Statement",
      "label": "Account Statement",
      "type": "document",
      "fileUrl": "https://….pdf",
      "fileName": "statement.pdf",
      "fileType": "application/pdf",
      "fileSize": 123456
    }
  ]
}
```

### Commit completed requirements

`PATCH /api/v1/applications/{applicationId}/requirements`

```json
{
  "userId": "6a2fa2c55e076aafcf32316a",
  "requirementSubmissions": [
    {
      "requirementType": "Account Statement",
      "label": "Account Statement",
      "type": "document",
      "fileUrl": "https://springtd-product-documents.nyc3.digitaloceanspaces.com/…/statement.pdf",
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

**Matching rules**

- `documentsToDownload[]` → upload + match by `requirementType` / `label` (= document `name`); include `fileUrl`.
- `otherRequirements[]` with `contentType: "document_upload"` or `"document"` and `uploadRequired: true` → matching submission with `fileUrl`.
- `contentType: "document_template"` → download template → upload completed file.

**Response `200`:** application with updated `requirementSubmissions`.

---

## 5) Guarantors (when product requires it)

If `requirementsSnapshot.security.guarantor === true`:

`POST /api/v1/applications/{applicationId}/guarantors`

```json
{
  "userId": "6a2fa2c55e076aafcf32316a",
  "fullName": "Charles Avis",
  "email": "talktoavischales@gmail.com",
  "phone": "+23470452781",
  "occupation": "Trader",
  "relationship": "Brother",
  "country": "NG"
}
```

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
        "verificationId": "…",
        "verificationUrl": "https://transid2.fuspay.finance/?verificationId=…"
      }
    },
    "application": { }
  }
}
```

Show **Copy KYC URL** from `data.guarantor.kyc.verificationUrl`. Final submit requires at least one guarantor KYC when guarantor security is on.

---

## 6) Final submit

`POST /api/v1/applications/{applicationId}/submit`

### Loan

```json
{
  "userId": "6a2fa2c55e076aafcf32316a",
  "acceptedTerms": true
}
```

### Mortgage

```json
{
  "userId": "6a2fa2c55e076aafcf32316a",
  "acceptedTerms": true,
  "mortgageSelection": {
    "propertyName": "Basquait Home Unit A",
    "propertyType": "Apartment",
    "unitPrice": 60700000,
    "quantity": 1,
    "startDate": "2026-03",
    "investmentPeriod": "1 year",
    "total": 60830842,
    "metadata": { "roi": "3%", "duration": "06 months" }
  }
}
```

**Response `200` (typical):**

```json
{
  "success": true,
  "message": "Application submitted successfully. Pending approval.",
  "data": {
    "id": "6a3517f9923261b0563b4aa7",
    "status": "PENDING",
    "loanWorkflowStatus": "under_review",
    "requirementSubmissions": [ ],
    "contractSnapshot": {
      "finalSubmission": {
        "mortgageSelection": { }
      }
    }
  }
}
```

**Errors:**

| Status | Meaning |
|--------|---------|
| `400` | Missing requirements / guarantor / `acceptedTerms` not true |
| `403` | Wrong user |
| `502` | Plata final sync failed (`upstreamSyncError` may be set; retry submit) |

> After Spring accepts platform fields, include them on submit (or ensure progress metadata is promoted). Plata will reject submitted applications that omit PEP / income / marital / repayment / loan reason (and spouse fields when required).

---

## 7) Resume / status reads

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/v1/applications/{applicationId}` | Full application + `applicationProgress` |
| `GET` | `/api/v1/applications/user/{userId}` | List (`?appId=&status=&productType=`) |
| `GET` | `/api/v1/applications/user/{userId}/products/{productId}/init-status` | Resume init for a product |

---

## 8) Post-approval (MORTGAGE)

When approved with deferred disbursement:

| Step | Method | Path |
|------|--------|------|
| List offers | `GET` | `/api/v1/applications/user/{userId}/pending-approved-mortgages` |
| Step detail | `GET` | `/api/v1/applications/{id}/pending-approved-mortgage?userId=` |
| Accept / decline | `POST` | `/api/v1/applications/{id}/pending-approved-mortgage/offer` |
| Book inspection | `POST` | `/api/v1/applications/{id}/pending-approved-mortgage/appointment` |
| Start inspection | `POST` | `/api/v1/applications/{id}/pending-approved-mortgage/inspection/start` |
| Complete inspection | `POST` | `/api/v1/applications/{id}/pending-approved-mortgage/inspection/complete` |
| Down payment | `POST` | `/api/v1/applications/{id}/pending-approved-mortgage/down-payment` |

Offer body example:

```json
{ "userId": "…", "decision": "accept" }
```

(`decision`: `accept` | `decline`)

---

## 9) One-shot apply (legacy / compact clients)

`POST /api/v1/applications/apply`

Same core fields as init **plus** `requirementSubmissions[]` in one call. Prefer the two-step init flow on mobile for bank-account UX and resumability.

```json
{
  "userId": "…",
  "productId": "…",
  "merchantId": "…",
  "amount": 100000,
  "currency": "NGN",
  "email": "…",
  "applicantName": "…",
  "phone": "…",
  "bvn": "22123456789",
  "country": "NG",
  "requirementSubmissions": [ ]
}
```

---

## 10) Other product types (short)

Full plug-and-play guide for **all** types (LOAN / MORTGAGE / SAVINGS / INVESTMENT / COMMODITY), including router snippet, wallets, errors, and QA matrix:

→ **[STOREFRONT_ALL_PRODUCTS_PLUG_AND_PLAY.md](./STOREFRONT_ALL_PRODUCTS_PLUG_AND_PLAY.md)**

| Type | Endpoint | Notes |
|------|----------|--------|
| `SAVINGS` | `POST /api/v1/savings-accounts` then `.../:id/deposits` | Provision NUBAN, then fund from wallet |
| `COMMODITY` | `POST /api/v1/commodity-accounts/apply` (or legacy `/commodities/buy`) | Quantity / units |
| `INVESTMENT` | `POST /api/v1/investment-accounts` then `.../:id/deposits` | Mirrors savings; do not use `/applications/apply` |

Platform fields catalog applies on Plata for all types; lending-specific fields (`loanReason`, spouse) only for LOAN/MORTGAGE.

---

## 11) Example TypeScript shapes (frontend)

```ts
type LoanReason =
  | 'rent' | 'hospital' | 'emergency' | 'business'
  | 'family_expenses' | 'food_stuff' | 'investment' | 'other';

type RepaymentSource =
  | 'salary' | 'business' | 'contract_earning'
  | 'stocks' | 'crowdfunding' | 'other';

type MaritalStatus =
  | 'single' | 'married' | 'divorced'
  | 'widowed' | 'separated' | 'other';

interface PlatformApplicationFields {
  isPoliticallyExposedPerson: boolean; // PEP declaration (Yes/No)
  monthlyIncome: number;
  repaymentSource: RepaymentSource;
  repaymentSourceOther?: string;
  maritalStatus: MaritalStatus;
  maritalStatusOther?: string;
  // LOAN / MORTGAGE
  loanReason?: LoanReason;
  loanReasonOther?: string;
  repayingWithSpouse?: boolean;
  spouseFullName?: string;
  spouseEmail?: string;
  spousePhone?: string;
}
```

---

## 12) Error envelope (all routes)

```json
{ "success": false, "error": "Human-readable message" }
```

---

## Related docs

- Broader PWA screens: `springApp/STOREFRONT_PWA_INTEGRATION.md`
- Spring applications: `springApp/product-ms/README.md`
- Plata platform fields & options: `plata/product-ms/README.md` (§ Platform-mandated application fields)

## Backend follow-up

1. ~~Accept platform fields on Spring `init` / `progress` / `submit` / `apply`.~~ **Done** in Spring `product-ms`.
2. ~~Forward them on Plata `external-applications` body.~~ **Done** on final submit.
3. Optionally proxy `GET /api/v1/products/options/{platform-application-fields,loan-reason,marital-status,repayment-source}` through `account-ms`. **Done** — `account-ms` proxies to Spring `product-ms` option handlers (Plata-compatible responses).
4. Surface spouse KYC status when available (`spouseKyc` on Plata reads — not yet mirrored on Spring documents).
