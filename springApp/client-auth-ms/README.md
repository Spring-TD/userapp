# Client Authentication Microservice

## Overview
The Client Authentication Microservice (client-auth-ms) is a comprehensive API gateway that handles all client-facing authentication operations. It acts as the single entry point for frontend applications, providing form validation, request forwarding, and seamless integration with the backend authentication service (service-auth-ms). This service now supports the complete authentication workflow including registration, login, password management, OTP verification, and user profile management.

Deployment URL: https://client-auth-ms.fly.dev/

## Table of Contents
- [Features](#features)
- [API Endpoints](#api-endpoints)
- [Setup Instructions](#setup-instructions)
- [Environment Variables](#environment-variables)
- [Architecture](#architecture)
- [Data Structure & Models](#data-structure--models)
- [Validation Rules](#validation-rules)
- [Complete API Gateway Coverage](#complete-api-gateway-coverage)

## Features
- **✅ Registration Forms**: Merchant, user, and admin signup with validation
- **✅ Authentication**: Complete login/logout/refresh token flow  
- **✅ Account Verification**: Email-based account verification
- **✅ OTP Management**: Generate, verify, and resend OTP codes
- **✅ Password Management**: Forgot password, reset, and change operations
- **✅ User Profile**: Get and update user profile information
- **✅ Role Management**: Create roles and manage permissions
- **✅ Invitation Management**: Invite users, validate tokens, accept invitations
- **✅ Session Management**: View active sessions and revoke device access
- **✅ FAQ Management**: FAQ CRUD with publish controls
- **✅ Contact Support Management**: Support contact CRUD with publish controls
- **✅ Legal Documents Management**: Terms of Service and Privacy Policy CRUD
- **✅ Administrative Operations**: User suspension and activation
- **✅ API Gateway**: Centralized routing and validation
- **✅ CORS Support**: Configured for frontend integration
- **✅ Health Check**: Service monitoring endpoint
- **✅ Retail user wallets**: After successful `POST /api/v1/registration/user` (and compliance profile), optionally provisions a **wallet-ms** user wallet (including **Payonus NUBAN** when wallet-ms is configured). Requires **`WALLET_SERVICE_URL`**, **`WALLET_INTERNAL_TOKEN`** (same value as wallet-ms), and **`USER_WALLET_DEFAULT_CURRENCY`** (default `NGN`). See [Environment Variables](#environment-variables).

## Fuspay + Compliance Registration Sync

`POST /api/v1/registration/user` now performs these additional steps during signup (when enabled):

1. Create local user in `client-auth-ms`.
2. Create Fuspay Modular user via `POST /api/v1/modular/user/` using:
   - `email`, `phone`, `country`
   - `app` from `FUSPAY_MODULAR_APP_ID` (env only)
   - `user_ref` as canonical local user id
3. Create minimal KYC profile in `compliance-ms` (`POST /api/v1/kyc/profile/:userId`) and persist Fuspay identifiers.
4. **Wallet (optional):** If `WALLET_SERVICE_URL` and `WALLET_INTERNAL_TOKEN` are set (matching **wallet-ms** `WALLET_INTERNAL_TOKEN`), calls **`POST /api/v1/internal/wallets/user`** on wallet-ms to create the user’s wallet and run **Payonus** provisioning for the configured currency.

Registration response includes:

- `fuspayProfileCreated`
- `fuspayUserId` (Fuspay `customer_id` / `data.id`)
- `fuspayUserRef` (your canonical local user id)
- **`wallet`** — created wallet object from wallet-ms when provisioning succeeded (may include `virtualNuban` when Payonus is active)
- **`walletProvisioningError`** — present when wallet-ms was configured but the create call failed (user account is still created; retry or alert)

If Fuspay or compliance profile creation fails, registration is rolled back so partial onboarding is not left behind.

## API Endpoints

### Health Check
```
GET /health
```

### Registration Endpoints

#### Registration Forms Schema
```
GET /api/v1/registration/forms
```
Returns the form schemas for merchant, user, and admin registration.

#### Merchant Registration
```
POST /api/v1/registration/merchant
Content-Type: application/json

{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com", 
  "phone": "+1234567890",
  "country": "United States",
  "password": "SecurePass123!"
}
```

#### User Registration
```
POST /api/v1/registration/user
Content-Type: application/json

{
  "user_merchant_id": "merchant123",
  "first_name": "Jane",
  "last_name": "Smith", 
  "email": "jane@example.com",
  "phone": "+1234567890",
  "country": "United States",
  "password": "SecurePass123!"
}
```

#### Admin Registration
```
POST /api/v1/registration/admin
Content-Type: application/json

{
  "first_name": "Admin",
  "last_name": "User",
  "email": "admin@example.com",
  "phone": "+1234567890",
  "country": "United States",
  "password": "SecurePass123!"
}
```

### Authentication Endpoints ✅

#### Account Verification
```
POST /api/v1/auth/verify-account
Content-Type: application/json

{
  "token": "verification-token-string"
}
```

#### User Login
```
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

#### User Logout
```
POST /api/v1/auth/logout
Authorization: Bearer <jwt-token>
```

#### Refresh Token
```
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "refresh-token-string"
}
```

#### Get Current User
```
GET /api/v1/auth/me
Authorization: Bearer <jwt-token>
```

#### Verify Token
```
POST /api/v1/auth/verify-token
Authorization: Bearer <jwt-token>
```

#### Check Email Exists
```
GET /api/v1/auth/email-exists/{email}
```

### OTP Management Endpoints ✅

#### Generate OTP
```
POST /api/v1/otp/generate
Content-Type: application/json

{
  "identifier": "user@example.com",
  "channel": "email",
  "purpose": "verification"
}
```

#### Verify OTP
```
POST /api/v1/otp/verify
Content-Type: application/json

{
  "identifier": "user@example.com",
  "code": "123456"
}
```

#### Resend OTP
```
POST /api/v1/otp/resend
Content-Type: application/json

{
  "identifier": "user@example.com",
  "channel": "email",
  "purpose": "verification"
}
```

### Password Management Endpoints ✅

#### Forgot Password
```
POST /api/v1/password/forgot
Content-Type: application/json

{
  "email": "user@example.com"
}
```
Sends a one-time OTP code to the user's email for password reset.

#### Reset Password
```
POST /api/v1/password/reset
Content-Type: application/json

{
  "identifier": "user@example.com",
  "code": "123456",
  "newPassword": "NewSecurePass123!"
}
```

#### Request Password Change OTP (Authenticated)
```
POST /api/v1/password/change/request-otp
Authorization: Bearer <jwt-token>
```
Sends a one-time OTP code to the authenticated user's email for password change confirmation.

#### Change Password
```
PUT /api/v1/password/change
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "currentPassword": "OldPass123!",
  "code": "123456",
  "newPassword": "NewSecurePass123!"
}
```

After a successful **reset** or **change** password, the service sends a **confirmation email** via notifications-ms (`template: password-change`, `data.userName`). OTP emails use the separate **`otp`** template. Notification failures are logged only and do not fail the API response.

### User Management Endpoints ✅

#### Get User Profile
```
GET /api/v1/user/profile
Authorization: Bearer <jwt-token>
```

#### List Merchant Users
```
GET /api/v1/user/list
Authorization: Bearer <merchant-jwt-token>
```

#### Update User Profile
```
PUT /api/v1/user/profile
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "first_name": "UpdatedName",
  "last_name": "UpdatedLastName",
  "phone": "+1234567890",
  "country": "NG"
}
```

All profile fields are optional; send only the fields you want to update.

#### Update Email (Account Settings)

Requires the current password. `newEmail` and `confirmEmail` must match.

```
PUT /api/v1/user/email
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "newEmail": "new.address@example.com",
  "confirmEmail": "new.address@example.com",
  "currentPassword": "CurrentPass123!"
}
```

On success, the response prompts the user to verify the new email address.

#### Deactivate Account (Account Control)

Soft-deactivates the authenticated user’s account. No request body.

```
POST /api/v1/user/deactivate
Authorization: Bearer <jwt-token>
```

#### Get User Info (Admin)
```
GET /api/v1/user/info/{userId}
Authorization: Bearer <admin-jwt-token>
```

#### Verify User Info (Admin)
```
POST /api/v1/user/verify-info/{userId}
Content-Type: application/json
Authorization: Bearer <admin-jwt-token>

{
  "verificationData": {
    "field": "value"
  }
}
```

#### Suspend User (Admin)
```
PUT /api/v1/user/suspend/{userId}
Content-Type: application/json
Authorization: Bearer <admin-jwt-token>

{
  "reason": "Violation of terms"
}
```

#### Activate User (Admin)
```
PUT /api/v1/user/activate/{userId}
Authorization: Bearer <admin-jwt-token>
```

#### Update User Status (Merchant/Admin)
```
PUT /api/v1/user/{userId}/status
Authorization: Bearer <merchant-jwt-token>

{
  "status": "active"
}
```

### Invitation Management Endpoints ✅

#### Create Invitation (Merchant)
```
POST /api/v1/invitations
Content-Type: application/json
Authorization: Bearer <merchant-jwt-token>

{
  "email": "new.user@example.com",
  "roleId": "role-id-uuid"
}
```

#### Get Invitations (Merchant)
```
GET /api/v1/invitations
Authorization: Bearer <merchant-jwt-token>
```

#### Validate Invitation Token (Public)
```
GET /api/v1/invitations/validate/{token}
```

#### Accept Invitation (Public)
```
POST /api/v1/invitations/accept
Content-Type: application/json

{
  "token": "invitation-token-uuid",
  "firstName": "Jane",
  "lastName": "Doe",
  "password": "SecurePass123!",
  "phone": "+1234567890" // Optional
}
```

### Session Management Endpoints ✅

#### Get Active Sessions
```
GET /api/v1/sessions
Authorization: Bearer <jwt-token>
```
Returns a list of all active login sessions for the authenticated user, including device information, IP address, and last activity timestamp.

**Response Example:**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "session-uuid",
        "deviceInfo": "Chrome on MacBook Pro",
        "ipAddress": "192.168.1.100",
        "lastActiveAt": "2023-01-01T12:00:00.000Z",
        "isCurrent": false
      },
      {
        "id": "session-uuid-2",
        "deviceInfo": "Safari on iPhone 14",
        "ipAddress": "10.0.0.50",
        "lastActiveAt": "2023-01-01T10:30:00.000Z",
        "isCurrent": false
      }
    ]
  }
}
```
#### Revoke Session
```
DELETE /api/v1/sessions/{sessionId}
Authorization: Bearer <jwt-token>
```
Revokes a specific session, logging out the user on that device. Users can only revoke their own sessions.

**Response Example:**
```json
{
  "success": true,
  "message": "Session revoked successfully"
}
```

### FAQ Endpoints ✅

#### List FAQs (Public)
```
GET /api/v1/faqs
```
Optional query parameters:
- `q`: text search on `question` and `answer`
- `includeUnpublished=true`: only honored for authenticated `merchant`/`admin`

**Response Example (200):**
```json
{
  "success": true,
  "data": {
    "faqs": [
      {
        "id": "68105bc4af8f554f922a4ba5",
        "question": "Why is SpringTD",
        "answer": "SpringTD helps merchants launch products quickly.",
        "sort_order": 0,
        "is_published": true,
        "created_at": "2026-04-29T05:31:32.745Z",
        "updated_at": "2026-04-29T05:31:32.745Z"
      }
    ]
  }
}
```

#### Get FAQ by ID
```
GET /api/v1/faqs/{id}
```

**Response Example (200):**
```json
{
  "success": true,
  "data": {
    "faq": {
      "id": "68105bc4af8f554f922a4ba5",
      "question": "Why is SpringTD",
      "answer": "SpringTD helps merchants launch products quickly.",
      "sort_order": 0,
      "is_published": true,
      "created_at": "2026-04-29T05:31:32.745Z",
      "updated_at": "2026-04-29T05:31:32.745Z"
    }
  }
}
```

#### Create FAQ (Merchant/Admin)
```
POST /api/v1/faqs
Content-Type: application/json
Authorization: Bearer <merchant-or-admin-jwt-token>
```

**Request Body:**
```json
{
  "question": "How does mortgage work?",
  "answer": "Mortgage products are managed from your product dashboard.",
  "sort_order": 1,
  "is_published": true
}
```

**Response Example (201):**
```json
{
  "success": true,
  "message": "FAQ created",
  "data": {
    "faq": {
      "id": "68105bc4af8f554f922a4ba5",
      "question": "How does mortgage work?",
      "answer": "Mortgage products are managed from your product dashboard.",
      "sort_order": 1,
      "is_published": true,
      "created_at": "2026-04-29T05:31:32.745Z",
      "updated_at": "2026-04-29T05:31:32.745Z"
    }
  }
}
```

#### Update FAQ (Merchant/Admin)
```
PUT /api/v1/faqs/{id}
Content-Type: application/json
Authorization: Bearer <merchant-or-admin-jwt-token>
```

**Request Body (partial update):**
```json
{
  "answer": "Updated FAQ answer",
  "is_published": false
}
```

**Response Example (200):**
```json
{
  "success": true,
  "message": "FAQ updated",
  "data": {
    "faq": {
      "id": "68105bc4af8f554f922a4ba5",
      "question": "How does mortgage work?",
      "answer": "Updated FAQ answer",
      "sort_order": 1,
      "is_published": false,
      "created_at": "2026-04-29T05:31:32.745Z",
      "updated_at": "2026-04-29T05:35:10.122Z"
    }
  }
}
```

#### Delete FAQ (Merchant/Admin)
```
DELETE /api/v1/faqs/{id}
Authorization: Bearer <merchant-or-admin-jwt-token>
```

**Response Example (200):**
```json
{
  "success": true,
  "message": "FAQ deleted"
}
```

### Contact Support Endpoints ✅

#### List Support Contacts (Public)
```
GET /api/v1/support-contacts
```
Optional query parameters:
- `q`: text search on `title` and `link_url`
- `includeUnpublished=true`: only honored for authenticated `merchant`/`admin`

**Response Example (200):**
```json
{
  "success": true,
  "data": {
    "contacts": [
      {
        "id": "68105ce5af8f554f922a4c23",
        "title": "Customer Support",
        "link_url": "mailto:support@springtd.com",
        "icon_type": "question-mark-filled",
        "sort_order": 1,
        "is_published": true,
        "created_at": "2026-04-29T05:36:21.407Z",
        "updated_at": "2026-04-29T05:36:21.407Z"
      }
    ]
  }
}
```

#### Get Support Contact by ID
```
GET /api/v1/support-contacts/{id}
```

**Response Example (200):**
```json
{
  "success": true,
  "data": {
    "contact": {
      "id": "68105ce5af8f554f922a4c23",
      "title": "Customer Support",
      "link_url": "mailto:support@springtd.com",
      "icon_type": "question-mark-filled",
      "sort_order": 1,
      "is_published": true,
      "created_at": "2026-04-29T05:36:21.407Z",
      "updated_at": "2026-04-29T05:36:21.407Z"
    }
  }
}
```

#### Create Support Contact (Merchant/Admin)
```
POST /api/v1/support-contacts
Content-Type: application/json
Authorization: Bearer <merchant-or-admin-jwt-token>
```

**Request Body:**
```json
{
  "title": "WhatsApp",
  "link_url": "https://wa.me/2348012345678",
  "icon_type": "whatsapp",
  "sort_order": 3,
  "is_published": true
}
```

**Response Example (201):**
```json
{
  "success": true,
  "message": "Support contact created",
  "data": {
    "contact": {
      "id": "68105ce5af8f554f922a4c23",
      "title": "WhatsApp",
      "link_url": "https://wa.me/2348012345678",
      "icon_type": "whatsapp",
      "sort_order": 3,
      "is_published": true,
      "created_at": "2026-04-29T05:36:21.407Z",
      "updated_at": "2026-04-29T05:36:21.407Z"
    }
  }
}
```

#### Update Support Contact (Merchant/Admin)
```
PUT /api/v1/support-contacts/{id}
Content-Type: application/json
Authorization: Bearer <merchant-or-admin-jwt-token>
```

**Request Body (partial update):**
```json
{
  "title": "Website",
  "link_url": "https://springtd.com/support",
  "icon_type": "website"
}
```

**Response Example (200):**
```json
{
  "success": true,
  "message": "Support contact updated",
  "data": {
    "contact": {
      "id": "68105ce5af8f554f922a4c23",
      "title": "Website",
      "link_url": "https://springtd.com/support",
      "icon_type": "website",
      "sort_order": 3,
      "is_published": true,
      "created_at": "2026-04-29T05:36:21.407Z",
      "updated_at": "2026-04-29T05:39:44.884Z"
    }
  }
}
```

#### Delete Support Contact (Merchant/Admin)
```
DELETE /api/v1/support-contacts/{id}
Authorization: Bearer <merchant-or-admin-jwt-token>
```

**Response Example (200):**
```json
{
  "success": true,
  "message": "Support contact deleted"
}
```

### Legal Documents Endpoints (Terms + Privacy Policy) ✅

#### List Legal Documents (Public)
```
GET /api/v1/legal-documents
```
Optional query parameters:
- `document_type`: `terms_of_service` or `privacy_policy`
- `q`: text search on `title` and `content`
- `includeUnpublished=true`: only honored for authenticated `merchant`/`admin`

**Response Example (200):**
```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "id": "681075db355f7031f9f53f08",
        "document_type": "terms_of_service",
        "title": "Terms of Service Summary",
        "effective_date": "2025-01-01T00:00:00.000Z",
        "content": "1. Introduction\\nWelcome to SpringTD...",
        "sort_order": 1,
        "is_published": true,
        "created_at": "2026-04-29T06:59:39.123Z",
        "updated_at": "2026-04-29T06:59:39.123Z"
      },
      {
        "id": "681075f2355f7031f9f53f09",
        "document_type": "privacy_policy",
        "title": "Privacy Policy Summary",
        "effective_date": "2025-01-01T00:00:00.000Z",
        "content": "1. Overview\\nYour privacy is important to us...",
        "sort_order": 2,
        "is_published": true,
        "created_at": "2026-04-29T07:00:02.001Z",
        "updated_at": "2026-04-29T07:00:02.001Z"
      }
    ]
  }
}
```

#### Get Legal Document by ID
```
GET /api/v1/legal-documents/{id}
```

**Response Example (200):**
```json
{
  "success": true,
  "data": {
    "document": {
      "id": "681075db355f7031f9f53f08",
      "document_type": "terms_of_service",
      "title": "Terms of Service Summary",
      "effective_date": "2025-01-01T00:00:00.000Z",
      "content": "1. Introduction\\nWelcome to SpringTD...",
      "sort_order": 1,
      "is_published": true,
      "created_at": "2026-04-29T06:59:39.123Z",
      "updated_at": "2026-04-29T06:59:39.123Z"
    }
  }
}
```

#### Create Legal Document (Merchant/Admin)
```
POST /api/v1/legal-documents
Content-Type: application/json
Authorization: Bearer <merchant-or-admin-jwt-token>
```

**Request Body:**
```json
{
  "document_type": "terms_of_service",
  "title": "Terms of Service Summary",
  "effective_date": "2025-01-01T00:00:00.000Z",
  "content": "1. Introduction\nWelcome to SpringTD...",
  "sort_order": 1,
  "is_published": true
}
```

**Response Example (201):**
```json
{
  "success": true,
  "message": "Legal document created",
  "data": {
    "document": {
      "id": "681075db355f7031f9f53f08",
      "document_type": "terms_of_service",
      "title": "Terms of Service Summary",
      "effective_date": "2025-01-01T00:00:00.000Z",
      "content": "1. Introduction\\nWelcome to SpringTD...",
      "sort_order": 1,
      "is_published": true,
      "created_at": "2026-04-29T06:59:39.123Z",
      "updated_at": "2026-04-29T06:59:39.123Z"
    }
  }
}
```

#### Update Legal Document (Merchant/Admin)
```
PUT /api/v1/legal-documents/{id}
Content-Type: application/json
Authorization: Bearer <merchant-or-admin-jwt-token>
```

**Request Body (partial update):**
```json
{
  "title": "Updated Terms of Service Summary",
  "is_published": false
}
```

**Response Example (200):**
```json
{
  "success": true,
  "message": "Legal document updated",
  "data": {
    "document": {
      "id": "681075db355f7031f9f53f08",
      "document_type": "terms_of_service",
      "title": "Updated Terms of Service Summary",
      "effective_date": "2025-01-01T00:00:00.000Z",
      "content": "1. Introduction\\nWelcome to SpringTD...",
      "sort_order": 1,
      "is_published": false,
      "created_at": "2026-04-29T06:59:39.123Z",
      "updated_at": "2026-04-29T07:05:13.010Z"
    }
  }
}
```

#### Delete Legal Document (Merchant/Admin)
```
DELETE /api/v1/legal-documents/{id}
Authorization: Bearer <merchant-or-admin-jwt-token>
```

**Response Example (200):**
```json
{
  "success": true,
  "message": "Legal document deleted"
}
```

### FAQ + Contact Support Authorization Matrix

| Endpoint | Method | Public | Merchant | Admin |
|----------|--------|--------|----------|-------|
| `/api/v1/faqs` | GET | ✅ Published only | ✅ Published + unpublished with `includeUnpublished=true` | ✅ Published + unpublished with `includeUnpublished=true` |
| `/api/v1/faqs/{id}` | GET | ✅ Published only | ✅ Published + unpublished | ✅ Published + unpublished |
| `/api/v1/faqs` | POST | ❌ | ✅ | ✅ |
| `/api/v1/faqs/{id}` | PUT | ❌ | ✅ | ✅ |
| `/api/v1/faqs/{id}` | DELETE | ❌ | ✅ | ✅ |
| `/api/v1/support-contacts` | GET | ✅ Published only | ✅ Published + unpublished with `includeUnpublished=true` | ✅ Published + unpublished with `includeUnpublished=true` |
| `/api/v1/support-contacts/{id}` | GET | ✅ Published only | ✅ Published + unpublished | ✅ Published + unpublished |
| `/api/v1/support-contacts` | POST | ❌ | ✅ | ✅ |
| `/api/v1/support-contacts/{id}` | PUT | ❌ | ✅ | ✅ |
| `/api/v1/support-contacts/{id}` | DELETE | ❌ | ✅ | ✅ |
| `/api/v1/legal-documents` | GET | ✅ Published only | ✅ Published + unpublished with `includeUnpublished=true` | ✅ Published + unpublished with `includeUnpublished=true` |
| `/api/v1/legal-documents/{id}` | GET | ✅ Published only | ✅ Published + unpublished | ✅ Published + unpublished |
| `/api/v1/legal-documents` | POST | ❌ | ✅ | ✅ |
| `/api/v1/legal-documents/{id}` | PUT | ❌ | ✅ | ✅ |
| `/api/v1/legal-documents/{id}` | DELETE | ❌ | ✅ | ✅ |
- `last_name`: String (required, 2-50 chars)  
- `email`: Valid email address (required)
- `phone`: International format (required)
- `country`: String (required, 2-100 chars)
- `password`: Strong password (required, 8-128 chars with complexity requirements)

### User Registration Form
- `user_merchant_id`: String (required, 5-50 chars) - The merchant ID user belongs to
- `first_name`: String (required, 2-50 chars)
- `last_name`: String (required, 2-50 chars)
- `email`: Valid email address (required)
- `phone`: International format (required)
- `country`: String (required, 2-100 chars)  
- `password`: Strong password (required, 8-128 chars with complexity requirements)

### Admin Registration Form
- `first_name`: String (required, 2-50 chars)
- `last_name`: String (required, 2-50 chars)
- `email`: Valid email address (required)
- `phone`: International format (required)
- `country`: String (required, 2-100 chars)
- `password`: Strong password (required, 8-128 chars with complexity requirements)

## Setup Instructions

1. **Install Dependencies**
   ```bash
   cd server/client-auth-ms
   npm install
   ```

2. **Environment Configuration**
   Copy the .env file and configure:
   ```bash
   cp .env.example .env
   ```

3. **Development**
   ```bash
   npm run dev
   ```

4. **Production Build**
   ```bash
   npm run build
   npm start
   ```

## Environment Variables

### Core Configuration
| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `PORT` | number | `3001` | Server port for client-auth-ms |
| `NODE_ENV` | string | `development` | Environment mode (development/production) |
| `LOG_LEVEL` | string | `info` | Logging level (error, warn, info, debug) |

### Database
| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `MONGODB_URI` | string | — | MongoDB connection string (recommended for DigitalOcean) |
| `DATABASE_URL` | string | `mongodb://localhost:27017/client_auth_db` | Fallback MongoDB URL (e.g. used by docker-compose) |

### Service Communication
| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `SERVICE_AUTH_URL` | string | `http://localhost:3000` | Base URL for service-auth-ms communication |
| `NOTIFICATIONS_SERVICE_URL` | string | `http://localhost:4009` (non-prod) / `https://notifications-ms.fly.dev` (prod default in code) | Base URL for **notifications-ms** (`/api/v1/notifications/send`). Set to your deployed app (e.g. `https://springtd-notifications-ms.fly.dev`) in production. |
| `COMPLIANCE_SERVICE_URL` | string | `http://localhost:3003` | Base URL for **compliance-ms** (KYC profile bootstrap on user signup). |

### Wallet microservice (retail signup provisioning)

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `WALLET_SERVICE_URL` | string | *(empty)* | Base URL of **wallet-ms** (no trailing slash), e.g. `http://localhost:4004` or `https://wallet-ms.fly.dev`. If empty, user signup **does not** create a wallet. |
| `WALLET_INTERNAL_TOKEN` | string | *(empty)* | Shared secret with **wallet-ms** `WALLET_INTERNAL_TOKEN`. Sent as `X-Internal-Token` to `POST /api/v1/internal/wallets/user`. **Must match** wallet-ms. If **`WALLET_SERVICE_URL`** or **`WALLET_INTERNAL_TOKEN`** is empty, signup skips wallet creation. |
| `USER_WALLET_DEFAULT_CURRENCY` | string | `NGN` | ISO currency for the new user wallet (use `NGN` to align with Payonus `PAYONUS_NUBAN_CURRENCIES` defaults on wallet-ms). |
| `WALLET_SERVICE_HTTP_TIMEOUT_MS` | number | `30000` | HTTP timeout for wallet-ms internal calls. |

### Security & CORS
| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `CORS_ORIGINS` | string | `http://localhost:3000,http://localhost:3001,http://localhost:8080` | Comma-separated list of allowed CORS origins |

### Environment Variable Validation
- All environment variables are validated on startup
- Missing required variables will cause startup failure
- Default values are applied for optional variables
- Configuration is loaded from `src/config/environment.ts`

## Architecture

### Microservice Communication
The client-auth-ms acts as a comprehensive API gateway that handles all client-facing authentication operations:

```
Frontend → client-auth-ms (port 3001) → service-auth-ms (port 3000) → Database/Redis
```

### Communication Protocol
- **Protocol**: HTTP/HTTPS
- **Data Format**: JSON
- **Client Port**: 3001 (configurable via PORT env var)
- **Service Port**: 3000 (configurable via SERVICE_AUTH_URL env var)
- **Complete API Coverage**: 
  - Registration: `POST /api/v1/registration/*`
  - Authentication: `POST /api/v1/auth/*`
  - OTP Management: `POST /api/v1/otp/*`
  - Password Operations: `POST|PUT /api/v1/password/*`
  - User Management: `GET|PUT|POST /api/v1/user/*`

### Data Flow
1. Frontend submits requests to client-auth-ms endpoints
2. client-auth-ms validates request data and extracts authentication tokens
3. Validated requests are forwarded to appropriate service-auth-ms endpoints
4. service-auth-ms processes the request (registration, authentication, etc.)
5. client-auth-ms forwards the response back to frontend
6. All authentication state is managed by service-auth-ms
7. client-auth-ms acts as a transparent proxy with validation

## Data Structure & Models

### Form Data Structure
The client-auth-ms collects form data and maps it to the service-auth-ms data models:

#### Merchant Registration Data Model
``typescript
interface MerchantRegistrationForm {
  first_name: string;     // Maps to BaseUser.first_name
  last_name: string;      // Maps to BaseUser.last_name
  email: string;          // Maps to BaseUser.email
  phone: string;          // Maps to BaseUser.phone (optional)
  country: string;        // Maps to Merchant.country
  password: string;       // Maps to BaseUser.password (hashed by service)
}
```

#### User Registration Data Model
``typescript
interface UserRegistrationForm {
  user_merchant_id: string; // Maps to User.user_merchant_id
  first_name: string;       // Maps to BaseUser.first_name
  last_name: string;        // Maps to BaseUser.last_name
  email: string;            // Maps to BaseUser.email
  phone: string;            // Maps to BaseUser.phone (optional)
  country: string;          // Maps to User.country
  password: string;         // Maps to BaseUser.password (hashed by service)
}
```

#### Admin Registration Data Model
``typescript
interface AdminRegistrationForm {
  first_name: string;     // Maps to BaseUser.first_name
  last_name: string;      // Maps to BaseUser.last_name
  email: string;          // Maps to BaseUser.email
  phone: string;          // Maps to BaseUser.phone (optional)
  country: string;        // Maps to Admin.country
  password: string;       // Maps to BaseUser.password (hashed by service)
}
```

### Service-Auth-MS Data Model Relationship
The collected form data maps to the service-auth-ms data models:

``typescript
// BaseUser interface (inherited by User, Merchant, and Admin)
interface BaseUser {
  id: string;
  email: string;
  password: string;        // Hashed by service-auth-ms
  first_name: string;
  last_name: string;
  phone?: string;
  user_type: UserType;     // Set automatically by service
  status: AccountStatus;   // Set to 'pending' by service (except for admins)
  email_verified: boolean; // Set to false by service (except for admins)
  phone_verified: boolean; // Set to false by service
  // ... additional fields managed by service
}

// User extends BaseUser
interface User extends BaseUser {
  user_type: UserType.USER;
  user_merchant_id: string;
  country: string;
}

// Merchant extends BaseUser
interface Merchant extends BaseUser {
  user_type: UserType.MERCHANT;
  user_merchant_id: string;  // Auto-generated by client-auth-ms
  country: string;
}

// Admin extends BaseUser
interface Admin extends BaseUser {
  user_type: UserType.ADMIN;
  user_merchant_id: 'admin'; // Fixed value for admins
  country: string;
}
```

### Field Mapping
| Client Form Field | Service Model Field | Notes |
|------------------|--------------------|---------|
| `first_name` | `BaseUser.first_name` | Direct mapping |
| `last_name` | `BaseUser.last_name` | Direct mapping |
| `email` | `BaseUser.email` | Validated and lowercased |
| `phone` | `BaseUser.phone` | Optional, validated format |
| `password` | `BaseUser.password` | Hashed by service-auth-ms |
| `country` | `User/Merchant/Admin.country` | Direct mapping |
| `user_merchant_id` | `User.user_merchant_id` | For users: provided by form<br/>For merchants: auto-generated<br/>For admins: fixed as 'admin' |

## Validation Rules
- Email must be valid format and unique
- Password must contain uppercase, lowercase, number, and special character
- Phone numbers must be in international format
- All required fields must be provided
- Field length limits are enforced
- JWT tokens must be valid for authenticated endpoints
- OTP codes must be 6 digits
- Password reset and password change OTP codes must be valid and not expired

## Complete API Gateway Coverage ✅

The client-auth-ms now provides complete coverage of all authentication operations:

| Category | Endpoints | Status |
|----------|-----------|--------|
| **Registration** | Merchant/User/Admin registration, Forms schema | ✅ Complete |
| **Authentication** | Login, Logout, Refresh, Verify account | ✅ Complete |
| **Token Management** | JWT verification, Email existence check | ✅ Complete |
| **OTP Operations** | Generate, Verify, Resend OTP codes | ✅ Complete |
| **Password Management** | Forgot, Reset, Change password | ✅ Complete |
| **User Profile** | Get/Update profile, User information | ✅ Complete |
| **Role Management** | Create roles, Get roles, Permissions | ✅ Complete |
| **Invitation Management** | Create, List, Validate, Accept | ✅ Complete |
| **Session Management** | Get active sessions, Revoke sessions | ✅ Complete |
| **FAQ Management** | List/Get/Create/Update/Delete FAQs | ✅ Complete |
| **Contact Support Management** | List/Get/Create/Update/Delete support contacts | ✅ Complete |
| **Legal Documents Management** | List/Get/Create/Update/Delete terms and privacy policy | ✅ Complete |
| **Administration** | Suspend/Activate users, Verify info | ✅ Complete |
| **Health & Monitoring** | Health check endpoint | ✅ Complete |

### Frontend Integration Benefits
- **Single Entry Point**: All authentication operations through one service
- **Consistent API**: Uniform request/response patterns across all endpoints
- **Built-in Validation**: Request validation at the gateway level
- **Error Handling**: Standardized error responses
- **Token Management**: Centralized JWT token handling
- **CORS Support**: Pre-configured for frontend integration