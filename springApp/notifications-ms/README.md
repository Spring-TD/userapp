# Notifications Microservice

## Overview

This microservice provides centralized notification functionality for the SpringTD platform, handling email, SMS, **in-app inbox** records, **Web Push (VAPID)**, and combined **email + in-app + push** delivery across all services.

## Features

- **Email Notifications**: Send emails via Mailtrap (development) or production SMTP
- **SMS Notifications**: Send SMS via Twilio
- **In-app notifications**: Persist rendered title/body per user id (`channel: in_app`); clients list via `GET /api/v1/notifications/user/:recipient?channel=in_app`
- **Web Push (VAPID)**: Browser push alerts for PWAs via the [`web-push`](https://www.npmjs.com/package/web-push) library and standard Push API subscriptions
- **Dual delivery**: Single request sends the same template to **in-app (+ Web Push when subscribed)** and optionally **email** (`POST /api/v1/notifications/send-dual`)
- **Template Support**: Reusable email, SMS, and in-app templates with `{{variable}}` substitution
- **Delivery Tracking**: Track notification status and delivery
- **MongoDB Persistence**: Store all notification records for auditing
- **Graceful Degradation**: Service continues to work even if email/SMS providers are not configured

## Tech Stack

- Node.js with Express
- TypeScript
- MongoDB (via Mongoose)
- Nodemailer (email)
- Twilio (SMS)
- web-push (VAPID / Web Push)
- Jest for testing

## Deployment

The service is deployed on Fly.io and is accessible at: https://notifications-ms.fly.dev

Health check endpoint: https://notifications-ms.fly.dev/health

### Fly.io: Email must be configured

For emails to be sent (e.g. verification OTP, password reset OTP, password change OTP), set Mailtrap (or SMTP) secrets on the **notifications-ms** Fly app. Without these, the service will accept send requests but no email is delivered.

1. **Check current status:** Open https://notifications-ms.fly.dev/health — if `services.email` is `"not configured"`, set the secrets below.

2. **Set secrets** (from the `notifications-ms` directory):
   ```bash
   fly secrets set MAILTRAP_USER=your_mailtrap_user MAILTRAP_PASSWORD=your_mailtrap_password -a notifications-ms
   ```
   Optional: `MAILTRAP_FROM_EMAIL=noreply@yourdomain.com`

3. **Get Mailtrap credentials:** Sign up at [mailtrap.io](https://mailtrap.io), open your inbox, then **SMTP Settings** to get username and password. (Mailtrap is a testing inbox; for real delivery to user inboxes, use Mailtrap Email API, SendGrid, or another SMTP provider and set the same env vars if compatible, or adjust the service config.)

4. **Redeploy** so the new secrets are picked up (or let Fly restart the app):
   ```bash
   fly deploy -a notifications-ms
   ```

### Fly.io: JWT_SECRET is REQUIRED (in-app inbox auth)

The authenticated inbox endpoints (`/api/v1/notifications/inbox*` and legacy `/api/v1/notifications/user/:recipient`) verify the storefront access token using **`JWT_SECRET`**. This **must be set to the exact same value** as `client-auth-ms` (and the other services that share the secret, e.g. `account-ms`, `product-ms`).

If `JWT_SECRET` is unset, the service silently falls back to the dev default (`fallback-secret-key-for-development-purposes-only`) and **rejects every real storefront token with `401 Invalid or expired access token`**. In-app notifications are still *saved* (and emails still send), but users can never *read* their inbox — so they appear to receive no in-app notifications.

```bash
fly secrets set JWT_SECRET="<same-value-as-client-auth-ms>" -a springtd-notifications-ms
```

Verify the digest matches the other apps (same value → same digest):

```bash
fly secrets list -a springtd-notifications-ms     # JWT_SECRET digest
fly secrets list -a client-auth-ms                # must match
```

> Note: the Fly app for this service is `springtd-notifications-ms` (see `fly.toml`); the public hostname is `springtd-notifications-ms.fly.dev`.

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB
- Mailtrap account (for email testing)
- Twilio account (for SMS, optional)

### Installation

1. Clone the repository
2. Navigate to the notifications-ms directory
3. Install dependencies:
   ```
   npm install
   ```

### Configuration

Create a `.env` file with the following variables:

```env
# Server (docker-compose uses PORT=3009; local default in code is 4009 if unset)
PORT=4009
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/notifications_db

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:4008

# Optional: override templates directory (default: ./templates next to build)
# TEMPLATES_DIR=/absolute/path/to/templates

# Mailtrap SMTP (Email)
MAILTRAP_HOST=smtp.mailtrap.io
MAILTRAP_PORT=2525
MAILTRAP_USER=your_mailtrap_username
MAILTRAP_PASSWORD=your_mailtrap_password
MAILTRAP_FROM_EMAIL=noreply@springtd.com

# Twilio (SMS - Optional)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Logging
LOG_LEVEL=info
```

### Running the Service

#### Development Mode

```
npm run dev
```

#### Production Mode

```
npm run build
npm start
```

## API Endpoints

### Send Notification

Send a notification via email, SMS, or in-app (persisted inbox record).

**Endpoint:** `POST /api/v1/notifications/send`

**Request Body:**

```json
{
  "channel": "email",
  "recipient": "user@example.com",
  "template": "email-verification",
  "data": {
    "userName": "John Doe",
    "verificationUrl": "https://example.com/verify?token=abc123"
  },
  "priority": "normal"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Notification sent successfully",
  "data": {
    "id": "notification_id"
  }
}
```

**Channels**

- `email` — `recipient` must be a valid email address.
- `sms` — `recipient` must be a valid E.164-style phone number.
- `in_app` — `recipient` is the **end-user id** (same id the client uses to load the inbox). Renders `{template}.in-app.json` and stores `inAppTitle` / `inAppBody` on the record’s `data`.

### Send email + in-app + Web Push (dual)

Delivers the **same** `template` and `data` as an **in-app inbox record** and, when the user has registered a browser **PushSubscription**, a **Web Push** alert (VAPID). **Email is optional** — omit `email` to send in-app (+ push) only.

**Endpoint:** `POST /api/v1/notifications/send-dual`

**Request Body:**

```json
{
  "userId": "USER_DOCUMENT_ID",
  "email": "user@example.com",
  "template": "product-application-submitted",
  "data": {
    "applicantName": "Jane Smith",
    "productName": "Personal Loan"
  },
  "priority": "normal"
}
```

**In-app only (no email):**

```json
{
  "userId": "USER_DOCUMENT_ID",
  "template": "product-application-submitted",
  "data": { "productName": "Personal Loan" }
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "inApp": { "success": true, "id": "..." },
    "email": { "success": true, "id": "..." }
  },
  "error": null
}
```

When email is omitted, `data.email.skipped` is `true`. Either delivery can fail independently; check `data.inApp` and `data.email`. Web Push is best-effort after the in-app record is saved (only users who subscribed receive alerts).

### Storefront inbox (authenticated)

Requires **`Authorization: Bearer <accessToken>`** verified with **`JWT_SECRET`**, which **must be set to the same value as client-auth-ms** (see [Fly.io: JWT_SECRET is REQUIRED](#flyio-jwt_secret-is-required-in-app-inbox-auth)). If it is unset/mismatched, every request here returns `401 Invalid or expired access token`. Users may only access their own inbox.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/notifications/inbox` | List in-app items (`limit`, `offset`, `unreadOnly`) |
| `GET` | `/api/v1/notifications/inbox/unread-count` | Unread badge count |
| `PATCH` | `/api/v1/notifications/inbox/:id/read` | Mark one as read |
| `PATCH` | `/api/v1/notifications/inbox/read` | Mark read (`{ "ids": ["…"] }` or omit `ids` for all) |
| `DELETE` | `/api/v1/notifications/inbox/:id` | Delete one |
| `DELETE` | `/api/v1/notifications/inbox` | Bulk delete `{ "ids": ["…"] }` |

Each inbox item includes `readAt`, `isRead`, `data.inAppTitle`, `data.inAppBody`.

**Real-time:** WebSocket `GET /api/v1/notifications/inbox/ws?token=<accessJwt>` (proxied through account-ms). Events: `notification.new`, `notification.read`, `inbox.unread_count`, etc.

Legacy `GET /api/v1/notifications/user/:recipient?channel=in_app` still works but requires Bearer and `:recipient` must equal the token `userId`. Prefer **`GET /inbox`**.

### Web Push (VAPID) for storefront PWAs

Uses the standard **Web Push API** and the open-source **`web-push`** npm package (RFC 8030). No Firebase required.

#### Generate VAPID keys (once per environment)

```bash
cd notifications-ms
npx web-push generate-vapid-keys
```

Set on **notifications-ms**:

| Variable | Description |
|----------|-------------|
| `VAPID_PUBLIC_KEY` | Public key (safe to expose to the PWA) |
| `VAPID_PRIVATE_KEY` | Private key (secret) |
| `VAPID_SUBJECT` | `mailto:admin@yourdomain.com` or `https://yourdomain.com` |

Check `/health` — `services.webPush` should be `"configured"`.

#### Get public key (PWA subscribe)

**Endpoint:** `GET /api/v1/notifications/push/vapid-public-key`

**Response:**

```json
{ "success": true, "data": { "publicKey": "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U" } }
```

#### Register browser subscription (after login)

**Endpoint:** `POST /api/v1/notifications/push/subscribe`  
**Auth:** Bearer required; body `userId` must match token.

```json
{
  "userId": "user-uuid",
  "appId": "674a1b2c3d4e5f6789012345",
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/fcm/send/…",
    "expirationTime": null,
    "keys": {
      "p256dh": "…",
      "auth": "…"
    }
  }
}
```

**Unregister:** `DELETE /api/v1/notifications/push/subscribe` with `{ "userId", "endpoint" }`.

Stale subscriptions (HTTP 404/410 from push service) are removed automatically.

The merchant **PWA service worker** (published via create-app-ms) includes `push` and `notificationclick` handlers. **Republish the PWA** after upgrading so existing installs receive the updated `sw.js`.

See **`STOREFRONT_PWA_INTEGRATION.md`** for client-side subscribe example code.

### Get Notification Status

Get the status of a specific notification.

**Endpoint:** `GET /api/v1/notifications/:id/status`

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "notification_id",
    "status": "sent",
    "channel": "email",
    "recipient": "user@example.com",
    "template": "email-verification",
    "sentAt": "2024-01-01T00:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Get User Notifications

Get all notifications for a specific **recipient** (for in-app, this is the **user id**).

**Endpoint:** `GET /api/v1/notifications/user/:recipient?limit=50&offset=0&channel=in_app`

- Optional query **`channel`**: `email` | `sms` | `in_app` — filter by channel.
- For **`in_app`** rows, each item includes **`data`** (includes `inAppTitle`, `inAppBody`, and any template variables).

**Response:**

```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notification_id",
        "channel": "email",
        "template": "email-verification",
        "status": "sent",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "sentAt": "2024-01-01T00:00:00.000Z"
      },
      {
        "id": "notification_id_2",
        "channel": "in_app",
        "template": "app-created",
        "status": "sent",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "sentAt": "2024-01-01T00:00:00.000Z",
        "data": {
          "appName": "My App",
          "merchantName": "merchant_123",
          "inAppTitle": "App created",
          "inAppBody": "My App was created successfully for merchant_123."
        }
      }
    ],
    "total": 100,
    "limit": 50,
    "offset": 0
  }
}
```

### Get All Notifications (Admin)

Get all notifications (admin endpoint).

**Endpoint:** `GET /api/v1/notifications?limit=50&offset=0`

## Templates

Templates are stored in the `templates/` directory. Each template should have:

- `{template-name}.email.html` - HTML email template
- `{template-name}.email.txt` - Plain text email template (optional)
- `{template-name}.email.subject.txt` - Email subject template (optional)
- `{template-name}.sms.txt` - SMS template
- `{template-name}.in-app.json` - In-app title/body (required for `channel: in_app` and for `send-dual`). JSON shape: `{ "title": "...", "body": "..." }` with `{{placeholders}}` in strings.

### Template Variables

Use `{{variableName}}` syntax for variable substitution:

**Example Email Template (`email-verification.email.html`):**

```html
<!DOCTYPE html>
<html>
<head>
  <title>Verify Your Email</title>
</head>
<body>
  <h1>Hello {{userName}}!</h1>
  <p>Please verify your email by clicking the link below:</p>
  <a href="{{verificationUrl}}">Verify Email</a>
</body>
</html>
```

**Example SMS Template (`email-verification.sms.txt`):**

```
Hello {{userName}}! Please verify your email: {{verificationUrl}}
```

### Available Templates

**Auth / onboarding**

- `email-verification` - Email verification (email + `.in-app.json` for dual)
- `password-reset` - Password reset (link-style; SpringTD may also use OTP + `otp` for reset)
- `password-change` - **Dual for storefront users:** confirmation after password was changed or reset successfully (`data.userName`). OTP codes still use the `otp` template.
- `otp` - One-time code (email/SMS only — never duplicated in in-app for security)
- `otp-prompt` - **In-app only:** companion message after an OTP email (“check your inbox”; no code in the message)
- `user-registered` - **In-app only:** welcome message after storefront signup (verification OTP sent separately)
- `invitation` - Team invitation

For the `otp` template, set `data.purpose` to describe the use case (for example: `Verification`, `Password Reset`, `Password Change`, or `Login`).

**Domain events (email + `.in-app.json` where dual delivery is used)**

- `app-created` - Application created successfully (**create-app-ms** → `send-dual`)
- `app-deactivated` - App **suspended** or **deleted** (`data.appName`, `merchantName`, `action`: `suspended` | `deleted`)
- `app-reactivated` - App set back to **active** (`data.appName`, `merchantName`)
- `product-configuration` - Product **activated/deactivated**, **config updated**, or legacy **configurations** CRUD (**product-ms** → `send-dual` when Bearer access JWT present; `data.productId`, `productType`, `appId`, `action`, optional `detail`)
- `product-created` - Product created successfully
- `product-application-submitted` - Storefront application submitted (**product-ms** → `send-dual`; email optional)
- `product-application-workflow-updated` - Application workflow stage changed (applicant + merchant)
- `guarantor-kyc-approved` - Guarantor KYC completed (applicant + merchant)
- `guarantor-applicant-reported` - Guarantor flagged unknown applicant (merchant)
- `merchant-registered` - New merchant registered
- `compliance-incomplete` - Compliance needs attention (`failed` / `rejected` / `in_progress` flows from compliance-ms)
- `withdrawal-alert` - Withdrawal processed (billing-ms)
- `support-ticket-new` - New support ticket (call `send-dual` from the service that owns tickets when implemented)
- `merchant-account-status` - Merchant account deactivated (or similar lifecycle)
- `merchant-product-status` - Product set live or deactivated

**Other**

- `contract-submission` - Contract submission confirmation
- `kyc-approved` / `kyc-rejected` - Legacy naming; compliance also uses `kyc-status-updated` email template

## OpenAPI

A static spec is checked in as `openapi.json`. Regenerate from the running app’s Swagger UI export if needed:

```
npm run export-swagger
```

## Mailtrap Configuration

Mailtrap is an email testing service that catches all emails in development:

1. Sign up at [Mailtrap](https://mailtrap.io)
2. Create an inbox
3. Get SMTP credentials from the inbox settings
4. Configure environment variables:
   - `MAILTRAP_HOST=smtp.mailtrap.io`
   - `MAILTRAP_PORT=2525`
   - `MAILTRAP_USER` - Your Mailtrap username
   - `MAILTRAP_PASSWORD` - Your Mailtrap password

All emails sent in development will appear in your Mailtrap inbox for testing.

## Twilio Configuration

For SMS notifications:

1. Sign up at [Twilio](https://www.twilio.com)
2. Get your Account SID and Auth Token
3. Purchase a phone number
4. Configure environment variables:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER`

## Integration with account-ms

The notifications-ms is integrated with account-ms as the gateway. All requests to `/api/v1/notifications/*` are proxied from account-ms to notifications-ms.

## Testing

Run tests with:

```
npm test
```

## Error Handling

The service uses graceful degradation:

- If Mailtrap is not configured, email sending is skipped (logged)
- If Twilio is not configured, SMS sending is skipped (logged)
- Notification records are still created in MongoDB for tracking

## Future Enhancements

- Background worker for retry logic
- Webhook notifications
- Rate limiting
- Provider fallback mechanisms
