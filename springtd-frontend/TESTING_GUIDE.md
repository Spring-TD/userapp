# Quick Testing Guide - SQLite Migration

## 🚀 Quick Start

### 1. Login with Dev User (No Signup Needed!)

```bash
# Login to get access token
curl -X POST http://localhost:3002/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dev@test.com",
    "password": "dev123"
  }'
```

**Response:**
```json
{
  "success": true,
  "accessToken": "eyJhbGc...",
  "user": {
    "id": "dev_user_001",
    "email": "dev@test.com",
    "role": "merchant"
  }
}
```

Save the `accessToken` for authenticated requests!

---

## 🧪 Test Each Microservice

### Product-MS (Port 3001)

```bash
# 1. Create a product
curl -X POST http://localhost:3001/api/v1/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Quick Loan",
    "description": "Fast approval loan",
    "type": "Loan",
    "appId": "test_app_123",
    "status": "complete",
    "isActive": true
  }'

# 2. Get all products
curl http://localhost:3001/api/v1/products

# 3. Activate product for Spring App
curl -X PUT http://localhost:3001/api/v1/products/PRODUCT_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "springAppId": "wdpgeo0o0",
    "isActive": true
  }'

# 4. Get active products for mobile app
curl "http://localhost:3001/api/v1/products/active?springAppId=wdpgeo0o0"
```

### Auth-MS (Port 3002)

```bash
# 1. Login (already tested above)

# 2. Get user profile
curl http://localhost:3002/api/v1/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. Register new merchant (optional)
curl -X POST http://localhost:3002/api/v1/auth/register/merchant \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@merchant.com",
    "password": "test123",
    "first_name": "Test",
    "last_name": "Merchant",
    "user_merchant_id": "merchant_001",
    "country": "US"
  }'
```

### Create-App-MS (Port 3003)

```bash
# 1. Create an app
curl -X POST http://localhost:3003/api/v1/apps \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "My Spring App",
    "description": "Test app",
    "merchantId": "dev_user_001",
    "websiteUrl": "https://example.com"
  }'

# 2. Get all apps for merchant
curl http://localhost:3003/api/v1/apps/merchant/dev_user_001 \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. Get app by ID
curl http://localhost:3003/api/v1/apps/APP_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🔍 Verify Data Persistence

### Test 1: Create Data
```bash
# Create a product
curl -X POST http://localhost:3001/api/v1/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Persistence Test",
    "type": "Loan",
    "appId": "test123",
    "status": "complete"
  }'
```

### Test 2: Restart Service
```bash
# Restart product-ms
cd server/product-ms
npm run dev
```

### Test 3: Verify Data Still Exists
```bash
# Get all products - should include "Persistence Test"
curl http://localhost:3001/api/v1/products
```

✅ **If you see your product, persistence works!**

---

## 🎯 Test Complete Flow

### 1. Login as Dev User
```bash
TOKEN=$(curl -s -X POST http://localhost:3002/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@test.com","password":"dev123"}' \
  | jq -r '.accessToken')

echo "Token: $TOKEN"
```

### 2. Create Spring App
```bash
APP_ID=$(curl -s -X POST http://localhost:3003/api/v1/apps \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "My Spring App",
    "merchantId": "dev_user_001"
  }' | jq -r '.data.id')

echo "App ID: $APP_ID"
```

### 3. Create Product in Product Builder
```bash
PRODUCT_ID=$(curl -s -X POST http://localhost:3001/api/v1/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"name\": \"Quick Loan\",
    \"type\": \"Loan\",
    \"appId\": \"$APP_ID\",
    \"status\": \"complete\",
    \"isActive\": true
  }" | jq -r '.data.id')

echo "Product ID: $PRODUCT_ID"
```

### 4. Activate Product for Spring App
```bash
curl -X PUT "http://localhost:3001/api/v1/products/$PRODUCT_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "springAppId": "wdpgeo0o0"
  }'
```

### 5. Verify Mobile App Can See Product
```bash
curl "http://localhost:3001/api/v1/products/active?springAppId=wdpgeo0o0"
```

✅ **Should return the activated product!**

---

## 🐛 Troubleshooting

### Database Not Found
```bash
# Check if database files exist
ls -la /data/*.db

# Or in local dev:
ls -la server/product-ms/data/*.db
ls -la server/service-auth-ms/data/*.db
ls -la server/create-app-ms/data/*.db
```

### Dev User Not Created
```bash
# Check auth database
sqlite3 server/service-auth-ms/data/auth.db "SELECT * FROM users WHERE email='dev@test.com';"
```

### Products Not Persisting
```bash
# Check products database
sqlite3 server/product-ms/data/products.db "SELECT COUNT(*) FROM products;"
```

### Migration Not Running
```bash
# Check logs when starting services
# Should see: "Migrated X products from JSON to SQLite"
```

---

## 📊 Database Inspection

### View Products
```bash
sqlite3 server/product-ms/data/products.db
> SELECT id, name, type, spring_app_id FROM products;
> .exit
```

### View Users
```bash
sqlite3 server/service-auth-ms/data/auth.db
> SELECT id, email, role FROM users;
> .exit
```

### View Apps
```bash
sqlite3 server/create-app-ms/data/apps.db
> SELECT id, name, merchant_id, status FROM apps;
> .exit
```

---

## ✅ Success Checklist

- [ ] Dev user login works
- [ ] Can create products
- [ ] Products persist after restart
- [ ] Can create apps
- [ ] Apps persist after restart
- [ ] Product activation sets springAppId
- [ ] Mobile app fetches activated products
- [ ] All database files exist in /data

---

## 🚀 Ready for Demo!

Once all tests pass:
1. ✅ You have persistent data
2. ✅ Dev login works instantly
3. ✅ No more losing data on restart
4. ✅ Ready to deploy to Fly.dev

**Next:** Add product activation UI in Spring App dashboard!
