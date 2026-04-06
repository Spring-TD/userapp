# Create App Microservice

The Create App Microservice handles the creation and management of applications within the SpringTD platform. This service allows merchants to create applications that can then be associated with products from the Product Microservice.

Deployment URL: https://create-app-ms.fly.dev/

## Features

- Create new applications with detailed information (App Name, Website URL, App Alias, App Description); each app gets a unique **`subdomain`** and default platform URL (see **Create App** below)
- App status is **active** or **suspended**. Merchants can suspend or reactivate an app via `PATCH /api/v1/apps/{id}/status`.
- Retrieve applications by ID or merchant ID
- Retrieve all applications
- Automatically create merchant wallets (TREASURY, OPERATION, KYC) for each application using the Wallet Microservice
- Update application information
- Delete applications
- Associate applications with products through product keys
- Manage product keys for applications
- View transactions for individual applications
- Get transaction statistics for applications
- Manage documents submitted by users through the Drive feature
- Special endpoints requiring API key authentication for advanced operations
- **Authentication required for app creation** - Merchant ID is extracted from authenticated user context
- **Merchant app visibility fully enforced** - merchants can only view apps they own
- **PWA templates** — Many templates per app, stored in MongoDB (`AppPwaTemplate`). Each has a JSON `config` with nested sections aligned to the App Creator wizard: `asset`, `splash`, `onboarding`, `appProfile` (global font + theme: text / element / background / menu colors), `policyTerms`, `support`, `dns`. Used later by the Progressive Web App (PWA); this is separate from core app fields and from the **`create-default-merchant-apps.js`** mock seed script (that script is unchanged).
- **Template asset uploads** — Logo and splash images can be uploaded to **DigitalOcean Spaces** (S3-compatible); public URLs and object keys are stored under `config.asset`.

## API Endpoints

### Standard App Endpoints

#### Create App
```
POST /api/v1/apps
```
Creates a new application and automatically creates merchant wallets for it (TREASURY, OPERATION, KYC). Requires JWT authentication - merchant ID is extracted from the authenticated user context.

**Request Headers:**
- `Authorization`: Bearer token obtained through authentication

**Request Body:**
- `name` (string, required): Application name (3-100 characters)
- `websiteUrl` (string, required): Application website URL
- `alias` (string, required): Application alias (2-50 characters)
- `description` (string, required): Application description (10-1000 characters)
- `merchantId` (string, optional): ID of the merchant who owns the application (extracted from authenticated user for merchants, required for admins)
- `subdomain` (string, optional): Desired hostname label for `https://{subdomain}.{APP_PLATFORM_BASE_DOMAIN}`; if omitted, a unique slug is generated from `name`.

**Response:**
Returns the created application with **`subdomain`** (unique) and **`defaultAppUrl`** (platform URL), plus merchant wallet creation information.

### Get All Apps
```
GET /api/v1/apps
```
Requires JWT authentication.  
For merchant users, returns only applications owned by the authenticated merchant.  
For admin users, returns all applications.

**Request Headers:**
- `Authorization`: Bearer token

### Get App by ID
```
GET /api/v1/apps/{id}
```
Requires JWT authentication. Retrieves a specific application by its ID.

- Merchant users can only retrieve apps they own.
- Admin users can retrieve any app.

**Request Headers:**
- `Authorization`: Bearer token

### Get Apps by Merchant ID
```
GET /api/v1/apps/merchant/{merchantId}
```
Requires JWT authentication.

- Merchant users can only request their own `merchantId` and will receive only their own apps.
- Admin users can request any merchant ID.

**Request Headers:**
- `Authorization`: Bearer token

### Update App
```
PUT /api/v1/apps/{id}
```
Updates application information.

### Delete App
```
DELETE /api/v1/apps/{id}
```
Deletes an application.

### Update App Status
```
PATCH /api/v1/apps/{id}/status
```
Updates the app status to **active** or **suspended**. Merchants can suspend an app or reactivate it. Requires JWT authentication; only the app owner (merchant) or an admin can update status.

**Request Headers:**
- `Authorization`: Bearer token

**Request Body:**
- `status` (string, required): Either `"active"` or `"suspended"`

**Response:** Returns the updated app with the new status.

### PWA color options (public)

```
GET /api/v1/pwa/color-options
```

No authentication. Returns a shared hex palette for **splash** primary/secondary, **Global Styling** (`config.appProfile` text/background pickers), and any other color fields that accept the same `{ id, label, hex }` list:

- **`data.options`**: array of `{ id, label, hex }` — importable from `src/constants/pwaSplashColorOptions.ts` as `APP_PWA_SPLASH_COLOR_OPTIONS` (also re-exported from `src/types/pwaTemplate.ts`).
- **`data.defaults`**: `{ primaryColor, secondaryColor }` — same defaults as the template API for **splash** when those colors are missing.

Saving a template still accepts any valid hex for `config.splash` and `config.appProfile` color groups; the palette is a convenience, not a hard allow-list.

### PWA font options (public)

```
GET /api/v1/pwa/font-options
```

No authentication. Returns curated choices for **Global Styling** → **`config.appProfile.fontFamily`**:

- **`data.options`**: array of `{ id, label, value }` — use **`value`** when saving the template; importable from `src/constants/pwaAppProfileFontOptions.ts` as `APP_PWA_APP_PROFILE_FONT_OPTIONS` (also re-exported from `src/types/pwaTemplate.ts`).
- **`data.defaultFontFamily`**: suggested default (e.g. `Inter`) when the user has not chosen a font.

Saving still accepts any string up to 120 characters for `fontFamily`; the list is a convenience for the dropdown, not a hard allow-list. Ensure the PWA loads web fonts (e.g. Google Fonts) for families that are not system fonts.

### PWA template endpoints

All routes below require JWT authentication (`Authorization: Bearer …`) and merchant (or admin) role. Merchants may only access templates for apps they own (`app.merchantId`).

Each **template** document includes: `name`, optional `category`, `description`, `iconKey`, a JSON **`config`** object (seven section keys; see below), `isApplied` (only one template per app should be applied for the PWA), and timestamps.

**`config` sections (top-level keys):** `asset`, `splash`, `onboarding`, `appProfile`, `policyTerms`, `support`, `dns`.  
**`config.asset` (strings, all optional):** `logoUrl`, `logoKey`, `splashImageUrl`, `splashImageKey`, `siteDescription` — logo/splash URLs and Spaces keys; `siteDescription` is the user-facing app description.  
**`config.splash`:** `primaryColor` and `secondaryColor` — CSS hex strings (`#rgb`, `#rrggbb`, or `#rrggbbaa`) for the splash screen. If omitted or invalid in stored data, the API coerces to defaults **`#6B46C1`** (primary) and **`#E5E7EB`** (secondary) so the PWA always receives both colors.  
**`config.onboarding`:** `{ "screens": [ ... ] }` — ordered onboarding steps (screen 1 = index `0`). Each element may include **`title`**, **`description`**, **`screenImageUrl`**, **`screenImageKey`** (all optional strings). Images are uploaded via multipart (below); title/description are set with `PUT` on the template. Only the key **`screens`** is allowed under `onboarding`.  
**`config.appProfile`:** global styling for the PWA. Optional **`fontFamily`** (string, e.g. `Inter`) plus theme colors as CSS hex per slot. Top-level keys: **`fontFamily`**, **`textColors`**, **`elementColors`**, **`backgroundColors`**, **`menuColors`**. Each color group is an object with **`primary`** / **`secondary`** strings; **`textColors`** and **`menuColors`** also allow **`auxiliary`**. Updates merge **per group** / field (e.g. patch only `textColors.primary` or only `fontFamily`).  
**`config.policyTerms`:** **`privacyPolicy`** and **`termsOfService`**. Each is an object with optional string fields **`title`** (card heading / version label), **`contentHtml`** (TipTap/HTML from the rich text editor), **`contentText`** (Text/HTML editor mode if used), optional **`contentJson`** (TipTap `getJSON()` for lossless reload), plus optional **`media`**: an array of `{ url?, key?, caption? }` for linked files or figures. When you patch a document, string fields merge field-by-field; **`media`** and **`contentJson`** are **replaced in full** when present in the patch (send `null` to clear). Updates merge **per document** (patch only `privacyPolicy` or only `termsOfService`, and merge fields inside).  
**`config.support`:** optional string fields only (unknown keys rejected): **`contactEmail`**, **`contactPhone`**, **`website`**, **`linkedinPage`**, **`instagramHandle`**, **`twitterHandle`**, **`privacyPolicyLink`**, **`termsAndConditionsLink`** — matches the App Creator Support form (contact, social handles, policy links). Updates merge **shallowly** (patch only the keys you send).  
**`config.dns`:** custom domain & platform URL (Shopify-style). Each **app** gets a unique **`subdomain`** at creation (`POST /api/v1/apps`), e.g. `my-store`, and the API returns **`defaultAppUrl`** as `https://{subdomain}.{APP_PLATFORM_BASE_DOMAIN}` (defaults: **`springtd.com`**, **`https`** — see `.env.example`). When you **create a PWA template**, if `config.dns.defaultAppUrl` is omitted, the service fills **`subdomain`**, **`defaultAppUrl`**, and **`useCustomDomain: false`** from the app. Optional fields (unknown keys rejected): **`useCustomDomain`**, **`customDomain`**, **`customDomainVerificationStatus`** (`pending` \| `verified` \| `failed`), **`dnsRecords`** (array of `{ type: A \| AAAA \| CNAME \| TXT, name, value }` for the DNS table UI), **`verificationTxtValue`**, **`vercelDomainId`**, **`vercelProjectId`**. Custom domain DNS is intended to be managed via **Vercel** (add domain in Vercel, copy records into `dnsRecords` / drive verification from your worker using the Vercel API). Updates merge **shallowly** at the top level; **`dnsRecords`** is replaced in full when present in the patch.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/apps/:appId/pwa-templates` | List templates for an app |
| `POST` | `/api/v1/apps/:appId/pwa-templates` | Create a template (`name`, `config` required; `config` must include only allowed top-level keys; omitted sections default to `{}`) |
| `GET` | `/api/v1/apps/:appId/pwa-templates/:templateId` | Get one template |
| `PUT` | `/api/v1/apps/:appId/pwa-templates/:templateId` | Update template (partial `config` merges per section; `asset`, `splash`, `onboarding` merge shallowly within the section; `appProfile` merges **deeply** per color group; `policyTerms` merges **deeply** per document (`privacyPolicy` / `termsOfService`) — for onboarding, sending `screens` replaces that array) |
| `DELETE` | `/api/v1/apps/:appId/pwa-templates/:templateId` | Delete template |
| `PATCH` | `/api/v1/apps/:appId/pwa-templates/:templateId/apply` | Set this template as applied (`isApplied: true`) and clear `isApplied` on others for the app |

**Asset image uploads (multipart → DigitalOcean Spaces):**

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/apps/:appId/pwa-templates/:templateId/assets/logo` | Upload logo image; field name **`file`**. JPEG, PNG, or WebP. Updates `config.asset.logoUrl` and `logoKey`. |
| `POST` | `/api/v1/apps/:appId/pwa-templates/:templateId/assets/splash` | Upload splash image; field name **`file`**. Updates `config.asset.splashImageUrl` and `splashImageKey`. |
| `POST` | `/api/v1/apps/:appId/pwa-templates/:templateId/onboarding/screens/:screenIndex/image` | Upload image for onboarding screen **`screenIndex`** (0-based); field name **`file`**. Pads `screens` with empty objects if needed; sets `screenImageUrl` / `screenImageKey` on that entry. |

Uploads require Spaces to be configured (see **Environment variables**). If Spaces is not configured, uploads return **503**. Maximum size defaults to **2 MB** (`PWA_ASSET_MAX_UPLOAD_MB`).

Deleting an app removes its PWA template documents as well.

### Transaction Endpoints

#### Get App Transactions
```
GET /api/v1/apps/{id}/transactions
```
Requires JWT authentication. Retrieves all transactions for a specific application with optional filtering and pagination.

- Merchant users can only view transactions for apps they own.
- Admin users can view transactions for any app.

**Query Parameters:**
- `page` (number, optional): Page number for pagination
- `limit` (number, optional): Number of transactions per page
- `type` (string, optional): Filter by transaction type ('credit' or 'debit')
- `status` (string, optional): Filter by transaction status ('pending', 'completed', 'failed', 'cancelled')
- `startDate` (string, optional): Filter transactions from this date (ISO format)
- `endDate` (string, optional): Filter transactions up to this date (ISO format)

##### Example Request

```bash
curl -X GET "http://localhost:3002/api/v1/apps/app-123/transactions" \
  -H "Content-Type: application/json"
```

##### Example Response

```json
{
  "success": true,
  "data": [
    {
      "id": "txn-1",
      "appId": "app-123",
      "amount": 100.50,
      "currency": "USD",
      "type": "credit",
      "status": "completed",
      "description": "Payment received from customer",
      "createdAt": "2023-01-15T10:30:00Z",
      "updatedAt": "2023-01-15T10:30:00Z"
    },
    {
      "id": "txn-2",
      "appId": "app-123",
      "amount": 25.99,
      "currency": "USD",
      "type": "debit",
      "status": "completed",
      "description": "Service fee",
      "createdAt": "2023-01-16T14:45:00Z",
      "updatedAt": "2023-01-16T14:45:00Z"
    }
  ]
}
```

##### Filtering Transactions

You can filter transactions using query parameters:

```bash
# Get only credit transactions
curl -X GET "http://localhost:3002/api/v1/apps/app-123/transactions?type=credit" \
  -H "Content-Type: application/json"

# Get completed transactions within a date range
curl -X GET "http://localhost:3002/api/v1/apps/app-123/transactions?status=completed&startDate=2023-01-01&endDate=2023-01-31" \
  -H "Content-Type: application/json"

# Pagination
curl -X GET "http://localhost:3002/api/v1/apps/app-123/transactions?page=1&limit=10" \
  -H "Content-Type: application/json"
```

#### Get App Transaction Statistics
```
GET /api/v1/apps/{id}/transaction-stats
```
Requires JWT authentication. Retrieves transaction statistics for a specific application.

- Merchant users can only view stats for apps they own.
- Admin users can view stats for any app.

**Response:**
- `totalTransactions`: Total number of transactions
- `totalCreditAmount`: Total amount of credit transactions
- `totalDebitAmount`: Total amount of debit transactions
- `pendingTransactions`: Number of pending transactions
- `completedTransactions`: Number of completed transactions
- `failedTransactions`: Number of failed transactions
- `netAmount`: Net amount (credit - debit)

##### Example Request

```bash
curl -X GET "http://localhost:3002/api/v1/apps/app-123/transaction-stats" \
  -H "Content-Type: application/json"
```

##### Example Response

```json
{
  "success": true,
  "data": {
    "totalTransactions": 15,
    "totalCreditAmount": 1250.75,
    "totalDebitAmount": 325.50,
    "pendingTransactions": 2,
    "completedTransactions": 12,
    "failedTransactions": 1,
    "netAmount": 925.25
  }
}
```

##### Error Handling

If the app ID is not found, you'll receive a 404 error:

```json
{
  "success": false,
  "error": "App not found"
}
```

If the app ID is missing, you'll receive a 400 error:

```json
{
  "success": false,
  "error": "App ID is required"
}
```

### Drive Endpoints

The Drive feature allows management of documents submitted by users of the created app.

#### Upload Document
```
POST /api/v1/apps/{id}/drive/documents
```
Requires JWT authentication. Uploads a document to the app's drive.

**Request Body:**
- `userId` (string, required): ID of the user who submitted the document
- `fileName` (string, required): Name of the file
- `fileType` (string, required): Type of the file (e.g., 'pdf', 'jpg', 'png')
- `fileSize` (number, required): Size of the file in bytes
- `url` (string, required): URL where the file is stored
- `status` (string, required): Status of the document ('pending', 'verified', 'rejected')
- `metadata` (object, optional): Additional metadata about the document

##### Example Request

```bash
curl -X POST "http://localhost:3002/api/v1/apps/app-123/drive/documents" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-456",
    "fileName": "id-document.pdf",
    "fileType": "pdf",
    "fileSize": 2048000,
    "url": "https://storage.example.com/id-document.pdf",
    "status": "pending",
    "metadata": {
      "documentType": "id",
      "country": "US"
    }
  }'
```

##### Example Response

```json
{
  "success": true,
  "message": "Document uploaded successfully",
  "data": {
    "id": "doc-789",
    "appId": "app-123",
    "userId": "user-456",
    "fileName": "id-document.pdf",
    "fileType": "pdf",
    "fileSize": 2048000,
    "url": "https://storage.example.com/id-document.pdf",
    "status": "pending",
    "metadata": {
      "documentType": "id",
      "country": "US"
    },
    "uploadedAt": "2023-01-15T10:30:00Z"
  }
}
```

#### Get App Documents
```
GET /api/v1/apps/{id}/drive/documents
```
Requires JWT authentication. Retrieves all documents for a specific application with optional filtering and pagination.

- Merchant users can only view documents for apps they own.
- Admin users can view documents for any app.

**Query Parameters:**
- `page` (number, optional): Page number for pagination
- `limit` (number, optional): Number of documents per page
- `userId` (string, optional): Filter by user ID
- `fileType` (string, optional): Filter by file type
- `status` (string, optional): Filter by document status ('pending', 'verified', 'rejected')
- `startDate` (string, optional): Filter documents uploaded from this date (ISO format)
- `endDate` (string, optional): Filter documents uploaded up to this date (ISO format)

##### Example Request

```bash
curl -X GET "http://localhost:3002/api/v1/apps/app-123/drive/documents" \
  -H "Content-Type: application/json"
```

##### Example Response

```json
{
  "success": true,
  "data": [
    {
      "id": "doc-789",
      "appId": "app-123",
      "userId": "user-456",
      "fileName": "id-document.pdf",
      "fileType": "pdf",
      "fileSize": 2048000,
      "url": "https://storage.example.com/id-document.pdf",
      "status": "pending",
      "metadata": {
        "documentType": "id",
        "country": "US"
      },
      "uploadedAt": "2023-01-15T10:30:00Z"
    }
  ]
}
```

#### Get Document by ID
```
GET /api/v1/apps/{id}/drive/documents/{documentId}
```
Requires JWT authentication. Retrieves a specific document by its ID.

- Merchant users can only view documents for apps they own.
- Admin users can view documents for any app.

##### Example Request

```bash
curl -X GET "http://localhost:3002/api/v1/apps/app-123/drive/documents/doc-789" \
  -H "Content-Type: application/json"
```

##### Example Response

```json
{
  "success": true,
  "data": {
    "id": "doc-789",
    "appId": "app-123",
    "userId": "user-456",
    "fileName": "id-document.pdf",
    "fileType": "pdf",
    "fileSize": 2048000,
    "url": "https://storage.example.com/id-document.pdf",
    "status": "pending",
    "metadata": {
      "documentType": "id",
      "country": "US"
    },
    "uploadedAt": "2023-01-15T10:30:00Z"
  }
}
```

#### Update Document
```
PUT /api/v1/apps/{id}/drive/documents/{documentId}
```
Requires JWT authentication. Updates a document's information.

**Request Body:**
- Any fields from the document object that need to be updated

##### Example Request

```bash
curl -X PUT "http://localhost:3002/api/v1/apps/app-123/drive/documents/doc-789" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "verified"
  }'
```

##### Example Response

```json
{
  "success": true,
  "message": "Document updated successfully",
  "data": {
    "id": "doc-789",
    "appId": "app-123",
    "userId": "user-456",
    "fileName": "id-document.pdf",
    "fileType": "pdf",
    "fileSize": 2048000,
    "url": "https://storage.example.com/id-document.pdf",
    "status": "verified",
    "metadata": {
      "documentType": "id",
      "country": "US"
    },
    "uploadedAt": "2023-01-15T10:30:00Z"
  }
}
```

#### Delete Document
```
DELETE /api/v1/apps/{id}/drive/documents/{documentId}
```
Requires JWT authentication. Deletes a document.

##### Example Request

```bash
curl -X DELETE "http://localhost:3002/api/v1/apps/app-123/drive/documents/doc-789" \
  -H "Content-Type: application/json"
```

##### Example Response

```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

#### Get Document Statistics
```
GET /api/v1/apps/{id}/drive/document-stats
```
Requires JWT authentication. Retrieves document statistics for a specific application.

- Merchant users can only view stats for apps they own.
- Admin users can view stats for any app.

**Response:**
- `totalDocuments`: Total number of documents
- `pendingDocuments`: Number of pending documents
- `verifiedDocuments`: Number of verified documents
- `rejectedDocuments`: Number of rejected documents
- `fileTypeCounts`: Count of documents by file type

##### Example Request

```bash
curl -X GET "http://localhost:3002/api/v1/apps/app-123/drive/document-stats" \
  -H "Content-Type: application/json"
```

##### Example Response

```json
{
  "success": true,
  "data": {
    "totalDocuments": 15,
    "pendingDocuments": 5,
    "verifiedDocuments": 8,
    "rejectedDocuments": 2,
    "fileTypeCounts": {
      "pdf": 10,
      "jpg": 3,
      "png": 2
    }
  }
}
```

### Product Key Management

#### Add Product Key to App
```
POST /api/v1/apps/{id}/product-key
```
Adds a product key to an application.

#### Get Product Keys for App
```
GET /api/v1/apps/{id}/product-keys
```
Retrieves all product keys associated with an application.

#### Get App Wallets
```
GET /api/v1/apps/{id}/wallets
```
Requires JWT authentication. Retrieves merchant wallets for the specified app (`TREASURY`, `OPERATION`, `KYC`).

- Merchant users can only view wallets for apps they own.
- Admin users can view wallets for any app.

### Special Endpoints (Require API Key Authentication)

All special endpoints require both `X-Special-Key` and `X-Public-Key` headers to be provided for authentication.

#### 1. Get all Apps
```
GET /api/v1/special/apps
```
Retrieves all applications in the system with additional metadata.

#### 2. Get App by ID
```
GET /api/v1/special/apps/{id}
```
Retrieves a specific application by its ID with additional metadata.

#### 3. Get all Products
```
GET /api/v1/special/products
```
Retrieves all products from the Product Microservice.

#### 4. Get Product by ID
```
GET /api/v1/special/products/{id}
```
Retrieves a specific product by its ID.

#### 5. Get Merchant Wallet Balance
```
GET /api/v1/special/wallets/merchant/{merchantId}/balance/{walletType}
```
Retrieves the balance of a merchant wallet (TREASURY, OPERATION, or KYC).

#### 6. Get Merchant Wallet History
```
GET /api/v1/special/wallets/merchant/{merchantId}/history/{walletType}
```
Retrieves the transaction history of a merchant wallet.

#### 7. Create User and Wallet
```
POST /api/v1/special/users
```
Creates a new user and automatically creates a wallet for them.

#### 8. Get All Users
```
GET /api/v1/special/users
```
Retrieves all users in the system.

#### 9. Get User Details by ID
```
GET /api/v1/special/users/{id}
```
Retrieves details of a specific user by their ID.

#### 10. Get User's Wallet
```
GET /api/v1/special/wallets/user/{userId}
```
Retrieves the wallet of a specific user.

#### 11. Get All Users' Wallets
```
GET /api/v1/special/wallets/users/{merchantId}
```
Retrieves all user wallets associated with a merchant.

#### 12. Get Product's Users Subscribers
```
GET /api/v1/special/products/{productId}/subscribers
```
Retrieves all users subscribed to a specific product.

#### 13. Withdraw from User's Wallet
```
POST /api/v1/special/wallets/user/{userId}/withdraw
```
Withdraws funds from a user's wallet.

#### 14. Submit Documents for a User
```
POST /api/v1/special/users/{userId}/documents
```
Submits documents for a specific user.

#### 15. Get Drive Documents by User
```
GET /api/v1/special/drive/users/{userId}
```
Retrieves all drive documents for a specific user.

#### 16. Get Drive Documents by Product
```
GET /api/v1/special/drive/products/{productId}
```
Retrieves all drive documents associated with a specific product.

#### 17. Get Transaction History for a User
```
GET /api/v1/special/transactions/user/{userId}
```
Retrieves the transaction history for a specific user.

#### 18. Get All Transaction History by Product
```
GET /api/v1/special/transactions/product/{productId}
```
Retrieves all transaction history associated with a specific product.

#### 19. Get Transaction History by App
```
GET /api/v1/special/transactions/app/{appId}
```
Retrieves the transaction history for a specific application.

#### 20. Subscribe a User to a Product
```
POST /api/v1/special/subscriptions/users/{userId}/products/{productId}
```
Subscribes a user to a specific product.

#### 21. Get User's Product Subscription
```
GET /api/v1/special/subscriptions/users/{userId}/products/{productId}
```
Retrieves a user's subscription details for a specific product.

#### 22. Apply to Product
```
POST /api/v1/special/applications/users/{userId}/products/{productId}
```
Submits an application for a user to a specific product.

#### 23. Get All Product Applications
```
GET /api/v1/special/applications/products/{productId}
```
Retrieves all applications for a specific product.

#### 24. Register Callback
```
POST /api/v1/special/callbacks/users/{userId}
```
Registers a callback for user application status or wallet events.

## Data Model

### App
- `id`: Unique identifier for the application (auto-generated)
- `name`: Application name (3-100 characters)
- `websiteUrl`: Application website URL
- `alias`: Application alias (2-50 characters)
- `description`: Application description (10-1000 characters)
- `merchantId`: ID of the merchant who owns the application
- `status`: App status (`active` or `suspended`); default `active`. Merchants can suspend an app.
- `createdAt`: Creation timestamp (auto-generated)
- `updatedAt`: Last update timestamp (auto-generated)
- `productKeys`: Array of product keys associated with this application (optional)

### Transaction
- `id`: Unique identifier for the transaction (auto-generated)
- `appId`: ID of the application the transaction belongs to
- `amount`: Transaction amount
- `currency`: Currency code (e.g., 'USD')
- `type`: Transaction type ('credit' or 'debit')
- `status`: Transaction status ('pending', 'completed', 'failed', 'cancelled')
- `description`: Transaction description
- `createdAt`: Creation timestamp (auto-generated)
- `updatedAt`: Last update timestamp (auto-generated)

### DriveDocument
- `id`: Unique identifier for the document (auto-generated)
- `appId`: ID of the application the document belongs to
- `userId`: ID of the user who submitted the document
- `fileName`: Name of the file
- `fileType`: Type of the file (e.g., 'pdf', 'jpg', 'png')
- `fileSize`: Size of the file in bytes
- `url`: URL where the file is stored
- `uploadedAt`: Upload timestamp (auto-generated)
- `status`: Document status ('pending', 'verified', 'rejected')
- `metadata`: Additional metadata about the document (optional)

### AppPwaTemplate (PWA builder)

Stored in MongoDB collection `AppPwaTemplate`. Many rows per `appId`.

- `id`: Template id
- `appId`: Owning application
- `name`, `category`, `description`, `iconKey`: Display metadata for the “Choose your template” UI
- `config`: JSON object with required section keys `asset`, `splash`, `onboarding`, `appProfile`, `policyTerms`, `support`, `dns` (`support`: eight optional strings; `dns`: structured fields as in **`config.dns`** above)
- `config.asset`: `logoUrl`, `logoKey`, `splashImageUrl`, `splashImageKey`, `siteDescription` (all optional strings)
- `config.splash`: `primaryColor`, `secondaryColor` (hex strings; defaults `#6B46C1` / `#E5E7EB` when missing)
- `config.onboarding`: `screens[]` with per-screen `title`, `description`, `screenImageUrl`, `screenImageKey` (optional strings)
- `config.appProfile`: optional `fontFamily`; `textColors`, `elementColors`, `backgroundColors`, `menuColors` — nested `primary` / `secondary` (and `auxiliary` for text + menu); color values are hex strings
- `config.policyTerms`: `privacyPolicy`, `termsOfService` — each with optional `title`, `contentHtml`, `contentText`, optional `contentJson` (TipTap document object), and optional `media[]` (`url`, `key`, `caption` per item)
- `isApplied`: Whether this template is the active one for the PWA (at most one `true` per app after `apply`)
- `createdAt`, `updatedAt`

## Integration with Product Microservice

The Create App Microservice integrates with the Product Microservice through the `appId` field and product keys. When creating a product, the Product Microservice requires an `appId` that corresponds to an application created through this service.

Example workflow:
1. Create an application using this service
2. Use the returned application ID when creating products in the Product Microservice
3. Products will be associated with the application through the `appId` field
4. Product keys can be added to applications to track which products are associated with them

## Integration with Wallet Microservice

The Create App Microservice automatically creates merchant wallets for each application through integration with the Wallet Microservice. When an application is created, it provisions app-scoped merchant wallets for:
- `TREASURY`
- `OPERATION`
- `KYC`

This integration ensures that each application has the necessary financial infrastructure from the moment of creation.

## Authentication

Standard app endpoints now require JWT authentication (including read endpoints listed above). The merchant ID is extracted from the authenticated user context rather than being passed in the request body.

Merchant visibility enforcement:
- Merchants can only view apps where `app.merchantId` matches their authenticated merchant identity.
- Merchants cannot request another merchant's app list via `GET /api/v1/apps/merchant/{merchantId}`.
- Admins retain cross-merchant visibility.

Special endpoints require two headers for authentication:
- `X-Special-Key`: The special API key
- `X-Public-Key`: The public key

Example:
```bash
curl -X GET "http://localhost:3002/api/v1/special/apps" \
  -H "X-Special-Key: your-special-api-key-here" \
  -H "X-Public-Key: your-public-key-here"
```

## Environment Variables

- `PORT`: Port number for the service (default: 3002)
- `NODE_ENV`: Environment (development, production, etc.)
- `MONGODB_URI`: MongoDB connection string (apps, transactions, drive documents, PWA templates)
- `SERVICE_AUTH_URL`: URL for the Service Authentication Microservice
- `PRODUCT_SERVICE_URL`: URL for the Product Microservice
- `WALLET_SERVICE_URL`: URL for the Wallet Microservice
- `SPECIAL_API_KEY`: Special API key for authenticating special endpoints
- `PUBLIC_KEY`: Public key for authenticating special endpoints
- `JWT_SECRET`: Secret key for JWT token verification

**DigitalOcean Spaces (PWA template logo/splash uploads — optional but required for uploads):**

- `DO_SPACES_REGION` — Region slug (e.g. `nyc3`, `fra1`)
- `DO_SPACES_ENDPOINT` — e.g. `https://nyc3.digitaloceanspaces.com`
- `DO_SPACES_BUCKET` — Space name
- `DO_SPACES_ACCESS_KEY_ID` / `DO_SPACES_SECRET_ACCESS_KEY` — Spaces API keys
- `DO_SPACES_CDN_URL` — Optional CDN base for public URLs
- `DO_SPACES_PWA_PREFIX` — Object key prefix for uploads (default `pwa-assets`)
- `PWA_ASSET_MAX_UPLOAD_MB` — Max image size in MB for logo/splash (default `2`)

See `.env.example` for a template.

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the project:
   ```bash
   npm run build
   ```

3. Start the service:
   ```bash
   npm start
   ```

For development:
```bash
npm run dev
```