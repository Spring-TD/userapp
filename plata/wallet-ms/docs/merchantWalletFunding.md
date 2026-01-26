# Merchant Wallet Funding Callback

## Overview

The Merchant Wallet Funding Callback functionality allows external payment providers to notify the wallet service when a funding transaction for a merchant wallet has been completed. This enables real-time updates to merchant wallet balances when funds are added through external payment channels.

## Supported Wallet Types

Merchants have three distinct wallet types:
- **Treasury Wallet**: Main financial operations wallet
- **Operation Wallet**: Day-to-day business activities wallet
- **KYC Wallet**: Compliance and verification purposes wallet

## Webhook Endpoint

### URL
```
POST /api/v1/wallets/funding/callback
```

### Headers
```
Content-Type: application/json
```

### Request Body

For merchant wallet funding:
```json
{
  "merchantId": "string",
  "merchantWalletType": "TREASURY|OPERATION|KYC",
  "amount": number,
  "currency": "string",
  "transactionId": "string",
  "paymentMethod": "CARD|BANK_TRANSFER|WALLET|OTHER",
  "status": "SUCCESS|COMPLETED",
  "description": "string (optional)",
  "providerReference": "string (optional)",
  "signature": "string (optional, for authentication)"
}
```

For user wallet funding (existing functionality):
```json
{
  "walletId": "string",
  "amount": number,
  "currency": "string",
  "transactionId": "string",
  "paymentMethod": "CARD|BANK_TRANSFER|WALLET|OTHER",
  "status": "SUCCESS|COMPLETED",
  "description": "string (optional)",
  "providerReference": "string (optional)",
  "signature": "string (optional, for authentication)"
}
```

### Response

Success response:
```json
{
  "success": true,
  "message": "Merchant wallet funding callback processed successfully",
  "data": {
    "walletId": "string",
    "merchantId": "string",
    "merchantWalletType": "TREASURY|OPERATION|KYC",
    "newBalance": number
  }
}
```

## Implementation Details

### FundingController

The [FundingController](file:///c:/Users/user/Downloads/spring-TD/server/wallet-ms/src/controllers/walletController.ts#L1575-L1575) handles the webhook endpoint and processes incoming funding notifications:

1. Validates the incoming payload using Joi validation
2. Checks if the transaction status is successful
3. For merchant funding:
   - Identifies the merchant and wallet type
   - Retrieves the specific merchant wallet
   - Updates the wallet balance
4. For user funding:
   - Updates the specified user wallet balance
5. Returns appropriate responses

### Security Considerations

In a production environment, the following security measures should be implemented:

1. **Signature Verification**: Verify the `signature` field to ensure the callback is authentic
2. **Idempotency**: Check if the transaction has already been processed to prevent duplicate funding
3. **Rate Limiting**: Implement rate limiting to prevent abuse
4. **IP Whitelisting**: Restrict webhook calls to known payment provider IPs

### Error Handling

The callback endpoint handles various error scenarios:

- Invalid payload format (400 Bad Request)
- Failed wallet lookup (404 Not Found)
- Failed balance update (500 Internal Server Error)
- Non-successful transaction status (200 OK with informational message)

## Testing

### Test Scripts

The implementation includes test scripts to verify functionality:

1. `testMerchantFundingCallback.ts` - Tests merchant wallet funding
2. `testFundingCallback.ts` - Tests both user and merchant wallet funding

### Running Tests

```bash
# Test merchant wallet funding
npm run test:merchant-funding

# Test both user and merchant wallet funding
npm run test:funding
```

## Integration with Payment Providers

To integrate with payment providers:

1. Provide the webhook URL to the payment provider
2. Configure any required authentication (e.g., signatures)
3. Test the integration using sample payloads
4. Monitor logs for successful processing

## Example Payloads

### Successful Merchant Wallet Funding

```json
{
  "merchantId": "merchant_12345",
  "merchantWalletType": "TREASURY",
  "amount": 5000,
  "currency": "USD",
  "transactionId": "txn_98765",
  "paymentMethod": "BANK_TRANSFER",
  "status": "SUCCESS",
  "description": "Monthly business funding",
  "providerReference": "bank_ref_45678"
}
```

### Failed Transaction Notification

```json
{
  "merchantId": "merchant_12345",
  "merchantWalletType": "OPERATION",
  "amount": 1000,
  "currency": "USD",
  "transactionId": "txn_11111",
  "paymentMethod": "CARD",
  "status": "FAILED",
  "description": "Credit card funding failed",
  "providerReference": "card_ref_22222"
}
```

In this case, the system will acknowledge receipt but not update the wallet balance.