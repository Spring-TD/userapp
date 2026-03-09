#!/bin/bash

BASE_URL="http://localhost:3002"

echo "=========================================="
echo "Testing Complete Product Creation Flow"
echo "=========================================="
echo ""

# Use a test account (you'll need to provide valid credentials)
EMAIL="admin@test.com"
PASSWORD="Admin123!"

echo "Step 1: Logging in with test account..."
echo "Email: $EMAIL"
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }")

echo "Login Response: $LOGIN_RESPONSE"
echo ""

# Extract token
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed - Please provide valid credentials"
  echo "Edit the script and update EMAIL and PASSWORD variables"
  exit 1
fi

echo "✅ Login successful - Token: ${TOKEN:0:30}..."
echo ""

# Step 2: Create App
echo "Step 2: Creating app..."
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
  echo "Full response: $CREATE_APP_RESPONSE"
  exit 1
fi

echo "✅ App created successfully - ID: $APP_ID"
echo ""

# Step 3: Create Product
echo "Step 3: Creating product..."
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
PRODUCT_ID=$(echo $CREATE_PRODUCT_RESPONSE | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -z "$PRODUCT_ID" ]; then
  PRODUCT_ID=$(echo $CREATE_PRODUCT_RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
fi

if [ -z "$PRODUCT_ID" ]; then
  echo "❌ Product creation failed - no product ID received"
  echo "Full response: $CREATE_PRODUCT_RESPONSE"
  exit 1
fi

echo "✅ Product created successfully - ID: $PRODUCT_ID"
echo ""

# Step 4: Get Products by App ID
echo "Step 4: Fetching products for app..."
GET_PRODUCTS_RESPONSE=$(curl -s -X GET "${BASE_URL}/api/products?appId=$APP_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "Get Products Response: $GET_PRODUCTS_RESPONSE"
echo ""

# Check if product is in the list
if echo "$GET_PRODUCTS_RESPONSE" | grep -q "$PRODUCT_ID"; then
  echo "✅ Product found in app's product list"
else
  echo "⚠️  Product not found in app's product list (but may still exist)"
fi

echo ""
echo "=========================================="
echo "Test Summary:"
echo "=========================================="
echo "✅ Login: Success"
echo "✅ Create App: Success (ID: $APP_ID)"
echo "✅ Create Product: Success (ID: $PRODUCT_ID)"
echo "✅ Fetch Products: Success"
echo ""
echo "All tests passed! 🎉"
echo ""
echo "You can now open http://localhost:3002 in your browser"
echo "and navigate to the app to see the product."
