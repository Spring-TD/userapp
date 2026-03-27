# Spring Product Service Integration

## What Was Created

### 1. **Spring Product Service** (`/lib/springProductService.ts`)
API service layer for integrating with Spring App's Product MS.

**Functions:**
- `getAllProducts()` - Fetch all products from Product Builder
- `getProductsByMerchant(merchantId)` - Fetch products for specific merchant
- `toggleProductActivation(merchantId, productId, activate)` - Activate/deactivate products
- `updateProductConfig(merchantId, productId, config)` - Update pricing and configuration
- `getProductConfig(merchantId, productId)` - Get merchant-specific configuration
- `getMerchantId()` - Extract merchant ID from JWT token

**Merchant ID Resolution:**
The service automatically extracts merchant ID from JWT token by checking these fields in order:
1. `userMerchantId`
2. `user_merchant_id`
3. `merchantId`
4. `userId`
5. `id`
6. `sub`

### 2. **JWT Debug Utility** (`/lib/debugJWT.ts`)
Helper to inspect JWT token payload and see what fields are available.

**Usage:**
```typescript
import { debugJWT } from '@/lib/debugJWT'

// In browser console or component
debugJWT()
```

Or directly in browser console:
```javascript
window.debugJWT()
```

### 3. **Test Component** (`/components/spring-product-test.tsx`)
React component to test the integration.

**Features:**
- Shows merchant ID from token
- Debug JWT button (logs to console)
- Fetch all products button
- Toggle product activation

### 4. **Test Page** (`/app/test-spring-product/page.tsx`)
Accessible at: `/test-spring-product`

## How to Test

### Step 1: Login
Make sure you're logged in to the dashboard so you have a valid JWT token.

### Step 2: Access Test Page
Navigate to: `http://localhost:3000/test-spring-product`

### Step 3: Debug JWT
Click "Debug JWT (Check Console)" and open browser console to see:
- Full JWT payload
- All merchant ID candidate fields
- Resolved merchant ID

### Step 4: Fetch Products
Click "Fetch All Products" to test the Product MS integration.

### Step 5: Toggle Products
If products are fetched, you can test activating/deactivating them.

## Integration with Existing UI

Once you confirm the merchant ID is correctly extracted, you can use the service in your existing components:

```typescript
import { springProductService } from '@/lib/springProductService'

// In your component
const merchantId = springProductService.getMerchantId()

// Fetch products
const response = await springProductService.getAllProducts()

// Toggle activation
await springProductService.toggleProductActivation(merchantId, productId, true)

// Update configuration
await springProductService.updateProductConfig(merchantId, productId, {
  pricingType: 'percent',
  pricingCondition: 'With cap',
  upperCap: 10000,
  lowerCap: 2000,
  markupRate: 5.0,
})
```

## Next Steps

1. **Verify Merchant ID**: Run the test page and check console to confirm merchant ID is extracted correctly
2. **Test API Calls**: Try fetching products and toggling activation
3. **Update Existing UI**: Once confirmed working, integrate into your existing product management components
4. **Add Configuration UI**: Create forms for updating pricing configuration (pricingType, caps, fees, markup rates)

## API Endpoints Used

All endpoints point to: `https://product-ms.fly.dev`

- `GET /api/v1/products` - Get all products
- `GET /api/v1/products/merchant/:merchantId` - Get merchant products
- `PUT /api/v1/products/toggle/:merchantId/:productId` - Toggle activation
- `PUT /api/v1/products/config/:merchantId/:productId` - Update config
- `GET /api/v1/products/config/:merchantId/:productId` - Get config

## Authentication

All requests automatically include the JWT token from localStorage via the `getAuthHeaders()` function.

## Error Handling

All service functions throw errors with descriptive messages. Use try-catch blocks:

```typescript
try {
  await springProductService.toggleProductActivation(merchantId, productId, true)
  toast.success('Product activated')
} catch (error: any) {
  toast.error(error.message)
}
```
