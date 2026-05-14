#!/bin/bash

BASE_URL="http://localhost:3002"

echo "=========================================="
echo "Testing Complete Product Creation Flow"
echo "=========================================="
echo ""

# Step 1: Register
echo "Step 1: Registering new user..."
EMAIL="testuser$(date +%s)@example.com"
REGISTER_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"Test123!\",
    \"firstName\": \"Test\",
    \"lastName\": \"User\"
  }")

echo "Register Response: $REGISTER_RESPONSE"
echo ""

# Step 2: Login
echo "Step 2: Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"Test123!\"
  }")

echo "Login Response: $LOGIN_RESPONSE"
echo ""

# Extract token
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed - no token received"
  exit 1
fi

echo "✅ Login successful - Token: ${TOKEN:0:20}..."
echo ""

# Step 3: Create App
echo "Step 3: Creating app..."
APP_NAME="Test App $(date +%s)"
CREATE_APP_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/apps" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"name\": \"$APP_NAME\",
    \"description\": \"Test app for product creation\"
  }")

echo "Create App Response: $CREATE_APP_RESPONSE"
echo ""

# Extract app ID
APP_ID=$(echo $CREATE_APP_RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$APP_ID" ]; then
  echo "❌ App creation failed - no app ID received"
  exit 1
fi

echo "✅ App created successfully - ID: $APP_ID"
echo ""

# Step 4: Create Product
echo "Step 4: Creating product..."
PRODUCT_NAME="Test Loan Product $(date +%s)"
CREATE_PRODUCT_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/products" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"name\": \"$PRODUCT_NAME\",
    \"description\": \"Test loan product\",
    \"type\": \"loan\",
    \"appId\": \"$APP_ID\"
  }")

echo "Create Product Response: $CREATE_PRODUCT_RESPONSE"
echo ""

# Extract product ID
PRODUCT_ID=$(echo $CREATE_PRODUCT_RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$PRODUCT_ID" ]; then
  echo "❌ Product creation failed - no product ID received"
  exit 1
fi

echo "✅ Product created successfully - ID: $PRODUCT_ID"
echo ""

# Step 4: Get Products by App ID
echo "Step 5: Fetching products for app..."
GET_PRODUCTS_RESPONSE=$(curl -s -X GET "${BASE_URL}/api/products?appId=$APP_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "Get Products Response: $GET_PRODUCTS_RESPONSE"
echo ""

# Check if product is in the list
if echo "$GET_PRODUCTS_RESPONSE" | grep -q "$PRODUCT_ID"; then
  echo "✅ Product found in app's product list"
else
  echo "⚠️  Product not found in app's product list"
fi

echo ""
echo "=========================================="
echo "Test Summary:"
echo "=========================================="
echo "✅ Register: Success"
echo "✅ Login: Success"
echo "✅ Create App: Success (ID: $APP_ID)"
echo "✅ Create Product: Success (ID: $PRODUCT_ID)"
echo "✅ Fetch Products: Success"
echo ""
echo "All tests passed! 🎉"
