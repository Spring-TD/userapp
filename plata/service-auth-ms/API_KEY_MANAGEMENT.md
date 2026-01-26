# API Key Management

This document describes the API key management endpoints available to merchants in the service-auth-ms microservice.

## Overview

Merchants can create and manage API keys (Public/Secret key pairs) to secure external communication with the microservices ecosystem. These keys are environment-scoped (Test/Live) and can be used to authenticate requests from external applications.

## Endpoints

### 1. Create API Key

**POST** `/api/v1/keys`

Creates a new API key pair. The secret key is returned **only once** upon creation.

**Authentication:** Required (Merchant only)

**Request Body:**
```json
{
  "name": "E-commerce Backend",
  "environment": "test",
  "permissions": ["create_order", "read_products"],
  "expires_in_days": 90
}
```

**Validation:**
- `name`: Required, 3-50 characters
- `environment`: Required, either 'test' or 'live'
- `permissions`: Optional array of strings
- `expires_in_days`: Optional integer (1-365)

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "API Key created successfully. Store the secret key safely, it will not be shown again.",
  "data": {
    "apiKey": {
      "id": "uuid-here",
      "merchant_id": "merchant-id",
      "name": "E-commerce Backend",
      "public_key": "pk_test_a1b2c3d4e5f6...",
      "environment": "test",
      "status": "active",
      "permissions": ["create_order", "read_products"],
      "created_at": "2025-12-10T14:00:00.000Z",
      "updated_at": "2025-12-10T14:00:00.000Z",
      "expires_at": "2026-03-10T14:00:00.000Z"
    },
    "secretKey": "sk_test_x9y8z7..." // SAVE THIS!
  }
}
```

### 2. List API Keys

**GET** `/api/v1/keys`

Lists all API keys for the merchant. Secret keys are NOT included.

**Authentication:** Required (Merchant only)

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "apiKeys": [
      {
        "id": "uuid-here",
        "merchant_id": "merchant-id",
        "name": "E-commerce Backend",
        "public_key": "pk_test_a1b2c3d4e5f6...",
        "environment": "test",
        "status": "active",
        "permissions": ["create_order", "read_products"],
        "created_at": "2025-12-10T14:00:00.000Z",
        "updated_at": "2025-12-10T14:00:00.000Z",
        "expires_at": "2026-03-10T14:00:00.000Z"
      }
    ]
  }
}
```

### 3. Revoke API Key

**DELETE** `/api/v1/keys/:keyId`

Revokes an API key, making it unusable. This action cannot be undone (for now, status changes to 'revoked').

**Authentication:** Required (Merchant only)

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "API Key revoked successfully"
}
```

## Security Best Practices

1.  **Secret Key Storage**: Never store secret keys in client-side code (browsers, mobile apps). They are meant for server-to-server communication.
2.  **Environment Separation**: Use 'test' keys for development and staging, and 'live' keys only for production.
3.  **Rotation**: Regularly rotate keys by creating a new one, updating your applications, and then revoking the old one.
