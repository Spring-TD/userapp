# Billing Microservice - Testing Guide

This document provides instructions on how to run tests for the billing microservice.

## Prerequisites

Make sure you have all dependencies installed:

```bash
npm install
```

## Running Tests

### Run All Tests

To run all tests:

```bash
npm test
```

### Run Tests in Watch Mode

To run tests in watch mode (useful during development):

```bash
npm run test:watch
```

### Run Specific Test Files

To run a specific test file:

```bash
npx jest src/__tests__/billingService.test.ts
```

### Run Tests with Coverage

To run tests with coverage report:

```bash
npx jest --coverage
```

## Test Structure

The tests are organized as follows:

- `src/__tests__/billingService.test.ts` - Unit tests for the BillingService class
- `src/__tests__/billingController.test.ts` - Unit tests for the BillingController class
- `src/__tests__/integration.test.ts` - Integration tests for the overall billing flow

## What's Tested

### BillingService
- Invoice creation, retrieval, updating, and deletion
- Payment processing and retrieval
- Subscription creation and management
- Wallet integration (balance checking, debiting)
- Insufficient funds handling
- Account suspension functionality

### RecurringBillingService
- Recurring billing creation
- Recurring billing management (cancel, pause, resume)
- Processing of due recurring billings

### BillingScheduler
- Singleton pattern implementation
- Scheduler start/stop functionality
- Manual triggering of billing processes

### BillingController
- All REST API endpoints for billing operations
- Error handling in controllers
- Request/response formatting

## Mocking

The tests use Jest's mocking capabilities to:
- Mock external HTTP calls to the wallet service
- Mock service methods for isolated unit testing
- Simulate various error conditions

## Environment Variables

For testing, the following environment variables are used:
- `WALLET_SERVICE_URL` - URL of the wallet microservice (defaults to http://localhost:3004)

## Continuous Integration

The test suite is designed to be run in CI/CD pipelines. All tests should pass before merging any changes.