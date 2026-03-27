# Product Display Issue - Investigation Summary & Action Plan

**Date:** February 16, 2026  
**Status:** 🔴 CRITICAL - Products not displaying in Spring App  
**Priority:** P0 - Must fix immediately

---

## 🎯 The Problem

When you:
1. Log into **Product Builder (Platter)**
2. Create an app
3. Create products under that app

Then log into **Spring App** → The products **don't display**.

---

## 🔍 What I Found

### ✅ Good News

1. **Backend is properly configured** with persistent storage
   - Uses Fly.dev volumes (`/data` directory)
   - File-based storage: `products.json` and `configurations.json`
   - Data persists across service restarts

2. **API integration is correct**
   - Product Builder creates products via `POST /api/products`
   - Spring App fetches products via `GET /api/products?appId=xxx`
   - Both use proper authentication

3. **Code flow is correct**
   - Product Builder passes `appId` when creating products
   - Spring App passes `appId` when fetching products

### ⚠️ The Issues

I identified **THREE POTENTIAL ROOT CAUSES**:

#### Issue #1: AppId Mismatch (MOST LIKELY) 🔴

**What's happening:**
- Product Builder might be using one `appId` value
- Spring App might be using a different `appId` value
- Products exist but can't be found because appIds don't match

**Evidence:**
```typescript
// Product Builder uses:
const appId = params.id  // From URL: /create-app/all-apps/[id]/products

// Spring App uses:
const appId = app.id  // From apps API response
```

These might be **different values**!

**How to verify:**
1. Open browser console in Product Builder
2. Create a product and log the appId
3. Open browser console in Spring App  
4. View products and log the appId
5. Compare - do they match?

---

#### Issue #2: Products Never Created Successfully 🟡

**What's happening:**
- Product creation API calls might be failing silently
- Network errors, authentication failures, or backend errors
- No products actually exist in the database

**How to verify:**
1. Check browser console for errors when creating products
2. Check network tab - is the POST request successful?
3. SSH into Fly.dev: `fly ssh console -a product-ms`
4. Check if products exist: `cat /data/products.json`

---

#### Issue #3: Backend Service Issues 🟡

**What's happening:**
- Service might be stopped (auto-stop enabled)
- Cold starts causing timeouts
- Volume mount issues

**How to verify:**
1. Check service status: `fly status -a product-ms`
2. Check logs: `fly logs -a product-ms`
3. Test API directly with curl

---

## 🛠️ Immediate Action Plan

### Step 1: Add Debug Panel (DO THIS FIRST)

I've created a debug component that will show you EXACTLY what's happening.

**Add to Product Builder:**
```tsx
// In /app/dashboard/create-app/all-apps/[id]/products/overview/page.tsx
import { ProductDebugPanel } from "@/components/product-debug-panel"

export default function ProductsPage() {
  const appId = params.id as string
  
  return (
    <div>
      {/* Your existing code */}
      
      {/* Add this at the bottom */}
      <ProductDebugPanel appId={appId} location="platter" />
    </div>
  )
}
```

**Add to Spring App:**
```tsx
// In /components/merchant-products-wrapper.tsx
import { ProductDebugPanel } from "@/components/product-debug-panel"

function MerchantProductsContent({ category, theme, appId }: Props) {
  return (
    <div>
      {/* Your existing code */}
      
      {/* Add this at the bottom */}
      <ProductDebugPanel appId={appId} location="spring" />
    </div>
  )
}
```

**What this will show you:**
- Current appId being used
- Number of products for this appId
- Total products in system
- All appIds that have products
- Sample products with their appIds
- **Instant diagnosis of appId mismatch!**

---

### Step 2: Check Fly.dev Production Data

```bash
# SSH into product-ms
fly ssh console -a product-ms

# Check if data directory exists
ls -la /data/

# Check if products.json exists and view contents
cat /data/products.json | jq '.'

# Count products
cat /data/products.json | jq '. | length'

# Show all appIds
cat /data/products.json | jq '.[] | .appId' | sort | uniq

# Exit
exit
```

---

### Step 3: Check Logs

```bash
# View recent logs
fly logs -a product-ms

# Look for:
# - Product creation requests (POST /api/v1/products)
# - Product fetch requests (GET /api/v1/products/app/:appId)
# - Any errors or 404s
# - AppId values in requests
```

---

### Step 4: Test API Directly

```bash
# Get your auth token from browser console
# Open browser console and run:
localStorage.getItem('accessToken')

# Then test the API:
TOKEN="your_token_here"

# Create a test product
curl -X POST https://product-ms.fly.dev/api/v1/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Debug Test Product",
    "description": "Testing product creation",
    "type": "Loan",
    "appId": "YOUR_APP_ID_HERE"
  }'

# Fetch products for that app
curl https://product-ms.fly.dev/api/v1/products/app/YOUR_APP_ID_HERE \
  -H "Authorization: Bearer $TOKEN"

# Fetch ALL products
curl https://product-ms.fly.dev/api/v1/products \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🎯 Expected Outcomes

After Step 1 (Debug Panel), you will **immediately see**:

### Scenario A: AppId Mismatch
```
Current AppId: abc123
Products for This App: 0
Total Products: 5

All AppIds in System:
→ abc123 (current)
  xyz789
  def456

⚠️ AppId Mismatch Detected!
There are 5 products but none match appId 'abc123'
```

**Fix:** Ensure both Platter and Spring use the same appId

---

### Scenario B: No Products Exist
```
Current AppId: abc123
Products for This App: 0
Total Products: 0

All AppIds in System:
(empty)

⚠️ No Products Found!
No products exist in the system.
```

**Fix:** Products were never created successfully - check API errors

---

### Scenario C: Products Exist and Match
```
Current AppId: abc123
Products for This App: 3
Total Products: 5

Sample Products:
✓ Quick Loan (Loan) - AppId: abc123 - Active
✓ Home Mortgage (Mortgage) - AppId: abc123 - Active
✓ Savings Plan (Savings) - AppId: abc123 - Active
```

**This means:** Products exist but there's a different issue (filtering, UI bug, etc.)

---

## 📋 Quick Checklist

- [ ] Add ProductDebugPanel to both Platter and Spring App
- [ ] Open Product Builder and check debug panel
- [ ] Note the appId and product count
- [ ] Open Spring App and check debug panel
- [ ] Compare appIds - do they match?
- [ ] SSH into Fly.dev and check /data/products.json
- [ ] Check Fly.dev logs for errors
- [ ] Test API directly with curl
- [ ] Report findings

---

## 🔧 Likely Fixes

### If AppId Mismatch:

**Option 1: Normalize AppId (Recommended)**
```typescript
// Create a utility function
export const normalizeAppId = (id: string) => {
  return id.trim().toLowerCase()
}

// Use everywhere:
const appId = normalizeAppId(params.id)
```

**Option 2: Use Consistent Source**
```typescript
// Always use the same source for appId
// Either always from URL params or always from API response
// Never mix the two
```

---

### If Products Don't Exist:

**Check for errors in product creation:**
```typescript
// Add error logging in Product Builder
try {
  const result = await productApi.createProduct(data)
  console.log('✅ Product created:', result)
} catch (error) {
  console.error('❌ Failed to create product:', error)
  toast.error('Failed to create product: ' + error.message)
}
```

---

### If Backend Issues:

**Increase timeout and add retry:**
```typescript
// In /app/api/products/route.ts
const response = await axios.post(url, body, {
  headers: { ... },
  timeout: 30000,  // Increase to 30 seconds
  retry: 3  // Retry failed requests
})
```

---

## 📚 Reference Files

- **Analysis:** `PRODUCT_DISPLAY_ISSUE_ANALYSIS.md`
- **Debug Panel:** `components/product-debug-panel.tsx`
- **Diagnostic Script:** `diagnose-product-issue.sh`
- **System Architecture:** `SYSTEM_ARCHITECTURE.md`

---

## 🚀 Next Steps

1. **Add the debug panel** (5 minutes)
2. **Run the diagnostic** (10 minutes)
3. **Identify the root cause** (based on debug panel output)
4. **Apply the appropriate fix** (15-30 minutes)
5. **Test end-to-end** (10 minutes)
6. **Document the solution** (5 minutes)

**Total estimated time:** 45-60 minutes

---

## 💡 Pro Tips

1. **Always check the debug panel first** - it will save hours of debugging
2. **Compare appIds character by character** - even a space or case difference breaks it
3. **Check Fly.dev logs in real-time** while creating/fetching products
4. **Test with a fresh product** - create one specifically for debugging
5. **Use browser console** - log everything during the flow

---

**Once you run the debug panel, you'll know EXACTLY what the issue is. Report back what you see!**
