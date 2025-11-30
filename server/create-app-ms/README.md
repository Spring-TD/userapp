# Create App Microservice

The Create App Microservice handles the creation and management of applications within the SpringTD platform. This service allows merchants to create applications that can then be associated with products from the Product Microservice.

Deployment URL: https://create-app-ms.fly.dev/

## Features

- Create new applications with detailed information (App Name, Website URL, App Alias, App Description)
- Manage application lifecycle (draft, submitted, approved, rejected)
- Retrieve applications by ID or merchant ID
- Retrieve all applications
- Automatically create user wallets for applications using the Wallet Microservice
- Update application information
- Delete applications
- Associate applications with products through product keys
- Manage product keys for applications
- View transactions for individual applications
- Get transaction statistics for applications
- Manage documents submitted by users through the Drive feature
- Special endpoints requiring API key authentication for advanced operations

## API Endpoints

### Standard App Endpoints

#### Create App
```
POST /api/v1/apps
```
Creates a new application in draft status and automatically creates a user wallet for the application.

**Request Body:**
- `name` (string, required): Application name (3-100 characters)
- `websiteUrl` (string, required): Application website URL
- `alias` (string, required): Application alias (2-50 characters)
- `description` (string, required): Application description (10-1000 characters)
- `merchantId` (string, required): ID of the merchant who owns the application

**Response:**
Returns the created application with auto-generated ID and timestamps, along with user wallet creation information.

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

### Update App
```
PUT /api/v1/apps/{id}
```
Updates application information.

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
curl -X GET "http://localhost:3002/api/v1/apps/app-123/transactions" \
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
curl -X GET "http://localhost:3002/api/v1/apps/app-123/transactions?type=credit" \
  -H "Content-Type: application/json"

# Get completed transactions within a date range
curl -X GET "http://localhost:3002/api/v1/apps/app-123/transactions?status=completed&startDate=2023-01-01&endDate=2023-01-31" \
  -H "Content-Type: application/json"

# Pagination
curl -X GET "http://localhost:3002/api/v1/apps/app-123/transactions?page=1&limit=10" \
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
curl -X GET "http://localhost:3002/api/v1/apps/app-123/transaction-stats" \
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
curl -X POST "http://localhost:3002/api/v1/apps/app-123/drive/documents" \
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
curl -X GET "http://localhost:3002/api/v1/apps/app-123/drive/documents" \
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
curl -X GET "http://localhost:3002/api/v1/apps/app-123/drive/documents/doc-789" \
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
curl -X PUT "http://localhost:3002/api/v1/apps/app-123/drive/documents/doc-789" \
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
curl -X DELETE "http://localhost:3002/api/v1/apps/app-123/drive/documents/doc-789" \
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
curl -X GET "http://localhost:3002/api/v1/apps/app-123/drive/document-stats" \
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

## Integration with Wallet Microservice

The Create App Microservice automatically creates a user wallet for each application through integration with the Wallet Microservice. When an application is created, a user wallet is automatically created for the merchant (as a user of their own app).

This integration ensures that each application has the necessary financial infrastructure from the moment of creation.

## Authentication

Special endpoints require two headers for authentication:
- `X-Special-Key`: The special API key
- `X-Public-Key`: The public key

Example:
```bash
curl -X GET "http://localhost:3002/api/v1/special/apps" \
  -H "X-Special-Key: your-special-api-key-here" \
  -H "X-Public-Key: your-public-key-here"
```

## Environment Variables

- `PORT`: Port number for the service (default: 3002)
- `NODE_ENV`: Environment (development, production, etc.)
- `SERVICE_AUTH_URL`: URL for the Service Authentication Microservice
- `PRODUCT_SERVICE_URL`: URL for the Product Microservice
- `WALLET_SERVICE_URL`: URL for the Wallet Microservice
- `SPECIAL_API_KEY`: Special API key for authenticating special endpoints
- `PUBLIC_KEY`: Public key for authenticating special endpoints

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