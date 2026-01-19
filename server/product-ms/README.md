# Product Management Microservice

## Overview
This microservice handles product creation and management for the SpringTD platform. When triggered, it receives a create-app ID and uses it to create a product with the required information.

Deployment URL: https://product-ms.fly.dev/

## New Workflow
The product creation workflow has been updated to require product type selection as the first step after receiving the create-app ID:
1. Receive create-app ID
2. Select product type (Loan, Mortgage, Savings, Commodity, or Investment)
3. Provide product name and description
4. Configure product-specific settings

## API Endpoints

### Select Product Type
Selects the product type after receiving the create-app ID.

**Endpoint:** `POST /api/v1/products/select-type`

**Request Body:**
```json
{
  "appId": "string",           // Required: Create-app ID (1-100 characters)
  "type": "string"             // Required: Product type (Loan, Mortgage, Savings, Commodity, or Investment)
}
```

**Response:**
```json
{
  "success": true,
  "message": "Product type selected successfully",
  "data": {
    "id": "string",
    "referenceNumber": "string",  // Auto-generated unique reference number
    "name": "",                   // Will be set later
    "description": "",            // Will be set later
    "type": "string",
    "appId": "string",
    "status": "incomplete",       // Initial status (complete or incomplete)
    "createdAt": "string",        // ISO timestamp
    "updatedAt": "string"         // ISO timestamp
  }
}
```

### Create Product After Type Selection
Creates the product with name and description after selecting the type.

**Endpoint:** `POST /api/v1/products/create-after-type`

**Request Body:**
```json
{
  "productId": "string",        // Required: Product ID from type selection
  "name": "string",             // Required: Product name (1-200 characters)
  "description": "string"       // Required: Product description (1-1000 characters)
}
```

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

### Create Product (Legacy Endpoint)
Creates a new product with all information at once (maintained for backward compatibility).

**Endpoint:** `POST /api/v1/products`

**Request Body:**
```json
{
  "name": "string",           // Required: Product name (1-200 characters)
  "description": "string",    // Required: Product description (1-1000 characters)
  "type": "string",           // Required: Product type (Loan, Mortgage, Savings, Commodity, or Investment)
  "appId": "string"           // Required: Create-app ID (1-100 characters)
}
```

**Product Types:**
- **Loan**: Financial product for borrowing money
- **Mortgage**: Long-term loan secured by real estate
- **Savings**: Financial product for saving money with interest
- **Commodity**: Product related to trading physical goods
- **Investment**: Financial product for investment portfolios and instruments

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
  "type": "string",              // Optional: Product type (Loan, Mortgage, Savings, Commodity, or Investment)
  "status": "string"             // Optional: Product status (complete or incomplete)
}
```

### Delete Product
Deletes a product by its ID.

**Endpoint:** `DELETE /api/v1/products/:id`

### Get ALL Products
Retrieves all products.

**Endpoint:** `GET /api/v1/products`

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

### Manage Product
Allows editing/updating all product information for complete products.

**Endpoint:** `PUT /api/v1/products/:id/manage`

**Request Body:**
```json
{
  "name": "string",              // Optional: Product name (1-200 characters)
  "description": "string",       // Optional: Product description (1-1000 characters)
  "type": "string",              // Optional: Product type (Loan, Mortgage, Savings, Commodity, or Investment)
  "status": "string"             // Optional: Product status (complete or incomplete)
}
```

**Response:**
```json
{
  "success": true,
  "message": "Product managed successfully",
  "data": {
    "id": "string",
    "referenceNumber": "string",  // Auto-generated unique reference number
    "name": "string",
    "description": "string",
    "type": "string",
    "appId": "string",
    "status": "string",           // Product status (complete or incomplete)
    "createdAt": "string",        // ISO timestamp
    "updatedAt": "string"         // ISO timestamp
  }
}
```

Only products with "complete" status can be managed. Attempting to manage an incomplete product will result in a 403 Forbidden error.

## Product Configuration API Endpoints

### Create Product Configuration
Creates a configuration for a specific product based on its type.

**Endpoint:** `POST /api/v1/configurations`

**Request Body:**
```json
{
  "productId": "string",           // Required: Product ID
  "productType": "string",         // Required: Product type (Loan, Mortgage, Savings, Commodity, or Investment)
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
- **interestRate**: 
  - **type**: "percentage" or "amount"
  - **value**: Interest rate value
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

### Mortgage Product Configuration
For Mortgage products, the following configuration fields are available:

- **purpose**: Text description of the mortgage purpose
- **minimumFacilityAmount**: Minimum mortgage amount available
- **maximumFacilityAmount**: Maximum mortgage amount available
- **repaymentCycle**: Repayment frequency (year, month, week, day)
- **loanTenure**: 
  - **value**: Number of units
  - **unit**: Time unit (year, month, week, day)
- **managementFee**: Management fee amount
- **interestRate**: 
  - **type**: "percentage" or "amount"
  - **value**: Interest rate value
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
- **termYears**: Number of years for the mortgage term
- **downPaymentPercentage**: Required down payment percentage
- **propertyTypeRestrictions**: Array of property type restrictions (optional)
- **requiresInsurance**: Whether insurance is required
- **insuranceTypes**: Array of insurance types (optional)
- **equityContribution**: Equity contribution percentage (optional)
- **propertyValue**: Property value amount (optional)

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

### Commodity Product Configuration
For Commodity products, the following configuration fields are available:

- **commodityType**: Type of commodity (e.g., Gold, Silver, Oil)
- **unitOfMeasure**: Unit of measurement for the commodity (e.g., grams, barrels)
- **minimumOrderQuantity**: Minimum quantity that can be ordered
- **price**: Price of the commodity
- **priceVolatilityThreshold**: Threshold for price volatility alerts

## Validation
All requests are validated using Joi schemas to ensure data integrity:
- Product name: 1-200 characters, required for creation
- Product description: 1-1000 characters, required for creation
- Product type: Must be one of Loan, Mortgage, Savings, Commodity, or Investment (1-100 characters)
- App ID: 1-100 characters, required for creation
- Status: Must be either "complete" or "incomplete"

## Example Usage

To select a product type after receiving the create-app ID:
```bash
curl -X POST http://localhost:3005/api/v1/products/select-type \
  -H "Content-Type: application/json" \
  -d '{
    "appId": "app-12345",
    "type": "Loan"
  }'
```

To create a product after selecting the type:
```bash
curl -X POST http://localhost:3005/api/v1/products/create-after-type \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "product-id-123",
    "name": "Personal Loan",
    "description": "A personal loan for home improvement"
  }'
```

To create a product using the legacy endpoint (all information at once):
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

To manage a complete product:
```bash
curl -X PUT http://localhost:3005/api/v1/products/product-id-123/manage \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Product Name",
    "description": "Updated product description"
  }'
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
      "interestRate": {
        "type": "percentage",
        "value": 5.5
      },
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