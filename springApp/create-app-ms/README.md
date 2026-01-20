# Create App Microservice

The Create App Microservice handles the creation and management of applications within the SpringTD platform. This service allows merchants to create applications that can then be associated with products from the Product Microservice.

Deployment URL: https://create-app-ms.fly.dev/

## Features

- Create new applications with detailed information (App Name, Website URL, App Alias, App Description)
- **Automatic subdomain assignment** - Each app receives a unique subdomain (e.g., `my-app.springtd.com`) similar to Shopify's shop subdomain system
- Manage application lifecycle (draft, submitted, approved, rejected)
- Retrieve applications by ID, merchant ID, or subdomain
- Retrieve all applications
- Automatically create user wallets for applications using the Wallet Microservice
- Update application information (including subdomain)
- Delete applications
- Associate applications with products through product keys
- Manage product keys for applications
- View transactions for individual applications
- Get transaction statistics for applications
- Manage documents submitted by users through the Drive feature
- Special endpoints requiring API key authentication for advanced operations
- **Authentication required for app creation** - Merchant ID is extracted from authenticated user context

## API Endpoints

### Standard App Endpoints

#### Create App
```
POST /api/v1/apps
```
Creates a new application in draft status, automatically assigns a unique subdomain, and creates a user wallet for the application. Requires JWT authentication - merchant ID is extracted from the authenticated user context.

**Request Headers:**
- `Authorization`: Bearer token obtained through authentication

**Request Body:**
- `name` (string, required): Application name (3-100 characters) - Used to auto-generate subdomain if not provided
- `websiteUrl` (string, required): Application website URL
- `alias` (string, required): Application alias (2-50 characters)
- `description` (string, required): Application description (10-1000 characters)
- `merchantId` (string, optional): ID of the merchant who owns the application (extracted from authenticated user for merchants, required for admins)
- `subdomain` (string, optional): Custom subdomain (3-63 characters, lowercase alphanumeric and hyphens only). If not provided, a subdomain will be auto-generated from the app name.

**Response:**
Returns the created application with auto-generated ID, assigned subdomain, subdomain URL, and timestamps, along with user wallet creation information.

**Example Response:**
```json
{
  "success": true,
  "message": "App created successfully",
  "data": {
    "app": {
      "id": "abc123xyz",
      "name": "My Awesome App",
      "subdomain": "my-awesome-app",
      "subdomainUrl": "https://my-awesome-app.springtd.com",
      "websiteUrl": "https://example.com",
      "alias": "awesome-app",
      "description": "This is my awesome application",
      "merchantId": "merchant-123",
      "status": "draft",
      "createdAt": "2023-01-15T10:30:00Z",
      "updatedAt": "2023-01-15T10:30:00Z",
      "productKeys": []
    },
    "wallets": {
      "success": true,
      "data": {...}
    }
  }
}
```

**Subdomain Generation:**
- If a custom `subdomain` is provided, it will be validated and used (must be unique)
- If no `subdomain` is provided, one will be auto-generated from the app `name`:
  - Converted to lowercase
  - Special characters removed (only alphanumeric and hyphens allowed)
  - Spaces replaced with hyphens
  - If the generated subdomain already exists, a numeric suffix is appended (e.g., `my-app-2`, `my-app-3`)
- All subdomains must be unique across all apps

### Get All Apps
```
GET /api/v1/apps
```
Retrieves all applications in the system.

### Get App by ID
```
GET /api/v1/apps/{id}
```
Retrieves a specific application by its ID.

### Get Apps by Merchant ID
```
GET /api/v1/apps/merchant/{merchantId}
```
Retrieves all applications associated with a merchant.

### Get App by Subdomain
```
GET /api/v1/apps/subdomain/{subdomain}
```
Retrieves a specific application by its subdomain. Useful for routing middleware that needs to resolve apps by subdomain.

**Example Request:**
```bash
curl -X GET "http://localhost:4002/api/v1/apps/subdomain/my-awesome-app" \
  -H "Content-Type: application/json"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "id": "abc123xyz",
    "name": "My Awesome App",
    "subdomain": "my-awesome-app",
    "subdomainUrl": "https://my-awesome-app.springtd.com",
    "websiteUrl": "https://example.com",
    "alias": "awesome-app",
    "description": "This is my awesome application",
    "merchantId": "merchant-123",
    "status": "approved",
    "createdAt": "2023-01-15T10:30:00Z",
    "updatedAt": "2023-01-15T10:30:00Z"
  }
}
```

### Update App
```
PUT /api/v1/apps/{id}
```
Updates application information. Can also update the subdomain (must be unique if changed).

**Request Body:**
- `name` (string, optional): Application name
- `websiteUrl` (string, optional): Application website URL
- `alias` (string, optional): Application alias
- `description` (string, optional): Application description
- `status` (string, optional): Application status
- `subdomain` (string, optional): Custom subdomain (must be unique if provided)
- `productKeys` (array, optional): Array of product keys

**Note:** When updating the subdomain, it must be unique across all apps. The system will validate uniqueness before allowing the update.

### Delete App
```
DELETE /api/v1/apps/{id}
```
Deletes an application.

### Submit App
```
POST /api/v1/apps/{id}/submit
```
Submits an application for review.

### Approve App
```
POST /api/v1/apps/{id}/approve
```
Approves a submitted application.

### Reject App
```
POST /api/v1/apps/{id}/reject
```
Rejects a submitted application.

### Transaction Endpoints

#### Get App Transactions
```
GET /api/v1/apps/{id}/transactions
```
Retrieves all transactions for a specific application with optional filtering and pagination.

**Query Parameters:**
- `page` (number, optional): Page number for pagination
- `limit` (number, optional): Number of transactions per page
- `type` (string, optional): Filter by transaction type ('credit' or 'debit')
- `status` (string, optional): Filter by transaction status ('pending', 'completed', 'failed', 'cancelled')
- `startDate` (string, optional): Filter transactions from this date (ISO format)
- `endDate` (string, optional): Filter transactions up to this date (ISO format)

##### Example Request

```bash
curl -X GET "http://localhost:4002/api/v1/apps/app-123/transactions" \
  -H "Content-Type: application/json"
```

##### Example Response

```json
{
  "success": true,
  "data": [
    {
      "id": "txn-1",
      "appId": "app-123",
      "amount": 100.50,
      "currency": "USD",
      "type": "credit",
      "status": "completed",
      "description": "Payment received from customer",
      "createdAt": "2023-01-15T10:30:00Z",
      "updatedAt": "2023-01-15T10:30:00Z"
    },
    {
      "id": "txn-2",
      "appId": "app-123",
      "amount": 25.99,
      "currency": "USD",
      "type": "debit",
      "status": "completed",
      "description": "Service fee",
      "createdAt": "2023-01-16T14:45:00Z",
      "updatedAt": "2023-01-16T14:45:00Z"
    }
  ]
}
```

##### Filtering Transactions

You can filter transactions using query parameters:

```bash
# Get only credit transactions
curl -X GET "http://localhost:4002/api/v1/apps/app-123/transactions?type=credit" \
  -H "Content-Type: application/json"

# Get completed transactions within a date range
curl -X GET "http://localhost:4002/api/v1/apps/app-123/transactions?status=completed&startDate=2023-01-01&endDate=2023-01-31" \
  -H "Content-Type: application/json"

# Pagination
curl -X GET "http://localhost:4002/api/v1/apps/app-123/transactions?page=1&limit=10" \
  -H "Content-Type: application/json"
```

#### Get App Transaction Statistics
```
GET /api/v1/apps/{id}/transaction-stats
```
Retrieves transaction statistics for a specific application.

**Response:**
- `totalTransactions`: Total number of transactions
- `totalCreditAmount`: Total amount of credit transactions
- `totalDebitAmount`: Total amount of debit transactions
- `pendingTransactions`: Number of pending transactions
- `completedTransactions`: Number of completed transactions
- `failedTransactions`: Number of failed transactions
- `netAmount`: Net amount (credit - debit)

##### Example Request

```bash
curl -X GET "http://localhost:4002/api/v1/apps/app-123/transaction-stats" \
  -H "Content-Type: application/json"
```

##### Example Response

```json
{
  "success": true,
  "data": {
    "totalTransactions": 15,
    "totalCreditAmount": 1250.75,
    "totalDebitAmount": 325.50,
    "pendingTransactions": 2,
    "completedTransactions": 12,
    "failedTransactions": 1,
    "netAmount": 925.25
  }
}
```

##### Error Handling

If the app ID is not found, you'll receive a 404 error:

```json
{
  "success": false,
  "error": "App not found"
}
```

If the app ID is missing, you'll receive a 400 error:

```json
{
  "success": false,
  "error": "App ID is required"
}
```

### Drive Endpoints

The Drive feature allows management of documents submitted by users of the created app.

#### Upload Document
```
POST /api/v1/apps/{id}/drive/documents
```
Uploads a document to the app's drive.

**Request Body:**
- `userId` (string, required): ID of the user who submitted the document
- `fileName` (string, required): Name of the file
- `fileType` (string, required): Type of the file (e.g., 'pdf', 'jpg', 'png')
- `fileSize` (number, required): Size of the file in bytes
- `url` (string, required): URL where the file is stored
- `status` (string, required): Status of the document ('pending', 'verified', 'rejected')
- `metadata` (object, optional): Additional metadata about the document

##### Example Request

```bash
curl -X POST "http://localhost:4002/api/v1/apps/app-123/drive/documents" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-456",
    "fileName": "id-document.pdf",
    "fileType": "pdf",
    "fileSize": 2048000,
    "url": "https://storage.example.com/id-document.pdf",
    "status": "pending",
    "metadata": {
      "documentType": "id",
      "country": "US"
    }
  }'
```

##### Example Response

```json
{
  "success": true,
  "message": "Document uploaded successfully",
  "data": {
    "id": "doc-789",
    "appId": "app-123",
    "userId": "user-456",
    "fileName": "id-document.pdf",
    "fileType": "pdf",
    "fileSize": 2048000,
    "url": "https://storage.example.com/id-document.pdf",
    "status": "pending",
    "metadata": {
      "documentType": "id",
      "country": "US"
    },
    "uploadedAt": "2023-01-15T10:30:00Z"
  }
}
```

#### Get App Documents
```
GET /api/v1/apps/{id}/drive/documents
```
Retrieves all documents for a specific application with optional filtering and pagination.

**Query Parameters:**
- `page` (number, optional): Page number for pagination
- `limit` (number, optional): Number of documents per page
- `userId` (string, optional): Filter by user ID
- `fileType` (string, optional): Filter by file type
- `status` (string, optional): Filter by document status ('pending', 'verified', 'rejected')
- `startDate` (string, optional): Filter documents uploaded from this date (ISO format)
- `endDate` (string, optional): Filter documents uploaded up to this date (ISO format)

##### Example Request

```bash
curl -X GET "http://localhost:4002/api/v1/apps/app-123/drive/documents" \
  -H "Content-Type: application/json"
```

##### Example Response

```json
{
  "success": true,
  "data": [
    {
      "id": "doc-789",
      "appId": "app-123",
      "userId": "user-456",
      "fileName": "id-document.pdf",
      "fileType": "pdf",
      "fileSize": 2048000,
      "url": "https://storage.example.com/id-document.pdf",
      "status": "pending",
      "metadata": {
        "documentType": "id",
        "country": "US"
      },
      "uploadedAt": "2023-01-15T10:30:00Z"
    }
  ]
}
```

#### Get Document by ID
```
GET /api/v1/apps/{id}/drive/documents/{documentId}
```
Retrieves a specific document by its ID.

##### Example Request

```bash
curl -X GET "http://localhost:4002/api/v1/apps/app-123/drive/documents/doc-789" \
  -H "Content-Type: application/json"
```

##### Example Response

```json
{
  "success": true,
  "data": {
    "id": "doc-789",
    "appId": "app-123",
    "userId": "user-456",
    "fileName": "id-document.pdf",
    "fileType": "pdf",
    "fileSize": 2048000,
    "url": "https://storage.example.com/id-document.pdf",
    "status": "pending",
    "metadata": {
      "documentType": "id",
      "country": "US"
    },
    "uploadedAt": "2023-01-15T10:30:00Z"
  }
}
```

#### Update Document
```
PUT /api/v1/apps/{id}/drive/documents/{documentId}
```
Updates a document's information.

**Request Body:**
- Any fields from the document object that need to be updated

##### Example Request

```bash
curl -X PUT "http://localhost:4002/api/v1/apps/app-123/drive/documents/doc-789" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "verified"
  }'
```

##### Example Response

```json
{
  "success": true,
  "message": "Document updated successfully",
  "data": {
    "id": "doc-789",
    "appId": "app-123",
    "userId": "user-456",
    "fileName": "id-document.pdf",
    "fileType": "pdf",
    "fileSize": 2048000,
    "url": "https://storage.example.com/id-document.pdf",
    "status": "verified",
    "metadata": {
      "documentType": "id",
      "country": "US"
    },
    "uploadedAt": "2023-01-15T10:30:00Z"
  }
}
```

#### Delete Document
```
DELETE /api/v1/apps/{id}/drive/documents/{documentId}
```
Deletes a document.

##### Example Request

```bash
curl -X DELETE "http://localhost:4002/api/v1/apps/app-123/drive/documents/doc-789" \
  -H "Content-Type: application/json"
```

##### Example Response

```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

#### Get Document Statistics
```
GET /api/v1/apps/{id}/drive/document-stats
```
Retrieves document statistics for a specific application.

**Response:**
- `totalDocuments`: Total number of documents
- `pendingDocuments`: Number of pending documents
- `verifiedDocuments`: Number of verified documents
- `rejectedDocuments`: Number of rejected documents
- `fileTypeCounts`: Count of documents by file type

##### Example Request

```bash
curl -X GET "http://localhost:4002/api/v1/apps/app-123/drive/document-stats" \
  -H "Content-Type: application/json"
```

##### Example Response

```json
{
  "success": true,
  "data": {
    "totalDocuments": 15,
    "pendingDocuments": 5,
    "verifiedDocuments": 8,
    "rejectedDocuments": 2,
    "fileTypeCounts": {
      "pdf": 10,
      "jpg": 3,
      "png": 2
    }
  }
}
```

### Product Key Management

#### Add Product Key to App
```
POST /api/v1/apps/{id}/product-key
```
Adds a product key to an application.

#### Get Product Keys for App
```
GET /api/v1/apps/{id}/product-keys
```
Retrieves all product keys associated with an application.

### Special Endpoints (Require API Key Authentication)

All special endpoints require both `X-Special-Key` and `X-Public-Key` headers to be provided for authentication.

#### 1. Get all Apps
```
GET /api/v1/special/apps
```
Retrieves all applications in the system with additional metadata.

#### 2. Get App by ID
```
GET /api/v1/special/apps/{id}
```
Retrieves a specific application by its ID with additional metadata.

#### 3. Get all Products
```
GET /api/v1/special/products
```
Retrieves all products from the Product Microservice.

#### 4. Get Product by ID
```
GET /api/v1/special/products/{id}
```
Retrieves a specific product by its ID.

#### 5. Get Merchant Wallet Balance
```
GET /api/v1/special/wallets/merchant/{merchantId}/balance/{walletType}
```
Retrieves the balance of a merchant wallet (TREASURY, OPERATION, or KYC).

#### 6. Get Merchant Wallet History
```
GET /api/v1/special/wallets/merchant/{merchantId}/history/{walletType}
```
Retrieves the transaction history of a merchant wallet.

#### 7. Create User and Wallet
```
POST /api/v1/special/users
```
Creates a new user and automatically creates a wallet for them.

#### 8. Get All Users
```
GET /api/v1/special/users
```
Retrieves all users in the system.

#### 9. Get User Details by ID
```
GET /api/v1/special/users/{id}
```
Retrieves details of a specific user by their ID.

#### 10. Get User's Wallet
```
GET /api/v1/special/wallets/user/{userId}
```
Retrieves the wallet of a specific user.

#### 11. Get All Users' Wallets
```
GET /api/v1/special/wallets/users/{merchantId}
```
Retrieves all user wallets associated with a merchant.

#### 12. Get Product's Users Subscribers
```
GET /api/v1/special/products/{productId}/subscribers
```
Retrieves all users subscribed to a specific product.

#### 13. Withdraw from User's Wallet
```
POST /api/v1/special/wallets/user/{userId}/withdraw
```
Withdraws funds from a user's wallet.

#### 14. Submit Documents for a User
```
POST /api/v1/special/users/{userId}/documents
```
Submits documents for a specific user.

#### 15. Get Drive Documents by User
```
GET /api/v1/special/drive/users/{userId}
```
Retrieves all drive documents for a specific user.

#### 16. Get Drive Documents by Product
```
GET /api/v1/special/drive/products/{productId}
```
Retrieves all drive documents associated with a specific product.

#### 17. Get Transaction History for a User
```
GET /api/v1/special/transactions/user/{userId}
```
Retrieves the transaction history for a specific user.

#### 18. Get All Transaction History by Product
```
GET /api/v1/special/transactions/product/{productId}
```
Retrieves all transaction history associated with a specific product.

#### 19. Get Transaction History by App
```
GET /api/v1/special/transactions/app/{appId}
```
Retrieves the transaction history for a specific application.

#### 20. Subscribe a User to a Product
```
POST /api/v1/special/subscriptions/users/{userId}/products/{productId}
```
Subscribes a user to a specific product.

#### 21. Get User's Product Subscription
```
GET /api/v1/special/subscriptions/users/{userId}/products/{productId}
```
Retrieves a user's subscription details for a specific product.

#### 22. Apply to Product
```
POST /api/v1/special/applications/users/{userId}/products/{productId}
```
Submits an application for a user to a specific product.

#### 23. Get All Product Applications
```
GET /api/v1/special/applications/products/{productId}
```
Retrieves all applications for a specific product.

#### 24. Register Callback
```
POST /api/v1/special/callbacks/users/{userId}
```
Registers a callback for user application status or wallet events.

## Data Model

### App
- `id`: Unique identifier for the application (auto-generated)
- `name`: Application name (3-100 characters)
- `websiteUrl`: Application website URL
- `alias`: Application alias (2-50 characters)
- `description`: Application description (10-1000 characters)
- `merchantId`: ID of the merchant who owns the application
- `subdomain`: Unique subdomain assigned to the application (auto-generated from name or custom)
- `subdomainUrl`: Full URL for accessing the app via subdomain (e.g., `https://my-app.springtd.com`) - included in API responses
- `status`: Current status (draft, submitted, approved, rejected, incomplete)
- `createdAt`: Creation timestamp (auto-generated)
- `updatedAt`: Last update timestamp (auto-generated)
- `submittedAt`: Submission timestamp (optional)
- `approvedAt`: Approval timestamp (optional)
- `rejectedAt`: Rejection timestamp (optional)
- `rejectionReason`: Reason for rejection (optional)
- `productKeys`: Array of product keys associated with this application (optional)

### Transaction
- `id`: Unique identifier for the transaction (auto-generated)
- `appId`: ID of the application the transaction belongs to
- `amount`: Transaction amount
- `currency`: Currency code (e.g., 'USD')
- `type`: Transaction type ('credit' or 'debit')
- `status`: Transaction status ('pending', 'completed', 'failed', 'cancelled')
- `description`: Transaction description
- `createdAt`: Creation timestamp (auto-generated)
- `updatedAt`: Last update timestamp (auto-generated)

### DriveDocument
- `id`: Unique identifier for the document (auto-generated)
- `appId`: ID of the application the document belongs to
- `userId`: ID of the user who submitted the document
- `fileName`: Name of the file
- `fileType`: Type of the file (e.g., 'pdf', 'jpg', 'png')
- `fileSize`: Size of the file in bytes
- `url`: URL where the file is stored
- `uploadedAt`: Upload timestamp (auto-generated)
- `status`: Document status ('pending', 'verified', 'rejected')
- `metadata`: Additional metadata about the document (optional)

## Integration with Product Microservice

The Create App Microservice integrates with the Product Microservice through the `appId` field and product keys. When creating a product, the Product Microservice requires an `appId` that corresponds to an application created through this service.

Example workflow:
1. Create an application using this service
2. Use the returned application ID when creating products in the Product Microservice
3. Products will be associated with the application through the `appId` field
4. Product keys can be added to applications to track which products are associated with them

## Subdomain System

Each application created through this service automatically receives a unique subdomain that can be used to access the app, similar to how Shopify assigns subdomains to shops.

### How Subdomains Work

1. **Automatic Generation**: When an app is created without specifying a custom subdomain, one is automatically generated from the app name:
   - "My Awesome App" → `my-awesome-app.springtd.com`
   - "E-Commerce Store" → `e-commerce-store.springtd.com`

2. **Custom Subdomains**: You can provide a custom subdomain in the create request:
   ```json
   {
     "name": "My App",
     "subdomain": "my-custom-name",
     ...
   }
   ```
   The subdomain will be validated for format and uniqueness.

3. **Uniqueness**: All subdomains must be unique. If a generated subdomain already exists, a numeric suffix is automatically appended:
   - `my-app` (if taken)
   - `my-app-2` (if `my-app` is taken)
   - `my-app-3` (if both are taken)

4. **Subdomain Rules**:
   - Must be 3-63 characters long
   - Can only contain lowercase letters, numbers, and hyphens
   - Must start and end with a letter or number
   - Cannot contain consecutive hyphens

5. **Accessing Apps**: Apps can be accessed via their subdomain URL:
   - `https://my-app.springtd.com`
   - The full URL is included in API responses as `subdomainUrl`

### Subdomain Lookup

You can retrieve an app by its subdomain using:
```
GET /api/v1/apps/subdomain/{subdomain}
```

This is useful for routing middleware that needs to resolve which app a request is for based on the subdomain in the HTTP Host header.

## Integration with Wallet Microservice

The Create App Microservice automatically creates a user wallet for each application through integration with the Wallet Microservice. When an application is created, a user wallet is automatically created for the merchant (as a user of their own app).

This integration ensures that each application has the necessary financial infrastructure from the moment of creation.

## Authentication

Standard endpoints that modify data (like creating apps) now require JWT authentication. The merchant ID is extracted from the authenticated user context rather than being passed in the request body.

Special endpoints require two headers for authentication:
- `X-Special-Key`: The special API key
- `X-Public-Key`: The public key

Example:
```bash
curl -X GET "http://localhost:4002/api/v1/special/apps" \
  -H "X-Special-Key: your-special-api-key-here" \
  -H "X-Public-Key: your-public-key-here"
```

## Environment Variables

- `PORT`: Port number for the service (default: 4002)
- `NODE_ENV`: Environment (development, production, etc.)
- `SERVICE_AUTH_URL`: URL for the Service Authentication Microservice
- `PRODUCT_SERVICE_URL`: URL for the Product Microservice
- `WALLET_SERVICE_URL`: URL for the Wallet Microservice
- `SPECIAL_API_KEY`: Special API key for authenticating special endpoints
- `PUBLIC_KEY`: Public key for authenticating special endpoints
- `JWT_SECRET`: Secret key for JWT token verification
- `SUBDOMAIN_BASE_DOMAIN`: Base domain for subdomains (default: `springtd.com`). All app subdomains will be created as `{subdomain}.{SUBDOMAIN_BASE_DOMAIN}`

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the project:
   ```bash
   npm run build
   ```

3. Start the service:
   ```bash
   npm start
   ```

For development:
```bash
npm run dev
```

## App Configuration Management

The Create App Microservice includes comprehensive app configuration management, allowing merchants to customize their app's appearance, branding, onboarding flow, support options, and policies. Each app can have multiple configuration versions with version tracking and publishing capabilities.

### Configuration Features

- **Multiple Configurations**: Each app can have multiple configuration versions (active and inactive)
- **Version Tracking**: Automatic version reference generation (e.g., "App_update_1aa344")
- **Update Variance Tracking**: Automatically tracks which sections were modified (Splash, Profile, DNS, Terms, etc.)
- **Publishing System**: Manage published and unpublished configurations with status tracking
- **Configuration Templates**: Save and reuse configuration templates
- **Granular Control**: Configure colors, fonts, images, and content for different app sections

### Configuration Sections

#### 1. Asset Configuration
- Logo upload
- Splash image upload
- Site description

#### 2. Splash Screen Configuration
- Primary and secondary colors
- Background colors
- Logo and image uploads

#### 3. Onboarding Configuration
- Three splash screens (splash1, splash2, splash3)
- Font family selection
- Title and subtitle text
- Text colors (primary, secondary)
- Background colors (primary, secondary)
- Images for each splash screen

#### 4. App Profile Configuration
- Text colors (primary, secondary, aux)
- Element colors (primary, secondary)
- Menu colors (primary, secondary, aux)
- Auxiliary element colors (primary, secondary)
- Background colors (primary, secondary)

#### 5. Policy/Terms Configuration
- Policy section with title and rich text content
- Terms section with title and rich text content
- Legacy support for privacy policy, terms and conditions, and indemnity URLs

#### 6. Support Configuration
- Contact email
- Contact phone
- Website URL
- LinkedIn page URL
- Social media handles
- Privacy policy link
- Terms and conditions link
- Support components (custom links, buttons, text)
- Social media links (Instagram, LinkedIn, Twitter, Facebook)

### Configuration Endpoints

#### Get Active Configuration
```
GET /api/v1/apps/:id/configuration
```
Returns the currently active configuration for the app.

**Example Response:**
```json
{
  "success": true,
  "data": {
    "id": "config-123",
    "appId": "app-456",
    "versionReference": "App_update_1aa344",
    "publishing": {
      "isPublished": true,
      "publishedAt": "2025-04-12T10:30:00Z"
    },
    "appElements": { ... },
    "appProfile": { ... },
    "onboarding": { ... },
    "support": { ... },
    "policy": { ... },
    "isActive": true,
    "updateVariance": ["Splash", "Profile", "DNS", "Terms"],
    "createdAt": "2025-04-12T10:00:00Z",
    "updatedAt": "2025-04-12T10:30:00Z"
  }
}
```

#### Get All Configurations
```
GET /api/v1/apps/:id/configuration/all
```
Returns all configurations (active and inactive) for the app.

#### Get Configurations for Publish UI
```
GET /api/v1/apps/:id/configuration/publish
```
Returns configurations formatted for the publish UI, separated into unpublished and previous (published) versions.

**Example Response:**
```json
{
  "success": true,
  "data": {
    "unpublished": [
      {
        "id": "config-123",
        "versionReference": "App_update_1aa344",
        "updateVariance": ["Splash", "Profile", "DNS", "Terms"],
        "publishing": { "isPublished": false },
        "isActive": false,
        "updatedAt": "2025-04-12T10:30:00Z"
      }
    ],
    "previous": [
      {
        "id": "config-456",
        "versionReference": "App_update_abc123",
        "updateVariance": ["Splash", "Profile"],
        "publishing": {
          "isPublished": true,
          "publishedAt": "2025-04-11T15:20:00Z"
        },
        "isActive": true,  // "Current" if true, "Archived" if false
        "updatedAt": "2025-04-11T15:20:00Z"
      }
    ]
  }
}
```

#### Update Configuration
```
PUT /api/v1/apps/:id/configuration
```
Updates the active configuration. Automatically tracks update variance based on which sections are modified.

**Request Body:**
```json
{
  "publishing": { "isPublished": true },
  "appElements": { ... },
  "appProfile": { ... },
  "onboarding": { ... },
  "support": { ... },
  "policy": { ... }
}
```

#### Create New Configuration
```
POST /api/v1/apps/:id/configuration/create
```
Creates a new configuration version. Can be created without auto-deactivating the current active configuration.

**Request Body:**
```json
{
  "configuration": {
    "publishing": { "isPublished": false },
    "appElements": { ... }
  },
  "options": {
    "skipAutoDeactivate": true,  // Optional: don't deactivate current active config
    "isActive": false            // Optional: create as inactive
  }
}
```

#### Activate Configuration
```
PUT /api/v1/apps/:id/configuration/:configurationId/activate
```
Activates a specific configuration and deactivates all others for the app.

#### Update Publishing Status
```
PUT /api/v1/apps/:id/configuration/publishing
```
Updates the publishing status. Automatically sets `publishedAt` timestamp when publishing.

**Request Body:**
```json
{
  "isPublished": true
}
```

### Section-Specific Update Endpoints

#### Update App Elements
```
PUT /api/v1/apps/:id/configuration/app-elements
```
Updates app elements (logo, splash, buttons, header, body text, form colors).

#### Update App Profile
```
PUT /api/v1/apps/:id/configuration/app-profile
```
Updates app profile colors (text, element, menu, auxiliary, background).

#### Update Onboarding
```
PUT /api/v1/apps/:id/configuration/onboarding
```
Updates onboarding configuration (splash screens, fonts, colors, text).

#### Update Support
```
PUT /api/v1/apps/:id/configuration/support
```
Updates support configuration (contact info, social media, links).

#### Update Policy
```
PUT /api/v1/apps/:id/configuration/policy
```
Updates policy configuration (policy and terms sections with titles and content).

### Configuration Templates

#### Create Template
```
POST /api/v1/apps/:id/configuration/templates
```
Creates a configuration template from the current configuration.

**Request Body:**
```json
{
  "name": "My Template",
  "description": "Template description",
  "isDefault": false
}
```

#### Get All Templates
```
GET /api/v1/apps/:id/configuration/templates
```
Returns all templates for the app.

#### Get Template
```
GET /api/v1/apps/:id/configuration/templates/:templateId
```
Returns a specific template.

#### Apply Template
```
POST /api/v1/apps/:id/configuration/templates/:templateId/apply
```
Applies a template to the app's active configuration.

#### Update Template
```
PUT /api/v1/apps/:id/configuration/templates/:templateId
```
Updates a template.

#### Delete Template
```
DELETE /api/v1/apps/:id/configuration/templates/:templateId
```
Deletes a template.

#### Set Default Template
```
PUT /api/v1/apps/:id/configuration/templates/:templateId/set-default
```
Sets a template as the default for the app.

### Support Component Management

#### Add Support Component
```
POST /api/v1/apps/:id/configuration/support/components
```
Adds a support component (link, button, or text).

**Request Body:**
```json
{
  "name": "Help Center",
  "type": "link",
  "content": "https://help.example.com",
  "color": "#007bff",
  "order": 1
}
```

#### Update Support Component
```
PUT /api/v1/apps/:id/configuration/support/components/:componentId
```
Updates a support component.

#### Delete Support Component
```
DELETE /api/v1/apps/:id/configuration/support/components/:componentId
```
Deletes a support component.

#### Reorder Support Components
```
PUT /api/v1/apps/:id/configuration/support/components/reorder
```
Reorders support components.

**Request Body:**
```json
{
  "componentIds": ["comp-1", "comp-2", "comp-3"]
}
```

### Configuration Data Model

#### AppConfiguration
- `id`: Unique identifier (auto-generated)
- `appId`: ID of the app this configuration belongs to
- `versionReference`: Auto-generated version reference (e.g., "App_update_1aa344")
- `publishing`: Publishing configuration
  - `isPublished`: Whether the configuration is published
  - `publishedAt`: Timestamp when published (auto-set on publish)
- `appElements`: App elements configuration (logo, splash, buttons, colors)
- `appProfile`: App profile configuration (text, element, menu, background colors)
- `onboarding`: Onboarding configuration (splash screens, fonts, colors)
- `support`: Support configuration (contact info, social media, components)
- `policy`: Policy configuration (policy and terms sections)
- `isActive`: Whether this is the active configuration
- `updateVariance`: Array of sections that were modified (auto-calculated)
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

### Version Management

The configuration system supports version management:

1. **Multiple Versions**: Each app can have multiple configuration versions
2. **Active Configuration**: Only one configuration can be active at a time
3. **Version References**: Each configuration gets an auto-generated version reference
4. **Update Tracking**: System automatically tracks which sections were modified
5. **Publishing**: Configurations can be published or kept as drafts
6. **History**: Previous published versions are maintained with status (Current/Archived)

### Publishing Workflow

1. **Create/Update Configuration**: Make changes to configuration sections
2. **Review**: Configuration is created as unpublished
3. **Publish**: Set `isPublished: true` to publish the configuration
4. **Activate**: Activate a published configuration to make it live
5. **Version History**: Previous versions are archived and can be viewed

### Default Configuration

When an app is created, a default configuration is automatically generated with:
- Default color schemes (blue primary, gray secondary)
- Default fonts (Arial)
- Empty support components
- Empty policy/terms sections
- Unpublished status

All sections can be customized through the configuration endpoints.