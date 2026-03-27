# Spring App Architecture Update - Product Management Refactor

## Date: February 16, 2026

## Overview
Refactored the Spring App to align with the new architecture where:
- **Product Builder**: Source of truth for creating and managing products
- **Spring App**: Can create apps and activate/deactivate products from Product Builder

## Key Changes

### 1. Removed Product Creation from Spring App ✅

**File**: `/app/dashboard/create-app/page.tsx`
- **Before**: Page allowed creating products (Loan, Mortgage, Savings, Commodity) with complex drawer flows
- **After**: Page now creates **Apps** using `CreateAppDrawer`
- Removed all product-related drawers and state management
- Integrated with `/api/apps` to fetch and display real apps
- Apps table now shows: App Name, App ID, Website URL, Alias, Date Created, Status
- Clicking an app navigates to `/dashboard/create-app/all-apps/[id]/products/overview`

### 2. Updated Product Fetching Logic ✅

**File**: `/lib/product-api.ts`
Added new API functions:
- `getAllProductsFromBuilder()` - Fetches ALL products from Product Builder (global pool)
- `getAppProductActivations(appId)` - Gets product activation state for a specific app
- `toggleAppProductActivation(appId, productId, isActive)` - Toggles product on/off for an app

### 3. Updated Products Overview Page ✅

**File**: `/app/dashboard/create-app/all-apps/[id]/products/overview/page.tsx`
- **Before**: Fetched products specific to the app
- **After**: Fetches ALL products from Product Builder
- Product counts now reflect global product availability
- Clicking a product type navigates to the product type page for activation

### 4. Transformed Product Type Pages ✅

**File**: `/app/dashboard/create-app/all-apps/[id]/products/[productType]/page.tsx`
- **Before**: Showed app-specific products with "Create Product" button
- **After**: Shows ALL products from Product Builder with toggle switches
- Features:
  - Displays all products of the selected type from Product Builder
  - Shows activation status (Active/Inactive) per app
  - Toggle switch to activate/deactivate products for the current app
  - Removed "Create Product" button (products can only be created in Product Builder)
  - Added back button to return to products overview

### 5. Created New API Endpoints ✅

#### `/app/api/products/builder/all/route.ts`
- **Purpose**: Proxy endpoint to fetch all products from Product Builder microservice
- **Method**: GET
- **Returns**: All products from Product Builder
- **TODO**: Configure `PRODUCT_BUILDER_API_URL` environment variable

#### `/app/api/apps/[id]/products/route.ts`
- **Purpose**: Get all product activations for a specific app
- **Method**: GET
- **Returns**: Array of `{ productId, appId, isActive }` objects
- **TODO**: Implement database query (currently returns mock data)

#### `/app/api/apps/[id]/products/[productId]/route.ts`
- **Purpose**: Toggle product activation for a specific app
- **Method**: PUT
- **Body**: `{ isActive: boolean }`
- **Returns**: Updated activation record
- **TODO**: Implement database upsert (currently uses mock implementation)

## Data Model

### App-Product Activation Relationship
```typescript
interface AppProductActivation {
  appId: string;        // The Spring App ID
  productId: string;    // The Product ID from Product Builder
  isActive: boolean;    // Whether this product is active for this app
  createdAt: string;
  updatedAt: string;
}
```

### Key Concepts
1. **Apps** are created and owned by individual users in Spring
2. **Products** are created in Product Builder and available globally
3. **Activation** is stored per app (app-level, not user-level)
4. Each app has its own independent product activation settings

## User Flow

### Creating an App
1. User navigates to `/dashboard/create-app`
2. Clicks "Create App" button
3. Fills in app details (name, website URL, alias, description)
4. App is created and appears in the apps table

### Activating Products for an App
1. User clicks on an app in the apps table
2. Navigates to products overview page
3. Clicks on a product type (e.g., "Loan Products")
4. Sees all loan products from Product Builder
5. Toggles products ON/OFF for their specific app
6. Active products are available for that app's end users

## TODO: Database Integration

The following endpoints need database integration:

### 1. App-Product Activations Table
Create a table to store app-product relationships:
```sql
CREATE TABLE app_product_activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES apps(id),
  product_id UUID NOT NULL,  -- Product ID from Product Builder
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(app_id, product_id)
);
```

### 2. Update API Endpoints
- `/api/apps/[id]/products/route.ts` - Query the database
- `/api/apps/[id]/products/[productId]/route.ts` - Upsert to the database

## Environment Variables

Add to `.env.local`:
```
PRODUCT_BUILDER_API_URL=http://localhost:3002  # or production URL
```

## Testing Checklist

- [ ] Create a new app in Spring
- [ ] Navigate to app's products overview
- [ ] Click on a product type (e.g., Loan)
- [ ] Verify all products from Product Builder are displayed
- [ ] Toggle a product ON
- [ ] Verify the toggle state persists
- [ ] Toggle a product OFF
- [ ] Create another app and verify product activations are independent

## Notes

- Product creation is now exclusively done in Product Builder
- Spring App acts as a consumer of products from Product Builder
- Each app can have different products activated
- Product activation is at the app level, not user level
- All users accessing the same app see the same activated products
