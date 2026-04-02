# Product Management Microservice

## Overview
`product-ms` exposes the shared Plata product catalog and manages app-specific enabled products.

It now has two responsibilities:

1. Fetch the full upstream product catalog from Plata.
2. Persist products that an app has turned on into this service's local MongoDB `products` collection.

When an app turns on a product, `product-ms` clones the upstream Plata product into its own `products` collection using the Plata product document structure. Turning the product off keeps the local app product but marks `isActive` as `false`.

Deployment URL: https://product-ms.fly.dev/

## Plata Authentication

`GET /api/v1/products` fetches the full catalog from the upstream product service and forwards these credentials server-to-server:

- `X-Public-Key`
- `X-Secret-Key`

These values come from environment variables.

### Required Environment Variables

- `PLATA_PUBLIC_KEY`
- `PLATA_SECRET_KEY`
- `SERVER_PRODUCT_SERVICE_URL`
- `MONGODB_URI` or `DATABASE_URL`

## Current Flow

1. Frontend fetches the full selectable catalog from `GET /api/v1/products`.
2. User turns on a product for an app using `PUT /api/v1/products/toggle/:appId/:productId`.
3. `product-ms` fetches that product from upstream and stores a local copy in MongoDB `products`.
4. Frontend fetches enabled products for that app using `GET /api/v1/products/app/:appId`.

## Storage Model

Enabled products are saved in the local MongoDB `products` collection, not in `MerchantProductConfiguration`.

The local document shape follows the Plata product model, including fields such as:

- `referenceNumber`
- `name`
- `description`
- `isActive`
- `type`
- `subType`
- `appId`
- `status`
- `metadata`
- `about`
- `structure`
- `requirements`
- `feesAndCharges`

This means app-enabled products are stored as full product documents, not as lightweight activation records.

## API Endpoints

### Get All Products

Fetch the full upstream catalog.

**Endpoint:** `GET /api/v1/products`

### Get Product By ID

Fetch a product by ID. Local app product documents are resolved first; if none exists locally, the service falls back to the upstream catalog.

**Endpoint:** `GET /api/v1/products/:id`

### Get Products For An App

Fetch products that have been saved locally for a specific app.

**Endpoints:**

- `GET /api/v1/products/app/:appId`
- `GET /api/v1/products/merchant/:appId`

The `/merchant/:appId` route currently exists as a compatibility alias.

### Toggle Product Activation

Turn a product on or off for a specific app.

**Endpoint:** `PUT /api/v1/products/toggle/:appId/:productId`

**Request Body:**

```json
{
  "activate": true
}
```

**Behavior:**

- If `activate` is `true` and the app does not already have a local copy, the product is cloned from upstream into the local `products` collection.
- If the app already has a local copy, `isActive` is updated.
- If `activate` is `false`, the existing local app product is marked inactive.

**Response:**

```json
{
  "success": true,
  "message": "Product activated successfully",
  "data": {
    "id": "local-product-id",
    "referenceNumber": "PRD-123456-ABCD",
    "name": "Demo Investment Product",
    "description": "Investment product",
    "type": "INVESTMENT",
    "subType": "Metal Commodity",
    "appId": "app-id",
    "status": "incomplete",
    "isActive": true,
    "createdAt": "2026-03-23T09:53:34.130Z",
    "updatedAt": "2026-03-23T09:53:34.130Z"
  }
}
```

### Update App Product

Update the locally stored app product document.

**Endpoint:** `PUT /api/v1/products/config/:appId/:productId`

This endpoint now updates the Plata-shaped local product document for that app.

### Get App Product

Get the locally stored app product document.

**Endpoint:** `GET /api/v1/products/config/:appId/:productId`

### Check Product Action

Checks what action is allowed for an upstream product based on its status.

**Endpoint:** `GET /api/v1/products/:id/action`

### Manage Product

Not supported in this service.

**Endpoint:** `PUT /api/v1/products/:id/manage`

## Example Usage

Fetch the full product catalog:

```bash
curl -X GET http://localhost:4005/api/v1/products
```

Fetch enabled products for an app:

```bash
curl -X GET http://localhost:4005/api/v1/products/app/{appId}
```

Turn on a product for an app:

```bash
curl -X PUT http://localhost:4005/api/v1/products/toggle/{appId}/{productId} \
  -H "Content-Type: application/json" \
  -d '{
    "activate": true
  }'
```

Turn off a product for an app:

```bash
curl -X PUT http://localhost:4005/api/v1/products/toggle/{appId}/{productId} \
  -H "Content-Type: application/json" \
  -d '{
    "activate": false
  }'
```

Get an app-specific product:

```bash
curl -X GET http://localhost:4005/api/v1/products/config/{appId}/{productId}
```

Update an app-specific product:

```bash
curl -X PUT http://localhost:4005/api/v1/products/config/{appId}/{productId} \
  -H "Content-Type: application/json" \
  -d '{
    "isActive": true,
    "metadata": {
      "source": "frontend"
    }
  }'
```

Check allowed action for a product:

```bash
curl -X GET http://localhost:4005/api/v1/products/{productId}/action
```

## Notes

- Product creation, updates, and deletions for the master catalog still belong to the upstream Plata product service.
- This service is responsible for app-specific enabled product persistence.
- The local `products` collection is the source of truth for which products are enabled for a specific app.