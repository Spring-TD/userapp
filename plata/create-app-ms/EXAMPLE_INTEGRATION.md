# Example Integration with Product Microservice

This document shows how the Create App Microservice integrates with the Product Microservice.

## Workflow Example

1. First, create an application using the Create App Microservice:

```bash
curl -X POST http://localhost:3002/api/v1/apps \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Loan Application",
    "description": "Application for loan products",
    "merchantId": "merchant-123"
  }'
```

Response:
```json
{
  "success": true,
  "message": "App created successfully",
  "data": {
    "id": "app-xyz789",
    "name": "Loan Application",
    "description": "Application for loan products",
    "merchantId": "merchant-123",
    "status": "draft",
    "createdAt": "2025-10-21T10:00:00.000Z",
    "updatedAt": "2025-10-21T10:00:00.000Z"
  }
}
```

2. Submit the application for review:

```bash
curl -X POST http://localhost:3002/api/v1/apps/app-xyz789/submit
```

3. Approve the application (admin action):

```bash
curl -X POST http://localhost:3002/api/v1/apps/app-xyz789/approve
```

4. Now use the app ID when creating a product in the Product Microservice:

```bash
curl -X POST http://localhost:3005/api/v1/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Personal Loan",
    "description": "A personal loan product",
    "type": "Loan",
    "appId": "app-xyz789"
  }'
```

This creates a product associated with the application, allowing the system to track which products belong to which applications.