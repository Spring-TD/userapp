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
``json
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
``json
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
``json
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

### Get Business Information
**`GET /api/v1/kyc/business/business-info`**

Retrieves the business information for a merchant user.

**Authentication**: Requires valid JWT token for business customers

**Success Response (200 OK):**
``json
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
``json
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
``json
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
```json
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
```json
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
```json
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
```json
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
```json
{
  "success": true,
  "message": "Business information updated successfully"
}
```

**Error Response (400 Bad Request):**
```json
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
```json
{
  "businessType": "investment product",
  "country": "NG",
  "businessModel": "B2C",
  "monthlyProcessedVolume": 600000
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Business survey updated successfully"
}
```

**Error Response (400 Bad Request):**
```json
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
```json
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
```json
{
  "success": true,
  "message": "Shareholders updated successfully"
}
```

**Error Response (400 Bad Request):**
```json
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
```json
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
```json
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
```json
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
```json
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
```json
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
```json
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
```json
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
```json
{
  "success": false,
  "error": "No KYC profile found for this user"
}
```

