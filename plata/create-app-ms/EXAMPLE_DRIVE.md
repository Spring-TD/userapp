# Drive Endpoints Example Usage

This document provides examples of how to use the new Drive endpoints in the Create App Microservice.

## Uploading a Document

To upload a document to an application's drive, make a POST request to:

```
POST /api/v1/apps/{appId}/drive/documents
```

### Example Request

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

### Example Response

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

## Getting All Documents for an Application

To retrieve all documents for a specific application, make a GET request to:

```
GET /api/v1/apps/{appId}/drive/documents
```

### Example Request

```bash
curl -X GET "http://localhost:3002/api/v1/apps/app-123/drive/documents" \
  -H "Content-Type: application/json"
```

### Example Response

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

## Filtering Documents

You can filter documents using query parameters:

```bash
# Get only PDF documents
curl -X GET "http://localhost:3002/api/v1/apps/app-123/drive/documents?fileType=pdf" \
  -H "Content-Type: application/json"

# Get verified documents for a specific user
curl -X GET "http://localhost:3002/api/v1/apps/app-123/drive/documents?userId=user-456&status=verified" \
  -H "Content-Type: application/json"

# Pagination
curl -X GET "http://localhost:3002/api/v1/apps/app-123/drive/documents?page=1&limit=10" \
  -H "Content-Type: application/json"
```

## Getting a Specific Document

To retrieve a specific document by its ID, make a GET request to:

```
GET /api/v1/apps/{appId}/drive/documents/{documentId}
```

### Example Request

```bash
curl -X GET "http://localhost:3002/api/v1/apps/app-123/drive/documents/doc-789" \
  -H "Content-Type: application/json"
```

### Example Response

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

## Updating a Document

To update a document's information, make a PUT request to:

```
PUT /api/v1/apps/{appId}/drive/documents/{documentId}
```

### Example Request

```bash
curl -X PUT "http://localhost:3002/api/v1/apps/app-123/drive/documents/doc-789" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "verified"
  }'
```

### Example Response

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

## Deleting a Document

To delete a document, make a DELETE request to:

```
DELETE /api/v1/apps/{appId}/drive/documents/{documentId}
```

### Example Request

```bash
curl -X DELETE "http://localhost:3002/api/v1/apps/app-123/drive/documents/doc-789" \
  -H "Content-Type: application/json"
```

### Example Response

```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

## Getting Document Statistics

To retrieve document statistics for an application, make a GET request to:

```
GET /api/v1/apps/{appId}/drive/document-stats
```

### Example Request

```bash
curl -X GET "http://localhost:3002/api/v1/apps/app-123/drive/document-stats" \
  -H "Content-Type: application/json"
```

### Example Response

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

## Error Handling

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

If the document does not belong to the specified app, you'll receive a 403 error:

```json
{
  "success": false,
  "error": "Document does not belong to this app"
}
```