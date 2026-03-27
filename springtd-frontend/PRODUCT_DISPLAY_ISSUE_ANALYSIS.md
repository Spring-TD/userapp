# Product Display Issue - Root Cause Analysis

**Date:** February 16, 2026  
**Issue:** Products created in Product Builder (Platter) are not displaying in Spring App

---

## Executive Summary

After thorough investigation, I've identified **THREE CRITICAL ISSUES** that are preventing products from displaying in the Spring App:

1. ✅ **Data Persistence is Working** - The backend uses file-based storage on Fly.dev volumes
2. ❌ **Missing Data Files** - The products.json file doesn't exist in the data directory
3. ❌ **Potential AppId Mismatch** - Products may be created with one appId but queried with another

---

## System Architecture Overview

### The Flow (How It Should Work)

```
Product Builder (Platter)                Spring App (Merchant Dashboard)
        ↓                                           ↓
Create Product with appId              Query Products by appId
        ↓                                           ↓
    POST /api/products                      GET /api/products?appId=xxx
        ↓                                           ↓
    product-ms backend                      product-ms backend
        ↓                                           ↓
Save to /data/products.json             Read from /data/products.json
```

### Current Implementation

**Product Builder (Platter):**
- Location: `/app/dashboard/create-app/all-apps/[id]/products/`
- Creates products via: `POST /api/products`
- Includes `appId` in the request body

**Spring App (Merchant Dashboard):**
- Location: `/app/dashboard/merchant/products/all/loan/`
- Fetches products via: `GET /api/products?appId=xxx`
- Gets appId from URL query parameter

**Backend (product-ms):**
- File: `/server/product-ms/src/services/productService.ts`
- Storage: `/data/products.json` (on Fly.dev volume)
- Volume: `product_data` mounted at `/data`

---

## Root Cause Analysis

### Issue #1: Empty Data Directory ✅ CONFIRMED

**Finding:**
```bash
/home/majek/springtddashboard1/server/product-ms/data/
# Directory exists but is EMPTY - no products.json file
```

**Why This Happens:**
1. The local `data/` directory is just for development
2. On Fly.dev, data is stored in the mounted volume at `/data`
3. The local directory doesn't reflect what's on the production server

**Impact:** 
- We cannot verify if products exist on the production server from the local filesystem
- Need to check the actual Fly.dev deployment

---

### Issue #2: AppId Mismatch Potential ⚠️ NEEDS VERIFICATION

**Product Creation Flow:**
```typescript
// In Product Builder: /app/dashboard/create-app/all-apps/[id]/products/page.tsx
const appId = params.id as string  // From URL parameter

// Creates product with this appId
await productApi.createProduct({
  name: productData.name,
  description: productData.description,
  type: productType,
  appId: appId  // ← This appId
})
```

**Product Fetching Flow:**
```typescript
// In Spring App: /dashboard/merchant/page.tsx
const handleAppClick = (app: App) => {
  sessionStorage.setItem('selectedAppId', app.id)
  router.push(`/dashboard/merchant/products/all/loan?appId=${app.id}`)
}

// In ProductCards component
const appId = searchParams.get('appId') || undefined
const data = await productApi.getProductsByAppId(appId)  // ← Queries with this appId
```

**Potential Mismatch:**
- Product Builder uses `params.id` (from create-app route)
- Spring App uses `app.id` (from apps API response)
- These might be different values!

---

### Issue #3: Backend Service May Be Stopped 🔴 CRITICAL

**Fly.dev Configuration:**
```toml
# fly.toml
[http_service]
  auto_stop_machines = 'stop'
  auto_start_machines = true
  min_machines_running = 0
```

**What This Means:**
- When there's no traffic, the machine stops
- When stopped, the service is not running
- When a request comes in, it auto-starts (cold start)
- **Data persists** because it's on a volume, not in memory

**However:**
The service DOES use file-based persistence:
```typescript
// productService.ts
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');

private saveProducts(): void {
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(this.products, null, 2));
}
```

So products **should persist** across restarts.

---

## Diagnostic Steps Required

### Step 1: Check Fly.dev Deployment Status

```bash
# SSH into the product-ms machine
fly ssh console -a product-ms

# Check if data directory exists and has files
ls -la /data/
cat /data/products.json

# Check if products exist
cat /data/products.json | jq '.[] | {id, name, appId, type}'
```

### Step 2: Verify AppId Consistency

**Check what appId is used when creating products:**
```bash
# In browser console when creating a product in Platter
console.log('Creating product with appId:', appId)
```

**Check what appId is used when fetching products:**
```bash
# In browser console when viewing products in Spring App
console.log('Fetching products with appId:', appId)
```

### Step 3: Check API Logs

```bash
# View product-ms logs
fly logs -a product-ms

# Look for:
# - Product creation requests (POST /api/v1/products)
# - Product fetch requests (GET /api/v1/products/app/:appId)
# - Any errors or mismatches
```

### Step 4: Test Direct API Calls

```bash
# Get auth token from localStorage in browser console
const token = localStorage.getItem('accessToken')

# Test creating a product
curl -X POST https://product-ms.fly.dev/api/v1/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Test Product",
    "description": "Testing",
    "type": "Loan",
    "appId": "YOUR_APP_ID"
  }'

# Test fetching products
curl https://product-ms.fly.dev/api/v1/products/app/YOUR_APP_ID \
  -H "Authorization: Bearer $TOKEN"
```

---

## Most Likely Scenarios

### Scenario A: Products Were Never Created Successfully ⚠️

**Evidence:**
- Empty local data directory
- No products.json file

**Possible Causes:**
1. Authentication failures when creating products
2. Network errors during product creation
3. Backend service was down during creation attempts
4. Products were created but file write failed

**How to Verify:**
- Check browser console for errors during product creation
- Check product-ms logs for failed POST requests
- Try creating a new product and watch the network tab

---

### Scenario B: AppId Mismatch 🔴 HIGH PROBABILITY

**Evidence:**
- Product Builder uses route parameter `params.id`
- Spring App uses app object `app.id`
- These might be different values

**Example:**
```
Product Builder creates product with:
  appId: "abc123" (from /create-app/all-apps/abc123/products)

Spring App queries with:
  appId: "xyz789" (from apps API response)

Result: No products found because appId doesn't match
```

**How to Verify:**
1. Create a product in Platter
2. Note the appId used (check URL or console)
3. Go to Spring App
4. Note the appId used (check URL or console)
5. Compare the two values

---

### Scenario C: Products Exist But Query Fails 🟡 POSSIBLE

**Evidence:**
- Products might exist in /data/products.json on Fly.dev
- But query by appId returns empty

**Possible Causes:**
1. AppId format mismatch (case sensitivity, extra characters)
2. Products created with status='incomplete' (Spring App might filter these)
3. Products created with isActive=false
4. Backend filtering logic issue

**How to Verify:**
- SSH into Fly.dev and check actual products.json content
- Compare appId values exactly (including case, spaces, etc.)

---

## Recommended Fix Strategy

### Immediate Actions (Do These First)

1. **Add Comprehensive Logging**
   - Log appId when creating products in Platter
   - Log appId when fetching products in Spring App
   - Log all product creation/fetch requests in backend

2. **Verify AppId Consistency**
   - Ensure the same appId is used for creation and fetching
   - Add appId validation and normalization

3. **Check Fly.dev Data**
   - SSH into product-ms
   - Verify products.json exists and contains data
   - Check if appIds match expectations

### Short-term Fixes

1. **Add Better Error Handling**
   ```typescript
   // In ProductCards component
   if (data.success && data.data) {
     console.log('Products fetched:', data.data.length, 'for appId:', appId)
     if (data.data.length === 0) {
       console.warn('No products found for appId:', appId)
       console.warn('Available products:', await productApi.getAllProducts())
     }
   }
   ```

2. **Add AppId Debugging UI**
   - Show current appId in both Platter and Spring App
   - Add a "Debug Info" panel showing:
     - Current appId
     - Number of products for this appId
     - All products (for debugging)

3. **Implement Fallback Query**
   ```typescript
   // If no products found by appId, try fetching all products
   if (products.length === 0 && appId) {
     const allProducts = await productApi.getAllProducts()
     console.log('All products:', allProducts)
     // Show user which appIds have products
   }
   ```

### Long-term Solutions

1. **Database Migration**
   - Move from file-based storage to PostgreSQL
   - Better data integrity and querying
   - Proper indexing on appId

2. **Unified App Management**
   - Ensure apps created in Platter are accessible in Spring App
   - Single source of truth for app data
   - Consistent appId across all services

3. **Better Testing**
   - Integration tests for product creation → fetching flow
   - E2E tests covering both Platter and Spring App
   - Automated checks for appId consistency

---

## Code Locations Reference

### Frontend

**Product Builder (Platter):**
- Main page: `/app/dashboard/create-app/all-apps/[id]/products/page.tsx`
- Overview: `/app/dashboard/create-app/all-apps/[id]/products/overview/page.tsx`

**Spring App (Merchant Dashboard):**
- Main page: `/app/dashboard/merchant/page.tsx`
- Products wrapper: `/components/merchant-products-wrapper.tsx`
- Product cards: `/components/product-cards.tsx`

**API Layer:**
- Product API: `/lib/product-api.ts`
- API route: `/app/api/products/route.ts`

### Backend

**Product Microservice:**
- Service: `/server/product-ms/src/services/productService.ts`
- Controller: `/server/product-ms/src/controllers/productController.ts`
- Routes: `/server/product-ms/src/routes/productRoutes.ts`
- Config: `/server/product-ms/fly.toml`

---

## Next Steps

1. **Run Diagnostics** (Steps 1-4 above)
2. **Identify Root Cause** (Scenario A, B, or C)
3. **Implement Appropriate Fix**
4. **Test End-to-End**
5. **Document Solution**

---

## Questions to Answer

- [ ] Does /data/products.json exist on Fly.dev?
- [ ] Are there any products in the file?
- [ ] What appIds are in the products?
- [ ] What appId is used when creating products in Platter?
- [ ] What appId is used when fetching products in Spring App?
- [ ] Are these appIds the same?
- [ ] Are there any authentication errors in the logs?
- [ ] Is the product-ms service running and healthy?

---

*This analysis should be used as a guide to systematically debug and resolve the product display issue.*
