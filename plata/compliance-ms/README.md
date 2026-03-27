# Compliance Microservice

A comprehensive compliance microservice providing Know Your Customer (KYC) verification, risk assessment, and regulatory compliance capabilities for merchants and users.

**Deployment URL**: https://compliance-ms.fly.dev/  
**API Gateway**: https://account-ms-plata.fly.dev/api/v1/compliance/

## 📚 Documentation

- **[README.md](README.md)** - This file, feature documentation and API reference
- **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** - **Critical deployment configuration and troubleshooting guide**
- **[fly.toml](fly.toml)** - Fly.io deployment configuration

## ⚠️ Important: Deployment Configuration

Before deploying, review the [Deployment Guide](docs/DEPLOYMENT.md) for critical configuration requirements:

1. **Port Configuration**: `PORT` secret must match `fly.toml` internal_port (3003)
2. **JWT Secret**: Must use same JWT_SECRET as service-auth-ms and client-auth-ms
3. **Route Alias**: Service responds to both `/api/v1/kyc/*` and `/api/v1/compliance/*`

Failure to configure these correctly will result in 502 Bad Gateway errors or authentication failures.

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
- **AML Document Verification** - Verify business documents using Prembly API only (no other AML providers)
- **Sanctions List Checking** - Check individuals and businesses against international sanctions lists (via Prembly API)
- **Prembly Integration** - Comprehensive identity verification and compliance platform integration

## Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js with TypeScript
- **Database**: MongoDB (configured, currently using mock database)
- **Authentication**: JWT (JSON Web Tokens) - **Must use shared JWT_SECRET across all services**
- **Validation**: Joi
- **Testing**: Jest + Supertest
- **Security**: helmet, CORS, express-rate-limit
- **Logging**: Winston
- **Verification Provider**: Prembly API (KYC, AML, CAC, Sanctions, Liveness)

## Critical Deployment Configuration

### ⚠️ Required Fly.io Secrets

The following secrets **MUST** be configured correctly for the service to work properly through the API gateway:

```bash
# Port configuration - MUST match fly.toml [http_service] internal_port
fly secrets set PORT=3003 -a compliance-ms

# JWT secret - MUST match service-auth-ms and client-auth-ms
fly secrets set JWT_SECRET="your-shared-jwt-secret" -a compliance-ms

# Database connection
fly secrets set MONGODB_URI="mongodb+srv://..." -a compliance-ms

# DigitalOcean Spaces (for document uploads)
fly secrets set DO_SPACES_REGION=nyc3 -a compliance-ms
fly secrets set DO_SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com -a compliance-ms
fly secrets set DO_SPACES_BUCKET=your-bucket -a compliance-ms
fly secrets set DO_SPACES_ACCESS_KEY_ID=your-key -a compliance-ms
fly secrets set DO_SPACES_SECRET_ACCESS_KEY=your-secret -a compliance-ms
```

### Route Configuration

The service exposes KYC routes at **BOTH** paths for gateway compatibility:
- `/api/v1/kyc/*` - Primary route path
- `/api/v1/compliance/*` - Alias for API gateway routing

This allows the account-ms gateway to proxy `/api/v1/compliance/*` requests without path rewriting.

### Gateway Integration

When deployed with account-ms as the API gateway:

1. **Gateway URL**: `https://account-ms-plata.fly.dev/api/v1/compliance/...`
2. **Direct URL**: `https://compliance-ms.fly.dev/api/v1/kyc/...` or `https://compliance-ms.fly.dev/api/v1/compliance/...`
3. **Authentication**: All routes require valid JWT token from client-auth-ms
4. **Token validation**: Service validates tokens locally using shared JWT_SECRET

### Common Issues & Solutions

#### 502 Bad Gateway Error
**Symptoms**: Gateway returns 502 when accessing compliance endpoints  
**Causes**:
1. Port mismatch between `fly.toml` and `PORT` secret
2. Missing route alias at `/api/v1/compliance/*`
3. JWT_SECRET mismatch causing auth failures

**Solution**:
```bash
# Ensure PORT matches fly.toml internal_port (3003)
fly secrets set PORT=3003 -a compliance-ms

# Ensure JWT_SECRET matches across all auth services
fly secrets set JWT_SECRET="same-secret-as-service-auth-ms" -a compliance-ms
```

#### Authentication Failures (401)
**Symptoms**: "Invalid token" errors despite valid login  
**Cause**: JWT_SECRET differs between compliance-ms and the service that issued the token (client-auth-ms)  
**Solution**: Use the same JWT_SECRET value across:
- service-auth-ms
- client-auth-ms  
- compliance-ms
- Any other service that validates JWT tokens

## Expected request parameters (frontend)

The following parameters are validated by the service. The frontend must send these for compliance flows to succeed.

### Individual KYC — `POST /api/v1/kyc/individual/submit`

| Parameter | Required | Rules |
|-----------|----------|--------|
| `userId` | Yes | string |
| `userType` | Yes | `"individual"` |
| `personalInfo` | Yes | object |
| `personalInfo.firstName` | Yes | string, 2–50 |
| `personalInfo.lastName` | Yes | string, 2–50 |
| `personalInfo.dateOfBirth` | Yes | date, not in future |
| `personalInfo.nationality` | Yes | string, 2–3 (e.g. NG) |
| `personalInfo.occupation` | Yes | string, 2–100 |
| `personalInfo.sourceOfFunds` | Yes | string, 5–200 |
| `documents` | Yes | array, **min 2** (must include `identity` and `address`) |
| `documents[].type` | Yes | one of: `identity`, `address`, `income_proof`, `bank` |
| `documents[].fileName` | Yes | string |
| `documents[].fileType` | Yes | string (e.g. MIME type) |
| `documents[].fileSize` | Yes | number, max 10MB |
| `documents[].fileUrl` | Yes | valid URI (e.g. after upload) |
| `riskAssessment` | No | `{ politicallyExposed: boolean, sanctionListCheck: boolean }` |

**Note:** Documents are referenced by URL (`fileUrl`). Upload files first via the backend upload endpoint below (DigitalOcean Spaces) and send the resulting URL.

**Backend response (frontend):**
- **Success (201):** `{ "success": true, "data": { "kycId": "<id>", "userId": "<id>", "status": "PENDING", "riskLevel": "<LOW|MEDIUM|HIGH|VERY_HIGH>", "submittedAt": "<ISO date>" } }`
- **Error (400):** `{ "success": false, "error": "<validation or business error message>" }`
- **Error (404):** `{ "success": false, "error": "No KYC profile found for this user" }` (or similar)

### KYC document upload (backend) — `POST /api/v1/kyc/upload`

Backend upload to **DigitalOcean Spaces**. Authenticated (JWT or service token) only.

| Item | Description |
|------|-------------|
| **Method** | `POST` |
| **Path** | `/api/v1/kyc/upload` |
| **Auth** | Bearer token (user JWT or service) |
| **Body** | `multipart/form-data` with a single file in the field **`file`** |
| **Allowed types** | `application/pdf`, `image/jpeg`, `image/jpg`, `image/png`, `image/webp` |
| **Max size** | From `KYC_MAX_DOCUMENT_SIZE` (MB), default 10 MB |

**Backend response (frontend):**
- **Success (200):** `{ "success": true, "url": "<public URL>", "key": "<object key>" }` — use `url` as `fileUrl` when submitting KYC documents.
- **Error (400):** `{ "success": false, "error": "No file uploaded. Send a single file in the \"file\" field." }` or `{ "success": false, "error": "<validation message e.g. invalid type or size>" }`
- **Error (401):** `{ "success": false, "error": "<auth error message>" }` — not authenticated.
- **Error (503):** `{ "success": false, "error": "Document upload is not configured (Spaces)." }` — backend Spaces env not set.

**Environment:** Set the variables below to enable document uploads; otherwise the endpoint returns 503.

| Variable | Description |
|----------|-------------|
| `DO_SPACES_REGION` | e.g. `nyc3` |
| `DO_SPACES_ENDPOINT` | e.g. `https://nyc3.digitaloceanspaces.com` |
| `DO_SPACES_BUCKET` | Bucket name |
| `DO_SPACES_ACCESS_KEY_ID` | Spaces access key |
| `DO_SPACES_SECRET_ACCESS_KEY` | Spaces secret key |
| `DO_SPACES_CDN_URL` | Optional CDN base (e.g. `https://bucket.nyc3.cdn.digitaloceanspaces.com`) for public URLs |

#### Frontend: What to do for Spaces (document upload)

The frontend **never talks to DigitalOcean Spaces directly**. All document storage goes through the compliance service.

1. **Upload flow**
   - When the user selects a file (e.g. for KYC identity, address, or business documents), send it to the backend:
     - **Endpoint:** `POST /api/v1/kyc/upload`
     - **Headers:** `Authorization: Bearer <user or service JWT>`
     - **Body:** `multipart/form-data` with a single field named **`file`** (the selected file).
   - On success (200), the response is `{ "success": true, "url": "<public URL>", "key": "<object key>" }`.
   - Use the **`url`** value as `fileUrl` (and optionally store `key` if you need it for later reference) when submitting:
     - Individual KYC: `documents[].fileUrl`
     - Business KYC: `businessDocuments[].fileUrl`, `shareholders[].bankStatement.fileUrl`, `shareholders[].uboDocument.fileUrl`, etc.

2. **Validation (client-side, optional but recommended)**
   - **Allowed types:** `application/pdf`, `image/jpeg`, `image/jpg`, `image/png`, `image/webp`. Reject or warn before upload if the file type is not in this list.
   - **Max size:** Respect `KYC_MAX_DOCUMENT_SIZE` (MB); default is 10 MB. Check file size before calling upload and show a clear error if over the limit.

3. **Error handling**
   - **400** — No file, or invalid type/size: show a message asking the user to pick an allowed file type and stay under the size limit.
   - **401** — Not authenticated: redirect to login or refresh the token.
   - **503** — Document upload not configured (Spaces not set on the server): show a message that uploads are temporarily unavailable and ask the user to try again later or contact support.

4. **No Spaces credentials in the frontend**
   - Do not put `DO_SPACES_*` or any Spaces API keys in the frontend. Upload is done only via the compliance backend; the backend holds the Spaces credentials.

### Business KYC — `POST /api/v1/kyc/business/submit`

| Parameter | Required | Rules |
|-----------|----------|--------|
| `userId` | Yes | string |
| `userType` | Yes | `"merchant"` |
| `businessInfo` | Yes | object |
| `businessInfo.companyName` | Yes | string, 2–100 |
| `businessInfo.industry` | Yes | string, 2–50 |
| `businessInfo.businessDescription` | Yes | string, 10–500 |
| `businessInfo.countryOfIncorporation` | Yes | string, 2–50 |
| `businessInfo.website` | Yes | valid URI |
| `businessInfo.companyRegId` | Yes | string, 5–50 |
| `businessInfo.companyLogoUrl` | Yes | valid URI |
| `businessSurvey` | Yes | object |
| `businessSurvey.businessType` | Yes | string, 2–100 |
| `businessSurvey.country` | Yes | string, 2–50 |
| `businessSurvey.businessModel` | Yes | string, 2–20 |
| `businessSurvey.monthlyProcessedVolume` | Yes | number, ≥ 0 |
| `shareholders` | Yes | array, **min 1**; total `ownershipPercentage` must be ≤ 100 |
| `shareholders[].fullName` | Yes | string, 2–100 |
| `shareholders[].ownershipPercentage` | Yes | number, 0–100 |
| `shareholders[].bankStatement` | Yes | `{ fileName, fileType, fileSize (max 5MB), fileUrl, uploadDate }` |
| `shareholders[].status` | Yes | one of: `pending`, `in_progress`, `review`, `admin_approved`, `approved`, `rejected`, `failed`, `completed` |
| `shareholders[].kyc` | Yes | `{ url (URI), expiresAt, status: pending\|active\|expired\|completed\|failed }` |
| `shareholders[].email` | No | string, email |
| `shareholders[].phoneNumber` | No | string, 10–20 |
| `shareholders[].bvn` | No | string, 11 chars |
| `shareholders[].bankAccount` | No | string, 10–20 |
| `shareholders[].uboDocument` | No | `{ fileName, fileType, fileSize (max 5MB), fileUrl, uploadDate }` |
| `businessDocuments` | Yes | array, **exactly 8** items (one per type below) |
| `businessDocuments[].type` | Yes | All 7 types must appear (min 8 items): `certificate_of_incorporation`, `articles_of_association`, `list_of_shareholders`, `proof_of_address`, `bank_statement`, `aml_policies`, `data_privacy_policy` |
| `businessDocuments[].fileName` | Yes | string |
| `businessDocuments[].fileType` | Yes | `"application/pdf"` |
| `businessDocuments[].fileSize` | Yes | number, max 5MB |
| `businessDocuments[].fileUrl` | Yes | valid URI |
| `businessDocuments[].uploadedAt` | Yes | date |
| `businessDocuments[].status` | Yes | one of: `low`, `medium`, `high`, `very_high` (risk level; see validation) |
| `riskAssessment` | Yes | `{ annualTurnover, expectedTransactionVolume (≥0), highRiskJurisdiction, sanctionListCheck, adverseMediaCheck }` |

**Required business document types (all 8):** `certificate_of_incorporation`, `articles_of_association`, `list_of_shareholders`, `proof_of_address`, `bank_statement`, `aml_policies`, `data_privacy_policy`. (If the codebase adds more enum values, all must be sent.)

**Backend response (frontend):**
- **Success (201):** `{ "success": true, "data": { "kycId": "<id>", "userId": "<id>", "status": "PENDING", "riskLevel": "<level>", "shareholderCount": <n>, "submittedAt": "<ISO date>" } }`
- **Error (400):** `{ "success": false, "error": "<validation or business error message>" }`
- **Error (404):** `{ "success": false, "error": "No KYC profile found for this user" }` (or similar)

### Business KYC status and documents (merchant view)

- **Business KYC status — `GET /api/v1/kyc/business/status`**  
  Returns the KYC status for the authenticated merchant (no body; user is identified from JWT).

  **Backend response (frontend):**
  - **Success (200):** `{ "success": true, "data": { "status": "<PENDING|IN_PROGRESS|...>", "riskLevel": "<LOW|MEDIUM|HIGH|VERY_HIGH>", "submittedAt": "<ISO date>", "completedAt": "<ISO date>|null" } }`
  - **Error (404):** `{ "success": false, "error": "No KYC profile found for this user" }`

- **Business documents list — `GET /api/v1/kyc/business/documents`**  
  Returns all business KYC documents for the authenticated merchant.

  **Backend response (frontend):**
  - **Success (200):** `{ "success": true, "data": [ { "id"|"_id", "type", "fileName", "fileType", "fileSize", "fileUrl", "uploadedAt"|"uploadDate", "status", ... } ] }`
  - **Error (404):** `{ "success": false, "error": "No KYC profile found for this user" }` or `"Error retrieving documents"`

- **Single business document — `GET /api/v1/kyc/business/document/:documentId`**  
  Retrieves one document by ID for the authenticated merchant.

  **Path parameter:** `documentId` – document identifier

  **Backend response (frontend):**
  - **Success (200):** `{ "success": true, "data": { "id"|"_id", "type", "fileName", "fileType", "fileSize", "fileUrl", "uploadedAt", "status", ... } }`
  - **Error (404):** `{ "success": false, "error": "Document not found" }` or `"No KYC profile found for this user"`

### Business dropdown options (for frontend forms)

All these endpoints require an authenticated **merchant** JWT and return arrays of `{ value, label }` for populating select inputs. No request body or query parameters.

#### Frontend Usage Example

```javascript
// After user login, store the access token
const token = localStorage.getItem('authToken');

// Fetch business type options via API Gateway
async function getBusinessTypeOptions() {
  const response = await fetch(
    'https://account-ms-plata.fly.dev/api/v1/compliance/business/business-type-options',
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  const result = await response.json();
  if (result.success) {
    return result.data; // [{ value: "E-commerce", label: "E-commerce" }, ...]
  }
  throw new Error(result.error);
}

// React component example
function BusinessForm() {
  const [businessTypes, setBusinessTypes] = useState([]);
  
  useEffect(() => {
    getBusinessTypeOptions().then(setBusinessTypes);
  }, []);
  
  return (
    <select name="businessType">
      <option value="">Select a business type</option>
      {businessTypes.map(type => (
        <option key={type.value} value={type.value}>{type.label}</option>
      ))}
    </select>
  );
}
```

- **Business type options — `GET /api/v1/kyc/business/business-type-options`**  
  Returns high-level business type options (e.g. "E-commerce", "SaaS", "Marketplace", "Financial Services", "Healthcare", "Education", "Other").
  
  **Via Gateway**: `GET https://account-ms-plata.fly.dev/api/v1/compliance/business/business-type-options`
  
  **Backend response (frontend):**
  - **Success (200):** `{ "success": true, "data": [ { "value": "<string>", "label": "<string>" }, ... ] }`
  - **Error (401):** `{ "success": false, "error": "Authentication required" }`; **Error (400):** `{ "success": false, "error": "User is not a business customer" }`

- **Industry type options — `GET /api/v1/kyc/business/industry-type-options`**  
  Returns allowed industry types for the "Industry" field (e.g. Technology, Finance, Healthcare, E‑commerce, Education, Manufacturing, Other).

  **Backend response (frontend):** Same as business-type-options — **Success (200):** `{ "success": true, "data": [ { "value", "label" }, ... ] }`; **Error (401/400):** as above.

- **Business model options — `GET /api/v1/kyc/business/business-model-options`**  
  Returns allowed business models for the "Business model" field (e.g. B2B, B2C, B2B2C, Marketplace, Subscription, Freemium, Other).

  **Backend response (frontend):** Same as business-type-options — **Success (200):** `{ "success": true, "data": [ { "value", "label" }, ... ] }`; **Error (401/400):** as above.

### Business info update — `PUT /api/v1/kyc/business/business-info`

Body is merged into the profile; no server-side schema. Sending the same fields as `businessInfo` above (including optional `businessDescription`) is supported.

**Backend response (frontend):**
- **Success (200):** `{ "success": true, "message": "Business information updated successfully" }`
- **Error (400):** `{ "success": false, "error": "User ID is required" }` or `"Validation failed"`; **Error (404):** `{ "success": false, "error": "No KYC profile found for this user" }` or `"User is not a business customer"`

### Business survey update — `PUT /api/v1/kyc/business/business-survey`

Body is merged; same fields as `businessSurvey` above.

**Backend response (frontend):**
- **Success (200):** `{ "success": true, "message": "Business survey updated successfully" }`
- **Error (400):** `{ "success": false, "error": "User ID is required" }` or `"Validation failed"`; **Error (404):** `{ "success": false, "error": "No KYC profile found for this user" }` or `"User is not a business customer"`

### Shareholder endpoints (add / fetch)

- **Fetch a merchant's shareholders:** `GET /api/v1/kyc/business/:merchantId/beneficial-owners`  
  Returns the shareholders for the given `merchantId`. The authenticated user must be that merchant (JWT `userId` must equal `merchantId`), otherwise 403.  
  **Admin (by userId):** `GET /api/v1/kyc/admin/businesses/:userId/beneficial-owners`  
  **Legacy (by merchantId):** `GET /api/v1/kyc/business/:merchantId/shareholders`

  **Backend response (frontend) — GET beneficial-owners:**
  - **Success (200):** `{ "success": true, "data": [ { "fullName", "ownershipPercentage", "bankStatement", "uboDocument", "status", "kyc", "email", "phoneNumber", ... }, ... ] }`
  - **Error (403):** `{ "success": false, "error": "You can only fetch shareholders for your own account" }`
  - **Error (404):** `{ "success": false, "error": "No KYC profile found for this user" }`

- **Add or update shareholders:** There is no dedicated "add one shareholder" endpoint. To add shareholders:
  1. **Option A:** Include the full `shareholders` array in `POST /api/v1/kyc/business/submit` when submitting business KYC.
  2. **Option B:** Send the **full list** of shareholders (existing + new) in the body of `PUT /api/v1/kyc/business/beneficial-owners`. The body replaces the entire shareholders list (so to add one: GET beneficial-owners, append the new shareholder, then PUT).  
  **Legacy:** `PUT /api/v1/kyc/business/:merchantId/shareholders` — same idea, body = full array.  
  `POST /api/v1/kyc/business/:merchantId/shareholders/create` is **deprecated** and returns an error directing use to `PUT .../beneficial-owners`.

  **Backend response (frontend) — PUT beneficial-owners:**
  - **Success (200):** `{ "success": true, "message": "Shareholders updated successfully" }`
  - **Error (400):** `{ "success": false, "error": "User ID is required" }` or validation error; **Error (404):** `{ "success": false, "error": "No KYC profile found for this user" }` or `"User is not a business customer"`

Shareholder object parameters (for each item in the array) are in the table under **Business KYC** above: `fullName`, `ownershipPercentage`, `bankStatement`, `status`, `kyc` (required); `email`, `phoneNumber`, `bvn`, `bankAccount`, `uboDocument` (optional). Documents (UBO, bank statement) use `fileUrl` after upload (PDF, max 5MB).

### Compliance messaging (merchant/individual → admin)

- **Merchant send message:** `POST /api/v1/kyc/business/message` — body `{ "message": "string" }` (required, non-empty).
- **Merchant get thread:** `GET /api/v1/kyc/business/messages` — no body; returns `{ success, data: messages[] }`.
- **Individual send message:** `POST /api/v1/kyc/individual/message` — body `{ "message": "string" }`.
- **Individual get thread:** `GET /api/v1/kyc/individual/messages` — no body.
- **Admin receive:** `GET /api/v1/kyc/admin/businesses/:userId` and `GET /api/v1/kyc/admin/individuals/:userId` responses include a `messages` array (`id`, `message`, `sentBy`, `sentAt`, `read`).

**Backend response (frontend):**
- **Send message (POST):** **Success (200):** `{ "success": true }` (or message confirmation); **Error (400):** `{ "success": false, "error": "Message is required and must be a non-empty string" }`; **Error (401):** `{ "success": false, "error": "Authentication required" }`; **Error (404):** `{ "success": false, "error": "No KYC profile found for this user" }`
- **Get messages (GET):** **Success (200):** `{ "success": true, "data": [ { "id", "message", "sentBy", "sentAt", "read" }, ... ] }`; **Error (404):** `{ "success": false, "error": "No KYC profile found for this user" }`

### Document status update (admin) — `PUT /api/v1/kyc/admin/document/:documentId/status`

| Parameter | Required | Rules |
|-----------|----------|--------|
| `status` | Yes | one of: `pending`, `in_progress`, `review`, `admin_approved`, `approved`, `rejected`, `failed`, `completed` |
| `rejectionReason` | If status is `rejected` | string |

**Backend response (frontend):**
- **Success (200):** `{ "success": true, "message": "Document status updated successfully", "data": { "documentId", "status", "rejectionReason", "updatedBy" } }`
- **Error (400):** `{ "success": false, "error": "<validation or business rule message>" }`; **Error (401):** `{ "success": false, "error": "Admin authentication required" }`; **Error (404):** `{ "success": false, "error": "Document not found" }`

### Admin document approve — `POST /api/v1/kyc/admin/document/:documentId/approve`

| Parameter | Required | Rules |
|-----------|----------|--------|
| `notes` | No | string |

**Backend response (frontend):**
- **Success (200):** `{ "success": true, "message": "Document approved for Prembly verification", "data": { "documentId", "status": "admin_approved", "approvedBy", "approvedAt", "notes" } }`
- **Error (400):** `{ "success": false, "error": "Document cannot be approved. Current status: ... Only PENDING or REVIEW documents can be approved." }`; **Error (401):** `{ "success": false, "error": "Admin authentication required" }`; **Error (404):** `{ "success": false, "error": "Document not found" }`

### CAC verify — `POST /api/v1/kyc/admin/businesses/:userId/verify-certificate`

| Parameter | Required | Rules |
|-----------|----------|--------|
| `registrationNumber` | Yes | string (e.g. RC123456) |
| `companyName` | Yes | string |

**Backend response (frontend):**
- **Success (200):** `{ "success": true, "message": "Certificate verification completed", "data": { "verificationResult": { "success", "valid", "message", "data": { "companyName", "registrationNumber", "registrationDate", "status", "address", "directors" } }, "userId", "verifiedBy", "verifiedAt" } }`
- **Error (400):** `{ "success": false, "error": "Business documents must be approved by admin before Prembly verification" }`; **Error (401):** admin auth required; **Error (404):** user/profile not found

### AML verify — `POST /api/v1/kyc/admin/document/:documentId/verify-aml`

AML verification uses **Prembly only** (Trulioo, Sumsub, and ComplyAdvantage are not used). The request body is optional; if sent, `provider` is ignored. Prembly must be configured (`PREMBLY_API_KEY`, `PREMBLY_API_SECRET`) or the request will fail.

**Backend response (frontend):**
- **Success (200):** `{ "success": true, "message": "Document verification completed and approved", "data": { "documentId", "verificationResult": { "verificationId", "kybVerified", "amlClear", "overallApproved", "riskScore" }, "status": "approved" } }` — or `"Document verification completed but requires manual review"` / `"Document verification completed but rejected"` with corresponding `data`.
- **Error (400):** `{ "success": false, "error": "Document must be approved by admin before Prembly verification. Current status: ... Please approve the document first." }`; **Error (401):** admin auth required; **Error (404):** `{ "success": false, "error": "Document not found" }`; **Error (500):** `{ "success": false, "error": "Failed to update document status after verification" }`

---

## API Documentation

### System admin (compliance officer) endpoints

All endpoints under `/api/v1/kyc/admin` require a valid JWT with **Compliance Officer** role. **Compliance officer** is the same as **admin from client-auth-ms**: the JWT must have `userType: "admin"` (issued when an admin logs in via client-auth-ms). Users with `userType` individual or merchant receive 403. They allow the system admin to view and approve merchant (and individual) compliance data.

#### View merchant compliance data

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/kyc/admin/users` | List all users in the compliance system. |
| GET | `/api/v1/kyc/admin/documents` | List all compliance documents across users. |
| GET | `/api/v1/kyc/admin/profiles` | Search KYC profiles (query parameters). |
| GET | `/api/v1/kyc/admin/profiles/pending-review` | Get profiles pending review. |
| GET | `/api/v1/kyc/admin/profiles/high-risk` | Get high-risk profiles. |
| GET | `/api/v1/kyc/admin/businesses/:userId` | Get a single merchant's full business profile (business info, survey, documents, **messages** thread with admin, etc.). |
| GET | `/api/v1/kyc/admin/businesses/:userId/beneficial-owners` | Get a merchant's shareholders (beneficial owners). |
| GET | `/api/v1/kyc/admin/businesses/:userId/corporate-structure` | Get corporate structure (for corporation/LLC business types). |
| GET | `/api/v1/kyc/admin/document/:documentId` | Get a single document by ID. |

For **individual** customers, the admin can view:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/kyc/admin/individuals/:userId` | Get an individual's KYC profile (includes **messages** thread with admin). |

#### Approve merchant (and individual) compliance

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/kyc/admin/businesses/:userId/approve` | Approve or disapprove the merchant (user-level decision). |
| POST | `/api/v1/kyc/admin/businesses/:userId/review` | Record a review for the merchant's KYC (e.g. status, notes). |
| PUT | `/api/v1/kyc/admin/businesses/:userId/risk-level` | Update the merchant's risk level. |
| POST | `/api/v1/kyc/admin/document/:documentId/approve` | Approve a document for Prembly verification (sets status to `admin_approved`). |
| PUT | `/api/v1/kyc/admin/document/:documentId/status` | Update a document's status (e.g. `rejected` with `rejectionReason`). |
| POST | `/api/v1/kyc/admin/document/:documentId/verify-aml` | Run AML verification on a document (only after the document is admin-approved). |
| POST | `/api/v1/kyc/admin/businesses/:userId/verify-certificate` | Verify the business's CAC certificate (Corporate Affairs Commission). |

For **individual** customers:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/kyc/admin/individuals/:userId/approve` | Approve or disapprove the individual. |
| POST | `/api/v1/kyc/admin/individuals/:userId/review` | Record a review for the individual's KYC. |
| PUT | `/api/v1/kyc/admin/individuals/:userId/risk-level` | Update the individual's risk level. |

#### Other admin actions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/kyc/admin/businesses/:userId/message` | Send a message to the merchant (body: `{ "message": "string" }`). Admin can also **receive** messages from the merchant via the `messages` array in `GET .../businesses/:userId`. |
| POST | `/api/v1/kyc/admin/businesses/:userId/block` | Block the merchant. |
| POST | `/api/v1/kyc/admin/businesses/:userId/unblock` | Unblock the merchant. |
| POST | `/api/v1/kyc/admin/individuals/:userId/message` | Send a message to the individual (body: `{ "message": "string" }`). Admin can also **receive** messages via the `messages` array in `GET .../individuals/:userId`. |
| POST | `/api/v1/kyc/admin/individuals/:userId/block` | Block the individual. |
| POST | `/api/v1/kyc/admin/individuals/:userId/unblock` | Unblock the individual. |
| PUT | `/api/v1/kyc/admin/workflow/:kycId/status` | Update workflow status. |
| GET | `/api/v1/kyc/admin/workflows/pending` | Get pending workflows. |
| POST | `/api/v1/kyc/admin/check-sanctions` | Run a sanctions check (request body required). |
| GET | `/api/v1/kyc/admin/reports/risk-summary` | Get risk summary report. |
| GET | `/api/v1/kyc/admin/reports/compliance-metrics` | Get compliance metrics. |
| GET | `/api/v1/kyc/admin/reports/document-status` | Get document status report. |

#### Compliance messaging (merchant / individual ↔ admin)

Admins can send and receive messages. Merchants and individuals can send messages to compliance and read the full thread.

**Merchant**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/kyc/business/message` | Merchant sends a message to compliance admin. |
| GET | `/api/v1/kyc/business/messages` | Merchant retrieves the full message thread (admin + merchant). |

**Individual**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/kyc/individual/message` | Individual sends a message to compliance admin. |
| GET | `/api/v1/kyc/individual/messages` | Individual retrieves the full message thread (admin + individual). |

**Admin**

- **Send:** `POST /api/v1/kyc/admin/businesses/:userId/message` or `POST /api/v1/kyc/admin/individuals/:userId/message` with body `{ "message": "string" }`.
- **Receive:** The responses of `GET /api/v1/kyc/admin/businesses/:userId` and `GET /api/v1/kyc/admin/individuals/:userId` include a `messages` array. Each item has `id`, `message`, `sentBy` (user id of sender), `sentAt`, `read`.

**Merchant/individual – send message**

| Parameter | Required | Rules |
|-----------|----------|--------|
| `message` | Yes | Non-empty string (request body). |

**Example – merchant sends message**

```http
POST /api/v1/kyc/business/message
Authorization: Bearer <merchant_jwt>
Content-Type: application/json

{
  "message": "We have uploaded the additional document you requested."
}
```

**Example – admin receives messages**

```http
GET /api/v1/kyc/admin/businesses/merchant-user-id-123
Authorization: Bearer <compliance_officer_jwt>
```

Response includes:

```json
{
  "success": true,
  "data": {
    "userId": "merchant-user-id-123",
    "businessInfo": { ... },
    "documents": [ ... ],
    "messages": [
      {
        "id": "uuid-1",
        "message": "Please upload your certificate of incorporation.",
        "sentBy": "admin-user-id",
        "sentAt": "2025-01-10T10:00:00.000Z",
        "read": false
      },
      {
        "id": "uuid-2",
        "message": "We have uploaded the additional document you requested.",
        "sentBy": "merchant-user-id-123",
        "sentAt": "2025-01-11T09:00:00.000Z",
        "read": false
      }
    ]
  }
}
```

---

### Create Individual KYC Order
**`POST /api/v1/kyc/individual/submit`**

Submit KYC information for an individual customer to create a KYC order.

**Authentication**: Requires valid JWT token for individual customers

**Request Body:**
```json
{
  "userId": "user-123",
  "userType": "individual",
  "personalInfo": {
    "firstName": "John",
    "lastName": "Doe",
    "dateOfBirth": "1990-01-01",
    "nationality": "NG",
    "occupation": "Software developer",
    "sourceOfFunds": "Employment income"
  },
  "documents": [
    {
      "type": "identity",
      "fileName": "id.jpg",
      "fileType": "image/jpeg",
      "fileSize": 102400,
      "fileUrl": "https://example.com/uploads/id.jpg"
    },
    {
      "type": "address",
      "fileName": "proof.pdf",
      "fileType": "application/pdf",
      "fileSize": 204800,
      "fileUrl": "https://example.com/uploads/address.pdf"
    }
  ],
  "riskAssessment": {
    "politicallyExposed": false,
    "sanctionListCheck": false
  }
}
```
**Note:** At least two documents are required, including `identity` and `address`. Document types allowed: `identity`, `address`, `income_proof`, `bank`. Use `fileUrl` (upload first and send the URL), not base64.

**Success Response (201 Created):**
```json
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

**Request Body:**
```json
{
  "userId": "user-456",
  "userType": "merchant",
  "businessInfo": {
    "companyName": "Example Business Ltd",
    "industry": "Technology",
    "businessDescription": "We provide software development and consulting services.",
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
    { "type": "certificate_of_incorporation", "fileName": "cert.pdf", "fileType": "application/pdf", "fileSize": 204800, "fileUrl": "https://example.com/cert.pdf", "uploadedAt": "2025-01-10T09:00:00.000Z", "status": "low" },
    { "type": "articles_of_association", "fileName": "articles.pdf", "fileType": "application/pdf", "fileSize": 204800, "fileUrl": "https://example.com/articles.pdf", "uploadedAt": "2025-01-10T09:00:00.000Z", "status": "low" },
    { "type": "list_of_shareholders", "fileName": "shareholders.pdf", "fileType": "application/pdf", "fileSize": 204800, "fileUrl": "https://example.com/shareholders.pdf", "uploadedAt": "2025-01-10T09:00:00.000Z", "status": "low" },
    { "type": "proof_of_address", "fileName": "address.pdf", "fileType": "application/pdf", "fileSize": 204800, "fileUrl": "https://example.com/address.pdf", "uploadedAt": "2025-01-10T09:00:00.000Z", "status": "low" },
    { "type": "bank_statement", "fileName": "bank.pdf", "fileType": "application/pdf", "fileSize": 204800, "fileUrl": "https://example.com/bank.pdf", "uploadedAt": "2025-01-10T09:00:00.000Z", "status": "low" },
    { "type": "aml_policies", "fileName": "aml.pdf", "fileType": "application/pdf", "fileSize": 204800, "fileUrl": "https://example.com/aml.pdf", "uploadedAt": "2025-01-10T09:00:00.000Z", "status": "low" },
    { "type": "data_privacy_policy", "fileName": "privacy.pdf", "fileType": "application/pdf", "fileSize": 204800, "fileUrl": "https://example.com/privacy.pdf", "uploadedAt": "2025-01-10T09:00:00.000Z", "status": "low" },
    { "type": "certificate_of_incorporation", "fileName": "cert2.pdf", "fileType": "application/pdf", "fileSize": 204800, "fileUrl": "https://example.com/cert2.pdf", "uploadedAt": "2025-01-10T09:00:00.000Z", "status": "low" }
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
**Note:** `businessDescription` is required (10–500 chars). All 8 business document types must be present (validation requires min 8 items; types: `certificate_of_incorporation`, `articles_of_association`, `list_of_shareholders`, `proof_of_address`, `bank_statement`, `aml_policies`, `data_privacy_policy`). `businessDocuments[].status` is validated as a risk level: `low`, `medium`, `high`, or `very_high`. Shareholder `kyc.url` is the liveness test link; total ownership must be ≤ 100%.

**Success Response (201 Created):**
```json
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
```json
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
```json
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
``json
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
```json
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
``json
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
```json
{
  "notes": "Optional notes about the approval"
}
```

**Success Response (200 OK):**
```json
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
```json
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
```json
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

Verifies a document using **Prembly only** for AML/KYB checks. Other providers (e.g. Trulioo, Sumsub, ComplyAdvantage) are not used. **Requires document to be admin-approved first.**

**Authentication**: Requires valid JWT token with Compliance Officer role

**Authorization**: This endpoint is restricted to Compliance Officers only.

**Path Parameters:**
- `documentId`: The ID of the document to verify

**Request Body:** Optional. If provided, `provider` is ignored; Prembly is always used.
```json
{
  "provider": "prembly"
}
```

**Prerequisites**: Document must have status `admin_approved` before verification can proceed. Prembly must be configured (`PREMBLY_API_KEY`, `PREMBLY_API_SECRET` in environment); otherwise the verification returns an error.

**Success Response (200 OK):**
```json
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
```json
{
  "registrationNumber": "RC123456",
  "companyName": "Example Business Ltd"
}
```

**Prerequisites**: Business documents (especially certificate of incorporation) must have status `admin_approved` before verification can proceed.

**Success Response (200 OK):**
```json
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

### Get Business Information
**`GET /api/v1/kyc/business/business-info`**

Retrieves the business information for a merchant user.

**Authentication**: Requires valid JWT token for business customers

**Success Response (200 OK):**
``json
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
``json
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
``json
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
``json
{
  "success": false,
  "error": "No KYC profile found for this user"
}
```

### Get Shareholders (Beneficial Owners)
**`GET /api/v1/kyc/business/:merchantId/beneficial-owners`**

Retrieves the shareholders (beneficial owners) for the given merchant. The authenticated user must be that merchant (`userId` in JWT must equal `merchantId`); otherwise the response is 403.

**Path Parameters:**
- `merchantId`: The merchant (user) ID whose shareholders to fetch

**Authentication**: Requires valid JWT token for business customers

**Success Response (200 OK):**
```json
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
```json
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
``json
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
```json
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
```json
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
```json
{
  "success": true,
  "message": "Business information updated successfully"
}
```

**Error Response (400 Bad Request):**
```json
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
```json
{
  "businessType": "investment product",
  "country": "NG",
  "businessModel": "B2C",
  "monthlyProcessedVolume": 600000
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Business survey updated successfully"
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Error updating business survey"
}
```

### Update Shareholders (Beneficial Owners)
**`PUT /api/v1/kyc/business/beneficial-owners`**

Updates the shareholders (beneficial owners) for the authenticated merchant. Request body is the **full array** of shareholders (replaces existing list). Use this to add new shareholders by appending to the list returned from `GET /api/v1/kyc/business/:merchantId/beneficial-owners`.

**Authentication**: Requires valid JWT token for business customers

**Request Body:** Array of shareholder objects. Each object supports:

| Field | Required | Description |
|-------|----------|-------------|
| `fullName` | Yes | string, 2–100 |
| `ownershipPercentage` | Yes | number, 0–100 (total across all shareholders ≤ 100) |
| `bankStatement` | Yes | `{ fileName, fileType, fileSize (max 5MB), fileUrl, uploadDate }` — PDF, upload first and send URL |
| `status` | Yes | e.g. `pending`, `approved`, `rejected` |
| `kyc` | Yes | `{ url, expiresAt, status }` — liveness test link |
| `email` | No | string, email |
| `phoneNumber` | No | string, 10–20 |
| `bvn` | No | string, 11 chars (Bank Verification Number) |
| `bankAccount` | No | string, 10–20 |
| `uboDocument` | No | Ultimate Beneficial Owner doc: `{ fileName, fileType, fileSize (max 5MB), fileUrl, uploadDate }` — PDF |

**Example:**
```json
[
  {
    "fullName": "John Doe",
    "email": "john@example.com",
    "phoneNumber": "+2348012345678",
    "bvn": "22123456789",
    "bankAccount": "0123456789",
    "ownershipPercentage": 60,
    "uboDocument": {
      "fileName": "ubo.pdf",
      "fileType": "application/pdf",
      "fileSize": 102400,
      "fileUrl": "https://example.com/uploads/ubo.pdf",
      "uploadDate": "2025-01-10T09:00:00.000Z"
    },
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
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Shareholders updated successfully"
}
```

**Error Response (400 Bad Request):**
```json
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
```json
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
```json
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
```json
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
```json
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
```json
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
```json
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
```json
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
```json
{
  "success": false,
  "error": "No KYC profile found for this user"
}
```

