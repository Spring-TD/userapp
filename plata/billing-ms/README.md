# Billing Microservice

This microservice handles billing, invoicing, and payment processing for the SpringTD platform.

Deployment URL: https://billing-ms.fly.dev/

## Features

- Invoice generation and management
- Payment processing
- Subscription management
- Transaction history
- Billing analytics
- Account suspension for insufficient funds
- Billing page redirection
- Automated recurring billing processing
- One-time billing processing
- Transfer, withdrawal, and payout operations with automatic one-time billing creation
- Pricing schedule management with cron-based execution
- Advanced pricing conditions and controls for admins
- Event-driven billing triggers

## API Endpoints

### Invoices
- `POST /api/v1/billing/invoices` - Create a new invoice
- `GET /api/v1/billing/invoices/:id` - Get a specific invoice
- `GET /api/v1/billing/invoices` - List all invoices
- `PUT /api/v1/billing/invoices/:id` - Update an invoice
- `DELETE /api/v1/billing/invoices/:id` - Delete an invoice

### Payments
- `POST /api/v1/billing/payments` - Process a payment
- `GET /api/v1/billing/payments/:id` - Get a specific payment
- `GET /api/v1/billing/payments` - List all payments

### Subscriptions
- `POST /api/v1/billing/subscriptions` - Create a new subscription
- `GET /api/v1/billing/subscriptions/:id` - Get a specific subscription
- `GET /api/v1/billing/subscriptions` - List all subscriptions
- `PUT /api/v1/billing/subscriptions/:id` - Update a subscription

### Transactions
- `GET /api/v1/billing/transactions/:id` - Get a specific transaction
- `GET /api/v1/billing/transactions` - List all transactions

### Account Management
- `POST /api/v1/billing/check-billing-status` - Check billing status and handle insufficient funds
- `GET /api/v1/billing/billing-page/:userId` - Get billing page information for a user

### Recurring Billing
- `POST /api/v1/billing/recurring-billing/trigger` - Manually trigger recurring billing process
- `GET /api/v1/billing/recurring-billing/status` - Get recurring billing scheduler status

### Recurring Billings (New Data Structure)
- `POST /api/v1/billing/recurring-billings` - Create a new recurring billing
- `GET /api/v1/billing/recurring-billings/:id` - Get a specific recurring billing
- `GET /api/v1/billing/recurring-billings` - List all recurring billings
- `PUT /api/v1/billing/recurring-billings/:id` - Update a recurring billing
- `POST /api/v1/billing/recurring-billings/:id/cancel` - Cancel a recurring billing
- `POST /api/v1/billing/recurring-billings/:id/pause` - Pause a recurring billing
- `POST /api/v1/billing/recurring-billings/:id/resume` - Resume a recurring billing

### One-Time Billings
- `POST /api/v1/billing/one-time-billings` - Create a new one-time billing
- `GET /api/v1/billing/one-time-billings/:id` - Get a specific one-time billing
- `GET /api/v1/billing/one-time-billings` - List all one-time billings
- `POST /api/v1/billing/one-time-billings/:id/process-payment` - Process payment for a one-time billing

### Transfer, Withdrawal, and Payout Operations
- `POST /api/v1/billing/transfers` - Process a transfer operation and create a one-time billing
- `POST /api/v1/billing/withdrawals` - Process a withdrawal operation and create a one-time billing
- `POST /api/v1/billing/payouts` - Process a payout operation and create a one-time billing

### Pricing Schedules
- `POST /api/v1/billing/pricing/schedules` - Create a new pricing schedule with conditions
- `GET /api/v1/billing/pricing/schedules/:id` - Get a specific pricing schedule
- `GET /api/v1/billing/pricing/schedules` - List all pricing schedules
- `PUT /api/v1/billing/pricing/schedules/:id` - Update a pricing schedule
- `POST /api/v1/billing/pricing/schedules/:id/cancel` - Cancel a pricing schedule
- `POST /api/v1/billing/pricing/schedules/:id/pause` - Pause a pricing schedule
- `POST /api/v1/billing/pricing/schedules/:id/resume` - Resume a pricing schedule
- `POST /api/v1/billing/pricing/schedules/trigger` - Manually trigger the pricing schedule process

### Event Triggers
- `POST /api/v1/billing/triggers/product-created` - Handle product created event
- `POST /api/v1/billing/triggers/wallet-funded` - Handle wallet funding event
- `POST /api/v1/billing/triggers/merchant-users-count` - Handle merchant users count event

## Pricing Schedule Structure

When creating or updating pricing schedules, admins can configure the following fields:

- `amount` - A numeric value representing the billing amount
- `type` - String literal "recurring"
- `billingCycle` - Configurable interval in days (e.g., 30 for monthly billing)
- `billingTarget` - A numeric target amount - the billing process automatically stops when this target is reached
- `billingCount` - Starting at 1 and incrementing with each billing occurrence
- `billToType` - Specify whether billing applies to "merchants" or "users"
- `billToIds` - Array of specific merchant/user IDs to bill
- `billingFor` - A description field explaining what the billing is for
- `billingTitle` - A name/title for this billing entry
- `billingException` - Exception handling configuration:
  - `exceptionType` - "Counts" (track exception occurrences)
  - `action` - "Suspend" (suspend user/merchant when threshold is met)
  - `maxExceptionCount` - Maximum exception count before taking action
  - `currentExceptionCount` - Current exception count (system-managed)
- `trigger` - Event trigger configuration:
  - `type` - One of "perProduct", "walletFunding", "merchantUsersCount", or "generic"
  - Additional trigger-specific configuration

## Trigger Types

### Generic Trigger
A generic pricing schedule that has no ties to any specific events. This can be created for merchants or users and will follow the regular cron-based billing schedule.

Configuration:
```json
{
  "type": "generic"
}
```

### Per Product Trigger
Activates when new products are created in the system and applies the associated pricing/billing conditions to each newly created product.

Configuration:
```json
{
  "type": "perProduct"
}
```

### Wallet Funding Trigger
Activates each time a user or merchant wallet receives funding and applies to all wallet funding transactions regardless of funding method.

Configuration:
```json
{
  "type": "walletFunding",
  "walletTypes": ["user", "merchant"], // Optional: specify wallet types
  "minimumAmount": 100 // Optional: minimum funding amount to trigger
}
```

### Merchant Users Count Trigger
Activates based on the number of users onboarded to a merchant account and applies pricing/billing conditions for each onboarded user.

Configuration:
```json
{
  "type": "merchantUsersCount",
  "userCountThreshold": 10, // Number of users that triggers billing
  "triggerPerUser": false // Whether to trigger for each user or only when threshold is reached
}
```

## Installation

```bash
npm install
```

## Running the service

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

## Environment Variables

- `PORT` - Port to run the service on (default: 3006)
- `SERVICE_AUTH_URL` - URL for the service authentication microservice
- `WALLET_SERVICE_URL` - URL for the wallet microservice (default: http://localhost:3004)
- `DATABASE_URL` - Connection string for the database
- `JWT_SECRET` - Secret key for JWT token signing
- `RECURRING_BILLING_INTERVAL` - Interval for recurring billing processing in milliseconds (default: 3600000 - 1 hour)
- `PRICING_INTERVAL` - Interval for pricing schedule processing in milliseconds (default: 3600000 - 1 hour)