#!/bin/bash
# Test compliance business/industry/model options endpoints (production).
# Usage:
#   Without token (expect 401): ./test-compliance-options.sh
#   With token:                 ./test-compliance-options.sh "Bearer YOUR_MERCHANT_JWT"

BASE_GATEWAY="https://account-ms-plata.fly.dev"
BASE_COMPLIANCE="https://compliance-ms.fly.dev"
AUTH="${1:-}"

echo "=== Via Gateway (/api/v1/compliance) ==="
for path in business-type-options industry-type-options business-model-options; do
  echo "--- GET /api/v1/compliance/business/$path ---"
  if [ -n "$AUTH" ]; then
    curl -s -w "\nHTTP: %{http_code}\n" -H "Authorization: $AUTH" "$BASE_GATEWAY/api/v1/compliance/business/$path"
  else
    curl -s -w "\nHTTP: %{http_code}\n" "$BASE_GATEWAY/api/v1/compliance/business/$path"
  fi
  echo ""
done

echo "=== Direct to compliance-ms (/api/v1/kyc) ==="
for path in business-type-options industry-type-options business-model-options; do
  echo "--- GET /api/v1/kyc/business/$path ---"
  if [ -n "$AUTH" ]; then
    curl -s -w "\nHTTP: %{http_code}\n" -H "Authorization: $AUTH" "$BASE_COMPLIANCE/api/v1/kyc/business/$path"
  else
    curl -s -w "\nHTTP: %{http_code}\n" "$BASE_COMPLIANCE/api/v1/kyc/business/$path"
  fi
  echo ""
done
