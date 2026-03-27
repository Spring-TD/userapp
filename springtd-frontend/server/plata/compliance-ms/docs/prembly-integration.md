# Prembly API Integration

This document describes the integration of Prembly API for KYC, AML, CAC, Sanctions, and Liveness verification in the compliance microservice.

## Overview

The compliance microservice now supports Prembly API for all verification services. Prembly is a comprehensive identity verification and compliance platform that provides:

- **KYC Verification** - Individual and business identity verification
- **AML Verification** - Anti-Money Laundering document verification
- **CAC Verification** - Nigerian Corporate Affairs Commission certificate verification
- **Sanctions Checking** - International sanctions list screening
- **Liveness Testing** - Biometric liveness verification for shareholders

## Configuration

To enable Prembly API integration, set the following environment variables:

```env
PREMBLY_API_KEY=your_prembly_api_key
PREMBLY_API_SECRET=your_prembly_api_secret
PREMBLY_BASE_URL=https://api.prembly.com  # Optional, defaults to this URL
```

### Environment Variables

- `PREMBLY_API_KEY` - Your Prembly API key (required)
- `PREMBLY_API_SECRET` - Your Prembly API secret (required)
- `PREMBLY_BASE_URL` - Prembly API base URL (optional, defaults to `https://api.prembly.com`)

## Service Architecture

The Prembly integration is implemented through a unified `PremblyService` class that handles all API communications. Individual services (CAC, AML, Sanctions, Liveness, KYC) use the Prembly service when configured, with fallback to alternative methods or mock implementations.

### Service Flow

1. **Check Configuration** - Each service checks if Prembly is configured
2. **Call Prembly API** - If configured, makes API call to Prembly
3. **Process Response** - Maps Prembly response to internal data structures
4. **Fallback** - If Prembly fails or is not configured, falls back to alternative methods

## Features

### 1. Individual KYC Verification

Prembly verifies individual identity using various document types:

**Supported Document Types:**
- NIN (National Identification Number)
- Passport
- Driver's License
- Voter's Card

**Integration:**
- Automatically called during individual KYC submission
- Verifies document authenticity and identity information
- Updates KYC status based on verification result

**Example Request:**
```typescript
{
  firstName: "John",
  lastName: "Doe",
  dateOfBirth: "1990-01-01",
  documentType: "nin",
  documentNumber: "12345678901",
  documentImage: "base64_encoded_image",
  phoneNumber: "+2348012345678",
  email: "john.doe@example.com"
}
```

### 2. Business KYC Verification

Prembly verifies business information and registration:

**Integration:**
- Automatically called during business KYC submission
- Verifies company registration and business documents
- Updates KYC status based on verification result

**Example Request:**
```typescript
{
  companyName: "Example Business Ltd",
  registrationNumber: "RC123456",
  country: "NG",
  documentImage: "base64_encoded_image_or_url"
}
```

### 3. AML Document Verification

Prembly performs comprehensive AML checks including:
- KYB (Know Your Business) verification
- PEPs (Politically Exposed Persons) screening
- Sanctions list checking
- Adverse media screening
- Risk scoring

**Integration:**
- Called when admin verifies business documents
- Provides detailed AML risk assessment
- Escalates suspicious cases for manual review

**Example Request:**
```typescript
{
  companyName: "Example Business Ltd",
  registrationNumber: "RC123456",
  documentImage: "document_url_or_base64"
}
```

### 4. CAC Certificate Verification

Prembly verifies Nigerian Corporate Affairs Commission certificates:

**Integration:**
- Called during business KYC submission
- Verifies company registration details
- Retrieves company information including directors

**Example Request:**
```typescript
{
  registrationNumber: "RC123456",
  companyName: "Example Business Ltd"
}
```

**Response Includes:**
- Company name
- Registration number
- Registration date
- Company status
- Company address
- Directors list

### 5. Sanctions List Checking

Prembly checks individuals and businesses against international sanctions lists:

**Integration:**
- Called by compliance officers for sanctions screening
- Provides detailed match information
- Flags potential sanctions matches

**Example Request:**
```typescript
{
  name: "John Doe",
  companyId: "RC123456",  // Optional
  country: "NG",           // Optional
  dateOfBirth: "1990-01-01" // Optional
}
```

### 6. Liveness Testing

Prembly provides biometric liveness verification:

**Integration:**
- Generates liveness test URLs for shareholders
- Processes liveness test results
- Updates shareholder KYC status based on results

**Example Request:**
```typescript
{
  userId: "shareholder_123",
  callbackUrl: "https://your-app.com/liveness/callback"
}
```

**Response Includes:**
- Liveness test URL
- Expiration date
- Verification ID for result retrieval

## API Endpoints

The Prembly integration works seamlessly with existing endpoints:

### Individual KYC
- `POST /api/v1/kyc/individual/submit` - Automatically uses Prembly if configured

### Business KYC
- `POST /api/v1/kyc/business/submit` - Automatically uses Prembly if configured

### AML Verification
- `POST /api/v1/compliance/admin/document/:documentId/verify-aml` - Uses Prembly for AML checks

### CAC Verification
- Automatically called during business KYC submission

### Sanctions Check
- `POST /api/v1/compliance/admin/check-sanctions` - Uses Prembly for sanctions screening

### Liveness Testing
- `POST /api/v1/liveness/generate` - Uses Prembly to generate liveness test URLs
- `GET /api/v1/liveness/result/:verificationId` - Uses Prembly to retrieve results

## Error Handling

The integration includes comprehensive error handling:

1. **Configuration Errors** - If Prembly is not configured, services fall back to alternative methods
2. **API Errors** - Network and API errors are caught and logged, with fallback to alternative methods
3. **Validation Errors** - Invalid requests are validated before sending to Prembly
4. **Timeout Handling** - API calls have 30-second timeout with proper error handling

## Fallback Behavior

If Prembly API is not configured or fails:

1. **CAC Service** - Falls back to direct CAC API (if configured) or mock
2. **AML Service** - Falls back to mock implementation
3. **Sanctions Service** - Falls back to OpenSanctions API (if configured) or returns no matches
4. **Liveness Service** - Falls back to mock implementation
5. **KYC Service** - Continues with manual review process

## Logging and Audit

All Prembly API interactions are logged and audited:

- Request logging with request details
- Response logging with verification results
- Audit trail for compliance purposes
- Error logging for troubleshooting

## Testing

To test the Prembly integration:

1. Set environment variables with valid Prembly credentials
2. Submit KYC requests through the API
3. Check logs for Prembly API calls
4. Verify responses include Prembly verification IDs

## Best Practices

1. **API Key Security** - Store API keys securely in environment variables
2. **Error Handling** - Always handle API failures gracefully
3. **Rate Limiting** - Be aware of Prembly API rate limits
4. **Data Privacy** - Ensure compliance with data protection regulations
5. **Monitoring** - Monitor API usage and costs

## Troubleshooting

### Prembly API Not Working

1. Check environment variables are set correctly
2. Verify API key and secret are valid
3. Check network connectivity
4. Review error logs for specific error messages
5. Ensure API base URL is correct

### Verification Failing

1. Check document quality and format
2. Verify required fields are provided
3. Review Prembly API response for specific errors
4. Check if document type is supported

### High Error Rates

1. Check API rate limits
2. Verify API credentials are valid
3. Review network stability
4. Check Prembly service status

## Support

For Prembly API support:
- Check Prembly documentation: https://docs.prembly.com
- Contact Prembly support for API issues
- Review service logs for detailed error information

## Migration Notes

When migrating from mock/other providers to Prembly:

1. Set Prembly environment variables
2. Test with sample data first
3. Monitor verification success rates
4. Update any custom integrations
5. Train staff on new verification workflows

## Future Enhancements

Potential future enhancements:
- Webhook support for asynchronous verification results
- Batch verification capabilities
- Enhanced risk scoring
- Additional document type support
- Real-time verification status updates
