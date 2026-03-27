# Spring App Product Activation - Demo Guide

## Overview
This guide explains how to activate products in Spring App so they appear in the Mobile App.

## The Flow

### 1. Product Builder (Plata)
- Merchant creates App (gets appId: `abc123`)
- Merchant creates products under that app
- Products stored with `appId: abc123`

### 2. Spring App
- Merchant logs in to Spring App (has springAppId: `wdpgeo0o0`)
- Merchant sees ALL products from Product Builder
- Merchant activates products they want to offer
- **Activation sets `springAppId: wdpgeo0o0` on the product**

### 3. Mobile App
- Fetches products WHERE `springAppId = wdpgeo0o0`
- Shows ONLY activated products

## How to Activate Products (For Demo)

### Option 1: Manual Activation via API
Use the product-ms API to activate products:

```bash
# Activate a product
curl -X PUT https://product-ms.fly.dev/api/v1/products/{productId} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "springAppId": "wdpgeo0o0",
    "isActive": true
  }'
```

### Option 2: Via Spring App UI (TODO)
The Spring App UI needs an "Activate" button that calls:
```typescript
await productApi.updateProduct(productId, {
  springAppId: 'wdpgeo0o0',
  isActive: true
});
```

### Option 3: Quick Demo Setup (Temporary)
For the demo, you can manually update the products.json file:

1. SSH into product-ms or access the data directory
2. Edit `/data/products.json`
3. Add `"springAppId": "wdpgeo0o0"` to products you want to activate
4. Restart product-ms

## Current Status

### ✅ Implemented:
- `springAppId` field in Product model
- Backend filtering by springAppId
- Mobile app fetches by springAppId
- API proxy passes springAppId

### ⚠️ TODO for Demo:
- Add "Activate" button in Spring App UI
- Wire up activation API call
- Test end-to-end flow

### 📝 Post-Demo Improvements:
- Make springAppId dynamic (not hardcoded)
- Implement many-to-many relationship
- Add bulk activation feature
- Add activation history/audit log

## Environment Variables

Add to `.env.local`:
```bash
NEXT_PUBLIC_SPRING_APP_ID=wdpgeo0o0
```

## Testing the Flow

1. **Create products in Product Builder**
   - Go to `/dashboard/create-app`
   - Create an app
   - Create products under that app

2. **Activate products in Spring App**
   - Go to `/dashboard/merchant`
   - Click on your Spring App
   - View products
   - Click "Activate" (once implemented)

3. **View in Mobile App**
   - Go to `/mobile/products`
   - Should see only activated products

## Troubleshooting

### Mobile App shows no products
- Check if products have `springAppId` set
- Verify `NEXT_PUBLIC_SPRING_APP_ID` matches
- Check product `isActive` is true
- Check product `status` is 'complete'

### Products not activating
- Check API endpoint is working
- Verify authentication token
- Check product-ms logs
- Verify data is persisting to file

## API Endpoints

### Get Active Products (Mobile App)
```
GET /api/products/active?springAppId=wdpgeo0o0
```

### Activate Product (Spring App)
```
PUT /api/products/{id}
Body: { "springAppId": "wdpgeo0o0", "isActive": true }
```

### Get All Products (Spring App)
```
GET /api/products
```
