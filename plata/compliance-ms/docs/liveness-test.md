# Shareholder Liveness Test Implementation

## Overview

This document describes the implementation of the liveness test functionality for shareholders in the compliance microservice. The liveness test requires shareholders to perform actions such as smiling, turning their head, and closing their eyes to verify their identity through a third-party provider.

## Architecture

The liveness test implementation consists of the following components:

1. **Shareholder Interface** - Defines the structure for shareholder data including liveness test information
2. **Liveness Service** - Handles communication with the third-party liveness provider
3. **Liveness Controller** - Manages API endpoints for liveness test operations
4. **Liveness Routes** - Defines the API routes for liveness test functionality

## Shareholder Interface

The [Shareholder](file://c:\Users\user\Downloads\spring-TD\server\compliance-ms\src\types\kycTypes.ts#L247-L282) interface includes a `kyc` field that contains all liveness test information:

```typescript
kyc: {
  url: string; // The URL for the liveness test
  expiresAt: Date; // When the link expires
  status: 'pending' | 'active' | 'expired' | 'completed' | 'failed'; // Current status of the link
  providerReference?: string; // Reference ID from the 3rd party provider
  result?: {
    success: boolean;
    score?: number;
    details?: string;
    completedAt?: Date;
  };
}
```

## API Endpoints

### Generate Liveness Test URL

```
POST /api/v1/kyc/liveness/generate/:shareholderId
```

Generates a new liveness test URL for a shareholder.

**Request Body:**
```json
{
  "callbackUrl": "https://your-app.com/liveness/callback" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://third-party-liveness-provider.com/test/...",
    "expiresAt": "2023-12-31T23:59:59.000Z",
    "providerReference": "liveness_shareholder123_1678901234567"
  }
}
```

### Webhook for Liveness Results

```
POST /api/v1/kyc/liveness/webhook
```

Receives liveness test results from the third-party provider.

**Request Body:**
```json
{
  "providerReference": "liveness_shareholder123_1678901234567",
  "status": "completed",
  "result": {
    "success": true,
    "score": 95,
    "details": "Liveness test passed successfully",
    "completedAt": "2023-12-31T10:30:00.000Z"
  }
}
```

### Check Liveness Status

```
GET /api/v1/kyc/liveness/status/:providerReference
```

Manually check the status of a liveness test.

**Response:**
```json
{
  "success": true,
  "data": {
    "providerReference": "liveness_shareholder123_1678901234567",
    "result": {
      "success": true,
      "score": 95,
      "details": "Liveness test passed successfully",
      "completedAt": "2023-12-31T10:30:00.000Z"
    }
  }
}
```

## Integration with Third-Party Providers

To integrate with a real third-party liveness provider, you need to:

1. Replace the [MockLivenessProvider](file://c:\Users\user\Downloads\spring-TD\server\compliance-ms\src\services\livenessService.ts#L13-L57) implementation in [livenessService.ts](file://c:\Users\user\Downloads\spring-TD\server\compliance-ms\src\services\livenessService.ts) with your provider's API client
2. Update the `generateLivenessUrl` method to call your provider's API
3. Update the `getLivenessResult` method to retrieve results from your provider
4. Configure webhook URLs in your provider's dashboard to point to `/api/v1/kyc/liveness/webhook`

## Usage Flow

1. When a shareholder is created via `POST /api/v1/kyc/business/:merchantId/shareholders/create`, a liveness test URL is automatically generated
2. The shareholder is redirected to the URL to perform the liveness test
3. The third-party provider sends results to the webhook endpoint
4. The system updates the shareholder's liveness test status and results
5. The shareholder's KYC status is updated based on the liveness test result

## Error Handling

The liveness service includes comprehensive error handling:
- Network errors when calling third-party APIs
- Invalid responses from providers
- Missing required parameters
- Database update failures

All errors are logged and appropriate HTTP responses are returned.