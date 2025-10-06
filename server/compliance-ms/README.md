# Compliance Microservice

A comprehensive compliance microservice providing Know Your Customer (KYC) verification, risk assessment, and regulatory compliance capabilities for merchants and users.

## Features

### ✅ Implemented
- Individual and business KYC verification
- Risk assessment and scoring
- Document management and validation
- Compliance workflow management
- Shareholder liveness testing
- Administrative compliance management
- API-based compliance checking
- **CAC Certificate Verification** - Verify business registration with the Nigerian Corporate Affairs Commission
- **AML Document Verification** - Verify business documents using third-party KYB/AML providers
- **Sanctions List Checking** - Check individuals and businesses against international sanctions lists

## Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js with TypeScript
- **Database**: MongoDB (configured, currently using mock database)
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Joi
- **Testing**: Jest + Supertest
- **Security**: helmet, CORS, express-rate-limit
- **Logging**: Winston

## API Documentation

### Create Individual KYC Order
**`POST /api/v1/kyc/individual/submit`**

Submit KYC information for an individual customer to create a KYC order.

**Authentication**: Requires valid JWT token for individual customers

**Request Body:**
```json
{
  "personalInfo": {
    "firstName": "John",
    "lastName": "Doe",
    "dateOfBirth": "1990-01-01",
    "nationality": "NG",
    "address": {
      "street": "123 Main St",
      "city": "Lagos",
      "state": "Lagos",
      "postalCode": "100001",
      "country": "NG"
    }
  },
  "documents": [
    {
      "type": "passport",
      "fileName": "passport.jpg",
      "fileType": "image/jpeg",
      "fileSize": 102400,
      "fileData": "base64encodedfiledata"
    }
  ]
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "kycId": "kyc-123",
    "userId": "user-123",
    "status": "PENDING",
    "riskLevel": "LOW",
    "submittedAt": "2025-01-10T09:00:00.000Z"
  }
}
```

### Create Business KYC Order
**`POST /api/v1/kyc/business/submit`**

Submit KYC information for a business customer to create a KYC order.

**Authentication**: Requires valid JWT token for business customers

**Request Body:**
```json
{
  "businessInfo": {
    "businessName": "Example Business Ltd",
    "businessType": "CORPORATION",
    "registrationNumber": "RC123456",
    "industry": "Technology",
    "address": {
      "street": "456 Business Ave",
      "city": "Lagos",
      "state": "Lagos",
      "postalCode": "100001",
      "country": "NG"
    }
  },
  "beneficialOwners": [
    {
      "fullName": "John Doe",
      "dateOfBirth": "1985-05-15",
      "nationality": "NG",
      "ownershipPercentage": 60,
      "address": {
        "street": "123 Main St",
        "city": "Lagos",
        "state": "Lagos",
        "postalCode": "100001",
        "country": "NG"
      }
    }
  ],
  "directors": [
    {
      "fullName": "Jane Smith",
      "position": "Managing Director",
      "dateOfBirth": "1980-10-20",
      "nationality": "NG"
    }
  ],
  "documents": [
    {
      "type": "business_registration",
      "fileName": "certificate_of_incorporation.pdf",
      "fileType": "application/pdf",
      "fileSize": 204800,
      "fileData": "base64encodedfiledata"
    }
  ]
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "kycId": "kyc-456",
    "userId": "user-456",
    "status": "PENDING",
    "riskLevel": "MEDIUM",
    "shareholderCount": 1,
    "submittedAt": "2025-01-10T09:00:00.000Z"
  }
}
```

### KYC Status Check
**`GET /api/v1/kyc/status/:userId`**

Checks the KYC compliance status for a user or merchant.

**Authentication**: Requires valid JWT token

**Path Parameters:**
- `userId`: The ID of the user to check compliance status for

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "userId": "user-123",
    "userType": "merchant",
    "status": "APPROVED",
    "documentCount": 5,
    "submittedAt": "2025-01-10T09:00:00.000Z",
    "completedAt": "2025-01-10T10:30:00.000Z",
    "riskLevel": "LOW"
  }
}
```

**Not Found Response (404 Not Found):**
```json
{
  "success": false,
  "error": "No KYC profile found for this user"
}
```

**Possible Status Values:**
- `PENDING` - KYC submission received, under review
- `APPROVED` - KYC verification completed successfully
- `REJECTED` - KYC verification failed
- `REVIEW` - Additional review required
- `EXPIRED` - KYC documents have expired
- `COMPLETED` - All requirements fulfilled

**Possible Risk Level Values:**
- `LOW` - Low risk customer
- `MEDIUM` - Medium risk customer
- `HIGH` - High risk customer
- `VERY_HIGH` - Very high risk customer

### Get All Users
**`GET /api/v1/kyc/admin/users`**

Retrieves a list of all registered users in the compliance system.

**Authentication**: Requires valid JWT token with Compliance Officer role

**Authorization**: This endpoint is restricted to Compliance Officers only. Regular users cannot access this endpoint.

**Success Response (200 OK):**
``json
{
  "success": true,
  "data": [
    {
      "userId": "user-123",
      "userType": "merchant",
      "status": "APPROVED",
      "riskLevel": "LOW",
      "submittedAt": "2025-01-10T09:00:00.000Z",
      "completedAt": "2025-01-10T10:30:00.000Z",
      "reviewedBy": "admin-456",
      "reviewDate": "2025-01-10T10:30:00.000Z",
      "isBlocked": false,
      "blockedReason": null
    }
  ]
}
```

**Error Response (500 Internal Server Error):**
```json
{
  "success": false,
  "error": "Error retrieving all users"
}
```

**Response Fields:**
- `userId`: The unique identifier of the user
- `userType`: The type of user (individual or merchant)
- `status`: The current KYC status of the user
- `riskLevel`: The risk assessment level of the user
- `submittedAt`: When the user submitted their KYC information
- `completedAt`: When the KYC process was completed
- `reviewedBy`: The admin who last reviewed the user's KYC
- `reviewDate`: When the user's KYC was last reviewed
- `isBlocked`: Whether the user account is currently blocked
- `blockedReason`: The reason why the user account is blocked (if applicable)

### Get All Compliance Documents
**`GET /api/v1/kyc/admin/documents`**

Retrieves all compliance documents from all user profiles in the system.

**Authentication**: Requires valid JWT token with Compliance Officer role

**Authorization**: This endpoint is restricted to Compliance Officers only. Regular users cannot access this endpoint.

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "documentId": "doc-123",
      "userId": "user-456",
      "userType": "individual",
      "type": "passport",
      "fileName": "passport.jpg",
      "fileType": "image/jpeg",
      "fileSize": 102400,
      "uploadDate": "2025-01-10T09:00:00.000Z",
      "status": "APPROVED",
      "rejectionReason": null
    }
  ]
}
```

**Error Response (500 Internal Server Error):**
```
{
  "success": false,
  "error": "Error retrieving all documents"
}
