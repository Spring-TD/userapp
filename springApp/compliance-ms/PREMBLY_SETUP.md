# Prembly API Setup Guide

This guide will help you configure Prembly API integration for the compliance microservice.

## Prerequisites

1. Prembly API account with valid credentials
2. API Key and API Secret from Prembly dashboard
3. Access to environment configuration

## Quick Setup

### 1. Get Prembly Credentials

1. Sign up or log in to your Prembly account
2. Navigate to API Settings
3. Generate or copy your API Key and API Secret
4. Note the API base URL (usually `https://api.prembly.com`)

### 2. Configure Environment Variables

Add the following environment variables to your `.env` file or deployment environment:

```env
# Prembly API Configuration
PREMBLY_API_KEY=your_prembly_api_key_here
PREMBLY_API_SECRET=your_prembly_api_secret_here
PREMBLY_BASE_URL=https://api.prembly.com
```

### 3. Verify Configuration

The service will automatically detect Prembly configuration and use it for:
- ✅ Individual KYC verification
- ✅ Business KYC verification
- ✅ AML document verification
- ✅ CAC certificate verification
- ✅ Sanctions list checking
- ✅ Liveness testing

## Testing the Integration

### Test Individual KYC

```bash
curl -X POST http://localhost:3003/api/v1/kyc/individual/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "personalInfo": {
      "firstName": "John",
      "lastName": "Doe",
      "dateOfBirth": "1990-01-01",
      "nationality": "NG"
    },
    "documents": [{
      "type": "nin",
      "fileName": "nin.jpg",
      "fileType": "image/jpeg",
      "fileData": "base64_encoded_image"
    }]
  }'
```

### Test Business KYC

```bash
curl -X POST http://localhost:3003/api/v1/kyc/business/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "businessInfo": {
      "companyName": "Example Business Ltd",
      "companyRegId": "RC123456"
    },
    "businessDocuments": [{
      "type": "certificate_of_incorporation",
      "fileName": "certificate.pdf",
      "fileUrl": "https://example.com/certificate.pdf"
    }]
  }'
```

### Test Sanctions Check

```bash
curl -X POST http://localhost:3003/api/v1/compliance/admin/check-sanctions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "John Doe",
    "country": "NG"
  }'
```

## Verification

After configuration, check the logs to verify Prembly is being used:

1. Look for log messages containing "Using Prembly API"
2. Check for Prembly verification IDs in responses
3. Verify API calls in Prembly dashboard

## Fallback Behavior

If Prembly is not configured:
- Services will fall back to alternative methods (OpenSanctions, direct APIs, or mock)
- No errors will occur, but verification may be limited
- Check logs for "Prembly API not configured" warnings

## Troubleshooting

### Issue: "Prembly API not configured"

**Solution:** Ensure environment variables are set correctly:
```bash
echo $PREMBLY_API_KEY
echo $PREMBLY_API_SECRET
```

### Issue: API authentication errors

**Solution:** 
1. Verify API key and secret are correct
2. Check API key hasn't expired
3. Ensure API key has required permissions

### Issue: Verification always fails

**Solution:**
1. Check document quality and format
2. Verify required fields are provided
3. Review Prembly API response in logs
4. Check Prembly service status

## API Endpoints

All existing endpoints automatically use Prembly when configured:

- `POST /api/v1/kyc/individual/submit` - Individual KYC with Prembly
- `POST /api/v1/kyc/business/submit` - Business KYC with Prembly
- `POST /api/v1/compliance/admin/document/:id/verify-aml` - AML verification with Prembly
- `POST /api/v1/compliance/admin/check-sanctions` - Sanctions check with Prembly
- `POST /api/v1/liveness/generate` - Liveness test with Prembly

## Additional Resources

- [Prembly Integration Documentation](./docs/prembly-integration.md)
- [Prembly API Documentation](https://docs.prembly.com)
- [Service README](./README.md)

## Support

For issues with:
- **Prembly API**: Contact Prembly support
- **Integration**: Check service logs and documentation
- **Configuration**: Review environment variables
