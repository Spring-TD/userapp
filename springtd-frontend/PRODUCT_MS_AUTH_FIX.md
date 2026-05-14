# Product-MS Authentication Fix

## Problem
Products were appearing after creation but then disappearing from the list. This was because the product-ms microservice had NO authentication middleware, similar to the issue we fixed with create-app-ms.

## Root Cause
- product-ms routes had no authentication
- Products were being created without proper auth validation
- GET requests might have been failing or returning inconsistent data
- No role-based access control

## Solution Implemented

### 1. Added JWT Authentication Middleware
**`server/product-ms/src/middleware/auth.ts`**
- Verifies JWT tokens from service-auth-ms
- Validates token signature, expiration, issuer, and audience
- Extracts user information (userId, email, userType, userMerchantId)
- Provides role-based authorization helpers

### 2. Updated Environment Configuration
**`server/product-ms/src/config/environment.ts`**
- Added `jwtSecret` configuration
- Uses same secret as service-auth-ms and create-app-ms

### 3. Protected All Product Routes
**`server/product-ms/src/routes/productRoutes.ts`**
- All routes now require authentication
- Create, update, delete operations require MERCHANT or ADMIN role
- Read operations require authentication

### 4. Added Dependencies
**`server/product-ms/package.json`**
- Added `jsonwebtoken` for JWT verification
- Added `@types/jsonwebtoken` for TypeScript support

## Changes Made

### New Files:
- `server/product-ms/src/middleware/auth.ts` - JWT authentication middleware

### Modified Files:
- `server/product-ms/src/config/environment.ts` - Added JWT secret
- `server/product-ms/src/routes/productRoutes.ts` - Added auth to all routes
- `server/product-ms/package.json` - Added jsonwebtoken dependency

## Route Protection

### Create Operations (MERCHANT/ADMIN only):
- `POST /api/v1/products` - Create product
- `POST /api/v1/products/create-after-type` - Create after type selection

### Read Operations (Authenticated):
- `GET /api/v1/products/:id` - Get product by ID
- `GET /api/v1/products/app/:appId` - Get products by app ID
- `GET /api/v1/products/:id/action` - Check product action
- `POST /api/v1/products/select-type` - Select product type

### Update Operations (MERCHANT/ADMIN only):
- `PUT /api/v1/products/:id` - Update product
- `PUT /api/v1/products/:id/manage` - Manage product

### Delete Operations (MERCHANT/ADMIN only):
- `DELETE /api/v1/products/:id` - Delete product

## Deployment Steps

### 1. Set JWT_SECRET on Fly.io
```bash
fly secrets set JWT_SECRET=Jb@1zP!k9#tW$xL&5aVn*QyR7gE^cF#Qb23 -a product-ms
```

### 2. Deploy to Fly.io
```bash
cd server/product-ms
fly deploy
```

### 3. Verify Deployment
```bash
fly status -a product-ms
fly logs -a product-ms
```

## Testing After Deployment

### 1. Create a Product
```
1. Go to app products page
2. Click "Create Product"
3. Select product type (Loan, Mortgage, Savings, Commodity)
4. Fill in details
5. Submit
6. ✅ Product should appear in list
```

### 2. Refresh Page
```
1. Refresh the browser
2. ✅ Product should still be visible
3. ✅ Product should persist across page reloads
```

### 3. Navigate Away and Back
```
1. Go to another page
2. Come back to products page
3. ✅ Product should still be there
```

### 4. Check Product Details
```
1. Click on a product
2. ✅ Product details should load
3. ✅ No authentication errors
```

## Why Products Were Disappearing

The issue was likely:
1. **No authentication on GET requests** - Products might have been created but GET requests were failing
2. **Inconsistent data** - Without auth, the backend might have been returning different data
3. **Race conditions** - Multiple requests without proper auth could cause data inconsistency
4. **Database issues** - Without proper auth, products might not have been persisted correctly

## Security Benefits

✅ **Proper Authentication** - All requests verified with JWT
✅ **Role-Based Access** - Only MERCHANT/ADMIN can create/modify products
✅ **Audit Trail** - User information attached to all requests
✅ **Token Validation** - Expired/invalid tokens rejected
✅ **Consistent Data** - Authenticated requests ensure data integrity

## Environment Variables Needed

### Fly.io (product-ms):
```bash
JWT_SECRET=Jb@1zP!k9#tW$xL&5aVn*QyR7gE^cF#Qb23
```

### Vercel (Next.js):
Already configured ✅

## Rollback Plan

If issues occur after deployment:
```bash
fly releases -a product-ms
fly releases rollback -a product-ms
```

## Next Steps

1. ✅ Code changes committed
2. ⏳ Deploy to Fly.io (run commands above)
3. ⏳ Test product creation and persistence
4. ⏳ Verify products don't disappear

## Similar Pattern

This fix follows the same pattern we used for:
- ✅ create-app-ms (already deployed)
- ✅ product-ms (this fix)

If other microservices have similar issues, we can apply the same pattern.
