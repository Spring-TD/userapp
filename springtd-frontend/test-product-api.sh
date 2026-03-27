#!/bin/bash

# Product API Test Script
# This script tests the product-ms API to verify it's working correctly

echo "========================================="
echo "Product API Test Script"
echo "========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# API URL
API_URL="https://product-ms.fly.dev"

echo -e "${BLUE}Testing product-ms API at: $API_URL${NC}"
echo ""

# Test 1: Health Check
echo "1. Health Check"
echo "-----------------------------------"
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/health" 2>/dev/null)
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
BODY=$(echo "$HEALTH_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Service is healthy${NC}"
    echo "  Response: $BODY"
else
    echo -e "${RED}✗ Service health check failed (HTTP $HTTP_CODE)${NC}"
fi
echo ""

# Test 2: Get all products (without auth - should fail)
echo "2. Get Products (No Auth - Should Fail)"
echo "-----------------------------------"
PRODUCTS_RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/api/v1/products" 2>/dev/null)
HTTP_CODE=$(echo "$PRODUCTS_RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
    echo -e "${GREEN}✓ Auth required (as expected)${NC}"
    echo "  HTTP Code: $HTTP_CODE"
else
    echo -e "${YELLOW}⚠ Unexpected response (HTTP $HTTP_CODE)${NC}"
fi
echo ""

# Test 3: Instructions for authenticated test
echo "3. Authenticated API Test"
echo "-----------------------------------"
echo -e "${YELLOW}To test with authentication:${NC}"
echo ""
echo "1. Open your browser and log into the application"
echo "2. Open browser console (F12)"
echo "3. Run: localStorage.getItem('accessToken')"
echo "4. Copy the token"
echo "5. Run this command:"
echo ""
echo -e "${BLUE}TOKEN=\"your_token_here\"${NC}"
echo -e "${BLUE}curl -H \"Authorization: Bearer \$TOKEN\" $API_URL/api/v1/products${NC}"
echo ""
echo "This will show all products in the system."
echo ""

# Test 4: Check if Fly CLI is available
echo "4. Fly.dev CLI Check"
echo "-----------------------------------"
if command -v fly &> /dev/null; then
    echo -e "${GREEN}✓ Fly CLI is installed${NC}"
    echo ""
    echo "You can check the service status with:"
    echo -e "${BLUE}fly status -a product-ms${NC}"
    echo ""
    echo "View logs with:"
    echo -e "${BLUE}fly logs -a product-ms${NC}"
    echo ""
    echo "SSH into the machine with:"
    echo -e "${BLUE}fly ssh console -a product-ms${NC}"
else
    echo -e "${YELLOW}⚠ Fly CLI not installed${NC}"
    echo ""
    echo "Install it from: https://fly.io/docs/hands-on/install-flyctl/"
fi
echo ""

# Summary
echo "========================================="
echo "Summary"
echo "========================================="
echo ""
echo "Service Status: $([ "$HTTP_CODE" = "200" ] && echo -e "${GREEN}Running${NC}" || echo -e "${RED}Issue detected${NC}")"
echo ""
echo "Next Steps:"
echo "1. Get your auth token from browser console"
echo "2. Test authenticated endpoints"
echo "3. Check Fly.dev logs if issues persist"
echo "4. Use the ProductDebugPanel component in the UI"
echo ""
echo "See PRODUCT_ISSUE_ACTION_PLAN.md for detailed instructions"
echo ""
