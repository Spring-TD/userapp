# Product Management Microservice

## Overview
This microservice provides read-only access to products created in the server product service and enables merchant-specific configuration management. It allows merchants to fetch products and configure them for their specific use cases, including toggling product availability and adjusting interest rates.

Deployment URL: https://product-ms.fly.dev/

## New Workflow
The product configuration workflow allows merchants to manage products that were created in the server product service:
1. Fetch products from server product service
2. Configure products for merchant use (toggle on/off, adjust rates, etc.)
3. Apply merchant-specific settings like interest rate markups

## API Endpoints

### Get ALL Products
Retrieves all products from the server product service.

**Endpoint:** `GET /api/v1/products`

### Get Product by ID
Retrieves a product by its ID from the server product service.

**Endpoint:** `GET /api/v1/products/:id`

### Get Products by Merchant ID
Retrieves all products associated with a specific merchant ID from the server product service.

**Endpoint:** `GET /api/v1/products/merchant/:appId`

### Toggle Product Activation
Toggles whether a product is activated for a specific merchant.

**Endpoint:** `PUT /api/v1/products/toggle/:merchantId/:productId`

**Request Body:**
```json
{
  "activate": true                // Required: Boolean to activate/deactivate the product for the merchant
}
```

**Response:**
```json
{
  "success": true,
  "message": "Product activated successfully",  // Or "Product deactivated successfully"
  "data": {
    "productId": "string",
    "merchantId": "string",
    "isActive": true               // Current activation status
  }
}
```

### Update Merchant Product Configuration
Updates merchant-specific product configurations including pricing settings, interest rate markups, and custom terms.

**Endpoint:** `PUT /api/v1/products/config/:merchantId/:productId`

**Request Body:**
```json
{
  "pricingType": "percent",                    // Optional: Pricing type - "percent" or "Fixed pricing"
  "pricingCondition": "With cap",              // Optional: Pricing condition - "With cap" or "No Cap"
  "upperCap": 10000,                          // Optional: Maximum fee cap - If calculated fee > upper cap, charge upper cap as flat rate
  "lowerCap": 2000,                           // Optional: Minimum fee cap - If calculated fee < lower cap, charge lower cap
  "springTDFee": 100,                         // Optional: SpringTD platform fee
  "serviceFee": 50,                           // Optional: Service fee charged by Spring
  "markupRate": 5.0,                          // Optional: Additional percentage to add to base interest rate (Your Mark-up Fee)
  "customTerms": {},                          // Optional: Custom terms for this merchant
  "enabledFeatures": ["string"]               // Optional: Features enabled for this merchant
}
```

**Pricing Configuration Notes:**
- **pricingType**: Determines how fees are calculated - percentage-based or fixed pricing
- **pricingCondition**: Controls whether caps are applied ("With cap") or not ("No Cap")
- **upperCap**: Maximum fee limit. Example: If 10% of transaction = 15,000 and upperCap = 10,000, charge 10,000 as flat rate
- **lowerCap**: Minimum fee limit. Example: If 10% of transaction = 1,500 and lowerCap = 2,000, charge 2,000
- When "With cap" is selected, both upperCap and lowerCap should be provided

**Response:**
```json
{
  "success": true,
  "message": "Merchant product configuration updated successfully",
  "data": {
    "id": "string",              // Configuration ID
    "productId": "string",       // Product ID
    "merchantId": "string",      // Merchant ID
    "isActive": true,            // Whether product is active for this merchant
    "pricingType": "percent",   // Pricing type - "percent" or "Fixed pricing"
    "pricingCondition": "With cap", // Pricing condition - "With cap" or "No Cap"
    "upperCap": 10000,          // Maximum fee cap
    "lowerCap": 2000,           // Minimum fee cap
    "springTDFee": 100,         // SpringTD platform fee
    "serviceFee": 50,           // Service fee charged by Spring
    "markupRate": 5.0,          // Additional rate added to base rate
    "customTerms": {},          // Custom terms for this merchant
    "enabledFeatures": ["string"], // Features enabled for this merchant
    "createdAt": "string",      // ISO timestamp
    "updatedAt": "string"       // ISO timestamp
  }
}
```

### Get Merchant Product Configuration
Retrieves merchant-specific product configuration.

**Endpoint:** `GET /api/v1/products/config/:merchantId/:productId`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "string",              // Configuration ID
    "productId": "string",       // Product ID
    "merchantId": "string",      // Merchant ID
    "isActive": true,            // Whether product is active for this merchant
    "pricingType": "percent",    // Pricing type - "percent" or "Fixed pricing"
    "pricingCondition": "With cap", // Pricing condition - "With cap" or "No Cap"
    "upperCap": 10000,          // Maximum fee cap
    "lowerCap": 2000,           // Minimum fee cap
    "springTDFee": 100,         // SpringTD platform fee
    "serviceFee": 50,           // Service fee charged by Spring
    "markupRate": 5.0,          // Additional rate added to base rate
    "customTerms": {},          // Custom terms for this merchant
    "enabledFeatures": ["string"], // Features enabled for this merchant
    "createdAt": "string",      // ISO timestamp
    "updatedAt": "string"       // ISO timestamp
  }
}
```

### Check Product Action
Checks what action is allowed for a product based on its status.

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

### Manage Product
Manages a complete product (Note: This functionality is not supported in this service. Use server/product-ms for product management.).

**Endpoint:** `PUT /api/v1/products/:id/manage`

**Response:**
```json
{
  "success": false,
  "error": "Product management is not supported in this service. Use server/product-ms for product management."
}
```

**Note:** Product creation, updates, and deletions are not supported in this service. These operations must be performed on the server/product-ms service.
## Merchant Configuration Management

This service focuses on merchant-specific configuration management for products that were created in the server product service. Each merchant can configure products according to their needs:

- **Toggle Product Availability**: Turn products on/off for specific merchants
- **Pricing Configuration**: Configure pricing types, conditions, and fee caps
- **Interest Rate Markups**: Add additional percentages to base interest rates
- **Custom Terms**: Define custom terms for specific products
- **Feature Control**: Enable/disable specific features for each merchant

### Merchant Product Configuration

Merchant product configurations include:

- **isActive**: Whether the product is available for the merchant
- **pricingType**: Pricing calculation method - "percent" (percentage-based) or "Fixed pricing" (flat rate)
- **pricingCondition**: Whether to apply caps - "With cap" (apply upper/lower caps) or "No Cap" (no caps)
- **upperCap**: Maximum fee cap - If calculated fee exceeds this value, charge the upper cap as a flat rate
- **lowerCap**: Minimum fee cap - If calculated fee is below this value, charge the lower cap
- **springTDFee**: SpringTD platform fee amount
- **serviceFee**: Service fee charged by Spring
- **markupRate**: Additional percentage added to base interest rates (Your Mark-up Fee)
- **customTerms**: Merchant-specific terms and conditions
- **enabledFeatures**: List of features enabled for the merchant

**Pricing Cap Example:**
If you configure 10% markup with lowerCap = 2,000 and upperCap = 10,000:
- Transaction of 15,000: 10% = 1,500 → Charge 2,000 (lower cap applied)
- Transaction of 50,000: 10% = 5,000 → Charge 5,000 (within range)
- Transaction of 150,000: 10% = 15,000 → Charge 10,000 (upper cap applied as flat rate)

This allows merchants to customize how they offer products to their customers while maintaining the core product definitions in the server service.
## Validation
All requests are validated to ensure data integrity:
- Merchant ID: Required for merchant-specific operations
- Product ID: Required for identifying products
- Activate flag: Boolean value for toggling product availability
- Pricing Type: Must be "percent" or "Fixed pricing"
- Pricing Condition: Must be "With cap" or "No Cap"
- Upper Cap: Numeric value representing maximum fee limit
- Lower Cap: Numeric value representing minimum fee limit
- SpringTD Fee: Numeric value for platform fee
- Service Fee: Numeric value for service fee
- Markup rate: Numeric value for interest rate adjustments

## Example Usage

To fetch all products from the server product service:
```bash
curl -X GET http://localhost:4005/api/v1/products
```

To fetch a specific product by ID:
```bash
curl -X GET http://localhost:4005/api/v1/products/{productId}
```

To fetch products for a specific merchant:
```bash
curl -X GET http://localhost:4005/api/v1/products/merchant/{merchantId}
```

To toggle product activation for a merchant:
```bash
curl -X PUT http://localhost:4005/api/v1/products/toggle/{merchantId}/{productId} \
  -H "Content-Type: application/json" \
  -d '{
    "activate": true
  }'
```

To update merchant-specific product configuration:
```bash
curl -X PUT http://localhost:4005/api/v1/products/config/{merchantId}/{productId} \
  -H "Content-Type: application/json" \
  -d '{
    "pricingType": "percent",
    "pricingCondition": "With cap",
    "upperCap": 10000,
    "lowerCap": 2000,
    "springTDFee": 100,
    "serviceFee": 50,
    "markupRate": 5.0,
    "customTerms": {
      "specialCondition": "Minimum deposit required"
    },
    "enabledFeatures": ["onlineBanking", "mobileApp"]
  }'
```

To get merchant-specific product configuration:
```bash
curl -X GET http://localhost:4005/api/v1/products/config/{merchantId}/{productId}
```

To check what action is allowed for a product:
```bash
curl -X GET http://localhost:4005/api/v1/products/{productId}/action
```

**Note:** Product creation, updates, and deletions are not supported in this service. These operations must be performed on the server/product-ms service. This service only provides read-only access to products and merchant-specific configuration capabilities.