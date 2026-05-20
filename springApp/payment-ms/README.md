# Payment Microservice

Payment gateway integration and transaction processing microservice for the Spring-TD platform.

Deployment URL: https://payment-ms.fly.dev/

## Overview

The Payment Microservice handles all payment-related operations including processing payments through various gateways, managing transactions, and handling refunds. It supports multiple payment methods including card payments, bank transfers, PayPal, and cryptocurrency.

## Features

- 💳 **Card Payments** - Process credit/debit card transactions
- 🏦 **Bank Transfers** - Handle direct bank transfers
- 💰 **PayPal Integration** - Support PayPal payments
- ₿ **Crypto Payments** - Accept cryptocurrency payments
- 🔄 **Refund Processing** - Manage payment refunds
- 🔐 **Secure Transactions** - JWT-based authentication and authorization
- 📊 **Payment Tracking** - Retrieve and monitor payment status
- 📒 **Merchant Record Management** - Automatic creation of merchant and merchant-user records
- 💸 **Debit/Credit Ledger** - Complete transaction ledger with running balances
- 🏷️ **Financial Category Support** - Categorize transactions by Loan, Savings, Mortgage, Commodity, or Wallet
- 💰 **Funding Operations** - Credit money to records across all financial categories
- 🔻 **Debit Operations** - Debit money from records across all financial categories
- 📊 **Advanced Analytics** - Comprehensive analytics with total payin, payout, and category breakdowns
- 📈 **Merchant Analytics** - Aggregated analytics for merchants including all their users
- 🔍 **Advanced Filtering** - Filter by date range, category, transaction type, amount range
- ⬆️⬇️ **Multi-Criteria Sorting** - Sort by date, amount, category, transaction type, and more
- 📉 **Financial Reporting** - Generate detailed financial reports and summaries
- 🔔 **Webhook Integration** - Automatic record creation after successful signup verification

## Technology Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Security**: Helmet, CORS, JWT
- **Logging**: Winston, Morgan
- **Testing**: Jest
- **Development**: ts-node-dev

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Access to service-auth-ms for authentication
- Access to billing-ms and wallet-ms for transaction coordination

## Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration
```

## Environment Variables

Create a `.env` file with the following variables:

```env
# Server Configuration
PORT=3005
NODE_ENV=development

# Service URLs
SERVICE_AUTH_URL=http://localhost:3001
BILLING_SERVICE_URL=http://localhost:3004
WALLET_SERVICE_URL=http://localhost:3003

# JWT Configuration
JWT_SECRET=your-jwt-secret

# Payment Gateway Configuration
# Add your payment gateway credentials here
```

## Available Scripts

```bash
# Development mode with auto-reload
npm run dev

# Build TypeScript to JavaScript
npm run build

# Run production build
npm start

# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## API Endpoints

### Base URL
```
http://localhost:3005/api/v1/payments
```

### Health Check
```http
GET /health
```
Returns service health status.

### Process Payment
```http
POST /api/v1/payments/process
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "string",
  "amount": number,
  "currency": "USD",
  "method": "card" | "bank" | "paypal" | "crypto",
  "metadata": {
    // Additional payment metadata
  }
}
```

### Get Payment
```http
GET /api/v1/payments/:paymentId
Authorization: Bearer <token>
```

### Refund Payment
```http
POST /api/v1/payments/:paymentId/refund
Authorization: Bearer <token>
```

## Record Management API

### Base URL
```
http://localhost:3007/api/v1/records
```

### Create Record (Webhook)
```http
POST /api/v1/records/webhook/create
Content-Type: application/json

{
  "userId": "string",
  "email": "string",
  "firstName": "string",
  "lastName": "string",
  "userType": "MERCHANT" | "USER",
  "userMerchantId": "string",
  "country": "string",
  "phone": "string" (optional),
  "verifiedAt": "ISO date string",
  "metadata": {} (optional)
}
```
**Note:** This endpoint is automatically called by service-auth-ms after successful account verification. No authentication required.

### Internal Wallet Payout Ledger Hook
```http
POST /api/v1/records/internal/wallet-payout-ledger
X-Internal-Token: <PAYMENT_INTERNAL_TOKEN>
Content-Type: application/json
```

Called by **wallet-ms** after a successful user wallet payout. It appends an idempotent **DEBIT** ledger entry to the user's payment record using `txnRef` as the duplicate key. This endpoint does not move money; wallet-ms remains the wallet balance owner.

Required payment-ms env: `PAYMENT_INTERNAL_TOKEN`. Configure the same value on wallet-ms as `PAYMENT_INTERNAL_TOKEN` with `PAYMENT_SERVICE_URL` pointing to payment-ms.

### Get Record by ID
```http
GET /api/v1/records/:recordId
Authorization: Bearer <token>
```

### Get Record by User ID
```http
GET /api/v1/records/user/:userId
Authorization: Bearer <token>
```

### Get Record by Email
```http
GET /api/v1/records/email/:email
Authorization: Bearer <token>
```

### Get All Merchant Records
```http
GET /api/v1/records/merchants/all
Authorization: Bearer <token>
```

### Get Merchant Users
```http
GET /api/v1/records/merchant/:userMerchantId/users
Authorization: Bearer <token>
```

### Get Ledger Entries (Advanced Querying & Filtering)
```http
GET /api/v1/records/:recordId/ledger
Authorization: Bearer <token>
```

**Query Parameters (all optional):**
- `entryType` - Filter by CREDIT or DEBIT
- `financialCategory` - Filter by LOAN, SAVINGS, MORTGAGE, COMMODITY, or WALLET
- `transactionType` - Filter by TRANSFER, DEPOSIT, WITHDRAWAL, etc.
- `startDate` - Start of date range (ISO date string)
- `endDate` - End of date range (ISO date string)
- `minAmount` - Minimum transaction amount
- `maxAmount` - Maximum transaction amount
- `sortBy` - Sort field: DATE, AMOUNT, TRANSACTION_TYPE, FINANCIAL_CATEGORY, ENTRY_TYPE, or BALANCE
- `sortOrder` - Sort order: ASC or DESC (default: DESC)
- `limit` - Number of records to return (default: 100)
- `offset` - Starting position for pagination (default: 0)

**Examples:**
```http
# Filter by category and date range
GET /api/v1/records/:recordId/ledger?financialCategory=LOAN&startDate=2025-01-01&endDate=2025-01-31

# Sort by amount (highest first)
GET /api/v1/records/:recordId/ledger?sortBy=AMOUNT&sortOrder=DESC&limit=10

# Filter by amount range and transaction type
GET /api/v1/records/:recordId/ledger?transactionType=DEPOSIT&minAmount=1000&maxAmount=5000

# Combined filters with sorting
GET /api/v1/records/:recordId/ledger?financialCategory=SAVINGS&sortBy=DATE&sortOrder=ASC&limit=50
```

**Response:**
```json
{
  "success": true,
  "data": {
    "entries": [ /* ledger entries */ ],
    "count": 25,
    "recordId": "record-uuid",
    "filters": {
      "entryType": "CREDIT",
      "financialCategory": "LOAN",
      "transactionType": "DEPOSIT",
      "dateRange": {
        "startDate": "2025-01-01",
        "endDate": "2025-01-31"
      },
      "amountRange": {
        "min": 1000,
        "max": 5000
      },
      "sortBy": "AMOUNT",
      "sortOrder": "DESC"
    }
  }
}
```

### Get Ledger Summary
```http
GET /api/v1/records/:recordId/ledger/summary
Authorization: Bearer <token>
```

### Get Category Summary
```http
GET /api/v1/records/:recordId/category-summary
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": [
      {
        "category": "LOAN",
        "totalDebits": 5000,
        "totalCredits": 10000,
        "balance": 5000,
        "transactionCount": 15
      },
      {
        "category": "SAVINGS",
        "totalDebits": 2000,
        "totalCredits": 8000,
        "balance": 6000,
        "transactionCount": 10
      },
      // ... other categories (MORTGAGE, COMMODITY, WALLET)
    ],
    "recordId": "record-uuid"
  }
}
```

### Add Ledger Entry
```http
POST /api/v1/records/:recordId/ledger/entry
Authorization: Bearer <token>
Content-Type: application/json

{
  "entryType": "CREDIT" | "DEBIT",
  "debitAmount": number,
  "transactionDescription": "string",
  "transactionType": "TRANSFER" | "UTILITY_PAYMENT" | "AIRTIME_PURCHASE" | "BILL_PAYMENT" | "MERCHANT_PAYMENT" | "WITHDRAWAL" | "DEPOSIT" | "REFUND" | "PAYOUT" | "OTHER",
  "financialCategory": "LOAN" | "SAVINGS" | "MORTGAGE" | "COMMODITY" | "WALLET" (optional, defaults to WALLET),
  "txnRef": "string",
  "sessionId": "string",
  "fromCurrency": "string",
  "toCurrency": "string",
  "senderInfo": {
    "full_name": "string",
    "email": "string",
    "phone": "string"
  },
  "feeBreakdown": {
    "payout_fee": number,
    "merchant_commission": number,
    "other_fee": [
      {
        "name": "string",
        "amount": number
      }
    ]
  },
  "thirdPartyRefId": "string" (optional),
  "beneficiaryInfo": {
    "beneficiary_fiat_ref": "string",
    "bank_name": "string",
    "bank_code": "string",
    "account_number": "string",
    "account_holder_name": "string",
    "other_data": {} (optional)
  } (optional),
  "status": "PENDING" | "COMPLETED" | "FAILED" | "REVERSED" (optional)
}
```

### Fund Record (Credit Operation)
```http
POST /api/v1/records/:recordId/fund
Authorization: Bearer <token>
Content-Type: application/json

{
  "category": "LOAN" | "SAVINGS" | "MORTGAGE" | "COMMODITY" | "WALLET",
  "amount": number,
  "description": "string",
  "transactionType": "TRANSFER" | "DEPOSIT" | "OTHER",
  "txnRef": "string",
  "sessionId": "string",
  "fromCurrency": "string",
  "toCurrency": "string",
  "senderInfo": {
    "full_name": "string",
    "email": "string",
    "phone": "string"
  },
  "feeBreakdown": {
    "payout_fee": number,
    "merchant_commission": number,
    "other_fee": [{ "name": "string", "amount": number }] (optional)
  },
  "thirdPartyRefId": "string" (optional),
  "beneficiaryInfo": { ... } (optional)
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "entry": { ... },
    "record": { ... },
    "message": "Successfully funded LOAN category with 1000 USD"
  }
}
```

### Debit Record (Debit Operation)
```http
POST /api/v1/records/:recordId/debit
Authorization: Bearer <token>
Content-Type: application/json

{
  "category": "LOAN" | "SAVINGS" | "MORTGAGE" | "COMMODITY" | "WALLET",
  "amount": number,
  "description": "string",
  "transactionType": "WITHDRAWAL" | "BILL_PAYMENT" | "OTHER",
  "txnRef": "string",
  "sessionId": "string",
  "fromCurrency": "string",
  "toCurrency": "string",
  "senderInfo": {
    "full_name": "string",
    "email": "string",
    "phone": "string"
  },
  "feeBreakdown": {
    "payout_fee": number,
    "merchant_commission": number,
    "other_fee": [{ "name": "string", "amount": number }] (optional)
  },
  "thirdPartyRefId": "string" (optional),
  "beneficiaryInfo": { ... } (optional)
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "entry": { ... },
    "record": { ... },
    "message": "Successfully debited 500 USD from SAVINGS category"
  }
}
```

**Error Response (Insufficient Balance):**
```json
{
  "success": false,
  "error": "Insufficient balance for debit operation"
}
```

### Deactivate Record
```http
PUT /api/v1/records/:recordId/deactivate
Authorization: Bearer <token>
```

### Activate Record
```http
PUT /api/v1/records/:recordId/activate
Authorization: Bearer <token>
```

## Analytics & Reporting API

### Get Record Analytics
Get comprehensive analytics summary for a specific record with detailed breakdowns.

```http
GET /api/v1/records/:recordId/analytics
Authorization: Bearer <token>
```

**Query Parameters (optional):**
- `startDate` - Start of date range for analytics (ISO date string)
- `endDate` - End of date range for analytics (ISO date string)

**Example:**
```http
GET /api/v1/records/:recordId/analytics?startDate=2025-01-01&endDate=2025-12-31
```

**Response:**
```json
{
  "success": true,
  "data": {
    "analytics": {
      "recordId": "record-uuid",
      "userMerchantId": "merchant-001",
      
      // Overall Metrics
      "totalPayin": 15000,        // Total CREDIT transactions
      "totalPayout": 5000,        // Total DEBIT transactions
      "netBalance": 10000,        // totalPayin - totalPayout
      "totalTransactions": 45,
      
      // Category-Specific Totals
      "totalLoan": 8000,          // Net balance in LOAN category
      "totalSavings": 5000,       // Net balance in SAVINGS category
      "totalMortgage": 3000,      // Net balance in MORTGAGE category
      "totalCommodity": 1000,     // Net balance in COMMODITY category
      "totalWallet": 2000,        // Net balance in WALLET category
      
      // Customer Metrics (for merchant records only)
      "totalCustomers": 25,       // Total merchant users
      "activeCustomers": 22,      // Active merchant users
      
      // Date Range
      "dateRange": {
        "startDate": "2025-01-01T00:00:00Z",
        "endDate": "2025-12-31T23:59:59Z"
      },
      
      // Detailed Category Breakdown
      "categoryBreakdown": [
        {
          "category": "LOAN",
          "totalDebits": 2000,
          "totalCredits": 10000,
          "balance": 8000,
          "transactionCount": 15
        },
        {
          "category": "SAVINGS",
          "totalDebits": 1000,
          "totalCredits": 6000,
          "balance": 5000,
          "transactionCount": 12
        },
        {
          "category": "MORTGAGE",
          "totalDebits": 500,
          "totalCredits": 3500,
          "balance": 3000,
          "transactionCount": 8
        },
        {
          "category": "COMMODITY",
          "totalDebits": 300,
          "totalCredits": 1300,
          "balance": 1000,
          "transactionCount": 5
        },
        {
          "category": "WALLET",
          "totalDebits": 1200,
          "totalCredits": 3200,
          "balance": 2000,
          "transactionCount": 18
        }
      ]
    }
  }
}
```

### Get Merchant Analytics
Get aggregated analytics for a merchant including all their users' transactions.

```http
GET /api/v1/records/merchant/:userMerchantId/analytics
Authorization: Bearer <token>
```

**Query Parameters (optional):**
- `startDate` - Start of date range for analytics (ISO date string)
- `endDate` - End of date range for analytics (ISO date string)

**Example:**
```http
GET /api/v1/records/merchant/merchant-001/analytics?startDate=2025-01-01&endDate=2025-12-31
```

**Response:**
Same structure as record analytics, but includes aggregated data from:
- Merchant's own record transactions
- All merchant users' transactions combined

**Use Cases:**
- **Dashboard Analytics** - Display merchant's total business metrics
- **Financial Reports** - Generate comprehensive financial reports
- **Category Performance** - Analyze performance by financial category
- **Customer Insights** - Track total and active customer counts
- **Period Comparison** - Compare different time periods using date ranges

### Analytics Features Summary

#### Available Metrics:
- ✅ **Total Payin** - All credit transactions
- ✅ **Total Payout** - All debit transactions
- ✅ **Net Balance** - Overall financial position
- ✅ **Total Loan** - Loan category performance
- ✅ **Total Savings** - Savings category performance
- ✅ **Total Mortgage** - Mortgage category performance
- ✅ **Total Commodity** - Commodity category performance
- ✅ **Total Wallet** - Wallet category performance
- ✅ **Total Customers** - Customer count (merchants only)
- ✅ **Active Customers** - Active user count (merchants only)
- ✅ **Category Breakdown** - Detailed per-category analysis

#### Filtering Capabilities:
- Filter by date range
- Filter by financial category (LOAN, SAVINGS, MORTGAGE, COMMODITY, WALLET)
- Filter by transaction type (TRANSFER, DEPOSIT, WITHDRAWAL, etc.)
- Filter by entry type (CREDIT/DEBIT)
- Filter by amount range (min/max)

#### Sorting Options:
- Sort by DATE (transaction date)
- Sort by AMOUNT (transaction amount)
- Sort by TRANSACTION_TYPE
- Sort by FINANCIAL_CATEGORY
- Sort by ENTRY_TYPE
- Sort by BALANCE (balance after transaction)
- Bi-directional sorting (ASC/DESC)

## Project Structure

```
payment-ms/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Request handlers (payment, record)
│   ├── middleware/      # Authentication, CORS, error handling
│   ├── models/          # Data models (recordModel)
│   ├── routes/          # API route definitions
│   ├── services/        # Business logic (payment, record)
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions (logger, etc.)
│   └── index.ts         # Application entry point
├── __tests__/           # Test files
├── .env                 # Environment variables (not in git)
├── .gitignore          # Git ignore rules
├── jest.config.js      # Jest configuration
├── package.json        # Dependencies and scripts
├── tsconfig.json       # TypeScript configuration
└── README.md           # This file
```

## Authentication

All payment endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

Tokens are issued by the service-auth-ms microservice.

## Error Handling

The service uses standardized error responses:

```json
{
  "success": false,
  "error": "Error message",
  "statusCode": 400
}
```

## Development

```bash
# Start in development mode
npm run dev
```

The server will start on the configured port (default: 3005) with auto-reload enabled.

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Integration with Other Services

### Service Auth MS
- Validates JWT tokens
- Provides user authentication
- **Triggers record creation webhook** after successful signup verification
- Sends user/merchant data to payment-ms for record creation

### Billing MS
- Coordinates billing operations
- Manages invoices and subscriptions

### Wallet MS
- Manages wallet balances
- Processes wallet transactions

## Record Management Workflow

1. **User/Merchant Signup**: User or merchant registers through service-auth-ms
2. **Email Verification**: User verifies email address
3. **Account Activation**: service-auth-ms activates the account
4. **Webhook Trigger**: service-auth-ms automatically calls payment-ms webhook
5. **Record Creation**: payment-ms creates either:
   - **Merchant Record** for verified merchants (user_type='MERCHANT')
   - **Merchant-User Record** for verified merchant users (user_type='USER')
6. **Ledger Initialization**: Each record includes an empty Debit/Credit ledger ready for transactions

### Record Types

#### Merchant Record
- Created for users with user_type='MERCHANT'
- Includes: userId, email, merchant details, ledger
- Initial balance: 0
- Currency based on country (USD, NGN, GHS, etc.)

#### Merchant-User Record
- Created for users with user_type='USER'
- Links to parent merchant via userMerchantId
- Includes: userId, email, user details, ledger
- Initial balance: 0

### Debit/Credit Ledger

Each record has an associated ledger that tracks:
- **Credits**: Money added to the account (Funding operations)
- **Debits**: Money withdrawn/spent (Debit operations)
- **Running Balance**: Current balance after each transaction
- **Transaction History**: Complete audit trail with comprehensive details
- **Financial Categories**: Transactions categorized by LOAN, SAVINGS, MORTGAGE, COMMODITY, or WALLET

#### Financial Categories

The system supports five financial categories for organizing transactions:

1. **LOAN**: Loan disbursements, repayments, and related transactions
2. **SAVINGS**: Savings deposits, withdrawals, and interest payments
3. **MORTGAGE**: Mortgage funding, payments, and related financial activities
4. **COMMODITY**: Commodity purchases, sales, and transactions
5. **WALLET**: General wallet operations and transfers

Each transaction is tagged with a financial category, allowing merchants and users to:
- Track balances separately for each category
- Generate category-specific financial reports
- Manage different product types (loans, savings, etc.) within a single record
- Get detailed summaries per category using the `/category-summary` endpoint

### Ledger Entry Structure

#### Core Transaction Fields
- `balance_bf`: Opening balance (Balance Brought Forward)
- `balance_after`: Closing balance after transaction
- `transaction_timestamp`: When the transaction occurred
- `txn_ref`: Internal transaction reference
- `session_id`: Session identifier for tracking
- `transaction_description`: Detailed transaction description/reasons
- `third_party_ref_id`: External reference ID (optional)
- `from_currency`: Source currency code
- `to_currency`: Target currency code
- `debit_amount_local`: Transaction amount in local currency

#### Transaction Classification
- `entryType`: CREDIT (funding) or DEBIT (withdrawal)
- `transactionType`: TRANSFER, UTILITY_PAYMENT, AIRTIME_PURCHASE, BILL_PAYMENT, MERCHANT_PAYMENT, WITHDRAWAL, DEPOSIT, REFUND, PAYOUT, OTHER
- `financialCategory`: LOAN, SAVINGS, MORTGAGE, COMMODITY, WALLET
- `status`: PENDING, COMPLETED, FAILED, REVERSED

#### Beneficiary Information (for fiat transactions)
- `beneficiary_fiat_ref`: Unique beneficiary reference (treated as account number for fraud detection)
- `bank_name`: Beneficiary's bank name
- `bank_code`: Bank identification code
- `account_number`: Beneficiary's account number
- `account_holder_name`: Account holder's full name
- `other_data`: Extensibility container for future fields

#### Sender Information
- `full_name`: Sender's complete name
- `email`: Sender's email address
- `phone`: Sender's phone number

#### Fee Breakdown
- `payout_fee`: Fee charged for payout
- `merchant_commission`: Commission earned by merchant
- `other_fee`: Array of additional fees with name and amount fields

## Security Considerations

- All endpoints require JWT authentication
- Helmet.js for security headers
- CORS configured for allowed origins
- Request validation using Joi
- Sensitive data logged appropriately

## Logging

The service uses Winston for structured logging:
- Info level: Service status and operations
- Error level: Errors and exceptions
- HTTP requests logged via Morgan

## Contributing

1. Create a feature branch
2. Make your changes
3. Write/update tests
4. Ensure all tests pass
5. Submit a pull request

## License

ISC
