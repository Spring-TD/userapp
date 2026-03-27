# Product Backend Analysis

## Current State

### What the Frontend Expects (Product Details Page)

The product details page (`/products/[productType]/[productId]`) has these tabs:

1. **Active Loans/Savings/Commodity** - Shows active subscriptions/transactions
2. **Inactive Loans/Savings/Commodity** - Shows inactive/completed subscriptions
3. **Drive** (Loan only) - Shows user documents/file submissions
4. **Configuration** - Shows product configuration settings

### What the Backend Currently Provides

#### ✅ Available APIs:

1. **Products API** (`/api/v1/products`)
   - Create, read, update, delete products
   - Get products by app ID
   - Basic product info (name, description, type, status)

2. **Configuration API** (`/api/v1/configurations`)
   - Create, read, update, delete product configurations
   - Supports Loan, Mortgage, Savings, Commodity types
   - Stores interest rates, fees, tenure, etc.

#### ❌ Missing APIs:

1. **No Active/Inactive Transactions API**
   - No endpoint for user subscriptions to products
   - No endpoint for loan applications
   - No endpoint for savings accounts
   - No endpoint for commodity orders

2. **No Drive/Documents API**
   - No endpoint for user document uploads
   - No endpoint for file management
   - No endpoint for document verification

3. **No User-Product Relationship API**
   - No endpoint to track which users have which products
   - No endpoint for product usage statistics

### Critical Issue: In-Memory Storage

The product-ms service uses **in-memory arrays** for data storage:

```typescript
export class ProductService {
  private products: Product[] = [];  // ← In-memory only!
  private productConfigurations: ProductConfiguration[] = [];  // ← In-memory only!
}
```

**This means:**
- ❌ Data is lost when the service restarts
- ❌ Data is lost when Fly.io auto-stops the machine
- ❌ Products "disappear" after some time
- ❌ No persistence between deployments

## Why Products Disappear

1. Fly.io has `auto_stop_machines = 'stop'` configured
2. When there's no traffic, the machine stops
3. When it restarts, all in-memory data is gone
4. Products created earlier are lost

## What Needs to Be Done

### Short-term Fix (Frontend Only)

Update the frontend to:
1. Show "Coming Soon" or empty states for tabs without backend support
2. Use the Configuration API for the Configuration tab
3. Display actual product data from the API

### Long-term Fix (Backend Required)

The backend developer needs to:

1. **Add a Database**
   - PostgreSQL, MongoDB, or similar
   - Persist products and configurations
   - Survive restarts

2. **Add Transaction/Subscription APIs**
   ```
   GET /api/v1/products/:id/subscriptions
   GET /api/v1/products/:id/subscriptions/active
   GET /api/v1/products/:id/subscriptions/inactive
   POST /api/v1/products/:id/subscriptions
   ```

3. **Add Drive/Documents APIs**
   ```
   GET /api/v1/products/:id/documents
   POST /api/v1/products/:id/documents
   GET /api/v1/products/:id/documents/:docId
   DELETE /api/v1/products/:id/documents/:docId
   ```

4. **Add User-Product Relationship APIs**
   ```
   GET /api/v1/products/:id/users
   GET /api/v1/users/:userId/products
   ```

## Current Frontend Implementation

The product details page currently uses **hardcoded dummy data**:

```typescript
const activeLoans = [
  {
    amount: "$0.45",
    ref: "SPI-234-BY45K",
    // ... hardcoded data
  }
]

const driveUsers = [
  {
    name: "Grace Ayomide",
    email: "Graceayo@email.com",
    // ... hardcoded data
  }
]
```

## Recommended Actions

### For Now (Quick Fix):

1. **Update Configuration tab** to use real API data
2. **Show empty states** for Active/Inactive/Drive tabs with "No data yet" message
3. **Remove dummy data** to avoid confusion

### For Backend Developer:

Share this analysis and request:
1. Database integration (PostgreSQL recommended)
2. Transaction/Subscription APIs
3. Drive/Documents APIs
4. User-Product relationship APIs

## Configuration API Usage

The Configuration API is available and can be used:

### Create Configuration:
```typescript
POST /api/v1/configurations
{
  "productId": "xxx",
  "productType": "Loan",
  "configuration": {
    "purpose": "Personal Loan",
    "minimumFacilityAmount": 10000,
    "maximumFacilityAmount": 1000000,
    "interestRate": { "type": "percentage", "value": 15 },
    // ... other fields
  }
}
```

### Get Configuration:
```typescript
GET /api/v1/configurations/:productId
```

### Update Configuration:
```typescript
PUT /api/v1/configurations/:productId
{
  "configuration": {
    "interestRate": { "type": "percentage", "value": 12 }
  }
}
```

## Summary

| Feature | Backend Status | Frontend Status |
|---------|---------------|-----------------|
| Product CRUD | ✅ Available | ✅ Working |
| Product Configuration | ✅ Available | ❌ Using dummy data |
| Active Transactions | ❌ Not available | ❌ Using dummy data |
| Inactive Transactions | ❌ Not available | ❌ Using dummy data |
| Drive/Documents | ❌ Not available | ❌ Using dummy data |
| Data Persistence | ❌ In-memory only | N/A |

The main issue is that the backend needs a database and additional APIs for the full functionality to work.
