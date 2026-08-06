# Compliance Microservice

A comprehensive compliance microservice providing Know Your Customer (KYC) verification, risk assessment, and regulatory compliance capabilities for merchants and users.

Deployment URL: https://compliance-ms.fly.dev/

## Architecture Update

This service has been aligned with `plata/compliance-ms`.

- Business KYC data is normalized into separate collections:
  - `BusinessInfo`
  - `BusinessSurvey`
  - `BusinessDocument`
  - `Shareholder`
- `KYCProfile` remains the core workflow/status document and no longer stores merchant business documents inline.
- Merchant document status and admin review flows operate on business-document records from the dedicated collection.

## Features

### ✅ Implemented
- Individual and business KYC verification
- Risk assessment and scoring
- Document management and validation
- Compliance workflow management
- Shareholder liveness testing
- Administrative compliance management
- API-based compliance checking
- **CAC Certificate Verification** - Verify business registration with the Nigerian Corporate Affairs Commission (via Prembly API)
- **AML Document Verification** - Verify business documents using Prembly API (KYB/AML providers)
- **Sanctions List Checking** - Check individuals and businesses against international sanctions lists (via Prembly API)
- **Prembly Integration** - Comprehensive identity verification and compliance platform integration
- **Fuspay Modular KYC** - Creates a Modular KYC user for merchants via `POST /modular/user/` before business KYC is persisted when enabled ([Fuspay: Create User](https://docs.fuspay.us/modular-kyc/create-user)). Automatically resolves `email`, `phone`, `country`, and `user_ref` from `client-auth-ms` (`GET /api/v1/user/profile`) using the caller’s bearer token, with optional overrides in the submit payload.

## Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js with TypeScript
- **Database**: MongoDB (Mongoose); use MONGODB_URI or DATABASE_URL for connection (e.g. DigitalOcean Managed MongoDB)
- **Document Storage**: DigitalOcean Spaces via S3-compatible API
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Joi
- **Testing**: Jest + Supertest
- **Security**: helmet, CORS, express-rate-limit
- **Logging**: Winston
- **Verification Provider**: Prembly API (KYC, AML, CAC, Sanctions, Liveness)

## Document Upload Setup

KYC document binaries are uploaded directly by `compliance-ms` to DigitalOcean Spaces through `POST /api/v1/kyc/upload` (also available through `/api/v1/compliance/upload`). Submission payloads should then store the returned `url` as each document's `fileUrl`.

Required environment variables:

```env
DO_SPACES_REGION=nyc3
DO_SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
DO_SPACES_BUCKET=springtd-compliance-documents
DO_SPACES_ACCESS_KEY_ID=your-access-key
DO_SPACES_SECRET_ACCESS_KEY=your-secret-key
```

Optional:

```env
DO_SPACES_CDN_URL=https://springtd-compliance-documents.nyc3.cdn.digitaloceanspaces.com
```

Example upload flow:

1. `POST` multipart form-data to `/api/v1/kyc/upload` with the file in the `file` field.
2. Read the response `{ success, url, key }`.
3. Send that `url` as the document `fileUrl` in the subsequent KYC submission payload.

## Fuspay Modular KYC setup

When **`FUSPAY_MODULAR_KYC_ENABLED=true`**, **`POST /api/v1/kyc/business/submit`** (same router under **`/api/v1/compliance/business/submit`**) calls Fuspay’s Modular API to **create the user** with payload shape `email`, `phone`, `app`, `country`, `user_ref` before your business KYC records are saved. Official reference: [Create User — Fuspay Modular KYC](https://docs.fuspay.us/modular-kyc/create-user).

### Environment variables

Add these to `.env` (see `.env.example`):

```env
# Toggle Modular KYC user creation on business submit
FUSPAY_MODULAR_KYC_ENABLED=true

# Fuspay API base (host-only; service appends /api/v1/modular/...)
FUSPAY_MODULAR_BASE_URL=https://kyc-verif-new.fly.dev

# Fuspay app id (maps to the "app" field in Create User)
FUSPAY_MODULAR_APP_ID=your_fuspay_app_id

# Optional: Bearer token if your Fuspay tenant requires Authorization on Modular endpoints
FUSPAY_MODULAR_API_KEY=

# Required by Payonus create-verification unless callback is sent per request
FUSPAY_MODULAR_VERIFICATION_CALLBACK=https://account-ms.fly.dev/api/v1/kyc/modular/webhook

# Optional return URL after hosted flow; defaults to callback when omitted
FUSPAY_MODULAR_VERIFICATION_REDIRECT=https://your-frontend-app.com/kyc/done

# Optional default country when create-verification payload omits country
FUSPAY_MODULAR_DEFAULT_COUNTRY=NG

# Optional webhook shared secret (header: x-fuspay-webhook-secret or x-webhook-secret)
FUSPAY_MODULAR_WEBHOOK_SECRET=

# client-auth-ms — base URL for server-side profile fetch (same JWT as the merchant caller)
CLIENT_AUTH_BASE_URL=http://localhost:3001/api/v1
```

JWT verification for merchants logging in via **`client-auth-ms`** already supports **`CLIENT_AUTH_JWT_SECRET`** when it differs from **`JWT_SECRET`** (see authentication middleware). Ensure **`CLIENT_AUTH_BASE_URL`** is reachable from `compliance-ms` (Docker hostname or Fly internal URL in production).

### How identity fields are resolved

For each submit when Fuspay is enabled, the service resolves:

| Field (Fuspay) | Resolution order |
|----------------|------------------|
| `email` | `body.modularKycUser.email` → client-auth profile `email` → first shareholder `email` |
| `phone` | `body.modularKycUser.phone` → client-auth profile `phone` → first shareholder `phoneNumber` |
| `country` | `body.modularKycUser.country` → client-auth profile `country` → `businessSurvey.country` |
| `user_ref` | `body.modularKycUser.userRef` (optional override) → **JWT `userId`** (canonical `client-auth-ms` subject from `Authorization`) → `body.userId` (e.g. service calls without attaching JWT user) |

We intentionally **do not** send MongoDB’s optional `user_ref` profile field here so Fuspay always receives your **canonical auth user id** unless you override with `modularKycUser.userRef`.

If **`email`**, **`phone`**, or **`country`** are still missing after these steps, the submit fails with a validation-style error so incomplete Modular onboarding cannot slip through.

### Optional request overrides

You may include **`modularKycUser`** on the business submit JSON:

```json
"modularKycUser": {
  "email": "merchant@example.com",
  "phone": "2348000000000",
  "country": "NG",
  "userRef": "USR_optional_stable_ref"
}
```

### Modular verification and webhook endpoints in `compliance-ms`

Routes are mounted under both `/api/v1/kyc` and `/api/v1/compliance`.
User-facing verification routes require bearer auth; webhook route does not.
Verification routes map 1:1 to Fuspay Modular endpoints:

- Create verification: [Fuspay Create Verification](https://docs.fuspay.us/modular-kyc/create-verification)
- Submit verification: [Fuspay Submit Verification](https://docs.fuspay.us/modular-kyc/submit-verification)
- Status: [Fuspay Get Verification Status](https://docs.fuspay.us/modular-kyc/get-verification-status)
- Complete: [Fuspay Complete Verification](https://docs.fuspay.us/modular-kyc/complete-verification)

- `POST /api/v1/kyc/modular/verification` → create verification (**debits the merchant app KYC wallet** before Fuspay link creation; see [KYC wallet billing](#kyc-wallet-billing))
- `GET /api/v1/kyc/modular/verification-url` → fetch saved verification details for authenticated user
- `POST /api/v1/kyc/modular/submit/:verificationId` → submit check payloads
- `GET /api/v1/kyc/modular/status/:verificationId` → fetch verification status
- `POST /api/v1/kyc/modular/complete/:verificationId` → request completion
- `POST /api/v1/kyc/modular/webhook` → receive Fuspay webhook, persist full payload on `KYCProfile`, and trigger PayOnUs fixed VA for retail users (see below)

**Individual / retail verification checks:** compliance-ms sends Fuspay `individual_checks` with top-level `bio: true`, `document_verification: false`, plus `verification_types` for **phone, email, NIN, BVN, and liveliness** (`liveliness` — not `liveness`). AML and business checks are excluded for `kyc_type` `individual` or `retail` (client overrides are ignored).

**Tenant branding (Fuspay guide):** `branding` is sent on **`POST /modular/user`** (signup via `client-auth-ms`) and **`POST /modular/verification`**. When `CREATE_APP_SERVICE_URL` is set, compliance-ms and client-auth-ms resolve branding from `GET /api/v1/apps/:appId/pwa/manifest.webmanifest`:

| Fuspay field | PWA manifest source |
|--------------|---------------------|
| `brand_name` | `name` or `short_name` |
| `brand_logo` | first `icons[].src` (HTTPS only) |
| `button_color` | `theme_color` |
| `bg_color` | `background_color` |
| `text_color` | derived from `bg_color` luminance (`#212020` on light, `#FFFFFF` on dark) |

Optional `branding` in the verification request body merges over manifest values. Platform defaults apply when manifest lookup fails (`brand_name: Fuspay`, `bg_color: #FFFFFF`, `text_color: #212020`, `button_color: #2925FA`).

#### KYC wallet billing

Before a **retail customer** KYC link is created (`POST /api/v1/kyc/modular/verification`), compliance-ms debits the merchant’s **app-scoped KYC wallet** via wallet-ms internal API.

| Rule | Behavior |
|------|----------|
| Fee | Flat per link — `KYC_LINK_FEE` (default **500**, currency matches wallet) |
| Scope | Requires `x-tenant-app-id` + `x-tenant-merchant-id` (account-ms gateway forwards these) |
| Active pending link | If the user already has a non-terminal Fuspay verification with id + url, returns the existing link **without charging again** |
| Insufficient balance | **402** with `fundingInstructions` (balance, shortfall, KYC wallet NUBAN when provisioned) |
| Fuspay failure after debit | Auto-refund to the KYC wallet |
| Guarantor links | **Not charged** (`POST /api/v1/kyc/modular/guarantor-verification`) |

**Env:** `WALLET_SERVICE_URL`, shared **`JWT_SECRET`** (sent as `X-Internal-Token` to wallet-ms; must match wallet-ms), `KYC_LINK_FEE`, optional `KYC_LINK_BILLING_ENABLED=false` to disable.

#### Fuspay modular webhook (`verification.completed`) and PayOnUs

Configure Fuspay to call your gateway or compliance-ms directly:

```text
POST https://account-ms.fly.dev/api/v1/kyc/modular/webhook
```

(or `https://<compliance-ms>/api/v1/kyc/modular/webhook`)

**Important:** Fuspay must call this URL with **`POST`** and a JSON body. Opening the URL in a browser sends **`GET`**, which returns `404 Route not found` on older deployments. After deploy, `GET` returns a small health JSON confirming the endpoint is active; only `POST` processes webhooks.

**Quick test (POST):**

```bash
curl -X POST "https://account-ms.fly.dev/api/v1/kyc/modular/webhook" \
  -H "Content-Type: application/json" \
  -d '{"data":{"user_id":"your-fuspay-user-id"}}'
```

Expected: `200` with `{ "success": true, ... }` (profile may show `matched: 0` for a fake id).

**On each webhook**, compliance-ms:

1. Stores the **full JSON body** on the matched profile (`fuspay.webhook.lastPayload`, plus last 30 entries in `fuspay.webhook.history`).
2. Maps verification fields: `data.reference`, `data.status`, `data.verification_type`, `data.details` (name, dob, **bvn**), and `event` (e.g. `verification.completed`).
3. Sets profile `status` to **approved** when status/event indicates completion.
4. For **`userType: individual`** profiles, when KYC is complete, calls **wallet-ms**  
   `POST /api/v1/internal/wallets/user/:userId/provision-nuban` to create the PayOnUs **fixed (reserved)** virtual account (uses retail BVN from the webhook when 11 digits are available).

**Example webhook body (Fuspay):**

```json
{
  "event": "verification.completed",
  "data": {
    "reference": "v_ref_123456789",
    "status": "completed",
    "user_id": "usr_98765",
    "verification_type": "bvn",
    "details": {
      "first_name": "David",
      "last_name": "Titus",
      "dob": "1995-12-04",
      "bvn": "22345678901"
    }
  }
}
```

**Webhook HTTP 200 response** (abbreviated):

```json
{
  "success": true,
  "matched": 1,
  "modified": 1,
  "bvnStored": true,
  "nubanProvisionTriggered": true,
  "nubanProvision": {
    "success": true,
    "skipped": false
  }
}
```

`matched: 0` means no `KYCProfile` matched `fuspay.customerId` / `fuspay.userRef` / `userId` to `data.user_id` — fix ids at registration or create-verification time.

**Profile matching:** `data.user_id` (or `customer_id`) should match `fuspay.customerId` on the minimal profile created at signup. `data.reference` is also stored and used for lookup.

**Internal APIs (wallet-ms, header `X-Internal-Token: COMPLIANCE_WALLET_INTERNAL_TOKEN`):**

| Route | Purpose |
|-------|---------|
| `GET /api/v1/kyc/internal/payonus/user-bvn/:userId` | Retail user's 11-digit BVN from Fuspay KYC webhook |
| `GET /api/v1/kyc/internal/payonus/first-shareholder-bvn/:ownerUserId` | Merchant shareholder BVN (fallback for PayOnUs) |

**compliance-ms env (post–KYC wallet call):**

```env
WALLET_SERVICE_URL=https://wallet-ms.fly.dev
# JWT_SECRET must match wallet-ms (sent as X-Internal-Token to internal wallet routes)
WALLET_SERVICE_HTTP_TIMEOUT_MS=90000
COMPLIANCE_WALLET_INTERNAL_TOKEN=<wallet-ms uses this to read BVN from compliance-ms>
```

Optional: `FUSPAY_MODULAR_WEBHOOK_SECRET` — require header `x-fuspay-webhook-secret` or `x-webhook-secret`.

#### Create verification payload (customer-based)

```json
{
  "customer_id": "697226bcc043b64f205740c8",
  "country": "NG",
  "callback": "https://your-app.com/kyc-callback",
  "redirect": "https://your-app.com/dashboard",
  "individual_checks": {
    "bio": true,
    "document_verification": false,
    "verification_types": {
      "phone": true,
      "email": true,
      "nin": true,
      "bvn": true,
      "liveliness": true
    }
  }
}
```

Example create verification response:

```json
{
  "success": true,
  "message": "Fuspay verification created successfully",
  "data": {
    "verification_id": "69fdad2de19e6a83826a5a31",
    "reference": "VRF_409fdc11-b7c1-4ccd-8441-2a740d71499d",
    "verification_url": "https://transid2.fuspay.finance/?verificationId=69fdad2de19e6a83826a5a31",
    "todo": [
      "phone",
      "email",
      "bio",
      "nin",
      "bvn",
      "liveliness"
    ],
    "total_checks": 6,
    "status": "pending"
  },
  "verification_url": "https://transid2.fuspay.finance/?verificationId=69fdad2de19e6a83826a5a31",
  "verification_id": "69fdad2de19e6a83826a5a31"
}
```

The service now supports both styles:

- customer style: `customer_id` (+ optional `country`, `callback`, checks)
- user style: `user_id` + `kyc_type` (service injects `app` from env)

If checks are omitted, compliance-ms applies defaults (individual or business + AML) so hosted verification has actionable `todo` items.

Example submit verification payload (`POST /api/v1/kyc/modular/submit/:verificationId`) depends on the check type.
For identity checks:

```json
{
  "check_type": "bvn",
  "data": {
    "bvn": "37374434156"
  }
}
```

```json
{
  "check_type": "nin",
  "data": {
    "nin": "12345678901"
  }
}
```

For image-based checks (when required by provider):

```json
{
  "check_type": "liveliness",
  "data": {
    "image": "data:image/jpeg;base64,<base64>"
  }
}
```

Example submit verification response:

```json
{
  "success": true,
  "message": "Fuspay verification data submitted successfully",
  "data": {
    "success": true,
    "message": "Verification submitted"
  }
}
```

Example status call:

```bash
GET /api/v1/kyc/modular/status/:verificationId
```

Example status response:

```json
{
  "success": true,
  "message": "Fuspay verification status fetched successfully",
  "data": {
    "verification_id": "69fdad2de19e6a83826a5a31",
    "status": "pending",
    "overall_status": "pending",
    "completed_checks": 2,
    "total_checks": 10
  }
}
```

Example complete call:

```bash
POST /api/v1/kyc/modular/complete/:verificationId
```

Example complete response:

```json
{
  "success": true,
  "message": "Fuspay verification completion attempted",
  "data": {
    "success": true,
    "message": "Verification completed"
  }
}
```

#### Get saved modular verification URL (authenticated user)

`GET /api/v1/kyc/modular/verification-url`  
Alias via gateway: `GET /api/v1/compliance/modular/verification-url`

Headers:

```http
Authorization: Bearer <access-token>
```

This endpoint returns saved verification metadata from the user's KYC profile.

Example response:

```json
{
  "success": true,
  "data": {
    "customerId": "69fd4f4be19e6a838269c198",
    "verificationId": "69fdad2de19e6a83826a5a31",
    "verificationUrl": "https://transid2.fuspay.finance/?verificationId=69fdad2de19e6a83826a5a31",
    "reference": "VRF_409fdc11-b7c1-4ccd-8441-2a740d71499d",
    "status": "pending",
    "overallStatus": "pending",
    "completedChecks": 2,
    "totalChecks": 10,
    "lastSyncedAt": "2026-05-08T10:20:00.000Z"
  }
}
```

## API Documentation

### Create Individual KYC Order
**`POST /api/v1/kyc/individual/submit`**

Submit KYC information for an individual customer to create a KYC order.

**Authentication**: Requires valid JWT token for individual customers

**Request Body:**
```json
{
  "personalInfo": {
    "firstName": "John",
    "lastName": "Doe",
    "dateOfBirth": "1990-01-01",
    "nationality": "NG",
    "address": {
      "street": "123 Main St",
      "city": "Lagos",
      "state": "Lagos",
      "postalCode": "100001",
      "country": "NG"
    }
  },
  "documents": [
    {
      "type": "passport",
      "fileName": "passport.jpg",
      "fileType": "image/jpeg",
      "fileSize": 102400,
      "fileData": "base64encodedfiledata"
    }
  ]
}
```

**Success Response (201 Created):**
````json
{
  "success": true,
  "data": {
    "kycId": "kyc-123",
    "userId": "user-123",
    "status": "PENDING",
    "riskLevel": "LOW",
    "submittedAt": "2025-01-10T09:00:00.000Z"
  }
}
```

### Create Business KYC Order
**`POST /api/v1/kyc/business/submit`**

Submit KYC information for a business customer to create a KYC order.

**Authentication**: Requires valid JWT token for business customers

**Fuspay Modular KYC**: When enabled via env (see **Fuspay Modular KYC setup**), the caller should use a normal **`client-auth-ms` bearer token** so **`user_ref`** sent to Fuspay is that JWT’s **`userId`**. Optionally set **`modularKycUser`** for overrides; ensure **`phone`** / **`country`** exist on the profile or payload (and **`email`** via profile or first shareholder if needed).

**Request Body:**
```json
{
  "modularKycUser": {
    "email": "merchant@example.com",
    "phone": "2348000000000",
    "country": "NG",
    "userRef": "USR_optional"
  },
  "businessInfo": {
    "companyName": "Example Business Ltd",
    "industry": "Technology",
    "countryOfIncorporation": "NG",
    "website": "https://example.com",
    "companyRegId": "RC123456",
    "companyLogoUrl": "https://example.com/logo.png"
  },
  "businessSurvey": {
    "businessType": "loan product",
    "country": "NG",
    "businessModel": "B2B",
    "monthlyProcessedVolume": 500000
  },
  "shareholders": [
    {
      "fullName": "John Doe",
      "dateOfBirth": "1985-05-15",
      "nationality": "NG",
      "ownershipPercentage": 60,
      "bankStatement": {
        "fileName": "bank_statement.pdf",
        "fileType": "application/pdf",
        "fileSize": 102400,
        "fileUrl": "https://example.com/bank_statement.pdf",
        "uploadDate": "2025-01-10T09:00:00.000Z"
      },
      "status": "pending",
      "kyc": {
        "url": "https://liveness-test.example.com/test-123",
        "expiresAt": "2025-01-15T09:00:00.000Z",
        "status": "pending"
      }
    }
  ],
  "businessDocuments": [
    {
      "type": "certificate_of_incorporation",
      "fileName": "certificate_of_incorporation.pdf",
      "fileType": "application/pdf",
      "fileSize": 204800,
      "fileUrl": "https://example.com/certificate_of_incorporation.pdf",
      "uploadedAt": "2025-01-10T09:00:00.000Z",
      "status": "pending"
    }
  ],
  "riskAssessment": {
    "annualTurnover": 500000,
    "expectedTransactionVolume": 100000,
    "highRiskJurisdiction": false,
    "sanctionListCheck": false,
    "adverseMediaCheck": false
  }
}
```

**Success Response (201 Created):**
````json
{
  "success": true,
  "data": {
    "kycId": "kyc-456",
    "userId": "user-456",
    "status": "PENDING",
    "riskLevel": "MEDIUM",
    "shareholderCount": 1,
    "submittedAt": "2025-01-10T09:00:00.000Z"
  }
}
```

### KYC Status Check
**`GET /api/v1/kyc/status/:userId`**

Checks the KYC compliance status for a user or merchant.

**Authentication**: Requires valid JWT token

**Path Parameters:**
- `userId`: The ID of the user to check compliance status for

**Success Response (200 OK):**
````json
{
  "success": true,
  "data": {
    "userId": "user-123",
    "userType": "merchant",
    "status": "APPROVED",
    "documentCount": 5,
    "submittedAt": "2025-01-10T09:00:00.000Z",
    "completedAt": "2025-01-10T10:30:00.000Z",
    "riskLevel": "LOW"
  }
}
```

**Not Found Response (404 Not Found):**
````json
{
  "success": false,
  "error": "No KYC profile found for this user"
}
```

**Possible Status Values:**
- `PENDING` - KYC submission received, under review
- `IN_PROGRESS` - KYC processing in progress
- `REVIEW` - Additional review required
- `ADMIN_APPROVED` - Document approved by admin (ready for Prembly verification)
- `APPROVED` - KYC verification completed successfully
- `REJECTED` - KYC verification failed
- `FAILED` - KYC verification failed
- `COMPLETED` - All requirements fulfilled

**Possible Risk Level Values:**
- `LOW` - Low risk customer
- `MEDIUM` - Medium risk customer
- `HIGH` - High risk customer
- `VERY_HIGH` - Very high risk customer

### Get All Users
**`GET /api/v1/kyc/admin/users`**

Retrieves a list of all registered users in the compliance system.

**Authentication**: Requires valid JWT token with Compliance Officer role

**Authorization**: This endpoint is restricted to Compliance Officers only. Regular users cannot access this endpoint.

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "userId": "user-123",
      "userType": "merchant",
      "status": "APPROVED",
      "riskLevel": "LOW",
      "submittedAt": "2025-01-10T09:00:00.000Z",
      "completedAt": "2025-01-10T10:30:00.000Z",
      "reviewedBy": "admin-456",
      "reviewDate": "2025-01-10T10:30:00.000Z",
      "isBlocked": false,
      "blockedReason": null
    }
  ]
}
```

**Error Response (500 Internal Server Error):**
````json
{
  "success": false,
  "error": "Error retrieving all users"
}
```

**Response Fields:**
- `userId`: The unique identifier of the user
- `userType`: The type of user (individual or merchant)
- `status`: The current KYC status of the user
- `riskLevel`: The risk assessment level of the user
- `submittedAt`: When the user submitted their KYC information
- `completedAt`: When the KYC process was completed
- `reviewedBy`: The admin who last reviewed the user's KYC
- `reviewDate`: When the user's KYC was last reviewed
- `isBlocked`: Whether the user account is currently blocked
- `blockedReason`: The reason why the user account is blocked (if applicable)

### Get All Compliance Documents
**`GET /api/v1/kyc/admin/documents`**

Retrieves all compliance documents from all user profiles in the system.

**Authentication**: Requires valid JWT token with Compliance Officer role

**Authorization**: This endpoint is restricted to Compliance Officers only. Regular users cannot access this endpoint.

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "documentId": "doc-123",
      "userId": "user-456",
      "userType": "individual",
      "type": "passport",
      "fileName": "passport.jpg",
      "fileType": "image/jpeg",
      "fileSize": 102400,
      "uploadDate": "2025-01-10T09:00:00.000Z",
      "status": "APPROVED",
      "rejectionReason": null
    }
  ]
}
```

**Error Response (500 Internal Server Error):**
```
{
  "success": false,
  "error": "Error retrieving all documents"
}

```

### Admin Approve Document for Prembly Verification
**`POST /api/v1/kyc/admin/document/:documentId/approve`**

Approves a document for Prembly verification. Documents must be approved by an admin before they can be verified through Prembly API.

**Authentication**: Requires valid JWT token with Compliance Officer role

**Authorization**: This endpoint is restricted to Compliance Officers only.

**Path Parameters:**
- `documentId`: The ID of the document to approve

**Request Body:**
````json
{
  "notes": "Optional notes about the approval"
}
```

**Success Response (200 OK):**
````json
{
  "success": true,
  "message": "Document approved for Prembly verification",
  "data": {
    "documentId": "doc-123",
    "status": "admin_approved",
    "approvedBy": "admin-user-id",
    "approvedAt": "2025-01-10T10:00:00.000Z",
    "notes": "Document looks good, ready for Prembly verification"
  }
}
```

**Error Responses:**
- **400 Bad Request**: Document cannot be approved (not in PENDING or REVIEW status)
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: User is not a compliance officer
- **404 Not Found**: Document not found

**Note**: Documents must be in `PENDING` or `REVIEW` status to be approved. Once approved, the status changes to `admin_approved` and the document becomes eligible for Prembly verification.

### Update Document Status
**`PUT /api/v1/kyc/admin/document/:documentId/status`**

Updates the status of a document. Can be used to reject documents or update to other statuses.

**Authentication**: Requires valid JWT token with Compliance Officer role

**Authorization**: This endpoint is restricted to Compliance Officers only.

**Path Parameters:**
- `documentId`: The ID of the document to update

**Request Body:**
````json
{
  "status": "rejected",
  "rejectionReason": "Required if status is 'rejected'"
}
```

**Valid Status Values:**
- `pending` - Document is pending review
- `in_progress` - Document is being processed
- `review` - Document requires additional review
- `admin_approved` - Document approved by admin (ready for Prembly verification)
- `approved` - Document approved after Prembly verification
- `rejected` - Document rejected
- `failed` - Document verification failed
- `completed` - Document processing completed

**Success Response (200 OK):**
````json
{
  "success": true,
  "message": "Document status updated successfully",
  "data": {
    "documentId": "doc-123",
    "status": "rejected",
    "rejectionReason": "Document is unclear or missing required information"
  }
}
```

**Error Responses:**
- **400 Bad Request**: Invalid status or missing rejectionReason for rejected status
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: User is not a compliance officer
- **404 Not Found**: Document not found

**Example - Reject Document:**
```bash
PUT /api/v1/kyc/admin/document/doc-123/status
{
  "status": "rejected",
  "rejectionReason": "Document quality is too poor to verify"
}
```

### Verify AML Document (Prembly)
**`POST /api/v1/kyc/admin/document/:documentId/verify-aml`**

Verifies a document using Prembly AML verification. **Requires document to be admin-approved first.**

**Authentication**: Requires valid JWT token with Compliance Officer role

**Authorization**: This endpoint is restricted to Compliance Officers only.

**Path Parameters:**
- `documentId`: The ID of the document to verify

**Request Body:**
````json
{
  "provider": "prembly"
}
```

**Prerequisites**: Document must have status `admin_approved` before verification can proceed.

**Success Response (200 OK):**
````json
{
  "success": true,
  "message": "Document verification completed and approved",
  "data": {
    "documentId": "doc-123",
    "verificationResult": {
      "verificationId": "verification-123",
      "kybVerified": true,
      "amlClear": true,
      "overallApproved": true,
      "riskScore": 25
    },
    "status": "approved",
    "message": "Document approved"
  }
}
```

**Error Responses:**
- **400 Bad Request**: Document must be approved by admin before Prembly verification
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: User is not a compliance officer
- **404 Not Found**: Document not found

**Note**: If the document is not in `admin_approved` status, the verification will fail with a 400 error indicating that admin approval is required first.

### Verify CAC Certificate (Prembly)
**`POST /api/v1/kyc/admin/businesses/:userId/verify-certificate`**

Verifies a business Certificate of Incorporation with the Nigerian Corporate Affairs Commission using Prembly API. **Requires business documents to be admin-approved first.**

**Authentication**: Requires valid JWT token with Compliance Officer role

**Authorization**: This endpoint is restricted to Compliance Officers only.

**Path Parameters:**
- `userId`: The ID of the business user

**Request Body:**
````json
{
  "registrationNumber": "RC123456",
  "companyName": "Example Business Ltd"
}
```

**Prerequisites**: Business documents (especially certificate of incorporation) must have status `admin_approved` before verification can proceed.

**Success Response (200 OK):**
````json
{
  "success": true,
  "message": "Certificate verification completed",
  "data": {
    "verificationResult": {
      "success": true,
      "valid": true,
      "message": "CAC verification completed",
      "data": {
        "companyName": "Example Business Ltd",
        "registrationNumber": "RC123456",
        "registrationDate": "2020-01-15",
        "status": "Active",
        "address": "123 Business Street, Lagos, Nigeria",
        "directors": [
          {
            "name": "John Doe",
            "position": "Managing Director"
          }
        ]
      }
    },
    "userId": "user-456",
    "verifiedBy": "admin-user-id",
    "verifiedAt": "2025-01-10T10:30:00.000Z"
  }
}
```

**Error Responses:**
- **400 Bad Request**: Business documents must be approved by admin before Prembly verification
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: User is not a compliance officer
- **404 Not Found**: User profile not found

**Note**: If business documents are not in `admin_approved` status, the verification will fail with a 400 error indicating that admin approval is required first.

### Check Sanctions (Prembly)
**`POST /api/v1/kyc/admin/check-sanctions`**

Checks an individual or business against international sanctions lists. Uses Prembly API when configured, otherwise falls back to OpenSanctions API or mock.

**Authentication**: Requires valid JWT token with Compliance Officer role

**Authorization**: This endpoint is restricted to Compliance Officers only.

**Request Body:**
````json
{
  "name": "John Doe",
  "companyId": "optional-company-id",
  "country": "NG"
}
```

**Success Response (200 OK):**
````json
{
  "success": true,
  "data": {
    "flagged": false,
    "matches": [],
    "message": "optional"
  }
}
```

**Error Response (500 Internal Server Error):**
````json
{
  "success": false,
  "error": "Internal server error during sanctions check"
}
```

### Get Merchant Branding (KYC company logo)
**`GET /api/v1/kyc/merchants/:merchantId/branding`**

Public endpoint for storefront / frontend to display the merchant’s KYC company logo (`companyLogoUrl` uploaded during business KYC).

Also available as:
- **`GET /api/v1/kyc/merchant-branding?merchantId=…`**
- Header fallback: `x-tenant-merchant-id`

**Authentication**: None (public)

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "merchantId": "merchant_1774844182734_rm0g5u27l",
    "ownerUserId": "69c9f91770dec15687e44dbf",
    "companyName": "Example Business Ltd",
    "companyLogoUrl": "https://cdn.example/kyc/.../logo.png",
    "website": "https://example.com"
  }
}
```

**Error Response (404 Not Found):** branding / business info not submitted yet.

### Get Own Business Branding
**`GET /api/v1/kyc/business/branding`**

Authenticated merchant shortcut returning the same branding payload for the logged-in merchant.

**Authentication**: Requires valid JWT token for business customers

### Get Business Information
**`GET /api/v1/kyc/business/business-info`**

Retrieves the business information for a merchant user.

**Authentication**: Requires valid JWT token for business customers

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "companyName": "Example Business Ltd",
    "industry": "Technology",
    "countryOfIncorporation": "NG",
    "website": "https://example.com",
    "companyRegId": "RC123456",
    "companyLogoUrl": "https://example.com/logo.png"
  }
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "error": "No KYC profile found for this user"
}
```

### Get Business Survey
**`GET /api/v1/kyc/business/business-survey`**

Retrieves the business survey data for a merchant user.

**Authentication**: Requires valid JWT token for business customers

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "businessType": "loan product",
    "country": "NG",
    "businessModel": "B2B",
    "monthlyProcessedVolume": 500000
  }
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "error": "No KYC profile found for this user"
}
```

### Get Shareholders (Beneficial Owners)
**`GET /api/v1/kyc/business/beneficial-owners`**

Retrieves the shareholders (beneficial owners) information for a merchant user.

**Authentication**: Requires valid JWT token for business customers

**Success Response (200 OK):**
````json
{
  "success": true,
  "data": [
    {
      "fullName": "John Doe",
      "dateOfBirth": "1985-05-15",
      "nationality": "NG",
      "ownershipPercentage": 60,
      "bankStatement": {
        "fileName": "bank_statement.pdf",
        "fileType": "application/pdf",
        "fileSize": 102400,
        "fileUrl": "https://example.com/bank_statement.pdf",
        "uploadDate": "2025-01-10T09:00:00.000Z"
      },
      "status": "pending",
      "kyc": {
        "url": "https://liveness-test.example.com/test-123",
        "expiresAt": "2025-01-15T09:00:00.000Z",
        "status": "pending"
      }
    }
  ]
}
```

**Error Response (404 Not Found):**
````json
{
  "success": false,
  "error": "No KYC profile found for this user"
}
```

### Get Business Risk Assessment
**`GET /api/v1/kyc/business/risk-assessment`**

Retrieves the business risk assessment data for a merchant user.

**Authentication**: Requires valid JWT token for business customers

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "annualTurnover": 500000,
    "expectedTransactionVolume": 100000,
    "highRiskJurisdiction": false,
    "sanctionListCheck": false,
    "adverseMediaCheck": false
  }
}
```

**Error Response (404 Not Found):**
````json
{
  "success": false,
  "error": "No KYC profile found for this user"
}
```

### Update Business Information
**`PUT /api/v1/kyc/business/business-info`**

Updates the business information for a merchant user.

**Authentication**: Requires valid JWT token for business customers

**Request Body:**
````json
{
  "companyName": "Updated Business Ltd",
  "industry": "Technology",
  "countryOfIncorporation": "NG",
  "website": "https://updated-example.com",
  "companyRegId": "RC123456",
  "companyLogoUrl": "https://updated-example.com/logo.png"
}
```

**Success Response (200 OK):**
````json
{
  "success": true,
  "message": "Business information updated successfully"
}
```

**Error Response (400 Bad Request):**
````json
{
  "success": false,
  "error": "Error updating business information"
}
```

### Update Business Survey
**`PUT /api/v1/kyc/business/business-survey`**

Updates the business survey data for a merchant user.

**Authentication**: Requires valid JWT token for business customers

**Request Body:**
````json
{
  "businessType": "investment product",
  "country": "NG",
  "businessModel": "B2C",
  "monthlyProcessedVolume": 600000
}
```

**Success Response (200 OK):**
````json
{
  "success": true,
  "message": "Business survey updated successfully"
}
```

**Error Response (400 Bad Request):**
````json
{
  "success": false,
  "error": "Error updating business survey"
}
```

### Update Shareholders (Beneficial Owners)
**`PUT /api/v1/kyc/business/beneficial-owners`**

Updates the shareholders (beneficial owners) information for a merchant user.

**Authentication**: Requires valid JWT token for business customers

**Request Body:**
````json
[
  {
    "fullName": "John Doe",
    "dateOfBirth": "1985-05-15",
    "nationality": "NG",
    "ownershipPercentage": 60,
    "bankStatement": {
      "fileName": "bank_statement.pdf",
      "fileType": "application/pdf",
      "fileSize": 102400,
      "fileUrl": "https://example.com/bank_statement.pdf",
      "uploadDate": "2025-01-10T09:00:00.000Z"
    },
    "status": "pending",
    "kyc": {
      "url": "https://liveness-test.example.com/test-123",
      "expiresAt": "2025-01-15T09:00:00.000Z",
      "status": "pending"
    }
  },
  {
    "fullName": "Jane Smith",
    "dateOfBirth": "1980-10-20",
    "nationality": "NG",
    "ownershipPercentage": 40,
    "bankStatement": {
      "fileName": "bank_statement2.pdf",
      "fileType": "application/pdf",
      "fileSize": 102400,
      "fileUrl": "https://example.com/bank_statement2.pdf",
      "uploadDate": "2025-01-10T09:00:00.000Z"
    },
    "status": "pending",
    "kyc": {
      "url": "https://liveness-test.example.com/test-456",
      "expiresAt": "2025-01-15T09:00:00.000Z",
      "status": "pending"
    }
  }
]
```

**Success Response (200 OK):**
````json
{
  "success": true,
  "message": "Shareholders updated successfully"
}
```

**Error Response (400 Bad Request):**
````json
{
  "success": false,
  "error": "Error updating shareholders"
}
```

### Get Enhanced Due Diligence (High-Risk Businesses)
**`GET /api/v1/kyc/business/enhanced-due-diligence`**

Retrieves enhanced due diligence information for high-risk business customers.

**Authentication**: Requires valid JWT token for business customers with high-risk approval

**Success Response (200 OK):**
````json
{
  "success": true,
  "data": {
    "businessInfo": {
      "companyName": "Example Business Ltd",
      "industry": "Technology",
      "countryOfIncorporation": "NG",
      "website": "https://example.com",
      "companyRegId": "RC123456",
      "companyLogoUrl": "https://example.com/logo.png"
    },
    "businessSurvey": {
      "annualTurnover": 500000,
      "expectedTransactionVolume": 100000,
      "expectedTransactionValue": 5000,
      "sourceOfFunds": "Business revenue",
      "businessPurpose": "Software development and consulting",
      "numberOfEmployees": 25,
      "operatingSince": "2020-01-01T00:00:00.000Z",
      "businessModelDescription": "We provide software development services to clients globally",
      "customerBaseDescription": "Small to medium businesses in technology sector",
      "geographicMarkets": "Nigeria, United States, United Kingdom",
      "reasonForOpeningAccount": "To receive payments from international clients"
    },
    "shareholders": [
      {
        "fullName": "John Doe",
        "dateOfBirth": "1985-05-15",
        "nationality": "NG",
        "ownershipPercentage": 60,
        "bankStatement": {
          "fileName": "bank_statement.pdf",
          "fileType": "application/pdf",
          "fileSize": 102400,
          "fileUrl": "https://example.com/bank_statement.pdf",
          "uploadDate": "2025-01-10T09:00:00.000Z"
        },
        "status": "pending",
        "kyc": {
          "url": "https://liveness-test.example.com/test-123",
          "expiresAt": "2025-01-15T09:00:00.000Z",
          "status": "pending"
        }
      }
    ],
    "riskAssessment": {
      "annualTurnover": 500000,
      "expectedTransactionVolume": 100000,
      "highRiskJurisdiction": false,
      "sanctionListCheck": false,
      "adverseMediaCheck": false
    },
    "documents": [
      {
        "type": "certificate_of_incorporation",
        "fileName": "certificate_of_incorporation.pdf",
        "fileType": "application/pdf",
        "fileSize": 204800,
        "fileUrl": "https://example.com/certificate_of_incorporation.pdf",
        "uploadedAt": "2025-01-10T09:00:00.000Z",
        "status": "pending"
      }
    ]
  }
}
```

**Error Response (404 Not Found):**
````json
{
  "success": false,
  "error": "No KYC profile found for this user"
}
```

### Get Corporate Structure Information
**`GET /api/v1/kyc/business/corporate-structure`**

Retrieves corporate structure information for corporation and LLC business types.

**Authentication**: Requires valid JWT token for business customers with corporation or LLC business type

**Success Response (200 OK):**
````json
{
  "success": true,
  "data": {
    "businessInfo": {
      "companyName": "Example Business Ltd",
      "industry": "Technology",
      "countryOfIncorporation": "NG",
      "website": "https://example.com",
      "companyRegId": "RC123456",
      "companyLogoUrl": "https://example.com/logo.png"
    },
    "shareholders": [
      {
        "fullName": "John Doe",
        "dateOfBirth": "1985-05-15",
        "nationality": "NG",
        "ownershipPercentage": 60,
        "bankStatement": {
          "fileName": "bank_statement.pdf",
          "fileType": "application/pdf",
          "fileSize": 102400,
          "fileUrl": "https://example.com/bank_statement.pdf",
          "uploadDate": "2025-01-10T09:00:00.000Z"
        },
        "status": "pending",
        "kyc": {
          "url": "https://liveness-test.example.com/test-123",
          "expiresAt": "2025-01-15T09:00:00.000Z",
          "status": "pending"
        }
      }
    ],
    "documents": [
      {
        "type": "corporate_structure",
        "fileName": "corporate_structure.pdf",
        "fileType": "application/pdf",
        "fileSize": 204800,
        "fileUrl": "https://example.com/corporate_structure.pdf",
        "uploadedAt": "2025-01-10T09:00:00.000Z",
        "status": "pending"
      }
    ]
  }
}
```

**Error Response (404 Not Found):**
````json
{
  "success": false,
  "error": "No KYC profile found for this user"
}
```

### Get Non-Profit Verification Information
**`GET /api/v1/kyc/business/non-profit-verification`**

Retrieves verification information for non-profit business types.

**Authentication**: Requires valid JWT token for business customers with non-profit business type

**Success Response (200 OK):**
````json
{
  "success": true,
  "data": {
    "businessInfo": {
      "companyName": "Example Non-Profit Org",
      "industry": "Charity",
      "countryOfIncorporation": "NG",
      "website": "https://example-nonprofit.org",
      "companyRegId": "RC789012",
      "companyLogoUrl": "https://example-nonprofit.org/logo.png"
    },
    "businessSurvey": {
      "annualTurnover": 0,
      "expectedTransactionVolume": 50000,
      "expectedTransactionValue": 1000,
      "sourceOfFunds": "Donations",
      "businessPurpose": "Providing educational services to underprivileged children",
      "numberOfEmployees": 10,
      "operatingSince": "2015-01-01T00:00:00.000Z",
      "businessModelDescription": "We provide educational services funded by donations",
      "customerBaseDescription": "Underprivileged children and their families",
      "geographicMarkets": "Nigeria",
      "reasonForOpeningAccount": "To receive donations and manage funds"
    },
    "documents": [
      {
        "type": "business_registration",
        "fileName": "nonprofit_registration.pdf",
        "fileType": "application/pdf",
        "fileSize": 204800,
        "fileUrl": "https://example-nonprofit.org/registration.pdf",
        "uploadedAt": "2025-01-10T09:00:00.000Z",
        "status": "pending"
      }
    ]
  }
}
```

**Error Response (404 Not Found):**
````json
{
  "success": false,
  "error": "No KYC profile found for this user"
}
```

### Get Government Verification Information
**`GET /api/v1/kyc/business/government-verification`**

Retrieves verification information for government entity business types.

**Authentication**: Requires valid JWT token for business customers with government entity business type

**Success Response (200 OK):**
````json
{
  "success": true,
  "data": {
    "businessInfo": {
      "companyName": "Ministry of Education",
      "industry": "Government",
      "countryOfIncorporation": "NG",
      "website": "https://education.gov.ng",
      "companyRegId": "GOV-001",
      "companyLogoUrl": "https://education.gov.ng/logo.png"
    },
    "businessSurvey": {
      "annualTurnover": 10000000,
      "expectedTransactionVolume": 500000,
      "expectedTransactionValue": 20000,
      "sourceOfFunds": "Government budget",
      "businessPurpose": "Managing educational policies and funds",
      "numberOfEmployees": 500,
      "operatingSince": "1960-01-01T00:00:00.000Z",
      "businessModelDescription": "Government entity responsible for education policies",
      "customerBaseDescription": "Educational institutions and citizens",
      "geographicMarkets": "Nigeria",
      "reasonForOpeningAccount": "To manage government funds"
    },
    "documents": [
      {
        "type": "business_registration",
        "fileName": "government_registration.pdf",
        "fileType": "application/pdf",
        "fileSize": 204800,
        "fileUrl": "https://education.gov.ng/registration.pdf",
        "uploadedAt": "2025-01-10T09:00:00.000Z",
        "status": "pending"
      }
    ]
  }
}
```

**Error Response (404 Not Found):**
````json
{
  "success": false,
  "error": "No KYC profile found for this user"
}
```

