# Contract Microservice

Contract Microservice for managing contracts, agreements, and legal documents within the Spring-TD platform.

## Overview

The Contract Microservice handles the creation, management, and lifecycle of various contract types including disclaimers, agreements, indemnity forms, and terms & conditions. It provides comprehensive contract management with support for digital signatures, facial scan verification, and contract versioning.

## Features

- **Contract Management**: Create, read, update, and delete contracts
- **Contract Orders**: Handle contract order creation and tracking
- **Automatic URL Generation**: Each contract order gets a unique, shareable URL
- **Callback Notifications**: Automatic HTTP callbacks to `redirect_url` when contracts are signed
- **Email Notifications**: Automatic email notifications via SMTP when contracts are submitted
- **SMS Notifications**: Automatic SMS notifications via Twilio when contracts are submitted
- **PDF Generation**: Generate professional PDF documents for signed contracts
- **Bulk PDF Download**: Download all signed contracts by user as a single PDF
- **Contract Forms**: Manage user-submitted contract forms
- **Digital Signatures**: Support for contract signing workflow
- **Multiple Contract Types**: 
  - Disclaimer
  - Agreement
  - Indemnity
  - Terms and Conditions
- **Contract Versioning**: Track contract versions over time
- **Authentication**: JWT-based authentication for secure operations
- **Facial Scan Verification**: Support for biometric verification on specific contract types

## Technology Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Joi
- **Security**: Helmet, CORS
- **Logging**: Morgan
- **HTTP Client**: Axios

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (v5 or higher)
- npm or yarn

## Installation

1. **Navigate to the contract-ms directory**:
   ```bash
   cd server/contract-ms
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```

4. **Update the `.env` file with your configuration**:
   ```env
   NODE_ENV=development
   PORT=3009
   SERVICE_AUTH_URL=http://localhost:3000
   CONTRACT_BASE_URL=http://localhost:3009
   CORS_ORIGINS=http://localhost:3000,http://localhost:3001
   LOG_LEVEL=info
   MONGO_URI=mongodb://localhost:27017/contract_db
   JWT_SECRET=your-secret-key-here
   ```

## Running the Service

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

### Testing
```bash
npm test
npm run test:watch
```

## API Endpoints

### Service Information

#### Get Service Info
```http
GET /
```
Returns service information, version, and available endpoints.

#### Health Check
```http
GET /health
```
Returns service health status.

---

### Public Contract Creation Endpoint

Base URL: `/api/v1/contracts/public/create`

#### Create Contract (Public)
```http
POST /api/v1/contracts/public/create
Content-Type: application/json

{
  "email": "user@example.com",
  "name": "John Doe",
  "contractData": {
    "title": "My New Contract",
    "content": "Contract content here...",
    "description": "Description of the contract"
  }
}
```

Creates a new user account if it doesn't exist and then creates a new contract for the user.

**Response:**
```json
{
  "success": true,
  "message": "Contract created successfully",
  "data": {
    "contract": { /* contract object */ },
    "token": "jwt_token", // Authentication token for the newly created account
    "redirectUrl": "/contracts/contract-id/edit" // URL to redirect user to edit contract
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

### Public Contract Signing Workflow

The service provides a complete public workflow for external users to sign contracts:

#### 1. Request OTP
```http
POST /api/v1/contracts/public/request-otp
Content-Type: application/json

{
  "email": "signer@example.com",
  "contractUrl": "http://localhost:3009/contracts/65a1b2c3d4e5f6g7h8i9j0k1"
}
```

Sends a 6-digit OTP to the user's email for verification.

#### 2. Verify OTP and Create Account
```http
POST /api/v1/contracts/public/verify-otp
Content-Type: application/json

{
  "email": "signer@example.com",
  "otp": "123456",
  "contractOrderId": "65a1b2c3d4e5f6g7h8i9j0k1"
}
```

Verifies the OTP and automatically creates an account for the user.

**Response:**
```json
{
  "success": true,
  "message": "Verification successful",
  "data": {
    "token": "jwt_token",
    "contractFormId": "form_123",
    "contractUrl": "http://localhost:3009/contracts/form/form_123",
    "userId": "user_123"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 3. Get Contract Form
```http
GET /api/v1/contracts/public/form/:formId
```

Retrieves the contract form for the user to review and sign.

#### 4. Submit Signed Contract
```http
POST /api/v1/contracts/public/form/:formId/submit
Content-Type: application/json

{
  "contract_from": {
    "fullName": "John Doe",
    "signature": "base64_signature_data",
    "facialCapture": "base64_facial_data" // Required for certain contract types
  }
}
```

Submits the completed contract form.

---

### Contract Endpoints

Base URL: `/api/v1/contracts`

#### Create Contract
```http
POST /api/v1/contracts
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Service Agreement",
  "description": "Agreement for service usage",
  "type": "agreement",
  "content": "Contract content here..."
}
```

#### Get All Contracts
```http
GET /api/v1/contracts
```

#### Get Contract by ID
```http
GET /api/v1/contracts/:id
```

#### Update Contract
```http
PUT /api/v1/contracts/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Updated Title",
  "content": "Updated content..."
}
```

#### Delete Contract
```http
DELETE /api/v1/contracts/:id
Authorization: Bearer {token}
```

#### Sign Contract
```http
POST /api/v1/contracts/:id/sign
Authorization: Bearer {token}
Content-Type: application/json

{
  "signature": "base64_signature_data",
  "facialScanData": "base64_facial_scan_data" // Required for certain contract types
}
```

#### Get Contract Status
```http
GET /api/v1/contracts/:id/status
```

---

### Contract Order Endpoints

Base URL: `/api/v1/contract-orders`

#### Get Contract Types
```http
GET /api/v1/contract-orders/contract-types
```
Returns all available contract types and their configurations.

#### Get Contract Type Requirements
```http
GET /api/v1/contract-orders/contract-types/:type
```
Returns specific requirements for a contract type (signature, facial scan, etc.).

#### Verify Contract Reference
```http
GET /api/v1/contract-orders/verify/:reference
```

Verifies and retrieves contract information using a contract reference code.

**Example:**
```bash
curl http://localhost:3009/api/v1/contract-orders/verify/AGR-202412-A1B2C3
```

**Success Response:**
```json
{
  "success": true,
  "verified": true,
  "message": "Contract verified successfully",
  "data": {
    "reference": "AGR-202412-A1B2C3",
    "contractType": "agreement",
    "status": "pending",
    "expiration": "2024-12-31T23:59:59.000Z",
    "isExpired": false,
    "contractUrl": "http://localhost:3009/contracts/65a1b2c3d4e5f6g7h8i9j0k1",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Not Found Response:**
```json
{
  "success": false,
  "error": "Contract not found with the provided reference",
  "verified": false,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Contract Reference Format:**
- **Agreement:** `AGR-YYYYMM-XXXXXX` (e.g., AGR-202412-A1B2C3)
- **Disclaimer:** `DIS-YYYYMM-XXXXXX` (e.g., DIS-202412-XYZ789)
- **Indemnity:** `IND-YYYYMM-XXXXXX` (e.g., IND-202412-ABC123)
- **Terms & Conditions:** `TNC-YYYYMM-XXXXXX` (e.g., TNC-202412-DEF456)

#### Create Contract Order
```http
POST /api/v1/contract-orders
Authorization: Bearer {token}
Content-Type: application/json

{
  "contract_id": "contract_id_here",
  "contract_type": "agreement",
  "expiration": "2024-12-31T23:59:59Z",
  "redirect_url": "https://example.com/success" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Contract order created successfully",
  "data": {
    "id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "contract_id": "contract_id_here",
    "contract_type": "agreement",
    "contract_url": "http://localhost:3009/contracts/65a1b2c3d4e5f6g7h8i9j0k1",
    "expiration": "2024-12-31T23:59:59.000Z",
    "status": "pending",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

> **Note**: The `contract_url` is automatically generated when a contract order is created. This URL can be used to share the contract with recipients.

#### Get My Orders
```http
GET /api/v1/contract-orders/my-orders
Authorization: Bearer {token}
```

#### Get Order by ID
```http
GET /api/v1/contract-orders/:id
```

#### Get Orders by Contract
```http
GET /api/v1/contract-orders/contract/:contractId
```

#### Update Order Status
```http
PATCH /api/v1/contract-orders/:id/status
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "accepted" // Options: pending, sent, accepted, rejected, expired
}
```

#### Share Contract URL via Email/SMS
```http
POST /api/v1/contract-orders/:id/share
Authorization: Bearer {token}
Content-Type: application/json

{
  "email": "recipient@example.com",      // Optional
  "phone": "+1234567890",                // Optional
  "recipientName": "John Doe",           // Optional
  "message": "Please review and sign"    // Optional custom message
}
```

**Note:** At least one contact method (email or phone) is required.

**Use Cases:**
- Share contract URL with a specific person via email
- Send contract invitation via SMS
- Send to both email and phone simultaneously
- Include a custom message with the invitation

**Response:**
```json
{
  "success": true,
  "message": "Contract URL shared successfully",
  "data": {
    "contractUrl": "http://localhost:3009/contracts/65a1b2c3d4e5f6g7h8i9j0k1",
    "sharedWith": {
      "email": "recipient@example.com",
      "phone": "+1234567890"
    },
    "results": {
      "emailSent": true,
      "smsSent": true
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Email Template:**
The email includes:
- Professional HTML design
- Recipient name personalization
- Custom message (if provided)
- Contract type and expiration date
- Clickable button with contract URL
- Plain text fallback

**SMS Template:**
The SMS includes:
- Recipient name
- Custom message (if provided)
- Contract URL
- Expiration date

---

### Contract Form Endpoints

Base URL: `/api/v1/contract-forms`

#### Create Contract Form
```http
POST /api/v1/contract-forms
Authorization: Bearer {token}
Content-Type: application/json

{
  "orderId": "order_id_here",
  "contractType": "agreement",
  "formData": {
    "field1": "value1",
    "field2": "value2"
  }
}
```

#### Get My Forms
```http
GET /api/v1/contract-forms/my-forms
Authorization: Bearer {token}
```

#### Get My Signed Contracts (JSON)
```http
GET /api/v1/contract-forms/my-signed-contracts
Authorization: Bearer {token}
```

Returns all submitted/signed contracts for the authenticated user.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "form_id",
      "contractName": "Service Agreement",
      "contractType": "agreement",
      "status": "submitted",
      "createdAt": "2024-01-01T00:00:00.000Z",
      ...
    }
  ],
  "count": 5
}
```

#### Download All Signed Contracts as PDF
```http
GET /api/v1/contract-forms/my-contracts-pdf
Authorization: Bearer {token}
```

Downloads all signed contracts for the authenticated user as a single combined PDF file.

**Response:** PDF file download (`application/pdf`)

#### Get Forms by Status
```http
GET /api/v1/contract-forms/status/:status
```
Status options: draft, submitted, approved, rejected

#### Get Form by Order ID
```http
GET /api/v1/contract-forms/order/:orderId
```

#### Get Form by ID
```http
GET /api/v1/contract-forms/:id
```

#### Download Contract Form as PDF
```http
GET /api/v1/contract-forms/:id/pdf
```

Downloads a single contract form as a professional PDF document.

**Response:** PDF file download (`application/pdf`)

#### Update Form
```http
PUT /api/v1/contract-forms/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "formData": {
    "field1": "updated_value"
  }
}
```

#### Submit Form
```http
POST /api/v1/contract-forms/:id/submit
Authorization: Bearer {token}
```

When a contract form is submitted, the service automatically:
1. Validates the form based on contract type requirements
2. Updates the form status to 'submitted'
3. **Sends an HTTP POST callback** to the `redirect_url` (if provided in the contract order)

**Callback Payload:**
```json
{
  "contractOrderId": "order_id_here",
  "contractFormId": "form_id_here",
  "status": "success",
  "contractType": "agreement",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "data": {
    "formStatus": "submitted",
    "submittedBy": "user_id",
    "contractName": "Service Agreement"
  }
}
```

> **Note**: The callback includes automatic retry with exponential backoff (3 attempts). Callback failures won't prevent form submission.

#### Delete Form
```http
DELETE /api/v1/contract-forms/:id
Authorization: Bearer {token}
```

---

## Contract Reference Verification

The Contract Microservice automatically generates unique, human-readable reference codes for all contract orders. These references can be used to verify and lookup contracts.

### Contract Reference Format

Each contract order receives a unique reference code in the format:

```
{TYPE_PREFIX}-{YEAR}{MONTH}-{RANDOM}
```

**Type Prefixes:**
- **AGR** - Agreement (e.g., `AGR-202412-A1B2C3`)
- **DIS** - Disclaimer (e.g., `DIS-202412-XYZ789`)
- **IND** - Indemnity (e.g., `IND-202412-ABC123`)
- **TNC** - Terms & Conditions (e.g., `TNC-202412-DEF456`)
- **CTR** - Default/Other (e.g., `CTR-202412-GHI789`)

**Components:**
- **Prefix:** 3-letter contract type code
- **Date:** YYYYMM (year and month of creation)
- **Random:** 6-character alphanumeric identifier

### Automatic Generation

Contract references are automatically generated when a contract order is created:

```bash
POST /api/v1/contract-orders
{
  "contract_id": "contract_123",
  "contract_type": "agreement",
  "expiration": "2024-12-31T23:59:59Z"
}
```

**Response includes the reference:**
```json
{
  "success": true,
  "data": {
    "id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "contract_reference": "AGR-202412-A1B2C3",
    "contract_url": "http://localhost:3009/contracts/65a1b2c3d4e5f6g7h8i9j0k1",
    ...
  }
}
```

### Verify Contract Endpoint

**Endpoint:**
```http
GET /api/v1/contract-orders/verify/:reference
```

**Purpose:** Verify and retrieve contract information using the reference code.

**Example Request:**
```bash
curl http://localhost:3009/api/v1/contract-orders/verify/AGR-202412-A1B2C3
```

**Success Response (Valid Contract):**
```json
{
  "success": true,
  "verified": true,
  "message": "Contract verified successfully",
  "data": {
    "reference": "AGR-202412-A1B2C3",
    "contractType": "agreement",
    "status": "pending",
    "expiration": "2024-12-31T23:59:59.000Z",
    "isExpired": false,
    "contractUrl": "http://localhost:3009/contracts/65a1b2c3d4e5f6g7h8i9j0k1",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Success Response (Expired Contract):**
```json
{
  "success": true,
  "verified": true,
  "message": "Contract found but has expired",
  "data": {
    "reference": "AGR-202411-XYZ789",
    "contractType": "agreement",
    "status": "expired",
    "expiration": "2024-11-30T23:59:59.000Z",
    "isExpired": true,
    "contractUrl": "http://localhost:3009/contracts/65a1b2c3d4e5f6g7h8i9j0k1",
    "createdAt": "2024-11-01T00:00:00.000Z"
  },
  "timestamp": "2024-12-23T00:00:00.000Z"
}
```

**Error Response (Not Found):**
```json
{
  "success": false,
  "error": "Contract not found with the provided reference",
  "verified": false,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Verification Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether the API call succeeded |
| `verified` | boolean | Whether the contract was found and verified |
| `message` | string | Human-readable message |
| `data.reference` | string | The contract reference code |
| `data.contractType` | string | Type of contract (agreement, disclaimer, etc.) |
| `data.status` | string | Current contract status |
| `data.expiration` | string | Expiration date (ISO timestamp) |
| `data.isExpired` | boolean | Whether the contract has expired |
| `data.contractUrl` | string | URL to access the contract |
| `data.createdAt` | string | Contract creation date |

### Use Cases

1. **Reference Lookup**: Find contract details using a reference code
2. **Expiration Check**: Verify if a contract is still valid
3. **Status Verification**: Check the current status of a contract
4. **URL Retrieval**: Get the contract URL from a reference code
5. **Integration**: Allow external systems to verify contracts
6. **Customer Support**: Help users find contracts using reference codes

### Features

- ✅ **Case Insensitive**: Reference codes are case-insensitive (AGR-202412-A1B2C3 = agr-202412-a1b2c3)
- ✅ **Unique**: Each reference is globally unique
- ✅ **Human Readable**: Easy to read and communicate
- ✅ **Expiration Check**: Automatically checks if contract expired
- ✅ **No Authentication**: Public endpoint for easy verification

---

## Sharing Contract URLs

The Contract Microservice provides a dedicated API to share contract URLs with recipients via email and/or SMS.

### Share Contract Endpoint

**Endpoint:**
```http
POST /api/v1/contract-orders/:id/share
Authorization: Bearer {token}
```

**Purpose:** Send a contract URL to a specific person via email and/or SMS on demand.

### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `email` | string | No* | Recipient's email address |
| `phone` | string | No* | Recipient's phone number (E.164 format) |
| `recipientName` | string | No | Recipient's name (default: "Recipient") |
| `message` | string | No | Custom message to include (max 500 chars) |

**Note:** At least one contact method (email or phone) must be provided.

### Example Requests

#### Share via Email Only

```bash
curl -X POST http://localhost:3009/api/v1/contract-orders/65a1b2c3d4e5/share \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "recipientName": "John Doe",
    "message": "Please review and sign this important contract."
  }'
```

#### Share via SMS Only

```bash
curl -X POST http://localhost:3009/api/v1/contract-orders/65a1b2c3d4e5/share \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+1234567890",
    "recipientName": "Jane Smith"
  }'
```

#### Share via Both Email and SMS

```bash
curl -X POST http://localhost:3009/api/v1/contract-orders/65a1b2c3d4e5/share \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "recipient@example.com",
    "phone": "+1234567890",
    "recipientName": "Alex Johnson",
    "message": "Urgent: Please review and sign by EOD."
  }'
```

### Email Content

When sharing via email, recipients receive a professional HTML email with:

- **Subject:** "Contract Invitation"
- **Header:** Professional green-themed design
- **Personalization:** Uses recipient name
- **Custom Message:** Your optional message is displayed prominently
- **Contract Details:** Type and expiration date
- **CTA Button:** Green "View Contract" button with the contract URL
- **Plain Link:** Contract URL as clickable text
- **Plain Text Fallback:** For email clients that don't support HTML

### SMS Content

When sharing via SMS, recipients receive a concise message with:

- Greeting with recipient name
- Custom message (if provided)
- Contract URL
- Expiration date

**Example SMS:**
```
Hi John Doe, you have a contract to review and sign. Please review and sign by EOD. Please visit: http://localhost:3009/contracts/65a1b2c3d4e5 (Expires: 12/31/2024)
```

### Response Format

**Success Response:**
```json
{
  "success": true,
  "message": "Contract URL shared successfully",
  "data": {
    "contractUrl": "http://localhost:3009/contracts/65a1b2c3d4e5f6g7h8i9j0k1",
    "sharedWith": {
      "email": "recipient@example.com",
      "phone": "+1234567890"
    },
    "results": {
      "emailSent": true,
      "smsSent": true
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Partial Success (only email sent):**
```json
{
  "success": true,
  "message": "Contract URL shared successfully",
  "data": {
    "contractUrl": "http://localhost:3009/contracts/65a1b2c3d4e5f6g7h8i9j0k1",
    "sharedWith": {
      "email": "recipient@example.com",
      "phone": null
    },
    "results": {
      "emailSent": true,
      "smsSent": false
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Error Responses

**Missing Contact Method:**
```json
{
  "success": false,
  "error": "At least one contact method (email or phone) is required",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Contract Not Found:**
```json
{
  "success": false,
  "error": "Contract order not found",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Both Notifications Failed:**
```json
{
  "success": false,
  "error": "Failed to send notifications. Please check email/SMS configuration.",
  "details": {
    "emailSent": false,
    "smsSent": false
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Configuration Requirements

To use the share feature, ensure you have configured:

**For Email Sharing:**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-api-key
SMTP_FROM=noreply@yourdomain.com
```

**For SMS Sharing:**
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

### Use Cases

1. **Manual Contract Distribution**: Send contracts to specific individuals who aren't in the system
2. **Resend Contract**: Resend a contract URL if the recipient lost the original notification
3. **Urgent Contracts**: Send immediate notifications with custom urgent messages
4. **Multi-Channel Delivery**: Ensure important contracts are received via both email and SMS
5. **Personalized Invitations**: Include context-specific messages for each recipient

---

## PDF Generation

The Contract Microservice provides professional PDF generation for signed contracts using **PDFKit**.

### Features

- **Single Contract PDF**: Download individual contracts as formatted PDFs
- **Bulk PDF**: Download all signed contracts in one combined PDF document
- **Professional Layout**: Clean, readable design with headers, footers, and proper formatting
- **Complete Information**: Includes all contract details, party information, and signatures
- **Table of Contents**: Multi-contract PDFs include a cover page and table of contents

### PDF Endpoints

#### 1. Download Single Contract PDF

```http
GET /api/v1/contract-forms/:id/pdf
```

**Use Case:** Download a specific contract as a PDF

**Example:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3009/api/v1/contract-forms/65a1b2c3d4e5f6g7h8i9j0k1/pdf \
  --output contract.pdf
```

#### 2. Download All User Contracts PDF

```http
GET /api/v1/contract-forms/my-contracts-pdf
Authorization: Bearer {token}
```

**Use Case:** Download all signed contracts for the authenticated user as one PDF

**Example:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3009/api/v1/contract-forms/my-contracts-pdf \
  --output my-contracts.pdf
```

### PDF Content

Each contract PDF includes:

- **Header Section**
  - Contract name
  - Contract type (Agreement, Disclaimer, etc.)
  - Status (submitted, approved, etc.)

- **Contract Body**
  - Full description
  - Complete contract terms and content

- **Party Information**
  - Individual/Business details
  - Contact information
  - Business details (if applicable)

- **Signature Information**
  - Digital signature confirmation
  - Facial verification confirmation (if applicable)

- **Document Metadata**
  - Contract Order ID
  - Form ID
  - Creation and update timestamps
  - Submitted by user ID

### Multi-Contract PDF Structure

When downloading all contracts (`/my-contracts-pdf`), the PDF includes:

1. **Cover Page**
   - Title: "Contract Collection"
   - User ID
   - Total contract count
   - Generation date

2. **Table of Contents**
   - List of all contracts with names and types

3. **Individual Contracts**
   - Each contract on separate pages
   - Page numbers
   - Complete contract details

### Response Headers

PDF downloads include proper headers:

```
Content-Type: application/pdf
Content-Disposition: attachment; filename=contract-{id}.pdf
```

### Error Handling

If PDF generation fails:

```json
{
  "success": false,
  "error": "Failed to generate PDF: Contract form not found",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## Email and SMS Notifications

The Contract Microservice automatically sends email and SMS notifications to contract participants when contracts are submitted.

### Automatic Notifications

When a contract form is successfully submitted via `POST /api/v1/contract-forms/:id/submit`, the service automatically:

1. ✅ Validates and saves the contract form
2. 📧 Sends an **email notification** to the recipient
3. 📱 Sends an **SMS notification** to the recipient (if phone number provided)
4. 🔗 Sends an **HTTP callback** to the `redirect_url` (if configured)

### Email Notification Configuration

The service uses **Nodemailer** with SMTP for email delivery. It supports any SMTP provider (Gmail, SendGrid, AWS SES, etc.).

#### SendGrid Configuration Example

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
SMTP_FROM=noreply@yourdomain.com
```

> **Note**: For SendGrid, `SMTP_USER` must be set to the literal string `'apikey'` when using API key authentication.

#### Gmail Configuration Example

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=your-email@gmail.com
```

### SMS Notification Configuration

The service uses **Twilio** for SMS delivery.

#### Twilio Configuration

1. Sign up at [Twilio](https://www.twilio.com/)
2. Get your Account SID and Auth Token
3. Purchase a phone number
4. Configure environment variables:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

### Email Template

The email notification includes:
- Professional HTML template
- Contract details (name, type, submission date)
- Recipient name personalization
- Plain text fallback

### SMS Template

The SMS notification includes:
- Recipient name
- Contract name
- Confirmation message

### Graceful Degradation

- If SMTP is not configured, email notifications are skipped (service continues normally)
- If Twilio is not configured, SMS notifications are skipped (service continues normally)
- Notification failures **do not prevent** contract submission
- All notification attempts are logged for debugging

### Disabling Notifications

To disable notifications, simply leave the configuration empty:

```env
# Email disabled
SMTP_HOST=
SMTP_USER=
SMTP_PASSWORD=

# SMS disabled
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
```

---

## Callback Notifications

The Contract Microservice automatically sends HTTP POST callbacks to notify external systems when contracts are signed/submitted.

### How It Works

1. **Set redirect_url**: When creating a contract order, provide a `redirect_url`:
   ```json
   {
     "contract_id": "contract_123",
     "contract_type": "agreement",
     "expiration": "2024-12-31T23:59:59Z",
     "redirect_url": "https://your-app.com/api/contract-callback"
   }
   ```

2. **Form Submission**: When the contract form is submitted via `POST /api/v1/contract-forms/:id/submit`, the service sends a POST request to your `redirect_url`.

3. **Callback Payload**: Your endpoint receives:
   ```json
   {
     "contractOrderId": "order_id",
     "contractFormId": "form_id",
     "status": "success",
     "contractType": "agreement",
     "timestamp": "2024-01-01T00:00:00.000Z",
     "data": {
       "formStatus": "submitted",
       "submittedBy": "user_id",
       "contractName": "Contract Name"
     }
   }
   ```

### Retry Mechanism

- **Automatic retries**: 3 attempts with exponential backoff (2s, 4s, 8s)
- **Timeout**: Configurable via `CALLBACK_TIMEOUT` (default: 5000ms)
- **Non-blocking**: Callback failures won't prevent contract submission

### Your Callback Endpoint Requirements

- Must accept POST requests
- Should respond with HTTP 2xx status code
- Content-Type: `application/json`
- Should respond within the timeout window

### Example Callback Handler

```javascript
app.post('/api/contract-callback', (req, res) => {
  const { contractOrderId, contractFormId, status, contractType, data } = req.body;
  
  // Process the contract completion
  console.log(`Contract ${contractFormId} submitted successfully`);
  
  // Update your database, send emails, etc.
  // ...
  
  // Respond with success
  res.status(200).json({ received: true });
});
```

---

## Contract Types

The service supports four contract types, each with different requirements:

| Type | Requires Signature | Requires Facial Scan | Accept Only |
|------|-------------------|---------------------|-------------|
| **Disclaimer** | No | No | Yes |
| **Agreement** | Yes | Yes | No |
| **Indemnity** | Yes | Yes | No |
| **Terms and Conditions** | No | No | Yes |

- **Accept Only**: User can only accept/decline, no additional data required
- **Requires Signature**: Digital signature is mandatory
- **Requires Facial Scan**: Biometric facial verification is mandatory

## Project Structure

```
contract-ms/
├── src/
│   ├── config/           # Configuration files
│   ├── controllers/      # Request handlers
│   │   ├── contractController.ts
│   │   ├── contractFormController.ts
│   │   └── contractOrderController.ts
│   ├── middleware/       # Express middleware
│   │   ├── auth.ts
│   │   ├── cors.ts
│   │   ├── errorHandler.ts
│   │   ├── contractFormValidation.ts
│   │   └── contractOrderValidation.ts
│   ├── models/           # Mongoose models
│   │   ├── contractModel.ts
│   │   ├── contractFormModel.ts
│   │   └── contractOrderModel.ts
│   ├── routes/           # API routes
│   │   ├── contractRoutes.ts
│   │   ├── contractFormRoutes.ts
│   │   └── contractOrderRoutes.ts
│   ├── services/         # Business logic
│   │   ├── contractService.ts
│   │   ├── contractFormService.ts
│   │   ├── contractOrderService.ts
│   │   ├── callbackService.ts
│   │   ├── notificationService.ts
│   │   └── pdfService.ts
│   ├── types/            # TypeScript type definitions
│   │   ├── contract.ts
│   │   ├── contractForm.ts
│   │   ├── contractOrder.ts
│   │   └── contractType.ts
│   └── index.ts          # Application entry point
├── dist/                 # Compiled JavaScript
├── .env.example          # Environment variables template
├── .gitignore
├── Dockerfile
├── fly.toml              # Fly.io deployment config
├── jest.config.js
├── package.json
├── tsconfig.json
└── README.md
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------||
| `NODE_ENV` | Environment (development/production) | development |
| `PORT` | Server port | 3009 |
| `SERVICE_AUTH_URL` | Authentication service URL | http://localhost:3000 |
| `CONTRACT_BASE_URL` | Base URL for generated contract links | http://localhost:3009 |
| `CALLBACK_TIMEOUT` | Timeout for callback requests (milliseconds) | 5000 |
| `CORS_ORIGINS` | Allowed CORS origins (comma-separated) | http://localhost:3000 |
| `LOG_LEVEL` | Logging level | info |
| `MONGO_URI` | MongoDB connection string | mongodb://localhost:27017/contract_db |
| `JWT_SECRET` | JWT signing secret | - |
| **Email Configuration** | | |
| `SMTP_HOST` | SMTP server hostname | - |
| `SMTP_PORT` | SMTP server port | 587 |
| `SMTP_SECURE` | Use SSL/TLS (true/false) | false |
| `SMTP_USER` | SMTP username (use 'apikey' for SendGrid) | - |
| `SMTP_PASSWORD` | SMTP password or API key | - |
| `SMTP_FROM` | Sender email address | noreply@contract-service.com |
| **SMS Configuration** | | |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | - |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | - |
| `TWILIO_PHONE_NUMBER` | Twilio phone number (E.164 format) | - |

## Authentication

The service uses JWT-based authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

Protected endpoints will return `401 Unauthorized` if the token is missing or invalid.

## Error Handling

The service returns standardized error responses:

```json
{
  "success": false,
  "error": "Error message here",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

Common HTTP status codes:
- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Missing or invalid authentication
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

## Development

### Code Style
The project uses TypeScript with strict type checking. Follow the existing code patterns and conventions.

### Testing
Write tests for new features and ensure existing tests pass before committing.

### Database Migrations
When modifying Mongoose schemas, ensure backward compatibility or provide migration scripts.

## Deployment

### Docker
```bash
docker build -t contract-ms .
docker run -p 3009:3009 --env-file .env contract-ms
```

### Fly.io
```bash
fly deploy
```

## Integration with Other Services

The Contract Microservice integrates with:
- **Service Auth MS**: For authentication and authorization
- **Account MS**: For user account information
- **Billing MS**: For contract-related billing operations

## Monitoring

The service includes:
- Health check endpoint: `/health`
- Request logging via Morgan
- Error tracking and logging

## Security Considerations

- All sensitive endpoints require authentication
- CORS is configured to allow only trusted origins
- Helmet is used for HTTP security headers
- Input validation using Joi
- JWT tokens for secure authentication

## Contributing

1. Create a feature branch
2. Make your changes
3. Write/update tests
4. Submit a pull request

## License

ISC

## Support

For issues or questions, please contact the development team or create an issue in the project repository.
