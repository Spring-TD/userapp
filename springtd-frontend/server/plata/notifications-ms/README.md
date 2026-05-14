# Notifications Microservice

## Overview
This microservice provides centralized notification functionality for the SpringTD platform, handling email and SMS notifications across all services.

## Features

- **Email Notifications**: Send emails via Mailtrap (development) or production SMTP
- **SMS Notifications**: Send SMS via Twilio
- **Template Support**: Reusable email and SMS templates with variable substitution
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
Get all notifications for a specific user.

**Endpoint:** `GET /api/v1/notifications/user/:recipient?limit=50&offset=0`

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

- `email-verification` - Email verification
- `password-reset` - Password reset
- `contract-submission` - Contract submission confirmation
- `kyc-approved` - KYC verification approved
- `kyc-rejected` - KYC verification rejected

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
- Push notifications support
- In-app notifications
- Webhook notifications
- Rate limiting
- Provider fallback mechanisms

