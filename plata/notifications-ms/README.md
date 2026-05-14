# Notifications Microservice

## Overview
This microservice provides centralized notification functionality for the Plata platform, handling email, SMS, **in-app inbox** records, and combined **email + in-app** delivery across all services.

## Features

- **Email Notifications**: Send emails via Mailtrap (development) or production SMTP
- **SMS Notifications**: Send SMS via Twilio
- **In-app notifications**: Persist rendered title/body per user id (`channel: in_app`); clients list via `GET /api/v1/notifications/user/:recipient?channel=in_app`
- **Dual delivery**: Single request sends the same template to **email** and **in-app** (`POST /api/v1/notifications/send-dual`)
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
- Jest for testing

## Deployment

The service is deployed on Fly.io and is accessible at: https://notifications-ms.fly.dev

Health check endpoint: https://notifications-ms.fly.dev/health

### Fly.io: Email must be configured

For emails to be sent (e.g. verification OTP, password reset), set Mailtrap (or SMTP) secrets on the **notifications-ms** Fly app. Without these, the service will accept send requests but no email is delivered.

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
# Server
PORT=4009
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/notifications_db

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:4008

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
Send a notification via email or SMS.

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

### Send email + in-app (dual)

Delivers the **same** `template` and `data` as both an email and an in-app notification in one synchronous call.

**Endpoint:** `POST /api/v1/notifications/send-dual`

**Request Body:**
```json
{
  "userId": "USER_DOCUMENT_ID",
  "email": "user@example.com",
  "template": "app-created",
  "data": {
    "appName": "My App",
    "merchantName": "merchant_123",
    "detail": ""
  }
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

Either delivery can fail independently; check `data.inApp` and `data.email`.

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

- `email-verification` - Email verification
- `password-reset` - Password reset
- `otp` - One-time code (email/SMS)
- `invitation` - Team invitation

**Domain events (email + `.in-app.json` where dual delivery is used)**

- `app-created` - Application created successfully
- `product-created` - Product created successfully
- `merchant-registered` - New merchant registered
- `compliance-incomplete` - Compliance needs attention (`failed` / `rejected` / `in_progress` flows from compliance-ms)
- `withdrawal-alert` - Withdrawal processed (billing-ms)
- `support-ticket-new` - New support ticket (call `send-dual` from the service that owns tickets when implemented)
- `merchant-account-status` - Merchant account deactivated (or similar lifecycle)
- `merchant-product-status` - Product set live or deactivated

**Other**

- `contract-submission` - Contract submission confirmation
- `kyc-approved` / `kyc-rejected` - Legacy naming; compliance also uses `kyc-status-updated` email template

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
- Push notifications support (FCM/APNs) in addition to in-app store
- Webhook notifications
- Rate limiting
- Provider fallback mechanisms

