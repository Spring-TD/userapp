#!/bin/bash

# Product Display Issue - Diagnostic Script
# This script helps diagnose why products aren't showing in Spring App

echo "========================================="
echo "Product Display Issue - Diagnostics"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if services are running
echo "1. Checking Backend Services..."
echo "-----------------------------------"

echo -n "product-ms: "
if curl -s --max-time 5 https://product-ms.fly.dev/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Running${NC}"
else
    echo -e "${RED}✗ Not responding${NC}"
fi

echo -n "create-app-ms: "
if curl -s --max-time 5 https://create-app-ms.fly.dev/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Running${NC}"
else
    echo -e "${RED}✗ Not responding${NC}"
fi

echo ""

# Check Fly.dev volume status
echo "2. Checking Fly.dev Volume..."
echo "-----------------------------------"
if command -v fly &> /dev/null; then
    echo "Checking product-ms volumes:"
    fly volumes list -a product-ms 2>/dev/null || echo -e "${YELLOW}⚠ Cannot access Fly.dev (not logged in or no access)${NC}"
else
    echo -e "${YELLOW}⚠ Fly CLI not installed${NC}"
fi

echo ""

# Check local data directory
echo "3. Checking Local Data Directory..."
echo "-----------------------------------"
DATA_DIR="./server/product-ms/data"
if [ -d "$DATA_DIR" ]; then
    echo -e "${GREEN}✓ Directory exists${NC}"
    
    if [ -f "$DATA_DIR/products.json" ]; then
        PRODUCT_COUNT=$(cat "$DATA_DIR/products.json" | jq '. | length' 2>/dev/null || echo "0")
        echo -e "${GREEN}✓ products.json exists${NC}"
        echo "  Products in file: $PRODUCT_COUNT"
        
        if [ "$PRODUCT_COUNT" -gt 0 ]; then
            echo ""
            echo "  Sample products:"
            cat "$DATA_DIR/products.json" | jq '.[] | {id: .id, name: .name, type: .type, appId: .appId}' 2>/dev/null | head -20
        fi
    else
        echo -e "${RED}✗ products.json NOT found${NC}"
        echo -e "${YELLOW}  Note: Local file may not reflect production data on Fly.dev${NC}"
    fi
    
    if [ -f "$DATA_DIR/configurations.json" ]; then
        CONFIG_COUNT=$(cat "$DATA_DIR/configurations.json" | jq '. | length' 2>/dev/null || echo "0")
        echo -e "${GREEN}✓ configurations.json exists${NC}"
        echo "  Configurations in file: $CONFIG_COUNT"
    else
        echo -e "${RED}✗ configurations.json NOT found${NC}"
    fi
else
    echo -e "${RED}✗ Data directory NOT found${NC}"
fi

echo ""

# Check environment variables
echo "4. Checking Environment Variables..."
echo "-----------------------------------"
if [ -f ".env.local" ]; then
    echo -e "${GREEN}✓ .env.local exists${NC}"
    
    if grep -q "NEXT_PUBLIC_PRODUCT_SERVICE_URL" .env.local; then
        PRODUCT_URL=$(grep "NEXT_PUBLIC_PRODUCT_SERVICE_URL" .env.local | cut -d '=' -f2)
        echo "  PRODUCT_SERVICE_URL: $PRODUCT_URL"
    else
        echo -e "${YELLOW}⚠ NEXT_PUBLIC_PRODUCT_SERVICE_URL not set${NC}"
    fi
    
    if grep -q "NEXT_PUBLIC_CREATE_APP_SERVICE_URL" .env.local; then
        APP_URL=$(grep "NEXT_PUBLIC_CREATE_APP_SERVICE_URL" .env.local | cut -d '=' -f2)
        echo "  CREATE_APP_SERVICE_URL: $APP_URL"
    else
        echo -e "${YELLOW}⚠ NEXT_PUBLIC_CREATE_APP_SERVICE_URL not set${NC}"
    fi
else
    echo -e "${RED}✗ .env.local NOT found${NC}"
fi

echo ""

# Recommendations
echo "========================================="
echo "Recommendations"
echo "========================================="
echo ""
echo "To fully diagnose this issue, you need to:"
echo ""
echo "1. ${YELLOW}Check production data on Fly.dev:${NC}"
echo "   fly ssh console -a product-ms"
echo "   ls -la /data/"
echo "   cat /data/products.json | jq '.'"
echo ""
echo "2. ${YELLOW}Check Fly.dev logs:${NC}"
echo "   fly logs -a product-ms"
echo ""
echo "3. ${YELLOW}Test API directly:${NC}"
echo "   # Get token from browser console: localStorage.getItem('accessToken')"
echo "   curl https://product-ms.fly.dev/api/v1/products \\"
echo "     -H 'Authorization: Bearer YOUR_TOKEN'"
echo ""
echo "4. ${YELLOW}Verify appId consistency:${NC}"
echo "   - Check appId when creating products (browser console in Platter)"
echo "   - Check appId when fetching products (browser console in Spring App)"
echo "   - Ensure they match exactly"
echo ""
echo "See PRODUCT_DISPLAY_ISSUE_ANALYSIS.md for detailed analysis"
echo ""
