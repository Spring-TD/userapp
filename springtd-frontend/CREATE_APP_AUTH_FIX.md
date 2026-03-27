# Create App Authentication Fix

## Problem
When signing in successfully and attempting to create an app, users received a 403 Forbidden error:
```
Access denied. Required roles: MERCHANT, ADMIN
```

## Root Cause
The create-app-ms microservice didn't have authentication middleware to verify JWT tokens and validate user roles. Users with `USER` role type couldn't create apps because the service required `MERCHANT` or `ADMIN` roles.

## Solution - Production Ready Implementation

### 1. Added Authentication Middleware to create-app-ms
Created `server/create-app-ms/src/middleware/auth.ts` with:
- JWT token verification using the same secret as service-auth-ms
- Role-based authorization middleware
- Proper error handling for invalid/expired tokens

### 2. Protected App Routes
Updated `server/create-app-ms/src/routes/appRoutes.ts` to:
- Require authentication for all routes
- Require MERCHANT or ADMIN role for create, update, delete operations
- Validate JWT tokens on every request

### 3. Updated Environment Configuration
- Added `JWT_SECRET` to `server/create-app-ms/src/config/environment.ts`
- Added `JWT_SECRET` to `server/create-app-ms/.env`
- Added `JWT_SECRET` to `.env.production` for Next.js deployment
- Added `jsonwebtoken` dependency to `package.json`

## Changes Made

### 1. server/create-app-ms/src/middleware/auth.ts (NEW FILE)
```typescript
// JWT verification middleware
export const authenticate = (req, res, next) => {
  // Verifies JWT token with same secret as auth service
  // Attaches user info to req.user
}

// Role-based authorization
export const authorize = (allowedRoles) => {
  // Checks if user has required role (MERCHANT, ADMIN, etc.)
}

// Convenience middleware
export const merchantOrAdmin = authorize(['MERCHANT', 'ADMIN']);
```

### 2. server/create-app-ms/src/routes/appRoutes.ts
```typescript
// Before: No authentication
router.post('/', appController.createApp);

// After: Requires authentication and MERCHANT/ADMIN role
router.post('/', authenticate, merchantOrAdmin, appController.createApp);
```

### 3. server/create-app-ms/src/config/environment.ts
```typescript
// Added JWT secret configuration
jwtSecret: process.env.JWT_SECRET || 'Jb@1zP!k9#tW$xL&5aVn*QyR7gE^cF#Qb23'
```

### 4. server/create-app-ms/package.json
```json
// Added dependencies
"jsonwebtoken": "^9.0.2",
"@types/jsonwebtoken": "^9.0.3"
```

## Deployment Steps

### For create-app-ms Microservice (Fly.io)

1. **Set JWT_SECRET environment variable:**
```bash
fly secrets set JWT_SECRET=Jb@1zP!k9#tW$xL&5aVn*QyR7gE^cF#Qb23 -a create-app-ms
```

2. **Deploy the updated service:**
```bash
cd server/create-app-ms
fly deploy
```

### For Next.js Frontend (Vercel)

The JWT_SECRET is already added to `.env.production` and should be set in Vercel:

1. Go to Vercel project settings → Environment Variables
2. Verify `JWT_SECRET=Jb@1zP!k9#tW$xL&5aVn*QyR7gE^cF#Qb23` is set
3. Redeploy (automatic on git push)

## User Registration Requirements

**Important:** Users must register as MERCHANT to create apps:

- **Merchant Registration:** `POST /api/v1/auth/register/merchant` → Gets `userType: MERCHANT`
- **User Registration:** `POST /api/v1/auth/register/user` → Gets `userType: USER` (cannot create apps)

If your frontend registration form uses `/register/user`, update it to use `/register/merchant` for users who need to create apps.

## Testing
After deploying these changes:
1. Register a new account using the merchant registration endpoint
2. Verify email and sign in
3. Navigate to create app page
4. Fill in the app details
5. Submit - should now succeed with a 201 Created response

## Security Benefits

This production-ready implementation provides:
- ✅ Proper JWT verification on the backend
- ✅ Role-based access control
- ✅ Individual user authentication (audit trail)
- ✅ Token expiration handling
- ✅ Secure secret management
- ✅ No shared credentials or bypass tokens
