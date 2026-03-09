# Account Management Microservice - Integration Guide

**Last Updated:** January 26, 2026

This document provides a comprehensive overview of the Account Management Microservice (`account-ms`) and how it integrates with the Spring App dashboard.

---

## Table of Contents

1. [Service Overview](#service-overview)
2. [Current Architecture](#current-architecture)
3. [Account-MS Capabilities](#account-ms-capabilities)
4. [API Gateway Functionality](#api-gateway-functionality)
5. [Account-Specific Services](#account-specific-services)
6. [UI Mapping](#ui-mapping)
7. [Integration Requirements](#integration-requirements)
8. [Implementation Plan](#implementation-plan)
9. [Integration Options](#integration-options)

---

## Service Overview

**Deployment URL:** https://account-ms.fly.dev

**Health Check:** https://account-ms.fly.dev/health

**Tech Stack:**
- Node.js with Express
- TypeScript
- MongoDB (via Mongoose)
- Jest for testing

**Core Features:**
- Create and manage user accounts
- Track account balances
- Handle account transactions
- Support multiple account types
- Process product applications
- Handle billing checks and account pricing calculations
- Act as API Gateway for all SpringTD microservices

---

## Current Architecture

The Spring App currently has **8 microservices** deployed on Fly.dev:

| Service | URL | Purpose |
|---------|-----|---------|
| `service-auth-ms` | https://service-auth-ms.fly.dev | Merchant/service account authentication |
| `client-auth-ms` | https://client-auth-ms.fly.dev | End-user authentication |
| `create-app-ms` | https://create-app-ms.fly.dev | App/application management |
| `product-ms` | https://product-ms.fly.dev | Product management (Loans, Savings, Mortgages, Commodities) |
| `wallet-ms` | https://wallet-ms.fly.dev | Wallet operations & transactions |
| `compliance-ms` | https://compliance-ms.fly.dev | KYC/compliance management |
| `payment-ms` | https://payment-ms.fly.dev | Payment processing |
| `billing-ms` | https://billing-ms.fly.dev | Billing, invoicing, subscriptions |

### Frontend Service Layer

| File | Purpose | Lines |
|------|---------|-------|
| `lib/api.ts` | Main auth API client | - |
| `lib/appService.ts` | create-app-ms wrapper | 538 |
| `lib/productService.ts` | product-ms wrapper | 1158 |
| `lib/walletService.ts` | wallet-ms wrapper | 600 |
| `lib/paymentService.ts` | payment-ms wrapper | 673 |
| `lib/kycService.ts` | compliance-ms wrapper | 135 |
| `lib/specialApiService.ts` | Special API operations | 660 |
| `lib/api/billing-client.ts` | billing-ms client | - |

---

## Account-MS Capabilities

The Account Management Microservice serves **two main purposes**:

### 1. API Gateway (Proxy Layer)

Acts as a unified entry point that routes requests to existing services:

```
Client Request → account-ms.fly.dev → Appropriate Microservice
```

### 2. Account-Specific Services

Provides new functionality for account and application management.

---

## API Gateway Functionality

The Account-MS proxies requests to the following microservices:

| Route Pattern | Proxies To | Target Service |
|--------------|------------|----------------|
| `/api/v1/products/*` | Product Service | product-ms |
| `/api/v1/configurations/*` | Product Service | product-ms |
| `/api/v1/compliance/*` | Compliance Service | compliance-ms |
| `/api/v1/wallets/*` | Wallet Service | wallet-ms |
| `/api/v1/billing/*` | Billing Service | billing-ms |
| `/api/v1/apps/*` | Create App Service | create-app-ms |
| `/api/v1/payments/*` | Payment Service | payment-ms |
| `/api/v1/auth/*` | Client Auth Service | client-auth-ms |
| `/api/v1/registration/*` | Client Auth Service | client-auth-ms |
| `/api/v1/otp/*` | Client Auth Service | client-auth-ms |
| `/api/v1/password/*` | Client Auth Service | client-auth-ms |
| `/api/v1/user/*` | Client Auth Service | client-auth-ms |
| `/verify-email/*` | Client Auth Service | client-auth-ms |

---

## Account-Specific Services

### Account Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/accounts` | Create a new account |
| `GET` | `/api/v1/accounts/:id` | Get account by ID |
| `GET` | `/api/v1/users/:userId/accounts` | Get accounts by user ID |
| `PATCH` | `/api/v1/accounts/:id/balance` | Update account balance |
| `DELETE` | `/api/v1/accounts/:id` | Delete an account |

### Application Processing

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `POST` | `/api/v1/applications/apply` | Apply for a product | User |
| `POST` | `/api/v1/applications/:id/approve` | Approve application | Admin |
| `POST` | `/api/v1/applications/:id/reject` | Reject application | Admin |
| `GET` | `/api/v1/applications/` | Get all applications | Admin |
| `GET` | `/api/v1/applications/pending` | Get pending applications | Admin |
| `GET` | `/api/v1/applications/user/:userId` | Get user applications | User |
| `GET` | `/api/v1/applications/:id` | Get application by ID | All |

### Loan Services

| Method | Endpoint | Description | Body Parameters |
|--------|----------|-------------|-----------------|
| `POST` | `/api/v1/loans/apply` | Apply for a loan | `{ product_id, merchant_id, user_id }` |
| `GET` | `/api/v1/loans/:id` | Get loan details (application) | - |
| `GET` | `/api/v1/loans/user/:userId` | Get all user's loans | - |

### Mortgage Services

| Method | Endpoint | Description | Body Parameters |
|--------|----------|-------------|-----------------|
| `POST` | `/api/v1/mortgages/apply` | Apply for a mortgage | `{ product_id, merchant_id, user_id }` |
| `GET` | `/api/v1/mortgages/:id` | Get mortgage details (application) | - |
| `GET` | `/api/v1/mortgages/user/:userId` | Get all user's mortgages | - |

### Savings Services

| Method | Endpoint | Description | Body Parameters |
|--------|----------|-------------|-----------------|
| `POST` | `/api/v1/savings-accounts` | Create a savings account | `{ product_id, user_id, initial_deposit... }` |

### Commodity Services

| Method | Endpoint | Description | Body Parameters |
|--------|----------|-------------|-----------------|
| `POST` | `/api/v1/commodities/buy` | Buy a commodity | `{ product_id, user_id, amount }` |
| `GET` | `/api/v1/commodities/:productId` | Get commodity details | - |

### Account Services (Billing & Pricing)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/users/:userId/billing-check` | Check billing status |
| `GET` | `/api/v1/users/:userId/app-ownership` | Get app ownership information |
| `POST` | `/api/v1/pricing/calculate` | Calculate account pricing based on product |
| `GET` | `/api/v1/pricing/product/:productId` | Get product pricing |

### Wallet APIs (via Gateway)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/wallets/merchant` | Create Merchant Wallet |
| `POST` | `/api/v1/wallets/user` | Create User Wallet |
| `GET` | `/api/v1/wallets/merchant/:merchantId/all` | Fetch Merchant wallet details (Treasury, Operation, KYC) |
| `GET` | `/api/v1/wallets/treasury/:merchantId/transactions` | Fetch Merchant wallet history |
| `GET` | `/api/v1/wallets/user/:userId` | Fetch user wallet details |
| `GET` | `/api/v1/wallets/user/:userId/transactions` | Fetch user wallet history |

### Authentication APIs (via Gateway)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/auth/login` | API Authentication (Login) |
| `POST` | `/api/v1/registration/merchant` | Create Merchant Account |
| `POST` | `/api/v1/registration/user` | Create Merchant Customer |

---

## UI Mapping

### Product Creation (Merchant Side) - Existing

| UI Component | Current Flow | With Account-MS |
|--------------|--------------|-----------------|
| `components/drawers/configure-loan-drawer.tsx` | Creates loan config in `product-ms` | Same - proxied through `account-ms` |
| `components/drawers/configure-savings-drawer.tsx` | Creates savings config in `product-ms` | Same - proxied through `account-ms` |
| `components/drawers/configure-mortgage-drawer.tsx` | Creates mortgage config in `product-ms` | Same - proxied through `account-ms` |
| `components/drawers/configure-commodity-drawer.tsx` | Creates commodity config in `product-ms` | Same - proxied through `account-ms` |

### User Application Flow (End-User Side) - NEW FEATURES

| Account-MS Feature | Required UI | Current Status |
|-------------------|-------------|----------------|
| Loan Application (`/api/v1/loans/apply`) | Loan application form for end-users | 🔴 Not built |
| Mortgage Application (`/api/v1/mortgages/apply`) | Mortgage application form | 🔴 Not built |
| Savings Account Creation (`/api/v1/savings-accounts`) | Open savings account form | 🔴 Not built |
| Commodity Purchase (`/api/v1/commodities/buy`) | Commodity purchase flow | 🔴 Not built |
| Application Tracking | User dashboard showing their applications | 🔴 Not built |
| Admin Application Management | Admin panel to approve/reject applications | 🔴 Not built |

### Wallet Integration - Existing

| Account-MS Endpoint | Current Implementation | Status |
|--------------------|------------------------|--------|
| `POST /api/v1/wallets/merchant` | `lib/walletService.ts` | ✅ Integrated |
| `POST /api/v1/wallets/user` | `lib/walletService.ts` | ✅ Integrated |
| `GET /api/v1/wallets/merchant/:merchantId/all` | Treasury/Operation wallet pages | ✅ Working |
| `GET /api/v1/wallets/user/:userId/transactions` | User transaction history | ✅ Working |

---

## Integration Requirements

### 1. Frontend Service Layer

Create `lib/accountService.ts`:

```typescript
// Account Management API wrapper

const ACCOUNT_API_BASE = process.env.NEXT_PUBLIC_ACCOUNT_SERVICE_URL || 'https://account-ms.fly.dev';

const getAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

// Types
export interface Account {
  id: string;
  userId: string;
  type: string;
  balance: number;
  currency: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

export interface LoanApplication {
  id: string;
  userId: string;
  productId: string;
  merchantId: string;
  status: 'pending' | 'approved' | 'rejected';
  amount?: number;
  term?: number;
  purpose?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MortgageApplication {
  id: string;
  userId: string;
  productId: string;
  merchantId: string;
  status: 'pending' | 'approved' | 'rejected';
  propertyValue?: number;
  downPayment?: number;
  term?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SavingsAccount {
  id: string;
  userId: string;
  productId: string;
  balance: number;
  interestRate?: number;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Account Management
export const accountApi = {
  async createAccount(data: {
    userId: string;
    type: string;
    currency?: string;
  }): Promise<ApiResponse<Account>> {
    const response = await fetch(`${ACCOUNT_API_BASE}/api/v1/accounts`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async getAccountById(id: string): Promise<ApiResponse<Account>> {
    const response = await fetch(`${ACCOUNT_API_BASE}/api/v1/accounts/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.json();
  },

  async getAccountsByUserId(userId: string): Promise<ApiResponse<Account[]>> {
    const response = await fetch(`${ACCOUNT_API_BASE}/api/v1/users/${userId}/accounts`, {
      headers: getAuthHeaders(),
    });
    return response.json();
  },

  async updateBalance(id: string, data: { amount: number; type: 'credit' | 'debit' }): Promise<ApiResponse<Account>> {
    const response = await fetch(`${ACCOUNT_API_BASE}/api/v1/accounts/${id}/balance`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async deleteAccount(id: string): Promise<ApiResponse<void>> {
    const response = await fetch(`${ACCOUNT_API_BASE}/api/v1/accounts/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return response.json();
  },
};

// Loan Applications
export const loanApi = {
  async apply(data: {
    product_id: string;
    merchant_id: string;
    user_id: string;
    amount?: number;
    term?: number;
    purpose?: string;
  }): Promise<ApiResponse<LoanApplication>> {
    const response = await fetch(`${ACCOUNT_API_BASE}/api/v1/loans/apply`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async getById(id: string): Promise<ApiResponse<LoanApplication>> {
    const response = await fetch(`${ACCOUNT_API_BASE}/api/v1/loans/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.json();
  },

  async getUserLoans(userId: string): Promise<ApiResponse<LoanApplication[]>> {
    const response = await fetch(`${ACCOUNT_API_BASE}/api/v1/loans/user/${userId}`, {
      headers: getAuthHeaders(),
    });
    return response.json();
  },
};

// Mortgage Applications
export const mortgageApi = {
  async apply(data: {
    product_id: string;
    merchant_id: string;
    user_id: string;
    propertyValue?: number;
    downPayment?: number;
    term?: number;
  }): Promise<ApiResponse<MortgageApplication>> {
    const response = await fetch(`${ACCOUNT_API_BASE}/api/v1/mortgages/apply`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async getById(id: string): Promise<ApiResponse<MortgageApplication>> {
    const response = await fetch(`${ACCOUNT_API_BASE}/api/v1/mortgages/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.json();
  },

  async getUserMortgages(userId: string): Promise<ApiResponse<MortgageApplication[]>> {
    const response = await fetch(`${ACCOUNT_API_BASE}/api/v1/mortgages/user/${userId}`, {
      headers: getAuthHeaders(),
    });
    return response.json();
  },
};

// Savings Accounts
export const savingsApi = {
  async create(data: {
    product_id: string;
    user_id: string;
    initial_deposit?: number;
  }): Promise<ApiResponse<SavingsAccount>> {
    const response = await fetch(`${ACCOUNT_API_BASE}/api/v1/savings-accounts`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return response.json();
  },
};

// Commodities
export const commodityApi = {
  async buy(data: {
    product_id: string;
    user_id: string;
    amount: number;
  }): Promise<ApiResponse<any>> {
    const response = await fetch(`${ACCOUNT_API_BASE}/api/v1/commodities/buy`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async getDetails(productId: string): Promise<ApiResponse<any>> {
    const response = await fetch(`${ACCOUNT_API_BASE}/api/v1/commodities/${productId}`, {
      headers: getAuthHeaders(),
    });
    return response.json();
  },
};

// Application Processing (Admin)
export const applicationApi = {
  async apply(data: any): Promise<ApiResponse<any>> {
    const response = await fetch(`${ACCOUNT_API_BASE}/api/v1/applications/apply`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async approve(id: string): Promise<ApiResponse<any>> {
    const response = await fetch(`${ACCOUNT_API_BASE}/api/v1/applications/${id}/approve`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return response.json();
  },

  async reject(id: string, reason?: string): Promise<ApiResponse<any>> {
    const response = await fetch(`${ACCOUNT_API_BASE}/api/v1/applications/${id}/reject`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason }),
    });
    return response.json();
  },

  async getAll(): Promise<ApiResponse<any[]>> {
    const response = await fetch(`${ACCOUNT_API_BASE}/api/v1/applications/`, {
      headers: getAuthHeaders(),
    });
    return response.json();
  },

  async getPending(): Promise<ApiResponse<any[]>> {
    const response = await fetch(`${ACCOUNT_API_BASE}/api/v1/applications/pending`, {
      headers: getAuthHeaders(),
    });
    return response.json();
  },

  async getByUser(userId: string): Promise<ApiResponse<any[]>> {
    const response = await fetch(`${ACCOUNT_API_BASE}/api/v1/applications/user/${userId}`, {
      headers: getAuthHeaders(),
    });
    return response.json();
  },

  async getById(id: string): Promise<ApiResponse<any>> {
    const response = await fetch(`${ACCOUNT_API_BASE}/api/v1/applications/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.json();
  },
};

// Pricing
export const pricingApi = {
  async calculate(data: { productId: string; userId?: string }): Promise<ApiResponse<any>> {
    const response = await fetch(`${ACCOUNT_API_BASE}/api/v1/pricing/calculate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async getProductPricing(productId: string): Promise<ApiResponse<any>> {
    const response = await fetch(`${ACCOUNT_API_BASE}/api/v1/pricing/product/${productId}`, {
      headers: getAuthHeaders(),
    });
    return response.json();
  },
};

// Billing
export const billingCheckApi = {
  async checkBillingStatus(userId: string): Promise<ApiResponse<any>> {
    const response = await fetch(`${ACCOUNT_API_BASE}/api/v1/users/${userId}/billing-check`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return response.json();
  },

  async getAppOwnership(userId: string): Promise<ApiResponse<any>> {
    const response = await fetch(`${ACCOUNT_API_BASE}/api/v1/users/${userId}/app-ownership`, {
      headers: getAuthHeaders(),
    });
    return response.json();
  },
};

// Export all APIs
export const accountService = {
  accounts: accountApi,
  loans: loanApi,
  mortgages: mortgageApi,
  savings: savingsApi,
  commodities: commodityApi,
  applications: applicationApi,
  pricing: pricingApi,
  billing: billingCheckApi,
};

export default accountService;
```

### 2. UI Components Needed

| Component | Purpose | Location |
|-----------|---------|----------|
| `LoanApplicationDrawer` | End-user applies for a loan | `components/drawers/` |
| `MortgageApplicationDrawer` | End-user applies for a mortgage | `components/drawers/` |
| `OpenSavingsAccountDrawer` | End-user opens savings account | `components/drawers/` |
| `BuyCommodityDrawer` | End-user purchases commodity | `components/drawers/` |
| `ApplicationsListTable` | Admin views all applications | `components/` |
| `ApplicationDetailModal` | View/approve/reject application | `components/` |
| `UserAccountsDashboard` | User sees their accounts | `app/dashboard/` |
| `UserApplicationsPage` | User tracks their applications | `app/dashboard/` |

### 3. Page Routes Needed

| Route | Purpose |
|-------|---------|
| `/dashboard/merchant/applications` | Merchant views customer applications |
| `/dashboard/merchant/applications/pending` | Pending applications queue |
| `/dashboard/user/accounts` | End-user sees their accounts |
| `/dashboard/user/applications` | End-user tracks their applications |
| `/dashboard/user/apply/loan` | Apply for a loan |
| `/dashboard/user/apply/mortgage` | Apply for a mortgage |
| `/dashboard/user/apply/savings` | Open savings account |
| `/dashboard/user/apply/commodity` | Buy commodity |

### 4. Environment Variables

Add to `.env.local`:

```env
NEXT_PUBLIC_ACCOUNT_SERVICE_URL=https://account-ms.fly.dev
```

---

## Implementation Plan

### Phase 1: Foundation

1. ✅ Create `lib/accountService.ts` - API wrapper
2. ✅ Update `.env.local` with Account-MS URL
3. ✅ Update `API_INTEGRATION_STATUS.md`

### Phase 2: User Application Flow

1. Create `LoanApplicationDrawer` component
2. Create `MortgageApplicationDrawer` component
3. Create `OpenSavingsAccountDrawer` component
4. Create `BuyCommodityDrawer` component
5. Create user applications tracking page

### Phase 3: Admin Application Management

1. Create `ApplicationsListTable` component
2. Create `ApplicationDetailModal` component
3. Create `/dashboard/merchant/applications` page
4. Create `/dashboard/merchant/applications/pending` page
5. Implement approve/reject functionality

### Phase 4: Account Dashboard

1. Create user accounts overview page
2. Create account detail view
3. Integrate with existing wallet views

---

## Integration Options

### Option A: Use Account-MS as API Gateway

Change all frontend API calls to point to `https://account-ms.fly.dev` instead of individual services.

**Environment Update:**
```env
NEXT_PUBLIC_API_URL=https://account-ms.fly.dev
# Remove individual service URLs
```

**Pros:**
- Single endpoint for all APIs
- Simplified frontend configuration
- Built-in routing logic

**Cons:**
- Additional network hop
- Single point of failure
- Need to ensure gateway stays in sync with services

### Option B: Direct Integration + New Features Only (Recommended)

Keep current direct service calls and only use `account-ms` for new features.

**Environment Update:**
```env
# Keep existing service URLs
NEXT_PUBLIC_AUTH_SERVICE_URL=https://service-auth-ms.fly.dev
NEXT_PUBLIC_WALLET_SERVICE_URL=https://wallet-ms.fly.dev
NEXT_PUBLIC_PRODUCT_SERVICE_URL=https://product-ms.fly.dev
# ... etc

# Add account service for new features
NEXT_PUBLIC_ACCOUNT_SERVICE_URL=https://account-ms.fly.dev
```

**Pros:**
- Minimal changes to existing code
- Only add what's new
- Current integrations remain stable

**Cons:**
- Multiple API base URLs to manage
- Need to add new service file

---

## Testing

### Health Check
```bash
curl https://account-ms.fly.dev/health
```

### Test Loan Application
```bash
curl -X POST https://account-ms.fly.dev/api/v1/loans/apply \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "product_id": "product-123",
    "merchant_id": "merchant-456",
    "user_id": "user-789"
  }'
```

### Test Get User Loans
```bash
curl https://account-ms.fly.dev/api/v1/loans/user/user-789 \
  -H "Authorization: Bearer <token>"
```

---

## Related Documentation

- [API_INTEGRATION_STATUS.md](./API_INTEGRATION_STATUS.md) - Overall API integration status
- [PRODUCT_FLOW_IMPLEMENTATION.md](./PRODUCT_FLOW_IMPLEMENTATION.md) - Product flow details
- [server/wallet-ms/README.md](./server/wallet-ms/README.md) - Wallet service documentation
- [server/create-app-ms/README.md](./server/create-app-ms/README.md) - Create app service documentation
