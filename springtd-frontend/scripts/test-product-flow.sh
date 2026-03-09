#!/bin/bash
# Test Product Builder and Spring App API flow
# Usage: bash scripts/test-product-flow.sh

set -euo pipefail

PLATTER_EMAIL="majekgb@gmail.com"   # Change to a real admin email
PLATTER_PASS="DefaultPassword123!"      # Change to real password
SPRING_EMAIL="majekgb@gmail.com" # Change to a real merchant email
SPRING_PASS="DefaultPassword123!r"     # Change to real password

CREATE_APP_URL="https://create-app-ms.fly.dev/api/v1"
PRODUCT_MS_URL="https://product-ms.fly.dev/api/v1"

# 1. Login to Product Builder (Platter)
echo "Logging in to Product Builder..."
PLATTER_LOGIN=$(curl -s -X POST "$CREATE_APP_URL/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"'$PLATTER_EMAIL'","password":"'$PLATTER_PASS'"}')
PLATTER_TOKEN=$(echo "$PLATTER_LOGIN" | jq -r '.data.tokens.accessToken // .accessToken // .data.accessToken')
if [[ "$PLATTER_TOKEN" == "null" || -z "$PLATTER_TOKEN" ]]; then
  echo "Platter login failed: $PLATTER_LOGIN"; exit 1
fi

# 2. Create an app
echo "Creating app..."
APP_NAME="Test App $(date +%s)"
APP_ALIAS="testapp$(date +%s)"
APP_CREATE=$(curl -s -X POST "$CREATE_APP_URL/apps" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $PLATTER_TOKEN" \
  -d '{"name":"'$APP_NAME'","websiteUrl":"https://test.com","alias":"'$APP_ALIAS'","description":"Test app via script"}')
APP_ID=$(echo "$APP_CREATE" | jq -r '.data.app.id // .data.id // .app.id // .id')
if [[ "$APP_ID" == "null" || -z "$APP_ID" ]]; then
  echo "App creation failed: $APP_CREATE"; exit 1
fi

echo "App created: $APP_ID"

# 3. Create a product for the app
echo "Creating product..."
PRODUCT_CREATE=$(curl -s -X POST "$PRODUCT_MS_URL/products" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $PLATTER_TOKEN" \
  -d '{"name":"Script Product","description":"Created by script","type":"Loan","appId":"'$APP_ID'","status":"complete"}')
PRODUCT_ID=$(echo "$PRODUCT_CREATE" | jq -r '.data.id // .id')
if [[ "$PRODUCT_ID" == "null" || -z "$PRODUCT_ID" ]]; then
  echo "Product creation failed: $PRODUCT_CREATE"; exit 1
fi

echo "Product created: $PRODUCT_ID"

# 4. Login to Spring App
echo "Logging in to Spring App..."
SPRING_LOGIN=$(curl -s -X POST "$CREATE_APP_URL/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"'$SPRING_EMAIL'","password":"'$SPRING_PASS'"}')
SPRING_TOKEN=$(echo "$SPRING_LOGIN" | jq -r '.data.tokens.accessToken // .accessToken // .data.accessToken')
if [[ "$SPRING_TOKEN" == "null" || -z "$SPRING_TOKEN" ]]; then
  echo "Spring login failed: $SPRING_LOGIN"; exit 1
fi

# 5. Fetch products as Spring App user
echo "Fetching products as Spring App user..."
FETCHED_PRODUCTS=$(curl -s -X GET "$PRODUCT_MS_URL/products/app/$APP_ID" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $SPRING_TOKEN")
echo "Products fetched for app $APP_ID:"
echo "$FETCHED_PRODUCTS" | jq

echo "\nTest complete."
