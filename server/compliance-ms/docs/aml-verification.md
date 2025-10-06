# AML Document Verification Implementation

## Overview

This document describes the implementation of the AML (Anti-Money Laundering) document verification functionality in the compliance microservice. The system allows administrators to verify business documents using third-party KYB/AML providers such as Trulioo, Sumsub, and ComplyAdvantage.

## Architecture

The AML verification implementation consists of the following components:

1. **AML Verification Service** - Handles communication with third-party AML providers
2. **AML Verification Controller** - Manages API endpoints for AML verification operations
3. **AML Verification Routes** - Defines the API routes for AML verification functionality

## AML Verification Service

The [AMLVerificationService](file://c:\Users\user\Downloads\spring-TD\server\compliance-ms\src\services\amlVerificationService.ts#L27-L347) class provides methods for verifying business documents against third-party AML providers:

### verifyDocument Method

Verifies a business document using a specified AML provider:

```typescript
async verifyDocument(document: BusinessDocumentData, providerName: string = 'trulioo'): Promise<AMLVerificationResult>
```

**Parameters:**
- `document`: The business document to verify
- `providerName`: The AML provider to use (trulioo, sumsub, complyadvantage)

**Returns:** [AMLVerificationResult](file://c:\Users\user\Downloads\spring-TD\server\compliance-ms\src\services\amlVerificationService.ts#L14-L25) containing the verification results

### updateDocumentStatusBasedOnVerification Method

Updates the document status in the database based on the AML verification result:

```typescript
async updateDocumentStatusBasedOnVerification(documentId: string, verificationResult: AMLVerificationResult): Promise<boolean>
```

**Parameters:**
- `documentId`: The ID of the document to update
- `verificationResult`: The AML verification result

**Returns:** Boolean indicating success

## AML Verification Result Structure

The [AMLVerificationResult](file://c:\Users\user\Downloads\spring-TD\server\compliance-ms\src\services\amlVerificationService.ts#L14-L25) interface contains all information about the verification:

```typescript
interface AMLVerificationResult {
  documentId: string;
  providerId: string;
  verificationId: string;
  success: boolean;
  kybVerified: boolean;
  amlClear: boolean;
  overallApproved: boolean;
  suspicious: boolean;
  riskScore: number;
  reason?: string;
  documentUrl: string;
  documentHash: string;
  rawResponse: any;
  verifiedAt: Date;
}
```

## API Endpoints

### Verify AML Document

```
POST /api/v1/compliance/admin/document/:documentId/verify-aml
```

Verifies a document using a third-party AML provider.

**Request Body:**
```json
{
  "provider": "trulioo" // Optional, defaults to 'trulioo'
}
```

**Response:**
```json
{
  "success": true,
  "message": "Document verification completed and approved",
  "data": {
    "documentId": "document-123",
    "verificationResult": {
      // Full verification result
    },
    "status": "approved",
    "message": "Document approved"
  }
}
```

## Integration with Third-Party Providers

To integrate with real third-party AML providers, you need to:

1. Set environment variables for API keys:
   ```env
   TRULIOO_API_KEY=your_trulioo_api_key
   SUMSUB_API_KEY=your_sumsub_api_key
   COMPLYADVANTAGE_API_KEY=your_complyadvantage_api_key
   ```

2. Replace the mock implementation in [callAMLProvider](file://c:\Users\user\Downloads\spring-TD\server\compliance-ms\src\services\amlVerificationService.ts#L103-L152) method with actual API calls to your provider

3. Update the response parsing to match your provider's API response format

## Usage Flow

1. Customer uploads AML document as part of their KYC submission
2. Admin calls the verification endpoint to check the document
3. System calls the third-party AML provider API with document details
4. Provider performs KYB verification and AML checks (PEPs, sanctions, adverse media)
5. System receives results (instant or via webhook)
6. System persists provider's result, document URL, hash, and raw response
7. If check is suspicious, system escalates for manual review and blocks onboarding
8. If check fails, system rejects the document and requires extra documentation
9. If check passes, system approves the document

## Error Handling

The AML verification service includes comprehensive error handling:
- Network errors when calling third-party APIs
- Invalid responses from providers
- Missing required parameters
- Database update failures

All errors are logged and appropriate HTTP responses are returned.

## Audit Trail

All AML verification activities are logged in the audit trail:
- Document verification attempts
- Provider responses
- Status updates
- Manual reviews

This ensures complete traceability of all AML verification activities.