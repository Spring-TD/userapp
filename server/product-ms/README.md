# Product Management Microservice

## Overview
This microservice handles product creation and management for the SpringTD platform. When triggered, it receives a create-app ID and uses it to create a product with the required information.

## API Endpoints

### Create Product
Creates a new product with the provided information.

**Endpoint:** `POST /api/v1/products`

**Request Body:**
```json
{
  "name": "string",           // Required: Product name (1-200 characters)
  "description": "string",    // Required: Product description (1-1000 characters)
  "type": "string",           // Required: Product type (Loan, Mortgage, Savings, Commodity, or Custom)
  "appId": "string"           // Required: Create-app ID (1-100 characters)
}
```

**Product Types:**
- **Loan**: Financial product for borrowing money
- **Mortgage**: Long-term loan secured by real estate
- **Savings**: Financial product for saving money with interest
- **Commodity**: Product related to trading physical goods
- **Custom**: User-defined product type (allows custom naming)

When using "Custom" as the type, users can specify their own product type in the description or name fields.

**Response:**
```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "id": "string",
    "referenceNumber": "string",  // Auto-generated unique reference number
    "name": "string",
    "description": "string",
    "type": "string",
    "appId": "string",
    "status": "incomplete",       // Initial status (complete or incomplete)
    "createdAt": "string",        // ISO timestamp
    "updatedAt": "string"         // ISO timestamp
  }
}
```

### Get Product by ID
Retrieves a product by its ID.

**Endpoint:** `GET /api/v1/products/:id`

### Update Product
Updates an existing product.

**Endpoint:** `PUT /api/v1/products/:id`

**Request Body:**
```json
{
  "name": "string",              // Optional: Product name (1-200 characters)
  "description": "string",       // Optional: Product description (1-1000 characters)
  "type": "string",              // Optional: Product type (Loan, Mortgage, Savings, Commodity, or Custom)
  "status": "string"             // Optional: Product status (complete or incomplete)
}
```

### Delete Product
Deletes a product by its ID.

**Endpoint:** `DELETE /api/v1/products/:id`

### Get Products by App ID
Retrieves all products associated with a specific app ID.

**Endpoint:** `GET /api/v1/products/app/:appId`

### Check Product Action
Determines what action is allowed for a product based on its status.

**Endpoint:** `GET /api/v1/products/:id/action`

**Response:**
```json
{
  "success": true,
  "data": {
    "productId": "string",
    "status": "string",         // complete or incomplete
    "allowedAction": "string",  // manage or configure
    "message": "string"
  }
}
```

When a product's status is "complete", the allowed action is "manage".
When a product's status is "incomplete", the allowed action is "configure".

## Product Configuration API Endpoints

### Create Product Configuration
Creates a configuration for a specific product based on its type.

**Endpoint:** `POST /api/v1/configurations`

**Request Body:**
```json
{
  "productId": "string",           // Required: Product ID
  "productType": "string",         // Required: Product type (Loan, Mortgage, Savings, Commodity, or Custom)
  "configuration": {
    // Configuration fields vary by product type
    // See specific configuration types below
  }
}
```

### Get Product Configuration
Retrieves the configuration for a specific product.

**Endpoint:** `GET /api/v1/configurations/:productId`

### Update Product Configuration
Updates the configuration for a specific product.

**Endpoint:** `PUT /api/v1/configurations/:productId`

### Delete Product Configuration
Deletes the configuration for a specific product.

**Endpoint:** `DELETE /api/v1/configurations/:productId`

## Product Type Configurations

### Loan Product Configuration
For Loan products, the following configuration fields are available:

- **purpose**: Text description of the loan purpose
- **minimumFacilityAmount**: Minimum loan amount available
- **maximumFacilityAmount**: Maximum loan amount available
- **repaymentCycle**: Repayment frequency (year, month, week, day)
- **loanTenure**: 
  - **value**: Number of units
  - **unit**: Time unit (year, month, week, day)
- **managementFee**: Management fee amount
- **interestRate**: Interest rate percentage
- **penalty**: 
  - **type**: "percentage" or "amount"
  - **value**: Penalty value
- **moratorium**: 
  - **value**: Number of units
  - **unit**: Time unit (year, month, week, day)
- **minimumRepaymentAmount**: Minimum required repayment amount
- **securityRequirements**: Array of required securities (property, car, land, other)
- **additionalSecurityRequirements**: Additional security requirements text
- **eligibility**: Eligibility criteria text
- **productImage**: Product image URL or base64 encoded image
- **currency**: Currency code (e.g., USD, EUR, NGN)
- **withdrawalPenalty**: 
  - **type**: "percentage" or "amount"
  - **value**: Withdrawal penalty value

### Savings Product Configuration
For Savings products, the following configuration fields are available:

- **loanAmount**: 
  - **minimum**: Minimum loan amount (optional)
  - **maximum**: Maximum loan amount (optional)
- **charges**: Array of charges (fees, insurance, etc.)
  - **name**: Name of the charge
  - **type**: Type of charge ("fee", "insurance", or "other")
  - **amount**: Amount of the charge
  - **isPercentage**: Whether the charge is a percentage (optional)
- **savingAmountSettings**: Saving amount settings ("flexible" or "fixed")
- **duration**: 
  - **value**: Number of units
  - **unit**: Time unit ("day", "week", "month", or "year")
- **interestRate**: Interest rate percentage
- **withdrawalPenalty**: 
  - **type**: "percentage" or "amount"
  - **value**: Withdrawal penalty value
- **withdrawalFlexibility**: Withdrawal flexibility ("anytime", "weekly", "monthly", "yearly", or "by_schedule")
- **moratorium**: 
  - **value**: Number of units
  - **unit**: Time unit ("day", "week", "month", or "year")
- **productName**: Name of the product
- **productImage**: Product image URL or base64 encoded image
- **userMode**: User mode ("single" or "group")

## Validation
All requests are validated using Joi schemas to ensure data integrity:
- Product name: 1-200 characters, required for creation
- Product description: 1-1000 characters, required for creation
- Product type: Must be one of Loan, Mortgage, Savings, Commodity, or Custom (1-100 characters)
- App ID: 1-100 characters, required for creation
- Status: Must be either "complete" or "incomplete"

## Example Usage
To create a product, send a POST request to `/api/v1/products` with the required fields:

```bash
curl -X POST http://localhost:3005/api/v1/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Premium Subscription",
    "description": "Premium access to all features",
    "type": "Savings",
    "appId": "app-12345"
  }'
```

To update a product's status to complete:
```bash
curl -X PUT http://localhost:3005/api/v1/products/product-id-123 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "complete"
  }'
```

To check what action is allowed for a product:
```bash
curl -X GET http://localhost:3005/api/v1/products/product-id-123/action
```

To create a loan product configuration:
```bash
curl -X POST http://localhost:3005/api/v1/configurations \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "product-id-123",
    "productType": "Loan",
    "configuration": {
      "purpose": "Personal loan for home improvement",
      "minimumFacilityAmount": 1000,
      "maximumFacilityAmount": 50000,
      "repaymentCycle": "month",
      "loanTenure": {
        "value": 36,
        "unit": "month"
      },
      "managementFee": 100,
      "interestRate": 5.5,
      "penalty": {
        "type": "percentage",
        "value": 2.0
      },
      "moratorium": {
        "value": 3,
        "unit": "month"
      },
      "minimumRepaymentAmount": 100,
      "securityRequirements": ["property", "other"],
      "additionalSecurityRequirements": "Guarantor required",
      "eligibility": "Must be employed with minimum monthly income of $2000",
      "currency": "USD",
      "withdrawalPenalty": {
        "type": "percentage",
        "value": 1.5
      }
    }
  }'
```

To create a savings product configuration:
```bash
curl -X POST http://localhost:3005/api/v1/configurations \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "product-id-456",
    "productType": "Savings",
    "configuration": {
      "loanAmount": {
        "minimum": 1000,
        "maximum": 50000
      },
      "charges": [
        {
          "name": "Account Maintenance Fee",
          "type": "fee",
          "amount": 10,
          "isPercentage": false
        },
        {
          "name": "Insurance",
          "type": "insurance",
          "amount": 0.5,
          "isPercentage": true
        }
      ],
      "savingAmountSettings": "flexible",
      "duration": {
        "value": 12,
        "unit": "month"
      },
      "interestRate": 3.5,
      "withdrawalPenalty": {
        "type": "percentage",
        "value": 1.0
      },
      "withdrawalFlexibility": "monthly",
      "moratorium": {
        "value": 30,
        "unit": "day"
      },
      "productName": "Flexible Savings Account",
      "userMode": "single"
    }
  }'
```