# Create App Microservice

The Create App Microservice handles the creation and management of applications within the SpringTD platform. This service allows merchants to create applications that can then be associated with products from the Product Microservice.

Deployment URL: https://create-app-ms.fly.dev/

## Features

- Create new applications with detailed information (App Name, Website URL, App Alias, App Description); each app gets a unique **`subdomain`** and default platform URL (see **Create App** below)
- App status is **active** or **suspended**. Merchants can suspend or reactivate an app via `PATCH /api/v1/apps/{id}/status`.
- Retrieve applications by ID or merchant ID
- Retrieve all applications
- Automatically create merchant wallets (Billing, KYC, Repayment) for each application using the Wallet Microservice, with **`appId`** scoping, **`appName`** passed for Payonus labeling, and wallet **currency** from **`MERCHANT_WALLET_CURRENCY`** (default **NGN**, aligned with Payonus NUBAN defaults in wallet-ms)
- Update application information
- Delete applications
- Associate applications with products through product keys
- Manage product keys for applications
- View transactions for individual applications (optional filter by **`productId`** on stored transaction rows)
- Get transaction statistics for applications
- **Merchant product overview** — single read model for one activated product (`GET /api/v1/apps/{appId}/products/{productId}/overview`): returns **`product`**, KPI **`summary`**, and **`tabs`** (`generalInfo`, `activeLoans`, `inactiveLoans`, `pendingLoans`, `customers`, `transactions`, `pricingSettings`) so the dashboard can bind one payload per UI tab
- Manage documents submitted by users through the Drive feature
- Special endpoints requiring API key authentication for advanced operations
- **Authentication required for app creation** - Merchant ID is extracted from authenticated user context
- **Merchant app visibility fully enforced** - merchants can only view apps they own
- **Notifications** — After **create app**, **suspend / reactivate** (`PATCH .../status`), and **delete app** (when the request includes an authenticated user), this service calls **notifications-ms** `POST /api/v1/notifications/send-dual` so the merchant gets **email + in-app** (`app-created`, `app-deactivated`, `app-reactivated`). Configure **`NOTIFICATIONS_SERVICE_URL`** (see Environment Variables).
- **PWA templates** — Many templates per app, stored in MongoDB (`AppPwaTemplate`). Each has a JSON `config` with nested sections aligned to the App Creator wizard: `asset`, `splash`, `onboarding`, `appProfile` (global font + theme: text / element / background / menu colors), `policyTerms`, `support`, `dns`. Used later by the Progressive Web App (PWA); this is separate from core app fields and from the **`create-default-merchant-apps.js`** mock seed script (that script is unchanged).
- **Template asset uploads** — Logo and splash images can be uploaded to **DigitalOcean Spaces** (S3-compatible); public URLs and object keys are stored under `config.asset`.
- **App-level manifest uploads** — Manifest JSON files are stored independently on the app (not tied to a template). Files are uploaded to Spaces under an app-scoped `/manifests/` path; URLs and keys are saved on the app document.

## API Endpoints

### Standard App Endpoints

#### Create App
```
POST /api/v1/apps
```
Creates a new application and automatically creates merchant wallets for it (Billing, KYC, Repayment) via wallet-ms using the new app’s **`id`** as **`appId`**, the app **`name`** as **`appName`**, and **`MERCHANT_WALLET_CURRENCY`** as **`currency`**. If wallet-ms has Payonus enabled and the currency matches `PAYONUS_NUBAN_CURRENCIES`, each wallet may include a **`virtualNuban`** with an account number. Requires JWT authentication; merchant ID is extracted from the authenticated user context.

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

A **send-dual** notification (`app-created`) is sent to the authenticated user’s email and in-app inbox when notifications-ms is reachable; failures are logged only and do not fail the request.

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

### Resolve app by subdomain (public)

```
GET /api/v1/apps/resolve/{subdomain}
```

No authentication. Used by the **storefront** (or edge worker) to map the hostname label to an app and, when a PWA has been published, to obtain install artifact URLs and the runtime manifest JSON.

**Response `data`:** `id`, `merchantId`, `subdomain`, `status`, `defaultAppUrl` (platform URL from `APP_URL_SCHEME` + `APP_SUBDOMAIN_PREFIX` + `APP_PLATFORM_BASE_DOMAIN` when `subdomain` is set).

**Optional `data.pwaManifest`** (included when there is a **published** PWA): the same JSON object served by `GET /api/v1/apps/{id}/pwa/manifest.webmanifest` (`name`, `short_name`, `icons`, `theme_color`, `start_url`, `scope`, etc.). Omitted when nothing is published. Lets storefronts bootstrap branding in one request without fetching the manifest URL.

**Optional `data.pwaInstall`** (included only when there is a **published** PWA and the request has a usable `Host` header so absolute URLs can be built):

| Field | Description |
|--------|-------------|
| `manifestUrl` | Latest runtime manifest (`GET` returns `Content-Type: application/manifest+json`). |
| `serviceWorkerUrl` | Latest runtime service worker script. |
| `pwaEntryUrl` | Public app site URL from publish (same resolution rules as `start_url` / custom domain). |
| `version` | Publish version string (ISO timestamp from publish). |

If nothing is published, `pwaManifest` and `pwaInstall` are omitted.

#### Storefront install UX (frontend implementation)

This microservice does **not** render HTML. On the **merchant app origin** (typically `pwaEntryUrl` / `defaultAppUrl` when no custom domain applies), implement:

1. **Discover artifacts** — On load, derive the subdomain from the host (or use your routing param), then `GET` this resolve endpoint against **create-app-ms** and read `data.pwaInstall` when present.

2. **Web manifest** — Add `<link rel="manifest" href="…">` pointing at `pwaInstall.manifestUrl` (or a **same-origin path** that reverse-proxies to that URL — see below).

3. **Service worker** — Browsers require the service worker script to be **same-origin** with the page that calls `navigator.serviceWorker.register`. The API serves `sw.js` on the **API host**, so for a reliable install flow you should either **proxy** `/pwa/sw.js` (and optionally the manifest) on the **storefront origin** to the URLs returned in `pwaInstall`, or serve an equivalent registration path on the app host. Register the worker after the page loads (or follow your component library’s docs). Published `sw.js` includes **`push`** and **`notificationclick`** handlers for Web Push (VAPID) browser alerts; **republish** after upgrading create-app-ms so tenants receive the updated worker.

4. **`@khmyznikov/pwa-install`** — Load the module and place `<pwa-install></pwa-install>` on the page. Configure the component per [its documentation](https://www.npmjs.com/package/@khmyznikov/pwa-install) (e.g. manifest URL / name / icons) so it can show an install prompt on supporting browsers. It handles much of the `beforeinstallprompt` / platform-specific UI.

5. **iOS (Safari)** — iOS does not fire `beforeinstallprompt`. If the user agent indicates iPhone/iPad Safari, show your own overlay (e.g. full-screen or modal) with copy such as: **“To install this app, tap the Share icon and choose Add to Home Screen.”** You can still show `<pwa-install>` on other platforms and hide or supplement it on iOS.

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

If the request includes a JWT with **`userId`** and **`email`** (same shape as other authenticated app routes), a **send-dual** notification is sent with template **`app-deactivated`** and action **`deleted`**. The route itself may be called without auth in some deployments; in that case no notification is sent.

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

**Notifications:** For **`suspended`**, sends **`app-deactivated`** (action `suspended`). For **`active`**, sends **`app-reactivated`**. Requires the authenticated user’s **`userId`** and **`email`** on the JWT.

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
**`config.support`:** optional string fields only (unknown keys rejected): **`contactEmail`**, **`contactPhone`**, **`website`**, **`linkedinPage`**, **`instagramHandle`**, **`twitterHandle`**, **`whatsapp`**, **`privacyPolicyLink`**, **`termsAndConditionsLink`** — matches the App Creator Support form (contact, social handles, policy links). Updates merge **shallowly** (patch only the keys you send).  
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

### App-level manifest endpoints

Manifest files are app-scoped and independent from PWA templates.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/apps/:id/manifests` | List app manifest references (`manifestUrls[]`, `manifestKeys[]`). |
| `POST` | `/api/v1/apps/:id/manifests` | Upload one or many manifest JSON files; field name **`files`**. Replaces existing app manifest list. |
| `PUT` | `/api/v1/apps/:id/manifests/:manifestIndex` | Replace one manifest at index (**0-based**); field name **`file`**. |
| `DELETE` | `/api/v1/apps/:id/manifests/:manifestIndex` | Delete one manifest at index (**0-based**). |

Manifest uploads accept `application/json`, `application/manifest+json`, `text/json`, or `.json` extension. Files are stored in Spaces under `/{appId}/manifests/`.

### PWA publish/runtime endpoints

Runtime publish artifacts are generated from the resolved template config and stored as versioned publish records (separate from editable template drafts).

**Auto-publish:** After a successful `PATCH` on a PWA template, `POST …/apply`, or asset/onboarding image upload, the service attempts to publish that template (same as `POST …/pwa/publish` with `templateId`). The response includes a `publish` object (`published`, `version`, `validationErrors`, etc.). Saves always succeed; publish validation failures are reported in `publish` without failing the request. Set `CREATE_APP_SERVICE_PUBLIC_URL` when requests lack a `Host` header (e.g. some internal callers).

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/apps/:appId/pwa/publish` | Publish runtime PWA artifacts. If `templateId` is provided in body, it is applied then published; otherwise the currently applied template is used. |
| `GET` | `/api/v1/apps/:appId/pwa/status` | Get publish/readiness status with warnings/errors and readiness flags. |
| `GET` | `/api/v1/apps/:appId/pwa/manifest.webmanifest` | Get latest published runtime web manifest JSON. |
| `GET` | `/api/v1/apps/:appId/pwa/sw.js` | Get latest published service worker JS. |

The **`GET /api/v1/apps/resolve/:subdomain`** response may include **`pwaManifest`** (inline manifest JSON, same as `GET …/pwa/manifest.webmanifest`) and **`pwaInstall`** with the same `manifestUrl` and `serviceWorkerUrl` pattern for the resolved app id (see **Resolve app by subdomain** above).

**Publish request body (`POST /pwa/publish`):**

```json
{
  "templateId": "optional-template-id",
  "publishMode": "apply-and-publish"
}
```

Validation failures return `422` with a consistent envelope:

```json
{
  "success": false,
  "error": "PWA publish validation failed",
  "details": [
    "logoUrl is required",
    "primaryColor must be a valid hex color"
  ]
}
```

Additional runtime behavior:

- `GET /api/v1/apps/:appId/pwa/status` is safe before first publish and returns readiness flags with warnings (including `No published PWA version yet`).
- `GET /api/v1/apps/:appId/pwa/manifest.webmanifest` and `GET /api/v1/apps/:appId/pwa/sw.js` return `404` with a clear JSON error when no published artifact exists yet.
- Service worker responses include `Content-Type: application/javascript`, `ETag`, and cache headers (`no-cache, must-revalidate`) for predictable version checks.
- Concurrent publishes for the same app are **last-write-wins**; publish history is retained in `AppPwaPublish` for audit/rollback workflows.

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
- `productId` (string, optional): Filter to transactions tagged with this merchant product id (same value used when persisting rows — typically the local product-ms document id)

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
      "productId": "674a1b2c3d4e5f6789012345",
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

# Product-scoped transactions (requires `productId` set when the transaction was created)
curl -X GET "http://localhost:3002/api/v1/apps/app-123/transactions?productId=674a1b2c3d4e5f6789012345" \
  -H "Authorization: Bearer YOUR_JWT"
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

#### Customer applications on an app (merchant dashboard)

These routes power **Customers → View Applications**. The frontend navigates with the selected app id and the customer user id, then loads the summary cards and application list.

Both routes require JWT authentication and enforce that merchant callers own the app. Through the **account-ms gateway**, the paths stay unchanged under `/api/v1/apps/...` and proxy to **create-app-ms**.

**Route parameters**

| Param | Description |
|-------|-------------|
| `appId` | Create-app application id currently selected in the dashboard. |
| `userId` | Customer / retail user id from `GET /api/v1/user/list`. |

**Headers**

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization: Bearer <merchant-jwt>` | Yes | Merchant access token. |
| `x-admin-id` | No | Optional admin passthrough when an admin is calling the route. |

##### Load summary cards

Use this for the Total / Pending / Approved / Rejected cards on the Applications page.

```http
GET /api/v1/apps/{appId}/customers/{userId}/applications/summary
Authorization: Bearer <merchant-jwt>
```

**Optional query parameters**

| Query | Example | Description |
|-------|---------|-------------|
| `productType` | `LOAN` | Applies category tabs to the summary. Common values: `LOAN`, `MORTGAGE`, `SAVINGS`, `INVESTMENT`, `COMMODITY`. |

**Example request**

```http
GET /api/v1/apps/674a1b2c3d4e5f6789012345/customers/user-uuid/applications/summary?productType=LOAN
Authorization: Bearer <merchant-jwt>
```

**Success response**

```json
{
  "success": true,
  "data": {
    "appId": "674a1b2c3d4e5f6789012345",
    "userId": "user-uuid",
    "summary": {
      "total": 4,
      "pending": 1,
      "approved": 2,
      "rejected": 1,
      "blacklisted": 0
    }
  }
}
```

##### Load application list

Use this for the table/list below the summary cards.

```http
GET /api/v1/apps/{appId}/customers/{userId}/applications
Authorization: Bearer <merchant-jwt>
```

**Optional query parameters**

| Query | Example | Description |
|-------|---------|-------------|
| `productType` | `LOAN` | Filters category tabs. Common values: `LOAN`, `MORTGAGE`, `SAVINGS`, `INVESTMENT`, `COMMODITY`. |
| `status` | `PENDING` | Optional status filter: `PENDING`, `APPROVED`, `REJECTED`, `BLACKLISTED`. |

**Example request**

```http
GET /api/v1/apps/674a1b2c3d4e5f6789012345/customers/user-uuid/applications?productType=LOAN
Authorization: Bearer <merchant-jwt>
```

**Success response**

```json
{
  "success": true,
  "data": {
    "appId": "674a1b2c3d4e5f6789012345",
    "userId": "user-uuid",
    "applications": [
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
}
```

**Frontend flow**

1. From the Customers row, navigate with `{ appId, userId }`.
2. Fetch summary: `GET /api/v1/apps/{appId}/customers/{userId}/applications/summary`.
3. Fetch list: `GET /api/v1/apps/{appId}/customers/{userId}/applications`.
4. For category tabs, add `?productType=LOAN`, `?productType=MORTGAGE`, etc. to both calls.
5. For status tabs or filters, add `?status=PENDING` to the list call. Keep the summary unfiltered by status.

**Common errors**

| Status | Meaning |
|--------|---------|
| `400` | Missing or invalid `appId` / `userId`. |
| `401` | Missing Bearer token. |
| `403` | Merchant does not own the app or cannot list applications. |
| `404` | App not found. |
| `502` | Applications service unavailable. |

**Direct product-ms / gateway alternatives** (prefer the app-scoped routes above for dashboard screens because they enforce app ownership):

- `GET /api/v1/applications?userId={userId}&appId={appId}` — merchant JWT required.
- `GET /api/v1/applications/summary?userId={userId}&appId={appId}` — merchant JWT required.
- `GET /api/v1/applications/user/{userId}?appId={appId}` — optional `appId` filter.

#### Get product overview (merchant dashboard)

```
GET /api/v1/apps/{appId}/products/{productId}/overview
```

Requires JWT authentication (`MERCHANT` or `ADMIN`). Returns a consolidated payload for **one activated product** so the merchant dashboard can render a product detail / overview page without stitching multiple clients.

- **Merchant users** can only call this for apps they own (same enforcement as other app-scoped routes).
- Through the **account-ms gateway**, the path is unchanged: `GET /api/v1/apps/{appId}/products/{productId}/overview` on the gateway proxies to this service.

**Request headers**

- `Authorization`: `Bearer <access token>` — forwarded to **product-ms** (product config) and **account-ms** (applications listing).
- `x-admin-id` (optional): forwarded to account-ms when listing applications as an **admin** (same behavior as `GET /api/v1/applications` without a merchant-scoped JWT).

**Query parameters**

- `transactionPage` or `txPage` (optional): Page index for the embedded transactions list (default `1`).
- `transactionLimit` or `txLimit` (optional): Page size for transactions (default `25`, max `100`).

**Behavior**

1. Loads **`GET {PRODUCT_SERVICE_URL}/api/v1/products/config/{appId}/{productId}`** and rejects if the product is missing, not owned by this app, or **`isActive` is not `true`**.
2. Loads **`GET {ACCOUNT_SERVICE_URL}/api/v1/applications`** with the same auth headers and filters applications to this app and product (matching path id, **`referenceNumber`**, **`upstreamProductId`**, or local **`id`** on the product document).
3. Loads **`GET {ACCOUNT_SERVICE_URL}/api/v1/user/list`** (same Bearer) to resolve **borrower display names** for **`tabs.generalInfo[].loanInformation.name`**. If the call fails or returns no users, names fall back to **`"—"`** and **`warnings`** may include **`customer_names_unavailable`** or **`some_customer_names_unresolved`**.
4. Loads **drive documents** for this **`appId`** (up to 500, newest first) and attaches the **latest file per `userId`** to **`tabs.customers[].submittedFile`** (`documentId`, **`url`** for the View action, **`fileName`**). Failures add **`drive_documents_unavailable`** to **`warnings`**.
5. Reads **transactions** from MongoDB for this **`appId`** where **`productId`** equals the resolved local product id (fallback: **`upstreamProductId`**, then path segment). Rows created without **`productId`** do not contribute to product-level transaction aggregates or the embedded list.

**Response `data`**

| Field | Description |
|--------|-------------|
| `product` | Full product document from product-ms (same as config GET). |
| `summary` | KPI strip: application amounts/counts by status, completed transaction volume/count (when **`productId`** is stored on transactions), pending tx counts, **`uniqueCustomerCount`**. |
| `tabs` | Nested object — **one array or object per dashboard tab** (see below). |
| `warnings` | e.g. **`applications_unavailable`**, **`customer_names_unavailable`**, **`some_customer_names_unresolved`**, **`drive_documents_unavailable`**, **`transactions_*`** — partial data may still be returned. |

**`data.tabs` (per-tab payloads)**

| Key | Type | Description |
|-----|------|-------------|
| `generalInfo` | array | **General Info** tab: one object per application (loan/mortgage first; if none, all scoped applications). Each element matches the dashboard sections: **`loanInformation`** `{ name, type }` (name from merchant **`/api/v1/user/list`** when the applicant is a sub-user; otherwise **`"—"`**; type e.g. **`Mortgage Loan`**), **`loanTenure`** `{ tenure, repayment, currency }` (`tenure` from product template months/labels; **`repayment`** = principal + simple interest when **`structure.interestRate`** and tenure months are derivable, else **`null`**), **`loanRequirement`** `{ name }` (first document / other requirement label from **`product.requirements`**, else **`null`**), plus **`applicationId`**, **`userId`**, **`status`**, timestamps. |
| `activeLoans` | array | **Active Loan** tab: loan/mortgage-like applications with **`APPROVED`** status. Each row: **`amount`**, **`currency`**, **`ref`** (product **`referenceNumber`**), **`timestamp`** (`HH:MM / Mon D, YYYY` from application **`createdAt`**), **`fee`** / **`feeCurrency`** (sum of numeric entries in **`product.feesAndCharges.fees`** when parseable, else **`fee`: null**), **`product`** (name), **`metaRef`** (`user_ref` or **`userId`**), **`userEmail`**, **`userPhone`**, **`applicationId`**, **`userId`**, **`status`**, **`rejectionReason`**, ISO **`createdAt`** / **`updatedAt`**. |
| `inactiveLoans` | array | **Inactive Loan** tab: same row shape as **`activeLoans`**, filtered to **`REJECTED`**. |
| `pendingLoans` | array | Same row shape, filtered to **`PENDING`**. |
| `customers` | array | **Customers** tab: one row per distinct applicant — **`userName`**, **`email`**, **`userId`**, **`userDisplayId`** (`user_ref` from client-auth when set, else same as **`userId`**), **`applicationIds`**, **`applicationCount`**, **`submittedFile`** (`{ documentId, url, fileName }` or **`null`** if no drive upload for that user on this app). |
| `transactions` | object | **Transactions** tab: `{ items: [...], pagination: { page, limit } }` — product-scoped ledger rows (see behavior above). |
| `pricingSettings` | object | **Pricing Settings** tab: merchant pricing slice copied from the product document — `feesAndCharges`, `baseFeesAndCharges`, `merchantFeeAdditions`, and optional keys such as `pricingType`, caps, `markupRate`, `customTerms`, `enabledFeatures` (also merged from nested **`config`** when present). |

TypeScript types for consumers live in **`src/types/productOverview.ts`**.

> **Breaking change:** earlier versions of this endpoint also returned `loans`, `customers`, `transactions`, and `transactionsPagination` at the top level of `data`. Those are now **only** under **`data.tabs`**. Update clients to read `data.tabs.*`.
>
> **`tabs.generalInfo`** entries are **nested cards** (`loanInformation`, `loanTenure`, `loanRequirement`) — not the older flat `customerName` / `loanTypeLabel` fields.
>
> **`tabs.activeLoans`**, **`inactiveLoans`**, and **`pendingLoans`** use the enriched **`ProductOverviewLoanTableRow`** (table columns above), not the legacy slim application object.

**Example**

```bash
curl -X GET "http://localhost:3002/api/v1/apps/app-123/products/674a1b2c3d4e5f6789012345/overview?transactionPage=1&transactionLimit=25" \
  -H "Authorization: Bearer YOUR_JWT"
```

**Example `data` shape (truncated)**

```json
{
  "product": { "id": "...", "name": "...", "isActive": true },
  "summary": {
    "requestedAmount": 0,
    "approvedAmount": 0,
    "applicationCount": 0,
    "uniqueCustomerCount": 0,
    "totalTransactionsAmount": 0,
    "completedTransactionsCount": 0,
    "pendingTransactionsCount": 0
  },
  "tabs": {
    "generalInfo": [
      {
        "applicationId": "...",
        "userId": "...",
        "loanInformation": { "name": "—", "type": "Mortgage Loan" },
        "loanTenure": { "tenure": "6 Months", "repayment": null, "currency": "NGN" },
        "loanRequirement": { "name": null },
        "status": "APPROVED",
        "createdAt": "...",
        "updatedAt": "..."
      }
    ],
    "activeLoans": [],
    "inactiveLoans": [],
    "pendingLoans": [],
    "customers": [],
    "transactions": { "items": [], "pagination": { "page": 1, "limit": 25 } },
    "pricingSettings": {}
  },
  "warnings": []
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
Requires JWT authentication. Retrieves merchant wallets for the specified app (`BILLING`, `KYC`, `REPAYMENT`). Wallet objects are returned as wallet-ms defines them; when Payonus provisioning has run, each may include **`virtualNuban`** (`accountNumber`, `bankName`, `provisionStatus`, etc.).

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
Retrieves the balance of a merchant wallet (BILLING, KYC, or REPAYMENT).

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
- `manifestUrls`: App-level manifest public URLs (optional string array)
- `manifestKeys`: App-level Spaces object keys for manifests (optional string array)

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

### AppPwaPublish (PWA runtime artifacts)

Stored separately from template drafts to track publish/runtime state.

- `id`: Publish record id
- `appId`: Owning application
- `templateId`: Template used for this publish
- `version`: Publish version (ISO timestamp)
- `manifest`: Generated runtime web manifest payload
- `serviceWorkerMeta`: Runtime SW metadata (`version`, `hash`, `path`, `contentType`)
- `artifactUrls`: `manifestUrl`, `serviceWorkerUrl`, `pwaEntryUrl`
- `status`: `pending` | `published` | `failed`
- `warnings`, `errors`: Publish/readiness diagnostics
- `publishedAt`, `updatedAt`

## Integration with Product Microservice

The Create App Microservice integrates with the Product Microservice through the `appId` field and product keys. When creating a product, the Product Microservice requires an `appId` that corresponds to an application created through this service.

Example workflow:
1. Create an application using this service
2. Use the returned application ID when creating products in the Product Microservice
3. Products will be associated with the application through the `appId` field
4. Product keys can be added to applications to track which products are associated with them

## Integration with Wallet Microservice

The Create App Microservice automatically creates merchant wallets for each application through integration with the Wallet Microservice. When an application is created, it calls **`POST /api/v1/wallets/merchant/all`** on wallet-ms (with the caller’s **`Authorization`** header) and provisions **app-scoped** merchant wallets for:
- `BILLING`
- `KYC`
- `REPAYMENT`

The request body includes **`appId`** (the new application’s id), **`appName`** (the application name, for Payonus customer labeling), and **`currency`** from **`MERCHANT_WALLET_CURRENCY`** (default **NGN**). Use **`USD`** or another ISO code only if you intentionally do not use Payonus NUBAN for those wallets or you extend `PAYONUS_NUBAN_CURRENCIES` in wallet-ms to match.

Virtual NUBAN provisioning, webhooks, and environment variables are documented in the **Wallet Microservice** README (`springApp/wallet-ms/README.md`, section **Payonus virtual NUBAN**). **Retail user** wallets (merchant-scoped customers) are created by **client-auth-ms** after `POST /api/v1/registration/user` when `WALLET_SERVICE_URL` and `WALLET_INTERNAL_TOKEN` are set; see **client-auth-ms** README (wallet provisioning + env vars).

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
- `ACCOUNT_SERVICE_URL`: Base URL for **account-ms** (used by the product overview route to call **`GET /api/v1/applications`** with the caller’s JWT). Default in code: `http://localhost:4008`. In deployment, set this to wherever applications are served (often the same gateway host as account-ms).
- `PRODUCT_SERVICE_URL`: URL for **product-ms** (product config on overview). Default in code: `http://localhost:4005` for local springApp stacks; override if your product service runs elsewhere.
- `WALLET_SERVICE_URL`: URL for the Wallet Microservice (`POST .../merchant/all` on app create; see **Integration with Wallet Microservice**)
- `MERCHANT_WALLET_CURRENCY`: ISO currency code for new app-scoped Billing / KYC / Repayment wallets (default **`NGN`**). Should match Payonus expectations when NUBAN provisioning is enabled in wallet-ms.
- `SPECIAL_API_KEY`: Special API key for authenticating special endpoints
- `PUBLIC_KEY`: Public key for authenticating special endpoints
- `JWT_SECRET`: Secret key for JWT token verification
- `NOTIFICATIONS_SERVICE_URL`: Base URL for **notifications-ms** (no trailing slash), e.g. `http://localhost:4009` locally or `https://springtd-notifications-ms.fly.dev` in production. Used for **send-dual** emails/in-app messages on app lifecycle events. If unset in production, the code defaults to `https://springtd-notifications-ms.fly.dev`.

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