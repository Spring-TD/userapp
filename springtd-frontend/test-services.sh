#!/bin/bash

# API Testing Script using cURL
# Tests all implemented services from the terminal

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="${NEXT_PUBLIC_API_URL:-http://localhost:3000}"
AUTH_SERVICE_URL="${NEXT_PUBLIC_AUTH_SERVICE_URL:-https://service-auth-ms.fly.dev}"
WALLET_SERVICE_URL="${NEXT_PUBLIC_WALLET_SERVICE_URL:-https://wallet-ms.fly.dev}"
PRODUCT_SERVICE_URL="${NEXT_PUBLIC_PRODUCT_SERVICE_URL:-https://product-ms.fly.dev}"
CREATE_APP_SERVICE_URL="${NEXT_PUBLIC_CREATE_APP_SERVICE_URL:-https://create-app-ms.fly.dev}"
PAYMENT_SERVICE_URL="${NEXT_PUBLIC_PAYMENT_SERVICE_URL:-https://payment-ms.fly.dev}"

# Variables
ACCESS_TOKEN=""
TEST_USER_EMAIL="test_$(date +%s)@example.com"
TEST_PASSWORD="TestPass123!"
TEST_APP_ID=""
TEST_PRODUCT_ID=""

echo -e "${CYAN}======================================${NC}"
echo -e "${CYAN}API Services Test Suite${NC}"
echo -e "${CYAN}======================================${NC}\n"

# ============================================================================
# Helper Functions
# ============================================================================

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_section() {
    echo -e "\n${CYAN}======================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}======================================${NC}"
}

# ============================================================================
# Test Authentication
# ============================================================================

test_auth() {
    log_section "Testing Authentication Service"
    
    # Try Registration First
    log_info "Test: User Registration"
    register_response=$(curl -s -w "\n%{http_code}" -X POST \
        "${AUTH_SERVICE_URL}/api/v1/auth/signup" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"${TEST_USER_EMAIL}\",
            \"password\": \"${TEST_PASSWORD}\",
            \"firstName\": \"Test\",
            \"lastName\": \"User\",
            \"role\": \"merchant\"
        }")
    
    reg_http_code=$(echo "$register_response" | tail -n1)
    reg_body=$(echo "$register_response" | sed '$d')
    
    if [ "$reg_http_code" -eq 200 ] || [ "$reg_http_code" -eq 201 ]; then
        ACCESS_TOKEN=$(echo "$reg_body" | grep -o '"accessToken":"[^"]*' | sed 's/"accessToken":"//')
        if [ -n "$ACCESS_TOKEN" ]; then
            log_success "Registration successful"
            echo "   Email: ${TEST_USER_EMAIL}"
            echo "   Token: ${ACCESS_TOKEN:0:30}..."
            return 0
        fi
    fi
    
    # If registration fails (user exists), try login
    log_info "Test: User Login (registration failed, user may exist)"
    
    response=$(curl -s -w "\n%{http_code}" -X POST \
        "${AUTH_SERVICE_URL}/api/v1/auth/login" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"${TEST_USER_EMAIL}\",
            \"password\": \"${TEST_PASSWORD}\"
        }")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq 200 ]; then
        ACCESS_TOKEN=$(echo "$body" | grep -o '"accessToken":"[^"]*' | sed 's/"accessToken":"//')
        
        if [ -n "$ACCESS_TOKEN" ]; then
            log_success "Login successful"
            echo "   Token: ${ACCESS_TOKEN:0:30}..."
            return 0
        fi
    fi
    
    log_error "Both registration and login failed"
    echo "Registration: $reg_http_code"
    echo "Login: $http_code"
    return 1
    
    # Test Get Current User
    log_info "Test: Get Current User"
    
    user_response=$(curl -s -w "\n%{http_code}" -X GET \
        "${AUTH_SERVICE_URL}/api/v1/auth/me" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}")
    
    user_http_code=$(echo "$user_response" | tail -n1)
    
    if [ "$user_http_code" -eq 200 ]; then
        log_success "Get current user successful"
    else
        log_warning "Get current user returned: $user_http_code"
    fi
    
    return 0
}

# ============================================================================
# Test App Service
# ============================================================================

test_apps() {
    log_section "Testing App Service"
    
    if [ -z "$ACCESS_TOKEN" ]; then
        log_error "No access token. Skipping app tests."
        return 1
    fi
    
    # Test Create App
    log_info "Test: Create App"
    
    create_response=$(curl -s -w "\n%{http_code}" -X POST \
        "${API_BASE_URL}/api/apps" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" \
        -d "{
            \"name\": \"Test App $(date +%s)\",
            \"description\": \"Test app for API testing\",
            \"category\": \"fintech\"
        }")
    
    create_http_code=$(echo "$create_response" | tail -n1)
    create_body=$(echo "$create_response" | sed '$d')
    
    if [ "$create_http_code" -eq 200 ] || [ "$create_http_code" -eq 201 ]; then
        TEST_APP_ID=$(echo "$create_body" | grep -o '"id":"[^"]*' | head -1 | sed 's/"id":"//')
        log_success "App created successfully"
        echo "   App ID: $TEST_APP_ID"
    else
        log_error "App creation failed: $create_http_code"
        echo "$create_body"
        return 1
    fi
    
    # Test Get Apps
    log_info "Test: Get User Apps"
    
    get_response=$(curl -s -w "\n%{http_code}" -X GET \
        "${API_BASE_URL}/api/apps" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}")
    
    get_http_code=$(echo "$get_response" | tail -n1)
    
    if [ "$get_http_code" -eq 200 ]; then
        log_success "Get apps successful"
    else
        log_warning "Get apps returned: $get_http_code"
    fi
    
    # Test Update App
    if [ -n "$TEST_APP_ID" ]; then
        log_info "Test: Update App"
        
        update_response=$(curl -s -w "\n%{http_code}" -X PUT \
            "${API_BASE_URL}/api/apps/${TEST_APP_ID}" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer ${ACCESS_TOKEN}" \
            -d '{"description": "Updated description"}')
        
        update_http_code=$(echo "$update_response" | tail -n1)
        
        if [ "$update_http_code" -eq 200 ]; then
            log_success "App updated successfully"
        else
            log_warning "App update returned: $update_http_code"
        fi
    fi
    
    return 0
}

# ============================================================================
# Test Product Service
# ============================================================================

test_products() {
    log_section "Testing Product Service"
    
    if [ -z "$ACCESS_TOKEN" ] || [ -z "$TEST_APP_ID" ]; then
        log_error "Missing access token or app ID. Skipping product tests."
        return 1
    fi
    
    # Test Create Product
    log_info "Test: Create Product"
    
    create_response=$(curl -s -w "\n%{http_code}" -X POST \
        "${API_BASE_URL}/api/products" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" \
        -d "{
            \"name\": \"Test Product $(date +%s)\",
            \"description\": \"Test product for API testing\",
            \"type\": \"loan\",
            \"appId\": \"${TEST_APP_ID}\"
        }")
    
    create_http_code=$(echo "$create_response" | tail -n1)
    create_body=$(echo "$create_response" | sed '$d')
    
    if [ "$create_http_code" -eq 200 ] || [ "$create_http_code" -eq 201 ]; then
        TEST_PRODUCT_ID=$(echo "$create_body" | grep -o '"id":"[^"]*' | head -1 | sed 's/"id":"//')
        log_success "Product created successfully"
        echo "   Product ID: $TEST_PRODUCT_ID"
    else
        log_error "Product creation failed: $create_http_code"
        echo "$create_body"
        return 1
    fi
    
    # Test Get Products
    log_info "Test: Get Products by App"
    
    get_response=$(curl -s -w "\n%{http_code}" -X GET \
        "${API_BASE_URL}/api/products?appId=${TEST_APP_ID}" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}")
    
    get_http_code=$(echo "$get_response" | tail -n1)
    
    if [ "$get_http_code" -eq 200 ]; then
        log_success "Get products successful"
    else
        log_warning "Get products returned: $get_http_code"
    fi
    
    return 0
}

# ============================================================================
# Test Wallet Service
# ============================================================================

test_wallet() {
    log_section "Testing Wallet Service"
    
    if [ -z "$ACCESS_TOKEN" ]; then
        log_error "No access token. Skipping wallet tests."
        return 1
    fi
    
    # Test Get Merchant Wallets
    log_info "Test: Get Merchant Wallets"
    
    wallet_response=$(curl -s -w "\n%{http_code}" -X GET \
        "${WALLET_SERVICE_URL}/api/v1/wallets/merchant" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}")
    
    wallet_http_code=$(echo "$wallet_response" | tail -n1)
    
    if [ "$wallet_http_code" -eq 200 ]; then
        log_success "Get merchant wallets successful"
    else
        log_warning "Get merchant wallets returned: $wallet_http_code (may not exist yet)"
    fi
    
    # Test Get User Wallet
    log_info "Test: Get User Wallet"
    
    user_wallet_response=$(curl -s -w "\n%{http_code}" -X GET \
        "${WALLET_SERVICE_URL}/api/v1/wallets/user" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}")
    
    user_wallet_http_code=$(echo "$user_wallet_response" | tail -n1)
    
    if [ "$user_wallet_http_code" -eq 200 ]; then
        log_success "Get user wallet successful"
    else
        log_warning "Get user wallet returned: $user_wallet_http_code (may not exist yet)"
    fi
    
    return 0
}

# ============================================================================
# Run All Tests
# ============================================================================

echo -e "${BLUE}Testing against: ${API_BASE_URL}${NC}"
echo -e "${BLUE}Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")${NC}\n"

# Run tests
test_auth
AUTH_RESULT=$?

if [ $AUTH_RESULT -eq 0 ]; then
    test_apps
    APP_RESULT=$?
    
    test_products
    PRODUCT_RESULT=$?
    
    test_wallet
    WALLET_RESULT=$?
else
    log_error "Authentication failed. Skipping other tests."
    APP_RESULT=1
    PRODUCT_RESULT=1
    WALLET_RESULT=1
fi

# Print Summary
log_section "Test Summary"

echo "Authentication:  $([ $AUTH_RESULT -eq 0 ] && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${RED}❌ FAIL${NC}")"
echo "App Service:     $([ $APP_RESULT -eq 0 ] && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${RED}❌ FAIL${NC}")"
echo "Product Service: $([ $PRODUCT_RESULT -eq 0 ] && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${RED}❌ FAIL${NC}")"
echo "Wallet Service:  $([ $WALLET_RESULT -eq 0 ] && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${YELLOW}⚠️  PARTIAL${NC}")"

if [ -n "$TEST_APP_ID" ]; then
    echo -e "\n📝 Test Data Created:"
    echo "   App ID: $TEST_APP_ID"
    [ -n "$TEST_PRODUCT_ID" ] && echo "   Product ID: $TEST_PRODUCT_ID"
    echo "   Email: $TEST_USER_EMAIL"
fi

echo -e "\n${CYAN}✨ Test suite completed${NC}\n"
