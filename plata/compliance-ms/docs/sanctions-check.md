# Sanctions Check Feature

The compliance microservice includes a sanctions checking feature that integrates with the OpenSanctions API to check if individuals or businesses are listed on any sanctions lists.

## Overview

The sanctions check feature allows compliance officers to verify if a person or business entity appears on international sanctions lists, politically exposed persons (PEPs) lists, or other watchlists. This helps ensure regulatory compliance and reduce financial crime risks.

## API Endpoint

**`POST /api/v1/compliance/admin/check-sanctions`**

This endpoint is only accessible to authenticated compliance officers.

### Request Body

```json
{
  "name": "string",        // Required: Name of individual or business
  "companyId": "string",   // Optional: Company registration ID/Number
  "country": "string"      // Optional: 2-letter ISO country code (e.g., "NG", "US")
}
```

### Response

#### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "flagged": true/false,
    "matches": [
      {
        "id": "string",
        "caption": "string",
        "schema": "string",
        "properties": {
          "name": ["string"],
          "country": ["string"],
          "address": ["string"],
          "birthDate": ["string"],
          "deathDate": ["string"],
          "position": ["string"],
          "topics": ["string"]
        },
        "datasets": ["string"],
        "referents": ["string"]
      }
    ],
    "message": "string"
  }
}
```

#### Error Responses

- **400 Bad Request**: Invalid input data
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: User is not a compliance officer
- **500 Internal Server Error**: Error during sanctions check

## Configuration

To enable sanctions checking, set the following environment variable:

```env
OPENSANCTIONS_API_KEY=your_opensanctions_api_key
```

If no API key is provided, the service will make requests without authentication (limited rate).

## Implementation Details

### Service Layer

The [SanctionsService](file://c:\Users\user\Downloads\spring-TD\server\compliance-ms\src\services\sanctionsService.ts#L25-L165) handles communication with the OpenSanctions API:

1. Validates input parameters
2. Constructs the search query
3. Makes authenticated requests to the OpenSanctions API
4. Processes and filters results
5. Returns structured response data
6. Handles errors gracefully with logging

### Controller Layer

The [checkSanctions](file://c:\Users\user\Downloads\spring-TD\server\compliance-ms\src\controllers\kycController.ts#L58-L98) method in [KYCController](file://c:\Users\user\Downloads\spring-TD\server\compliance-ms\src\controllers\kycController.ts#L12-L1795) handles the HTTP request:

1. Validates request body using Joi validation
2. Calls the sanctions service
3. Formats and returns the response
4. Handles errors appropriately

### Validation

Request validation is performed using Joi schema validation in the [validateSanctionsCheck](file://c:\Users\user\Downloads\spring-TD\server\compliance-ms\src\middleware\sanctionsValidation.ts#L13-L33) middleware.

## Usage Example

### Request

```bash
curl -X POST "http://localhost:3003/api/v1/compliance/admin/check-sanctions" \
  -H "Authorization: Bearer your_jwt_token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Example Company Ltd",
    "companyId": "RC123456",
    "country": "NG"
  }'
```

### Response

```json
{
  "success": true,
  "data": {
    "flagged": false,
    "matches": [],
    "message": "No matches found on sanctions lists"
  }
}
```

## Integration with Admin Review Process

The sanctions check feature integrates with the existing admin review workflow. After performing a sanctions check, compliance officers can:

1. Review the matches returned by the API
2. Reject the user/application with a message if sanctions matches are found
3. Approve the user/application if no concerning matches are found
4. Escalate for further review if needed

This allows compliance officers to make informed decisions based on sanctions screening results.