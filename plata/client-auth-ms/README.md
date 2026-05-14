# Client Authentication Microservice

## Overview
The Client Authentication Microservice (client-auth-ms) supports the complete authentication workflow including registration, login, password management, OTP verification, and user profile management.

Deployment URL: https://client-auth-ms-plata.fly.dev/

## Table of Contents
- [Features](#features)
- [Authentication: Public vs Protected Endpoints](#authentication-public-vs-protected-endpoints)
- [Testing with Postman](#testing-with-postman)
- [API Endpoints](#api-endpoints)
- [All Endpoints (Reference)](#all-endpoints-reference)
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
- **✅ Administrative Operations**: User suspension and activation
- **✅ CORS Support**: Configured for frontend integration
- **✅ Health Check**: Service monitoring endpoint
- **✅ Notifications integration**: Calls **notifications-ms** for OTP/verification emails and for **email + in-app** events (e.g. successful merchant registration template `merchant-registered`, account deactivation template `merchant-account-status`) via `POST /api/v1/notifications/send-dual`

## Authentication: Public vs Protected Endpoints

Most endpoints require a valid JWT access token in the `Authorization` header. Registration and a few bootstrap flows are public.

| Area | Public (no token) | Protected (Bearer token required) |
|------|-------------------|-----------------------------------|
| **Registration** | `GET /api/v1/registration/forms`, `POST /api/v1/registration/merchant`, `POST /api/v1/registration/user`, `POST /api/v1/registration/admin` | — |
| **Auth** | `POST /api/v1/auth/verify-account`, `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/verify-token`, `GET /api/v1/auth/email-exists/:email` | `POST /api/v1/auth/logout`, `GET /api/v1/auth/me` |
| **OTP** | `POST /api/v1/otp/generate`, `POST /api/v1/otp/resend` | `POST /api/v1/otp/verify` |
| **Password** | `POST /api/v1/password/forgot`, `POST /api/v1/password/reset` | `PUT /api/v1/password/change` |
| **User** | — | All `/api/v1/user/*` |
| **Roles** | — | All `/api/v1/roles/*` |
| **Invitations** | `GET /api/v1/invitations/validate/:token`, `POST /api/v1/invitations/accept` | `POST /api/v1/invitations`, `GET /api/v1/invitations` |
| **Sessions** | — | `GET /api/v1/sessions`, `DELETE /api/v1/sessions/:sessionId` |
| **Verify email** | `GET /verify-email/verify-email` | — |

## Testing with Postman

### 1. Get an access token

Send a login request (public, no auth):

- **Method:** `POST`
- **URL:** `https://client-auth-ms-plata.fly.dev/api/v1/auth/login` (or your gateway URL + `/api/v1/auth/login`)
- **Headers:** `Content-Type: application/json`
- **Body (raw JSON):**
  ```json
  {
    "email": "user@example.com",
    "password": "YourPassword123!"
  }
  ```

From the response, copy the **access token** (e.g. `data.accessToken` or `accessToken`).

### 2. Use the token for protected endpoints

For any protected endpoint (e.g. `GET /api/v1/auth/me`, `POST /api/v1/otp/verify`):

1. In Postman, open the request.
2. Go to the **Authorization** tab.
3. Set **Type** to **Bearer Token**.
4. In **Token**, paste the access token (no `Bearer ` prefix; Postman adds it).
5. Send the request.

**Example: Verify OTP (protected)**

- **Method:** `POST`
- **URL:** `https://client-auth-ms-plata.fly.dev/api/v1/otp/verify`
- **Authorization:** Type **Bearer Token**, Token = `<your-access-token>`
- **Body (raw JSON):**
  ```json
  {
    "identifier": "user@example.com",
    "code": "123456"
  }
  ```

**Example: Get current user**

- **Method:** `GET`
- **URL:** `https://client-auth-ms-plata.fly.dev/api/v1/auth/me`
- **Authorization:** Type **Bearer Token**, Token = `<your-access-token>`

If the token is missing or invalid, you will get `401` with `{ "success": false, "error": "Authentication required" }` or `"Invalid or expired token"`.

## API Endpoints

### All Endpoints (Reference)

All 44 endpoints with short descriptions:

#### Root & docs
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Service info: name, version, status, and list of endpoint groups. |
| GET | `/health` | Liveness/readiness check for the client-auth service. |
| GET | `/api-docs` | Serves the Swagger UI for interactive API docs. |
| GET | `/api-docs.json` | OpenAPI (Swagger) spec as JSON. |

#### Registration (`/api/v1/registration`) — all public
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/registration/forms` | Returns form schemas (fields, labels, validation) for merchant, user, and admin registration. |
| POST | `/api/v1/registration/merchant` | Registers a new merchant account; sends verification OTP email and **email + in-app** notification (template `merchant-registered`) via notifications-ms. |
| POST | `/api/v1/registration/user` | Registers a new user account; sends verification OTP email. |
| POST | `/api/v1/registration/admin` | Registers a new admin account. |

#### Auth (`/api/v1/auth`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/auth/verify-account` | Public | Verifies an account using a token (e.g. from an email link). |
| POST | `/api/v1/auth/login` | Public | Authenticates with email/password; returns access and refresh tokens. |
| POST | `/api/v1/auth/refresh` | Public | Rotates refresh token and returns new access + refresh pair (stored in MongoDB `refresh_sessions`). |
| POST | `/api/v1/auth/verify-token` | Public | Validates a JWT (e.g. used by other services to check tokens). |
| GET | `/api/v1/auth/email-exists/:email` | Public | Checks whether an email is already registered. |
| POST | `/api/v1/auth/logout` | Public | Revokes session: send `Authorization: Bearer <access>` and/or JSON `{ "refreshToken" }` if access is expired. |
| GET | `/api/v1/auth/me` | Bearer | Returns the current authenticated user's profile. |

#### OTP (`/api/v1/otp`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/otp/generate` | Public | Generates an OTP for an identifier (e.g. email), stores it, and sends it by email or SMS (purpose: verification, password-reset, login). |
| POST | `/api/v1/otp/resend` | Public | Deletes existing OTP for the identifier and sends a new OTP (e.g. "resend code"). |
| POST | `/api/v1/otp/verify` | Bearer | Verifies a submitted OTP code; for purpose `verification`, marks the user's email as verified and sets status to ACTIVE. |

#### Password (`/api/v1/password`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/password/forgot` | Public | Sends a password-reset link or OTP to the given email. |
| POST | `/api/v1/password/reset` | Public | Resets password using a valid reset token (from email link or OTP flow). |
| PUT | `/api/v1/password/change` | Bearer | Changes the authenticated user's password (requires current password). |

#### User (`/api/v1/user`) — all Bearer
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/user/list` | Lists users (e.g. for the authenticated merchant). |
| GET | `/api/v1/user/profile` | Returns the authenticated user's profile. |
| PUT | `/api/v1/user/profile` | Updates the authenticated user's profile (e.g. name, phone). |
| PUT | `/api/v1/user/email` | Updates the user's email (may send a new verification email). |
| PUT | `/api/v1/user/:userId/status` | Updates a user's status (e.g. active/suspended) by a merchant or admin. |
| POST | `/api/v1/user/deactivate` | Deactivates the authenticated user's account; sends **email + in-app** notification (template `merchant-account-status`, action `deactivated`). |
| PUT | `/api/v1/user/callbacks` | Updates callback URLs for the authenticated merchant/user. |
| GET | `/api/v1/user/info/:userId` | Returns detailed info for a user (admin). |
| POST | `/api/v1/user/verify-info/:userId` | Marks or updates verification info for a user (admin). |
| PUT | `/api/v1/user/suspend/:userId` | Suspends a user (admin). |
| PUT | `/api/v1/user/activate/:userId` | Reactivates a suspended user (admin). |

#### Roles (`/api/v1/roles`) — all Bearer
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/roles` | Creates a new role (e.g. for a merchant). |
| GET | `/api/v1/roles` | Returns roles for the current context (e.g. merchant). |
| GET | `/api/v1/roles/permissions` | Returns the list of available permissions for roles. |

#### Invitations (`/api/v1/invitations`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/invitations` | Bearer | Creates an invitation (e.g. merchant invites user by email and role). |
| GET | `/api/v1/invitations` | Bearer | Lists invitations for the authenticated merchant. |
| GET | `/api/v1/invitations/validate/:token` | Public | Validates an invitation token and returns invitation details (for the invitee). |
| POST | `/api/v1/invitations/accept` | Public | Accepts an invitation: creates user account and optionally sets password (invitee). |

#### Sessions (`/api/v1/sessions`) — all Bearer
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/sessions` | Returns the authenticated user's active sessions (e.g. devices, IPs, last activity). |
| DELETE | `/api/v1/sessions/:sessionId` | Revokes a specific session (logs out that device). |

#### Verify email (`/verify-email`) — public
| Method | Path | Description |
|--------|------|-------------|
| GET | `/verify-email/verify-email` | Verifies email using a token from the verification link (e.g. in email). |

**Total: 44 endpoints** (4 root/docs + 4 registration + 7 auth + 3 OTP + 3 password + 10 user + 3 roles + 4 invitations + 2 sessions + 1 verify-email).

---

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
Revokes the server-side session row for this device. Prefer Bearer access token; if it is expired, send only the refresh token.

```
POST /api/v1/auth/logout
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "refreshToken": "optional-if-access-expired"
}
```

#### Refresh Token
Returns **new** access and refresh tokens; the previous refresh token is invalidated (rotation).

```
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "refresh-token-string"
}
```

**Response:** `{ "success": true, "data": { "accessToken", "refreshToken" } }`

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
Authorization: Bearer <jwt-token>
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

#### Reset Password
```
POST /api/v1/password/reset
Content-Type: application/json

{
  "token": "reset-token-string",
  "password": "NewSecurePass123!"
}
```

#### Change Password
```
PUT /api/v1/password/change
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "currentPassword": "OldPass123!",
  "newPassword": "NewSecurePass123!"
}
```

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
  "phone": "+1234567890"
}
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

### Session storage (MongoDB)

Each login creates a document in the **`refresh_sessions`** collection: `user_id`, SHA-256 hash of the current refresh JWT (never the raw token), `user_agent`, `ip`, `expires_at`, `last_active_at`, `revoked_at`. **Password reset** and **password change** revoke **all** sessions for that user.

### Session Management Endpoints ✅

#### Get Active Sessions
```
GET /api/v1/sessions
Authorization: Bearer <jwt-token>
```
Returns non-revoked, non-expired sessions for the user. Each item includes `isCurrent: true` for the session tied to the access token’s `sessionId`.

**Response Example:**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "673abc...",
        "userId": "userObjectId",
        "createdAt": "2025-01-01T12:00:00.000Z",
        "lastActive": "2025-01-01T14:00:00.000Z",
        "userAgent": "Mozilla/5.0 ...",
        "ip": "::1",
        "isCurrent": true
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
   cd client-auth-ms
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

### Service Communication
| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `SERVICE_AUTH_URL` | string | `http://localhost:3000` | Base URL for service-auth-ms communication |
| `NOTIFICATIONS_SERVICE_URL` | string | `http://localhost:4009` (dev); production often `https://notifications-ms-plata.fly.dev` or your deployed URL | Base URL for notifications-ms: OTP/verification/password flows use `POST /api/v1/notifications/send`; merchant welcome and account deactivation use `POST /api/v1/notifications/send-dual` (see `src/services/NotificationService.ts`) |

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
- Password reset tokens must be valid and not expired

## Complete Coverage ✅

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
| **Administration** | Suspend/Activate users, Verify info | ✅ Complete |
| **Health & Monitoring** | Health check endpoint | ✅ Complete |

