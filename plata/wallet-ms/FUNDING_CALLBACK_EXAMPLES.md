# Funding Callback Implementation Examples

This document provides examples of how to use the funding callback endpoint to fund both merchant and user wallets.

## Endpoint

```
POST /api/v1/wallets/funding/callback
```

This is a **public endpoint** (no authentication required) designed to be called by payment providers.

---

## Features

✅ **Fund Merchant Wallets** (Treasury, Operation, or KYC)  
✅ **Fund User Wallets** (by walletId OR by userId + merchantId)  
✅ **Transaction Deduplication** (prevents double-processing)  
✅ **Flexible Identification** (multiple ways to specify the target wallet)  
✅ **Comprehensive Logging** (all transactions are logged with details)

---

## Example 1: Fund Merchant Treasury Wallet

```bash
curl -X POST "https://wallet-ms.fly.dev/api/v1/wallets/funding/callback" \
  -H "Content-Type: application/json" \
  -d '{
    "merchantId": "merchant-123",
    "merchantWalletType": "TREASURY",
    "amount": 1000.00,
    "currency": "USD",
    "transactionId": "txn-ext-001",
    "paymentMethod": "BANK_TRANSFER",
    "status": "SUCCESS",
    "description": "Monthly funding from bank",
    "providerReference": "BANK-REF-12345"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Merchant wallet funding callback processed successfully",
  "data": {
    "walletId": "wallet_1234567890",
    "merchantId": "merchant-123",
    "merchantWalletType": "TREASURY",
    "newMainBalance": 1000.00,
    "newLedgerBalance": 1000.00,
    "transactionId": "txn-ext-001"
  }
}
```

---

## Example 2: Fund Merchant Operation Wallet

```bash
curl -X POST "https://wallet-ms.fly.dev/api/v1/wallets/funding/callback" \
  -H "Content-Type: application/json" \
  -d '{
    "merchantId": "merchant-123",
    "merchantWalletType": "OPERATION",
    "amount": 500.00,
    "currency": "USD",
    "transactionId": "txn-ext-002",
    "paymentMethod": "CARD",
    "status": "COMPLETED",
    "description": "Card payment for operations",
    "providerReference": "STRIPE-CH-98765"
  }'
```

---

## Example 3: Fund Merchant KYC Wallet

```bash
curl -X POST "https://wallet-ms.fly.dev/api/v1/wallets/funding/callback" \
  -H "Content-Type: application/json" \
  -d '{
    "merchantId": "merchant-123",
    "merchantWalletType": "KYC",
    "amount": 250.00,
    "currency": "USD",
    "transactionId": "txn-ext-003",
    "paymentMethod": "WALLET",
    "status": "SUCCESS",
    "description": "KYC wallet top-up",
    "providerReference": "PAYPAL-PAY-45678"
  }'
```

---

## Example 4: Fund User Wallet by walletId

```bash
curl -X POST "https://wallet-ms.fly.dev/api/v1/wallets/funding/callback" \
  -H "Content-Type: application/json" \
  -d '{
    "walletId": "wallet_user_9876543210",
    "amount": 150.00,
    "currency": "USD",
    "transactionId": "txn-ext-004",
    "paymentMethod": "BANK_TRANSFER",
    "status": "SUCCESS",
    "description": "User wallet funding",
    "providerReference": "BANK-TRANSFER-111"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Funding callback processed successfully",
  "data": {
    "walletId": "wallet_user_9876543210",
    "newMainBalance": 150.00,
    "newLedgerBalance": 150.00,
    "transactionId": "txn-ext-004"
  }
}
```

---

## Example 5: Fund User Wallet by userId + merchantId (New Feature!)

This is useful when the payment provider doesn't have the walletId but knows the userId and merchantId.

```bash
curl -X POST "https://wallet-ms.fly.dev/api/v1/wallets/funding/callback" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-456",
    "merchantId": "merchant-123",
    "amount": 75.50,
    "currency": "USD",
    "transactionId": "txn-ext-005",
    "paymentMethod": "CARD",
    "status": "COMPLETED",
    "description": "Card payment for user",
    "providerReference": "STRIPE-CH-22222"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "User wallet funding callback processed successfully",
  "data": {
    "walletId": "wallet_user_9876543210",
    "userId": "user-456",
    "merchantId": "merchant-123",
    "newMainBalance": 225.50,
    "newLedgerBalance": 225.50,
    "transactionId": "txn-ext-005"
  }
}
```

---

## Example 6: Duplicate Transaction (Idempotency)

If the same `transactionId` is sent twice, the second request is recognized as a duplicate:

```bash
# First request - processes successfully
curl -X POST "https://wallet-ms.fly.dev/api/v1/wallets/funding/callback" \
  -H "Content-Type: application/json" \
  -d '{
    "walletId": "wallet_123",
    "amount": 100.00,
    "currency": "USD",
    "transactionId": "txn-duplicate-001",
    "paymentMethod": "CARD",
    "status": "SUCCESS"
  }'

# Second request with same transactionId - detected as duplicate
curl -X POST "https://wallet-ms.fly.dev/api/v1/wallets/funding/callback" \
  -H "Content-Type: application/json" \
  -d '{
    "walletId": "wallet_123",
    "amount": 100.00,
    "currency": "USD",
    "transactionId": "txn-duplicate-001",
    "paymentMethod": "CARD",
    "status": "SUCCESS"
  }'
```

**Second Response:**
```json
{
  "success": true,
  "message": "Transaction already processed",
  "duplicate": true
}
```

---

## Example 7: Failed Transaction

```bash
curl -X POST "https://wallet-ms.fly.dev/api/v1/wallets/funding/callback" \
  -H "Content-Type: application/json" \
  -d '{
    "walletId": "wallet_123",
    "amount": 100.00,
    "currency": "USD",
    "transactionId": "txn-failed-001",
    "paymentMethod": "CARD",
    "status": "FAILED",
    "description": "Card declined"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Callback received but transaction not successful"
}
```

---

## Via API Gateway

All requests can also go through the API gateway:

```bash
curl -X POST "https://account-ms.fly.dev/api/v1/wallets/funding/callback" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-456",
    "merchantId": "merchant-123",
    "amount": 200.00,
    "currency": "USD",
    "transactionId": "txn-gateway-001",
    "paymentMethod": "BANK_TRANSFER",
    "status": "SUCCESS"
  }'
```

---

## Required Fields

### For Merchant Wallet Funding:
- `merchantId` ✅ (required)
- `merchantWalletType` ✅ (required: TREASURY, OPERATION, or KYC)
- `amount` ✅
- `currency` ✅
- `transactionId` ✅ (unique identifier from payment provider)
- `paymentMethod` ✅ (CARD, BANK_TRANSFER, WALLET, OTHER)
- `status` ✅ (SUCCESS, COMPLETED, PENDING, FAILED, CANCELLED)

### For User Wallet Funding (Option 1):
- `walletId` ✅ (if you have the wallet ID)
- Same fields as above

### For User Wallet Funding (Option 2):
- `userId` ✅ (if you don't have walletId)
- `merchantId` ✅ (to identify which merchant's user)
- Same fields as above

### Optional Fields:
- `description` (transaction description)
- `providerReference` (external reference from payment provider)
- `signature` (for webhook authentication - future enhancement)

---

## Payment Methods

- `CARD` - Credit/Debit card payments
- `BANK_TRANSFER` - Bank transfers
- `WALLET` - Digital wallet payments (PayPal, Stripe, etc.)
- `OTHER` - Other payment methods

---

## Transaction Status

Only `SUCCESS` or `COMPLETED` status will credit the wallet.

Other statuses (`PENDING`, `FAILED`, `CANCELLED`) are acknowledged but don't update the balance.

---

## Error Responses

### Wallet Not Found
```json
{
  "success": false,
  "error": "Merchant TREASURY wallet not found"
}
```

### Validation Error
```json
{
  "success": false,
  "error": "Validation failed",
  "details": "Amount is required, Transaction ID is required"
}
```

### Missing Required Fields
```json
{
  "success": false,
  "error": "Either walletId or (userId + merchantId) or (merchantId + merchantWalletType) must be provided"
}
```

---

## Integration Notes

1. **Payment Provider Setup**: Configure your payment provider to send webhooks to:
   - Direct: `https://wallet-ms.fly.dev/api/v1/wallets/funding/callback`
   - Via Gateway: `https://account-ms.fly.dev/api/v1/wallets/funding/callback`

2. **Transaction IDs**: Always use unique transaction IDs from your payment provider to prevent duplicates.

3. **Idempotency**: The system tracks processed transactions. Retrying with the same `transactionId` won't duplicate funding.

4. **Status Checking**: Use `GET /api/v1/wallets/funding/status/:transactionId` to check transaction status.

5. **Signature Verification**: In production, implement signature verification using the `signature` field for security.

---

## Summary

The funding callback now supports **three flexible ways** to identify and fund wallets:

1. **Merchant Wallet**: `merchantId` + `merchantWalletType`
2. **User Wallet by ID**: `walletId`
3. **User Wallet by User**: `userId` + `merchantId` ← NEW!

This makes integration easier for payment providers who may not always have the internal wallet ID.
