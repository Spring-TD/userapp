# CAC Certificate Verification

This document explains how to use the Nigerian Corporate Affairs Commission (CAC) certificate verification feature.

## Overview

The compliance microservice includes functionality for Admin Compliance Officers to verify the Certificate of Incorporation document provided by business customers through a third-party API call to the Nigerian Corporate Affairs Commission.

## Configuration

To enable CAC verification, you need to set the following environment variables:

```env
CAC_API_URL=https://api.cac.gov.ng
CAC_API_KEY=your_api_key_here
```

If these variables are not set, the service will use a mock verification for development/testing purposes.

## API Endpoint

### Verify Certificate of Incorporation

**Endpoint:** `POST /api/v1/admin/businesses/{userId}/verify-certificate`

**Authentication:** Requires admin authentication with Compliance Officer role

**Request Body:**
```json
{
  "registrationNumber": "RC123456",
  "companyName": "Example Company Limited"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Certificate verification completed",
  "data": {
    "verificationResult": {
      "success": true,
      "valid": true,
      "message": "Verification completed",
      "data": {
        "companyName": "Example Company Limited",
        "registrationNumber": "RC123456",
        "registrationDate": "2020-01-15",
        "status": "Active",
        "address": "123 Business Street, Lagos, Nigeria",
        "directors": [
          {
            "name": "John Doe",
            "position": "Managing Director"
          },
          {
            "name": "Jane Smith",
            "position": "Company Secretary"
          }
        ]
      }
    },
    "userId": "user-123",
    "verifiedBy": "admin-456",
    "verifiedAt": "2025-01-10T09:00:00.000Z"
  }
}
```

## Implementation Details

The verification is implemented in the following files:

1. `src/services/cacService.ts` - Contains the CAC verification logic
2. `src/services/kycService.ts` - Extended with `verifyCertificateWithCAC` method
3. `src/controllers/kycController.ts` - Extended with `verifyCertificateWithCAC` controller method
4. `src/routes/complianceAdminRoutes.ts` - Added the new route
5. `src/config/environment.ts` - Added CAC API configuration

## Error Handling

The service handles various error scenarios:

1. **Missing Configuration**: Returns an error if CAC API is not configured
2. **Company Not Found**: Returns a specific error when the company is not found in CAC records
3. **Authentication Errors**: Handles 401/403 responses from the CAC API
4. **Network Issues**: Handles timeouts and connection errors
5. **API Errors**: Handles unexpected responses from the CAC API

## Mock Verification

For development and testing purposes, when the CAC API is not configured, the service will use a mock verification that:

1. Validates that the registration number is at least 5 characters
2. Validates that the company name is at least 2 characters
3. Returns mock company data for valid inputs
4. Returns verification failure for invalid inputs

## Usage Example

```typescript
// Example usage in an admin interface
const verificationResult = await cacService.verifyCertificateOfIncorporation(
  "RC123456",
  "Example Company Limited"
);

if (verificationResult.valid) {
  console.log("Certificate is valid");
  console.log("Company:", verificationResult.data?.companyName);
  console.log("Registration Date:", verificationResult.data?.registrationDate);
} else {
  console.log("Certificate verification failed:", verificationResult.message);
}
```