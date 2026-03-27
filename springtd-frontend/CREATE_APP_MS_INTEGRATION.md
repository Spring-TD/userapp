# Create App Microservice - Integration Guide

**Last Updated:** February 6, 2026

This document provides a comprehensive overview of the Create App Microservice (`create-app-ms`) and how it integrates with the Spring App dashboard for app creation, configuration, and management.

---

## Table of Contents

1. [Service Overview](#service-overview)
2. [Core Features](#core-features)
3. [API Endpoints](#api-endpoints)
   - [Standard App Endpoints](#standard-app-endpoints)
   - [Transaction Endpoints](#transaction-endpoints)
   - [Drive/Document Endpoints](#drivedocument-endpoints)
   - [Product Key Management](#product-key-management)
   - [App Configuration Endpoints](#app-configuration-endpoints)
   - [Special Endpoints](#special-endpoints)
4. [Data Models](#data-models)
5. [Subdomain System](#subdomain-system)
6. [Configuration Management](#configuration-management)
7. [UI Mapping](#ui-mapping)
8. [Frontend Integration Plan](#frontend-integration-plan)

---

## Service Overview

**Deployment URL:** https://create-app-ms.fly.dev/

**Purpose:** Handles the creation and management of applications within the SpringTD platform. Allows merchants to create applications that can be associated with products from the Product Microservice.

**Key Integrations:**
- Product Microservice (product association)
- Wallet Microservice (automatic wallet creation)
- Service Auth Microservice (JWT authentication)

---

## Core Features

| Feature | Description |
|---------|-------------|
| **App Creation** | Create apps with name, URL, alias, description |
| **Subdomain Assignment** | Automatic unique subdomain (e.g., `my-app.springtd.com`) |
| **App Lifecycle** | Manage status: draft → submitted → approved/rejected |
| **Wallet Integration** | Auto-create user wallets for applications |
| **Product Keys** | Associate apps with products |
| **Transactions** | View and manage app transactions |
| **Drive/Documents** | Document management for user submissions |
| **Configuration Management** | Complete app customization with versioning |

---

## API Endpoints

### Standard App Endpoints

#### Create App
```
POST /api/v1/apps
```

**Headers:**
- `Authorization: Bearer <token>` (required)

**Request Body:**
```json
{
  "name": "My Awesome App",           // required, 3-100 chars
  "websiteUrl": "https://example.com", // required
  "alias": "awesome-app",              // required, 2-50 chars
  "description": "App description",    // required, 10-1000 chars
  "merchantId": "merchant-123",        // optional (extracted from token)
  "subdomain": "my-custom-subdomain"   // optional (auto-generated if not provided)
}
```

**Response:**
```json
{
  "success": true,
  "message": "App created successfully",
  "data": {
    "app": {
      "id": "abc123xyz",
      "name": "My Awesome App",
      "subdomain": "my-awesome-app",
      "subdomainUrl": "https://my-awesome-app.springtd.com",
      "websiteUrl": "https://example.com",
      "alias": "awesome-app",
      "description": "App description",
      "merchantId": "merchant-123",
      "status": "draft",
      "createdAt": "2023-01-15T10:30:00Z",
      "updatedAt": "2023-01-15T10:30:00Z",
      "productKeys": []
    },
    "wallets": {
      "success": true,
      "data": {...}
    }
  }
}
```

#### Get All Apps
```
GET /api/v1/apps
```

#### Get App by ID
```
GET /api/v1/apps/{id}
```

#### Get Apps by Merchant ID
```
GET /api/v1/apps/merchant/{merchantId}
```

#### Get App by Subdomain
```
GET /api/v1/apps/subdomain/{subdomain}
```

#### Update App
```
PUT /api/v1/apps/{id}
```

**Request Body:**
```json
{
  "name": "Updated Name",
  "websiteUrl": "https://new-url.com",
  "alias": "new-alias",
  "description": "Updated description",
  "status": "submitted",
  "subdomain": "new-subdomain",
  "productKeys": ["key1", "key2"]
}
```

#### Delete App
```
DELETE /api/v1/apps/{id}
```

#### Submit App for Review
```
POST /api/v1/apps/{id}/submit
```

#### Approve App
```
POST /api/v1/apps/{id}/approve
```

#### Reject App
```
POST /api/v1/apps/{id}/reject
```

---

### Transaction Endpoints

#### Get App Transactions
```
GET /api/v1/apps/{id}/transactions
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number for pagination |
| `limit` | number | Transactions per page |
| `type` | string | Filter: 'credit' or 'debit' |
| `status` | string | Filter: 'pending', 'completed', 'failed', 'cancelled' |
| `startDate` | string | ISO date format |
| `endDate` | string | ISO date format |

#### Get Transaction Statistics
```
GET /api/v1/apps/{id}/transaction-stats
```

**Response:**
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

---

### Drive/Document Endpoints

#### Upload Document
```
POST /api/v1/apps/{id}/drive/documents
```

**Request Body:**
```json
{
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
}
```

#### Get App Documents
```
GET /api/v1/apps/{id}/drive/documents
```

**Query Parameters:** `page`, `limit`, `userId`, `fileType`, `status`, `startDate`, `endDate`

#### Get Document by ID
```
GET /api/v1/apps/{id}/drive/documents/{documentId}
```

#### Update Document
```
PUT /api/v1/apps/{id}/drive/documents/{documentId}
```

#### Delete Document
```
DELETE /api/v1/apps/{id}/drive/documents/{documentId}
```

#### Get Document Statistics
```
GET /api/v1/apps/{id}/drive/document-stats
```

---

### Product Key Management

#### Add Product Key
```
POST /api/v1/apps/{id}/product-key
```

**Request Body:**
```json
{
  "productKey": "product-key-123"
}
```

#### Get Product Keys
```
GET /api/v1/apps/{id}/product-keys
```

---

## App Configuration Endpoints

### ⭐ THIS IS THE KEY SECTION FOR APP BUILDER ⭐

The configuration system supports complete app customization with versioning, publishing, and templates.

### Configuration Structure

| Section | Purpose | UI Tab Mapping |
|---------|---------|----------------|
| `appElements` | Logo, splash, buttons, header, body, form colors | **Asset Tab**, **Splash Tab** |
| `appProfile` | Text, element, menu, aux, background colors | **App Profile Tab** |
| `onboarding` | Splash screens, fonts, colors, text | **Onboarding Tab** |
| `support` | Contact info, social media, components | **Support Tab** |
| `policy` | Policy and terms sections (title + rich text) | **Policy/Terms Tab** |
| `publishing` | Published status, publish timestamp | **Publish Tab** |

---

### Get Active Configuration
```
GET /api/v1/apps/:id/configuration
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "config-123",
    "appId": "app-456",
    "versionReference": "App_update_1aa344",
    "publishing": {
      "isPublished": true,
      "publishedAt": "2025-04-12T10:30:00Z"
    },
    "appElements": {
      "logo": "...",
      "splash": "...",
      "buttons": {...},
      "header": {...},
      "body": {...},
      "form": {...}
    },
    "appProfile": {
      "textColors": { "primary": "#...", "secondary": "#...", "aux": "#..." },
      "elementColors": { "primary": "#...", "secondary": "#..." },
      "menuColors": { "primary": "#...", "secondary": "#...", "aux": "#..." },
      "backgroundColors": { "primary": "#...", "secondary": "#..." }
    },
    "onboarding": {
      "fontFamily": "Arial",
      "splash1": { "title": "...", "subtitle": "...", "image": "..." },
      "splash2": { "title": "...", "subtitle": "...", "image": "..." },
      "splash3": { "title": "...", "subtitle": "...", "image": "..." },
      "textColors": { "primary": "#...", "secondary": "#..." },
      "backgroundColors": { "primary": "#...", "secondary": "#..." }
    },
    "support": {
      "email": "support@example.com",
      "phone": "+1234567890",
      "website": "https://example.com",
      "linkedinPage": "...",
      "socialMedia": {...},
      "components": [...]
    },
    "policy": {
      "policySection": { "title": "Privacy Policy", "content": "<rich-text>" },
      "termsSection": { "title": "Terms & Conditions", "content": "<rich-text>" }
    },
    "isActive": true,
    "updateVariance": ["Splash", "Profile", "DNS", "Terms"],
    "createdAt": "2025-04-12T10:00:00Z",
    "updatedAt": "2025-04-12T10:30:00Z"
  }
}
```

### Get All Configurations
```
GET /api/v1/apps/:id/configuration/all
```

### Get Configurations for Publish UI
```
GET /api/v1/apps/:id/configuration/publish
```

Returns unpublished drafts and previous published versions.

### Update Configuration
```
PUT /api/v1/apps/:id/configuration
```

**Request Body:**
```json
{
  "publishing": { "isPublished": false },
  "appElements": {...},
  "appProfile": {...},
  "onboarding": {...},
  "support": {...},
  "policy": {...}
}
```

### Create New Configuration Version
```
POST /api/v1/apps/:id/configuration/create
```

**Request Body:**
```json
{
  "configuration": {
    "publishing": { "isPublished": false },
    "appElements": {...}
  },
  "options": {
    "skipAutoDeactivate": true,
    "isActive": false
  }
}
```

### Activate Configuration
```
PUT /api/v1/apps/:id/configuration/:configurationId/activate
```

### Update Publishing Status
```
PUT /api/v1/apps/:id/configuration/publishing
```

**Request Body:**
```json
{
  "isPublished": true
}
```

---

### Section-Specific Update Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/apps/:id/configuration/app-elements` | PUT | Update logo, splash, buttons, colors |
| `/api/v1/apps/:id/configuration/app-profile` | PUT | Update text, element, menu, background colors |
| `/api/v1/apps/:id/configuration/onboarding` | PUT | Update splash screens, fonts, text |
| `/api/v1/apps/:id/configuration/support` | PUT | Update contact info, social media |
| `/api/v1/apps/:id/configuration/policy` | PUT | Update policy and terms content |

---

### Configuration Templates

#### Create Template
```
POST /api/v1/apps/:id/configuration/templates
```

**Request Body:**
```json
{
  "name": "My Template",
  "description": "Template description",
  "isDefault": false
}
```

#### Get All Templates
```
GET /api/v1/apps/:id/configuration/templates
```

#### Apply Template
```
POST /api/v1/apps/:id/configuration/templates/:templateId/apply
```

#### Update Template
```
PUT /api/v1/apps/:id/configuration/templates/:templateId
```

#### Delete Template
```
DELETE /api/v1/apps/:id/configuration/templates/:templateId
```

#### Set Default Template
```
PUT /api/v1/apps/:id/configuration/templates/:templateId/set-default
```

---

### Support Component Management

#### Add Component
```
POST /api/v1/apps/:id/configuration/support/components
```

**Request Body:**
```json
{
  "name": "Help Center",
  "type": "link",
  "content": "https://help.example.com",
  "color": "#007bff",
  "order": 1
}
```

#### Update Component
```
PUT /api/v1/apps/:id/configuration/support/components/:componentId
```

#### Delete Component
```
DELETE /api/v1/apps/:id/configuration/support/components/:componentId
```

#### Reorder Components
```
PUT /api/v1/apps/:id/configuration/support/components/reorder
```

---

## Data Models

### App
```typescript
interface App {
  id: string;                    // Auto-generated
  name: string;                  // 3-100 characters
  websiteUrl: string;
  alias: string;                 // 2-50 characters
  description: string;           // 10-1000 characters
  merchantId: string;
  subdomain: string;             // Auto-generated or custom
  subdomainUrl: string;          // e.g., https://my-app.springtd.com
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'incomplete';
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  productKeys?: string[];
}
```

### AppConfiguration
```typescript
interface AppConfiguration {
  id: string;
  appId: string;
  versionReference: string;      // e.g., "App_update_1aa344"
  
  publishing: {
    isPublished: boolean;
    publishedAt?: string;
  };
  
  appElements: {
    logo?: string;
    splash?: string;
    buttons?: { primaryColor: string; secondaryColor: string };
    header?: { backgroundColor: string; textColor: string };
    body?: { backgroundColor: string; textColor: string };
    form?: { backgroundColor: string; borderColor: string; textColor: string };
  };
  
  appProfile: {
    textColors: { primary: string; secondary: string; aux: string };
    elementColors: { primary: string; secondary: string };
    menuColors: { primary: string; secondary: string; aux: string };
    auxElementColors: { primary: string; secondary: string };
    backgroundColors: { primary: string; secondary: string };
  };
  
  onboarding: {
    fontFamily: string;
    splash1: { title: string; subtitle: string; image: string };
    splash2: { title: string; subtitle: string; image: string };
    splash3: { title: string; subtitle: string; image: string };
    textColors: { primary: string; secondary: string };
    backgroundColors: { primary: string; secondary: string };
  };
  
  support: {
    email?: string;
    phone?: string;
    website?: string;
    linkedinPage?: string;
    socialMedia?: {
      instagram?: string;
      linkedin?: string;
      twitter?: string;
      facebook?: string;
    };
    privacyPolicyLink?: string;
    termsLink?: string;
    components?: SupportComponent[];
  };
  
  policy: {
    policySection: { title: string; content: string };
    termsSection: { title: string; content: string };
  };
  
  isActive: boolean;
  updateVariance: string[];      // ['Splash', 'Profile', 'DNS', 'Terms']
  createdAt: string;
  updatedAt: string;
}
```

### Transaction
```typescript
interface Transaction {
  id: string;
  appId: string;
  amount: number;
  currency: string;
  type: 'credit' | 'debit';
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  description: string;
  createdAt: string;
  updatedAt: string;
}
```

### DriveDocument
```typescript
interface DriveDocument {
  id: string;
  appId: string;
  userId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string;
  uploadedAt: string;
  status: 'pending' | 'verified' | 'rejected';
  metadata?: Record<string, any>;
}
```

---

## Subdomain System

Each application gets a unique subdomain similar to Shopify's shop system.

### Subdomain Rules
- 3-63 characters
- Lowercase letters, numbers, hyphens only
- Must start/end with letter or number
- No consecutive hyphens
- Must be unique

### Auto-Generation
```
"My Awesome App" → my-awesome-app.springtd.com
"E-Commerce Store" → e-commerce-store.springtd.com
```

If subdomain exists, numeric suffix is added:
```
my-app → my-app-2 → my-app-3
```

---

## Configuration Management

### Version Workflow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CONFIGURATION VERSION FLOW                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   1. CREATE/UPDATE           2. REVIEW              3. PUBLISH      │
│   ┌─────────────────┐       ┌──────────────┐       ┌─────────────┐  │
│   │ Edit config     │  ──▶  │ Preview      │  ──▶  │ Publish     │  │
│   │ sections        │       │ changes      │       │ version     │  │
│   └─────────────────┘       └──────────────┘       └─────────────┘  │
│          │                                                │         │
│          │                                                ▼         │
│          │                                         ┌─────────────┐  │
│          ▼                                         │ Version     │  │
│   updateVariance: ["Splash", "Profile"]            │ archived    │  │
│                                                    └─────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Features
- **Multiple Versions:** Each app can have multiple configuration versions
- **Active Configuration:** Only one can be active at a time
- **Version References:** Auto-generated (e.g., "App_update_1aa344")
- **Update Tracking:** System tracks which sections were modified
- **Publishing:** Configs can be drafts or published
- **History:** Previous versions archived and viewable

---

## UI Mapping

### App Builder Tab → API Endpoint Mapping

| App Builder Tab | API Endpoint | Configuration Section |
|-----------------|--------------|----------------------|
| **Asset** | `PUT /configuration/app-elements` | `appElements.logo`, `appElements.splash` |
| **Splash** | `PUT /configuration/app-elements` | `appElements.buttons`, `appElements.header` |
| **Onboarding** | `PUT /configuration/onboarding` | `onboarding.splash1/2/3`, fonts, colors |
| **App Profile** | `PUT /configuration/app-profile` | `appProfile.textColors`, `elementColors`, etc. |
| **Policy/Terms** | `PUT /configuration/policy` | `policy.policySection`, `policy.termsSection` |
| **Support** | `PUT /configuration/support` | `support.email`, `phone`, `socialMedia` |
| **DNS Configuration** | `PUT /api/v1/apps/:id` | `subdomain` field on App model |
| **Publish** | `GET /configuration/publish`, `PUT /configuration/publishing` | `publishing.isPublished` |

---

## Frontend Integration Plan

### Phase 1: Update `lib/appService.ts`

Add configuration API methods:

```typescript
// Configuration APIs
export const appConfigurationApi = {
  getActiveConfiguration(appId: string): Promise<AppConfiguration>,
  getAllConfigurations(appId: string): Promise<AppConfiguration[]>,
  getPublishConfigurations(appId: string): Promise<{ unpublished: [], previous: [] }>,
  updateConfiguration(appId: string, config: Partial<AppConfiguration>): Promise<AppConfiguration>,
  createConfiguration(appId: string, config: any, options?: any): Promise<AppConfiguration>,
  activateConfiguration(appId: string, configId: string): Promise<AppConfiguration>,
  updatePublishingStatus(appId: string, isPublished: boolean): Promise<AppConfiguration>,
  
  // Section-specific
  updateAppElements(appId: string, data: any): Promise<AppConfiguration>,
  updateAppProfile(appId: string, data: any): Promise<AppConfiguration>,
  updateOnboarding(appId: string, data: any): Promise<AppConfiguration>,
  updateSupport(appId: string, data: any): Promise<AppConfiguration>,
  updatePolicy(appId: string, data: any): Promise<AppConfiguration>,
};

// Template APIs
export const appTemplateApi = {
  createTemplate(appId: string, data: any): Promise<Template>,
  getAllTemplates(appId: string): Promise<Template[]>,
  applyTemplate(appId: string, templateId: string): Promise<AppConfiguration>,
  updateTemplate(appId: string, templateId: string, data: any): Promise<Template>,
  deleteTemplate(appId: string, templateId: string): Promise<void>,
  setDefaultTemplate(appId: string, templateId: string): Promise<Template>,
};
```

### Phase 2: Connect App Builder Tabs

Each tab component should:
1. Fetch current configuration on mount
2. Update specific section via API on save
3. Show loading/error states
4. Trigger preview refresh

### Phase 3: Template Selection

Use templates API to:
1. Create templates from Mobile V1/V2 configurations
2. Allow users to select template on app creation
3. Apply template to new apps

---

## Environment Variables

```env
# Create App MS Configuration
NEXT_PUBLIC_CREATE_APP_SERVICE_URL=https://create-app-ms.fly.dev

# For Special Endpoints (if needed)
SPECIAL_API_KEY=your-special-api-key
PUBLIC_KEY=your-public-key
```

---

## Special Endpoints

Require `X-Special-Key` and `X-Public-Key` headers.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/special/apps` | GET | Get all apps with metadata |
| `/api/v1/special/apps/{id}` | GET | Get app by ID with metadata |
| `/api/v1/special/products` | GET | Get all products |
| `/api/v1/special/products/{id}` | GET | Get product by ID |
| `/api/v1/special/wallets/merchant/{id}/balance/{type}` | GET | Get merchant wallet balance |
| `/api/v1/special/wallets/merchant/{id}/history/{type}` | GET | Get merchant wallet history |
| `/api/v1/special/users` | POST | Create user with wallet |
| `/api/v1/special/users` | GET | Get all users |
| `/api/v1/special/users/{id}` | GET | Get user details |
| `/api/v1/special/wallets/user/{userId}` | GET | Get user wallet |
| `/api/v1/special/wallets/users/{merchantId}` | GET | Get all user wallets for merchant |
| `/api/v1/special/products/{id}/subscribers` | GET | Get product subscribers |
| `/api/v1/special/wallets/user/{userId}/withdraw` | POST | Withdraw from user wallet |
| `/api/v1/special/users/{userId}/documents` | POST | Submit user documents |
| `/api/v1/special/drive/users/{userId}` | GET | Get user drive documents |
| `/api/v1/special/drive/products/{productId}` | GET | Get product drive documents |
| `/api/v1/special/transactions/user/{userId}` | GET | Get user transactions |
| `/api/v1/special/transactions/product/{productId}` | GET | Get product transactions |
| `/api/v1/special/transactions/app/{appId}` | GET | Get app transactions |
| `/api/v1/special/subscriptions/users/{userId}/products/{productId}` | POST/GET | Subscribe/Get subscription |
| `/api/v1/special/applications/users/{userId}/products/{productId}` | POST | Apply to product |
| `/api/v1/special/applications/products/{productId}` | GET | Get product applications |
| `/api/v1/special/callbacks/users/{userId}` | POST | Register callback |

---

## Related Documentation

- [ACCOUNT_MS_INTEGRATION.md](./ACCOUNT_MS_INTEGRATION.md) - Account Management integration
- [API_INTEGRATION_STATUS.md](./API_INTEGRATION_STATUS.md) - Overall API status
- [lib/appService.ts](./lib/appService.ts) - Current frontend wrapper

---

## Summary

The Create App Microservice provides **complete backend support** for:

✅ App CRUD operations
✅ Subdomain management  
✅ App lifecycle (draft → submitted → approved)
✅ Wallet integration
✅ Transaction management
✅ Document management
✅ **App Configuration** (colors, fonts, text, images)
✅ **Onboarding customization**
✅ **Policy/Terms content**
✅ **Support configuration**
✅ **Publishing & versioning**
✅ **Configuration templates**

This means the App Builder can be **fully integrated with real APIs** instead of just frontend state!
