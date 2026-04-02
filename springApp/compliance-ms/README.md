# Compliance Microservice

A comprehensive compliance microservice providing Know Your Customer (KYC) verification, risk assessment, and regulatory compliance capabilities for merchants and users.

Deployment URL: https://compliance-ms.fly.dev/

## Architecture Update

This service has been aligned with `plata/compliance-ms`.

- Business KYC data is normalized into separate collections:
  - `BusinessInfo`
  - `BusinessSurvey`
  - `BusinessDocument`
  - `Shareholder`
- `KYCProfile` remains the core workflow/status document and no longer stores merchant business documents inline.
- Merchant document status and admin review flows operate on business-document records from the dedicated collection.

## Features

### ✅ Implemented
- Individual and business KYC verification
- Risk assessment and scoring
- Document management and validation
- Compliance workflow management
- Shareholder liveness testing
- Administrative compliance management
- API-based compliance checking
- **CAC Certificate Verification** - Verify business registration with the Nigerian Corporate Affairs Commission (via Prembly API)
- **AML Document Verification** - Verify business documents using Prembly API (KYB/AML providers)
- **Sanctions List Checking** - Check individuals and businesses against international sanctions lists (via Prembly API)
- **Prembly Integration** - Comprehensive identity verification and compliance platform integration

## Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js with TypeScript
- **Database**: MongoDB (Mongoose); use MONGODB_URI or DATABASE_URL for connection (e.g. DigitalOcean Managed MongoDB)
- **Document Storage**: DigitalOcean Spaces via S3-compatible API
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Joi
- **Testing**: Jest + Supertest
- **Security**: helmet, CORS, express-rate-limit
- **Logging**: Winston
- **Verification Provider**: Prembly API (KYC, AML, CAC, Sanctions, Liveness)

## Document Upload Setup

KYC document binaries are uploaded directly by `compliance-ms` to DigitalOcean Spaces through `POST /api/v1/kyc/upload` (also available through `/api/v1/compliance/upload`). Submission payloads should then store the returned `url` as each document's `fileUrl`.

Required environment variables:

```env
DO_SPACES_REGION=nyc3
DO_SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
DO_SPACES_BUCKET=springtd-compliance-documents
DO_SPACES_ACCESS_KEY_ID=your-access-key
DO_SPACES_SECRET_ACCESS_KEY=your-secret-key
```

Optional:

```env
DO_SPACES_CDN_URL=https://springtd-compliance-documents.nyc3.cdn.digitaloceanspaces.com
```

Example upload flow:

1. `POST` multipart form-data to `/api/v1/kyc/upload` with the file in the `file` field.
2. Read the response `{ success, url, key }`.
3. Send that `url` as the document `fileUrl` in the subsequent KYC submission payload.

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
````json
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
    "companyName": "Example Business Ltd",
    "industry": "Technology",
    "countryOfIncorporation": "NG",
    "website": "https://example.com",
    "companyRegId": "RC123456",
    "companyLogoUrl": "https://example.com/logo.png"
  },
  "businessSurvey": {
    "businessType": "loan product",
    "country": "NG",
    "businessModel": "B2B",
    "monthlyProcessedVolume": 500000
  },
  "shareholders": [
    {
      "fullName": "John Doe",
      "dateOfBirth": "1985-05-15",
      "nationality": "NG",
      "ownershipPercentage": 60,
      "bankStatement": {
        "fileName": "bank_statement.pdf",
        "fileType": "application/pdf",
        "fileSize": 102400,
        "fileUrl": "https://example.com/bank_statement.pdf",
        "uploadDate": "2025-01-10T09:00:00.000Z"
      },
      "status": "pending",
      "kyc": {
        "url": "https://liveness-test.example.com/test-123",
        "expiresAt": "2025-01-15T09:00:00.000Z",
        "status": "pending"
      }
    }
  ],
  "businessDocuments": [
    {
      "type": "certificate_of_incorporation",
      "fileName": "certificate_of_incorporation.pdf",
      "fileType": "application/pdf",
      "fileSize": 204800,
      "fileUrl": "https://example.com/certificate_of_incorporation.pdf",
      "uploadedAt": "2025-01-10T09:00:00.000Z",
      "status": "pending"
    }
  ],
  "riskAssessment": {
    "annualTurnover": 500000,
    "expectedTransactionVolume": 100000,
    "highRiskJurisdiction": false,
    "sanctionListCheck": false,
    "adverseMediaCheck": false
  }
}
```

**Success Response (201 Created):**
````json
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
````json
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
````json
{
  "success": false,
  "error": "No KYC profile found for this user"
}
```

**Possible Status Values:**
- `PENDING` - KYC submission received, under review
- `IN_PROGRESS` - KYC processing in progress
- `REVIEW` - Additional review required
- `ADMIN_APPROVED` - Document approved by admin (ready for Prembly verification)
- `APPROVED` - KYC verification completed successfully
- `REJECTED` - KYC verification failed
- `FAILED` - KYC verification failed
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
```json
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
````json
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

```

### Admin Approve Document for Prembly Verification
**`POST /api/v1/kyc/admin/document/:documentId/approve`**

Approves a document for Prembly verification. Documents must be approved by an admin before they can be verified through Prembly API.

**Authentication**: Requires valid JWT token with Compliance Officer role

**Authorization**: This endpoint is restricted to Compliance Officers only.

**Path Parameters:**
- `documentId`: The ID of the document to approve

**Request Body:**
````json
{
  "notes": "Optional notes about the approval"
}
```

**Success Response (200 OK):**
````json
{
  "success": true,
  "message": "Document approved for Prembly verification",
  "data": {
    "documentId": "doc-123",
    "status": "admin_approved",
    "approvedBy": "admin-user-id",
    "approvedAt": "2025-01-10T10:00:00.000Z",
    "notes": "Document looks good, ready for Prembly verification"
  }
}
```

**Error Responses:**
- **400 Bad Request**: Document cannot be approved (not in PENDING or REVIEW status)
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: User is not a compliance officer
- **404 Not Found**: Document not found

**Note**: Documents must be in `PENDING` or `REVIEW` status to be approved. Once approved, the status changes to `admin_approved` and the document becomes eligible for Prembly verification.

### Update Document Status
**`PUT /api/v1/kyc/admin/document/:documentId/status`**

Updates the status of a document. Can be used to reject documents or update to other statuses.

**Authentication**: Requires valid JWT token with Compliance Officer role

**Authorization**: This endpoint is restricted to Compliance Officers only.

**Path Parameters:**
- `documentId`: The ID of the document to update

**Request Body:**
````json
{
  "status": "rejected",
  "rejectionReason": "Required if status is 'rejected'"
}
```

**Valid Status Values:**
- `pending` - Document is pending review
- `in_progress` - Document is being processed
- `review` - Document requires additional review
- `admin_approved` - Document approved by admin (ready for Prembly verification)
- `approved` - Document approved after Prembly verification
- `rejected` - Document rejected
- `failed` - Document verification failed
- `completed` - Document processing completed

**Success Response (200 OK):**
````json
{
  "success": true,
  "message": "Document status updated successfully",
  "data": {
    "documentId": "doc-123",
    "status": "rejected",
    "rejectionReason": "Document is unclear or missing required information"
  }
}
```

**Error Responses:**
- **400 Bad Request**: Invalid status or missing rejectionReason for rejected status
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: User is not a compliance officer
- **404 Not Found**: Document not found

**Example - Reject Document:**
```bash
PUT /api/v1/kyc/admin/document/doc-123/status
{
  "status": "rejected",
  "rejectionReason": "Document quality is too poor to verify"
}
```

### Verify AML Document (Prembly)
**`POST /api/v1/kyc/admin/document/:documentId/verify-aml`**

Verifies a document using Prembly AML verification. **Requires document to be admin-approved first.**

**Authentication**: Requires valid JWT token with Compliance Officer role

**Authorization**: This endpoint is restricted to Compliance Officers only.

**Path Parameters:**
- `documentId`: The ID of the document to verify

**Request Body:**
````json
{
  "provider": "prembly"
}
```

**Prerequisites**: Document must have status `admin_approved` before verification can proceed.

**Success Response (200 OK):**
````json
{
  "success": true,
  "message": "Document verification completed and approved",
  "data": {
    "documentId": "doc-123",
    "verificationResult": {
      "verificationId": "verification-123",
      "kybVerified": true,
      "amlClear": true,
      "overallApproved": true,
      "riskScore": 25
    },
    "status": "approved",
    "message": "Document approved"
  }
}
```

**Error Responses:**
- **400 Bad Request**: Document must be approved by admin before Prembly verification
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: User is not a compliance officer
- **404 Not Found**: Document not found

**Note**: If the document is not in `admin_approved` status, the verification will fail with a 400 error indicating that admin approval is required first.

### Verify CAC Certificate (Prembly)
**`POST /api/v1/kyc/admin/businesses/:userId/verify-certificate`**

Verifies a business Certificate of Incorporation with the Nigerian Corporate Affairs Commission using Prembly API. **Requires business documents to be admin-approved first.**

**Authentication**: Requires valid JWT token with Compliance Officer role

**Authorization**: This endpoint is restricted to Compliance Officers only.

**Path Parameters:**
- `userId`: The ID of the business user

**Request Body:**
````json
{
  "registrationNumber": "RC123456",
  "companyName": "Example Business Ltd"
}
```

**Prerequisites**: Business documents (especially certificate of incorporation) must have status `admin_approved` before verification can proceed.

**Success Response (200 OK):**
````json
{
  "success": true,
  "message": "Certificate verification completed",
  "data": {
    "verificationResult": {
      "success": true,
      "valid": true,
      "message": "CAC verification completed",
      "data": {
        "companyName": "Example Business Ltd",
        "registrationNumber": "RC123456",
        "registrationDate": "2020-01-15",
        "status": "Active",
        "address": "123 Business Street, Lagos, Nigeria",
        "directors": [
          {
            "name": "John Doe",
            "position": "Managing Director"
          }
        ]
      }
    },
    "userId": "user-456",
    "verifiedBy": "admin-user-id",
    "verifiedAt": "2025-01-10T10:30:00.000Z"
  }
}
```

**Error Responses:**
- **400 Bad Request**: Business documents must be approved by admin before Prembly verification
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: User is not a compliance officer
- **404 Not Found**: User profile not found

**Note**: If business documents are not in `admin_approved` status, the verification will fail with a 400 error indicating that admin approval is required first.

### Check Sanctions (Prembly)
**`POST /api/v1/kyc/admin/check-sanctions`**

Checks an individual or business against international sanctions lists. Uses Prembly API when configured, otherwise falls back to OpenSanctions API or mock.

**Authentication**: Requires valid JWT token with Compliance Officer role

**Authorization**: This endpoint is restricted to Compliance Officers only.

**Request Body:**
````json
{
  "name": "John Doe",
  "companyId": "optional-company-id",
  "country": "NG"
}
```

**Success Response (200 OK):**
````json
{
  "success": true,
  "data": {
    "flagged": false,
    "matches": [],
    "message": "optional"
  }
}
```

**Error Response (500 Internal Server Error):**
````json
{
  "success": false,
  "error": "Internal server error during sanctions check"
}
```

### Get Business Information
**`GET /api/v1/kyc/business/business-info`**

Retrieves the business information for a merchant user.

**Authentication**: Requires valid JWT token for business customers

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "companyName": "Example Business Ltd",
    "industry": "Technology",
    "countryOfIncorporation": "NG",
    "website": "https://example.com",
    "companyRegId": "RC123456",
    "companyLogoUrl": "https://example.com/logo.png"
  }
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "error": "No KYC profile found for this user"
}
```

### Get Business Survey
**`GET /api/v1/kyc/business/business-survey`**

Retrieves the business survey data for a merchant user.

**Authentication**: Requires valid JWT token for business customers

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "businessType": "loan product",
    "country": "NG",
    "businessModel": "B2B",
    "monthlyProcessedVolume": 500000
  }
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "error": "No KYC profile found for this user"
}
```

### Get Shareholders (Beneficial Owners)
**`GET /api/v1/kyc/business/beneficial-owners`**

Retrieves the shareholders (beneficial owners) information for a merchant user.

**Authentication**: Requires valid JWT token for business customers

**Success Response (200 OK):**
````json
{
  "success": true,
  "data": [
    {
      "fullName": "John Doe",
      "dateOfBirth": "1985-05-15",
      "nationality": "NG",
      "ownershipPercentage": 60,
      "bankStatement": {
        "fileName": "bank_statement.pdf",
        "fileType": "application/pdf",
        "fileSize": 102400,
        "fileUrl": "https://example.com/bank_statement.pdf",
        "uploadDate": "2025-01-10T09:00:00.000Z"
      },
      "status": "pending",
      "kyc": {
        "url": "https://liveness-test.example.com/test-123",
        "expiresAt": "2025-01-15T09:00:00.000Z",
        "status": "pending"
      }
    }
  ]
}
```

**Error Response (404 Not Found):**
````json
{
  "success": false,
  "error": "No KYC profile found for this user"
}
```

### Get Business Risk Assessment
**`GET /api/v1/kyc/business/risk-assessment`**

Retrieves the business risk assessment data for a merchant user.

**Authentication**: Requires valid JWT token for business customers

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "annualTurnover": 500000,
    "expectedTransactionVolume": 100000,
    "highRiskJurisdiction": false,
    "sanctionListCheck": false,
    "adverseMediaCheck": false
  }
}
```

**Error Response (404 Not Found):**
````json
{
  "success": false,
  "error": "No KYC profile found for this user"
}
```

### Update Business Information
**`PUT /api/v1/kyc/business/business-info`**

Updates the business information for a merchant user.

**Authentication**: Requires valid JWT token for business customers

**Request Body:**
````json
{
  "companyName": "Updated Business Ltd",
  "industry": "Technology",
  "countryOfIncorporation": "NG",
  "website": "https://updated-example.com",
  "companyRegId": "RC123456",
  "companyLogoUrl": "https://updated-example.com/logo.png"
}
```

**Success Response (200 OK):**
````json
{
  "success": true,
  "message": "Business information updated successfully"
}
```

**Error Response (400 Bad Request):**
````json
{
  "success": false,
  "error": "Error updating business information"
}
```

### Update Business Survey
**`PUT /api/v1/kyc/business/business-survey`**

Updates the business survey data for a merchant user.

**Authentication**: Requires valid JWT token for business customers

**Request Body:**
````json
{
  "businessType": "investment product",
  "country": "NG",
  "businessModel": "B2C",
  "monthlyProcessedVolume": 600000
}
```

**Success Response (200 OK):**
````json
{
  "success": true,
  "message": "Business survey updated successfully"
}
```

**Error Response (400 Bad Request):**
````json
{
  "success": false,
  "error": "Error updating business survey"
}
```

### Update Shareholders (Beneficial Owners)
**`PUT /api/v1/kyc/business/beneficial-owners`**

Updates the shareholders (beneficial owners) information for a merchant user.

**Authentication**: Requires valid JWT token for business customers

**Request Body:**
````json
[
  {
    "fullName": "John Doe",
    "dateOfBirth": "1985-05-15",
    "nationality": "NG",
    "ownershipPercentage": 60,
    "bankStatement": {
      "fileName": "bank_statement.pdf",
      "fileType": "application/pdf",
      "fileSize": 102400,
      "fileUrl": "https://example.com/bank_statement.pdf",
      "uploadDate": "2025-01-10T09:00:00.000Z"
    },
    "status": "pending",
    "kyc": {
      "url": "https://liveness-test.example.com/test-123",
      "expiresAt": "2025-01-15T09:00:00.000Z",
      "status": "pending"
    }
  },
  {
    "fullName": "Jane Smith",
    "dateOfBirth": "1980-10-20",
    "nationality": "NG",
    "ownershipPercentage": 40,
    "bankStatement": {
      "fileName": "bank_statement2.pdf",
      "fileType": "application/pdf",
      "fileSize": 102400,
      "fileUrl": "https://example.com/bank_statement2.pdf",
      "uploadDate": "2025-01-10T09:00:00.000Z"
    },
    "status": "pending",
    "kyc": {
      "url": "https://liveness-test.example.com/test-456",
      "expiresAt": "2025-01-15T09:00:00.000Z",
      "status": "pending"
    }
  }
]
```

**Success Response (200 OK):**
````json
{
  "success": true,
  "message": "Shareholders updated successfully"
}
```

**Error Response (400 Bad Request):**
````json
{
  "success": false,
  "error": "Error updating shareholders"
}
```

### Get Enhanced Due Diligence (High-Risk Businesses)
**`GET /api/v1/kyc/business/enhanced-due-diligence`**

Retrieves enhanced due diligence information for high-risk business customers.

**Authentication**: Requires valid JWT token for business customers with high-risk approval

**Success Response (200 OK):**
````json
{
  "success": true,
  "data": {
    "businessInfo": {
      "companyName": "Example Business Ltd",
      "industry": "Technology",
      "countryOfIncorporation": "NG",
      "website": "https://example.com",
      "companyRegId": "RC123456",
      "companyLogoUrl": "https://example.com/logo.png"
    },
    "businessSurvey": {
      "annualTurnover": 500000,
      "expectedTransactionVolume": 100000,
      "expectedTransactionValue": 5000,
      "sourceOfFunds": "Business revenue",
      "businessPurpose": "Software development and consulting",
      "numberOfEmployees": 25,
      "operatingSince": "2020-01-01T00:00:00.000Z",
      "businessModelDescription": "We provide software development services to clients globally",
      "customerBaseDescription": "Small to medium businesses in technology sector",
      "geographicMarkets": "Nigeria, United States, United Kingdom",
      "reasonForOpeningAccount": "To receive payments from international clients"
    },
    "shareholders": [
      {
        "fullName": "John Doe",
        "dateOfBirth": "1985-05-15",
        "nationality": "NG",
        "ownershipPercentage": 60,
        "bankStatement": {
          "fileName": "bank_statement.pdf",
          "fileType": "application/pdf",
          "fileSize": 102400,
          "fileUrl": "https://example.com/bank_statement.pdf",
          "uploadDate": "2025-01-10T09:00:00.000Z"
        },
        "status": "pending",
        "kyc": {
          "url": "https://liveness-test.example.com/test-123",
          "expiresAt": "2025-01-15T09:00:00.000Z",
          "status": "pending"
        }
      }
    ],
    "riskAssessment": {
      "annualTurnover": 500000,
      "expectedTransactionVolume": 100000,
      "highRiskJurisdiction": false,
      "sanctionListCheck": false,
      "adverseMediaCheck": false
    },
    "documents": [
      {
        "type": "certificate_of_incorporation",
        "fileName": "certificate_of_incorporation.pdf",
        "fileType": "application/pdf",
        "fileSize": 204800,
        "fileUrl": "https://example.com/certificate_of_incorporation.pdf",
        "uploadedAt": "2025-01-10T09:00:00.000Z",
        "status": "pending"
      }
    ]
  }
}
```

**Error Response (404 Not Found):**
````json
{
  "success": false,
  "error": "No KYC profile found for this user"
}
```

### Get Corporate Structure Information
**`GET /api/v1/kyc/business/corporate-structure`**

Retrieves corporate structure information for corporation and LLC business types.

**Authentication**: Requires valid JWT token for business customers with corporation or LLC business type

**Success Response (200 OK):**
````json
{
  "success": true,
  "data": {
    "businessInfo": {
      "companyName": "Example Business Ltd",
      "industry": "Technology",
      "countryOfIncorporation": "NG",
      "website": "https://example.com",
      "companyRegId": "RC123456",
      "companyLogoUrl": "https://example.com/logo.png"
    },
    "shareholders": [
      {
        "fullName": "John Doe",
        "dateOfBirth": "1985-05-15",
        "nationality": "NG",
        "ownershipPercentage": 60,
        "bankStatement": {
          "fileName": "bank_statement.pdf",
          "fileType": "application/pdf",
          "fileSize": 102400,
          "fileUrl": "https://example.com/bank_statement.pdf",
          "uploadDate": "2025-01-10T09:00:00.000Z"
        },
        "status": "pending",
        "kyc": {
          "url": "https://liveness-test.example.com/test-123",
          "expiresAt": "2025-01-15T09:00:00.000Z",
          "status": "pending"
        }
      }
    ],
    "documents": [
      {
        "type": "corporate_structure",
        "fileName": "corporate_structure.pdf",
        "fileType": "application/pdf",
        "fileSize": 204800,
        "fileUrl": "https://example.com/corporate_structure.pdf",
        "uploadedAt": "2025-01-10T09:00:00.000Z",
        "status": "pending"
      }
    ]
  }
}
```

**Error Response (404 Not Found):**
````json
{
  "success": false,
  "error": "No KYC profile found for this user"
}
```

### Get Non-Profit Verification Information
**`GET /api/v1/kyc/business/non-profit-verification`**

Retrieves verification information for non-profit business types.

**Authentication**: Requires valid JWT token for business customers with non-profit business type

**Success Response (200 OK):**
````json
{
  "success": true,
  "data": {
    "businessInfo": {
      "companyName": "Example Non-Profit Org",
      "industry": "Charity",
      "countryOfIncorporation": "NG",
      "website": "https://example-nonprofit.org",
      "companyRegId": "RC789012",
      "companyLogoUrl": "https://example-nonprofit.org/logo.png"
    },
    "businessSurvey": {
      "annualTurnover": 0,
      "expectedTransactionVolume": 50000,
      "expectedTransactionValue": 1000,
      "sourceOfFunds": "Donations",
      "businessPurpose": "Providing educational services to underprivileged children",
      "numberOfEmployees": 10,
      "operatingSince": "2015-01-01T00:00:00.000Z",
      "businessModelDescription": "We provide educational services funded by donations",
      "customerBaseDescription": "Underprivileged children and their families",
      "geographicMarkets": "Nigeria",
      "reasonForOpeningAccount": "To receive donations and manage funds"
    },
    "documents": [
      {
        "type": "business_registration",
        "fileName": "nonprofit_registration.pdf",
        "fileType": "application/pdf",
        "fileSize": 204800,
        "fileUrl": "https://example-nonprofit.org/registration.pdf",
        "uploadedAt": "2025-01-10T09:00:00.000Z",
        "status": "pending"
      }
    ]
  }
}
```

**Error Response (404 Not Found):**
````json
{
  "success": false,
  "error": "No KYC profile found for this user"
}
```

### Get Government Verification Information
**`GET /api/v1/kyc/business/government-verification`**

Retrieves verification information for government entity business types.

**Authentication**: Requires valid JWT token for business customers with government entity business type

**Success Response (200 OK):**
````json
{
  "success": true,
  "data": {
    "businessInfo": {
      "companyName": "Ministry of Education",
      "industry": "Government",
      "countryOfIncorporation": "NG",
      "website": "https://education.gov.ng",
      "companyRegId": "GOV-001",
      "companyLogoUrl": "https://education.gov.ng/logo.png"
    },
    "businessSurvey": {
      "annualTurnover": 10000000,
      "expectedTransactionVolume": 500000,
      "expectedTransactionValue": 20000,
      "sourceOfFunds": "Government budget",
      "businessPurpose": "Managing educational policies and funds",
      "numberOfEmployees": 500,
      "operatingSince": "1960-01-01T00:00:00.000Z",
      "businessModelDescription": "Government entity responsible for education policies",
      "customerBaseDescription": "Educational institutions and citizens",
      "geographicMarkets": "Nigeria",
      "reasonForOpeningAccount": "To manage government funds"
    },
    "documents": [
      {
        "type": "business_registration",
        "fileName": "government_registration.pdf",
        "fileType": "application/pdf",
        "fileSize": 204800,
        "fileUrl": "https://education.gov.ng/registration.pdf",
        "uploadedAt": "2025-01-10T09:00:00.000Z",
        "status": "pending"
      }
    ]
  }
}
```

**Error Response (404 Not Found):**
````json
{
  "success": false,
  "error": "No KYC profile found for this user"
}
```

