# Backend Issues That Need to Be Fixed

## Critical Issues

### 1. JWT Secret Mismatch
**Problem:** Plata's services reject tokens from the auth service

**Services Affected:**
- `create-app-ms-plata.fly.dev` - Returns "Invalid or expired token"
- `product-ms-plata.fly.dev` - May have same issue

**Root Cause:** Plata's services are using a different JWT secret than `service-auth-ms.fly.dev`

**Fix Required:**
- Configure all Plata services to use the same JWT secret as the auth service
- OR provide the JWT secret that Plata services expect
- Current JWT secret in use: `Jb@1zP!k9#tW$xL&5aVn*QyR7gE^cF#Qb23`

**Impact:** Cannot create apps or products in Product Builder (Plata)

---

### 2. Database Persistence Issues
**Problem:** Data is being lost/reset periodically

**Evidence:**
- Created account with email `majekgb@gmail.com` - disappeared after some time
- Created app with ID `90hh4xu1u` - disappeared
- Created product with ID `6pl3iuaqi` - disappeared

**Services Affected:**
- `service-auth-ms.fly.dev` - User accounts disappearing
- `create-app-ms.fly.dev` - Apps disappearing
- `product-ms-plata.fly.dev` - Products disappearing

**Root Cause:** 
- Databases may be using in-memory storage (data lost on restart)
- OR databases not configured with persistent volumes on Fly.io
- OR databases being reset/cleared periodically

**Fix Required:**
- Configure persistent storage for all microservice databases
- Ensure Fly.io volumes are properly attached
- Verify database connection strings point to persistent storage

**Impact:** All data is temporary, making development and testing impossible

---

### 3. Product Sync Between Plata and Spring
**Problem:** Spring's Product MS doesn't fetch products from Plata's Product MS

**Expected Flow (from docs):**
1. Product Builder (Plata) creates products in `product-ms-plata.fly.dev`
2. Spring App fetches products from "server product service" via `product-ms.fly.dev`
3. Spring merchants configure/activate those products

**Current Reality:**
- `product-ms.fly.dev` returns empty array
- No connection between Plata's and Spring's Product MS
- Products created in Plata don't appear in Spring

**Fix Required:**
- Configure Spring's `product-ms.fly.dev` to connect to Plata's `product-ms-plata.fly.dev`
- OR configure both to share the same database
- OR create a sync/fetch endpoint that pulls products from Plata to Spring
- Clarify what "server product service" means in the docs

**Impact:** Spring TD Dashboard cannot fetch products from Product Builder

---

## Secondary Issues

### 4. Plata Auth Service Incomplete
**Problem:** `service-auth-ms-plata.fly.dev` doesn't have standard auth endpoints

**Missing Endpoints:**
- `/api/v1/auth/login` - Returns "Cannot POST"
- `/api/v1/auth/register/merchant` - Returns "Cannot POST"

**Current Workaround:** Using Spring's auth service for both apps

**Fix Required:**
- Deploy full auth service to `service-auth-ms-plata.fly.dev`
- OR document that both apps should use Spring's auth service

**Impact:** Cannot use separate auth for Product Builder

---

### 5. Wallet Service Connection Issues
**Problem:** Wallet creation fails when creating apps

**Error Message:**
```json
{
  "wallets": {
    "success": false,
    "error": "connect ECONNREFUSED ::1:4004"
  }
}
```

**Root Cause:** Wallet service not accessible or wrong port configuration

**Fix Required:**
- Verify wallet service is running and accessible
- Check port configuration (trying to connect to localhost:4004)
- Update service URLs to use Fly.io URLs instead of localhost

**Impact:** Apps created without wallets

---

## Summary of Required Actions

### Immediate (Blocking Development):
1. ✅ **Fix JWT secret mismatch** - Configure Plata services to accept auth tokens
2. ✅ **Enable database persistence** - Stop data from disappearing
3. ✅ **Connect Plata and Spring Product MS** - Enable product fetching

### Important (Affects Functionality):
4. **Deploy Plata auth service** - OR document shared auth approach
5. **Fix wallet service connection** - Enable wallet creation

---

## Testing Checklist (After Fixes)

Once backend issues are fixed, test this flow:

### Product Builder (Plata):
1. Register merchant account → Should persist
2. Login → Should work with same account
3. Create app → Should save to database
4. Create product → Should save to database
5. Logout and login again → Data should still exist

### Spring TD Dashboard:
1. Login with same account
2. Fetch products → Should see products from Plata
3. Toggle product activation → Should save configuration
4. Update product config → Should save pricing settings
5. Refresh page → Configuration should persist

---

## Contact Backend Team

Please provide:
1. **JWT Secret** used by Plata services
2. **Database configuration** for all services (persistent vs in-memory)
3. **Product sync strategy** - How should Spring fetch from Plata?
4. **Wallet service URL** - Correct endpoint for wallet creation
5. **Auth strategy** - Should Plata have separate auth or share with Spring?

---

## Current Working Setup (Temporary)

For development, we're using:
- **Auth:** `service-auth-ms.fly.dev` (Spring's auth)
- **Create App:** `create-app-ms.fly.dev` (Spring's create-app)
- **Products:** Cannot test - no persistent data

**Credentials (will be lost on next reset):**
- Email: majekgb@gmail.com
- Password: TestPass123!
