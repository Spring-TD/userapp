#!/bin/bash

# Quick API Health Check
# Tests if Next.js API routes are responding

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

API_BASE_URL="${1:-http://localhost:3000}"

echo -e "${CYAN}==================================${NC}"
echo -e "${CYAN}API Health Check${NC}"
echo -e "${CYAN}==================================${NC}\n"
echo -e "Testing: ${API_BASE_URL}\n"

# Test 1: Homepage
echo -ne "Homepage (/)... "
status=$(curl -s -o /dev/null -w "%{http_code}" "${API_BASE_URL}/")
if [ "$status" -eq 200 ]; then
    echo -e "${GREEN}✅ $status${NC}"
else
    echo -e "${RED}❌ $status${NC}"
fi

# Test 2: API Auth Login Route
echo -ne "Auth Login Route (/api/auth/login)... "
status=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    "${API_BASE_URL}/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{}')
if [ "$status" -eq 401 ] || [ "$status" -eq 400 ] || [ "$status" -eq 200 ]; then
    echo -e "${GREEN}✅ $status (route exists)${NC}"
else
    echo -e "${RED}❌ $status (route not found)${NC}"
fi

# Test 3: API Apps Route
echo -ne "Apps Route (/api/apps)... "
status=$(curl -s -o /dev/null -w "%{http_code}" \
    "${API_BASE_URL}/api/apps")
if [ "$status" -eq 401 ] || [ "$status" -eq 403 ] || [ "$status" -eq 200 ]; then
    echo -e "${GREEN}✅ $status (route exists)${NC}"
else
    echo -e "${RED}❌ $status (route not found)${NC}"
fi

# Test 4: API Products Route
echo -ne "Products Route (/api/products)... "
status=$(curl -s -o /dev/null -w "%{http_code}" \
    "${API_BASE_URL}/api/products")
if [ "$status" -eq 401 ] || [ "$status" -eq 403 ] || [ "$status" -eq 200 ]; then
    echo -e "${GREEN}✅ $status (route exists)${NC}"
else
    echo -e "${RED}❌ $status (route not found)${NC}"
fi

# Test 5: Backend Auth Service
echo -ne "Backend Auth Service... "
status=$(curl -s -o /dev/null -w "%{http_code}" \
    "https://service-auth-ms.fly.dev/api/v1/health" 2>/dev/null || echo "000")
if [ "$status" -eq 200 ]; then
    echo -e "${GREEN}✅ $status (online)${NC}"
else
    echo -e "${YELLOW}⚠️  $status (check backend)${NC}"
fi

# Test 6: Backend Wallet Service
echo -ne "Backend Wallet Service... "
status=$(curl -s -o /dev/null -w "%{http_code}" \
    "https://wallet-ms.fly.dev/api/v1/health" 2>/dev/null || echo "000")
if [ "$status" -eq 200 ]; then
    echo -e "${GREEN}✅ $status (online)${NC}"
else
    echo -e "${YELLOW}⚠️  $status (check backend)${NC}"
fi

# Test 7: Backend Product Service
echo -ne "Backend Product Service... "
status=$(curl -s -o /dev/null -w "%{http_code}" \
    "https://product-ms.fly.dev/api/v1/health" 2>/dev/null || echo "000")
if [ "$status" -eq 200 ]; then
    echo -e "${GREEN}✅ $status (online)${NC}"
else
    echo -e "${YELLOW}⚠️  $status (check backend)${NC}"
fi

echo -e "\n${CYAN}==================================${NC}"
echo -e "${CYAN}Health Check Complete${NC}"
echo -e "${CYAN}==================================${NC}\n"
