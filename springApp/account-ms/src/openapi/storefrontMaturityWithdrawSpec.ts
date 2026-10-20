/**
 * Spring storefront maturity withdrawal APIs — OpenAPI 3.0.
 * Gateway-proxied product-ms routes for savings / investment / commodity payout at maturity.
 */
const STOREFRONT_MATURITY_WITHDRAW_GUIDE = `
# Spring Storefront — Maturity Withdrawals

API reference for **paying out principal + interest** when a savings, investment, or commodity holding reaches the end of its holding period.

All paths are relative to the **account-ms gateway** (proxied to **product-ms**).

**Production gateway:** \`https://account-ms.fly.dev\`  
**Tenant example:** \`https://www.crbc.tryspring.io\`

---

## Flow

1. Holding period / moratorium has ended (\`maturityAt\` / product tenure).
2. Account is \`APPROVED\` with a positive balance and \`holdingStatus\` is not already \`WITHDRAWN\`.
3. Call the matching \`POST …/withdraw\` with \`{ "userId" }\`.
4. Backend:
   - Debits the **product creator TREASURY** on Plata (when the offering is upstream-linked / creator ≠ storefront merchant), then
   - Credits the storefront user’s **PRIMARY** wallet on Spring wallet-ms.
5. Local account snapshot is set to \`WITHDRAWN\` and balances zeroed.

Idempotent on \`referenceId\` (\`savings-withdrawal:{applicationId}\`, \`investment-withdrawal:{applicationId}\`, \`commodity-withdrawal:{applicationId}\`).

---

## Authentication

Send the retail access token from \`POST /api/v1/auth/login\`:

\`Authorization: Bearer <accessToken>\`

\`userId\` in the body must be the account owner (\`user.id\` from login).

---

## Money

Amounts in responses are **NGN naira** (major units): \`principal\`, \`interest\`, \`totalPayout\`.

---

## Common errors

| HTTP | Meaning |
|------|---------|
| \`403\` | Holding period not ended, or user does not own the account |
| \`402\` | Creator Treasury has insufficient balance |
| \`409\` | Already withdrawn, or no withdrawable balance |
| \`502\` | Plata Treasury debit or Spring wallet credit failed |
`.trim();

const applicationIdPathParam = {
  in: 'path' as const,
  name: 'applicationId',
  required: true,
  schema: { type: 'string', minLength: 1 },
  description: 'Product application / account id returned at enrollment or deposit'
};

const bearerSecurity = [{ bearerAuth: [] }];

const withdrawRequestSchema = {
  type: 'object',
  required: ['userId'],
  properties: {
    userId: {
      type: 'string',
      minLength: 1,
      description: 'Retail user id that owns the account (`user.id` from login)'
    },
    amount: {
      type: 'number',
      description:
        'Optional. Flexible/anytime SAVINGS only — partial withdrawal amount. Omit for full balance.'
    }
  }
};

const withdrawalDataSchema = {
  type: 'object',
  required: [
    'applicationId',
    'referenceId',
    'principal',
    'interest',
    'totalPayout',
    'currency',
    'withdrawnAt'
  ],
  properties: {
    applicationId: { type: 'string' },
    referenceId: { type: 'string', example: 'savings-withdrawal:66f0…' },
    principal: { type: 'number', description: 'Principal paid out (NGN)' },
    interest: { type: 'number', description: 'Interest paid out (NGN)' },
    totalPayout: { type: 'number', description: 'principal + interest (NGN)' },
    currency: { type: 'string', example: 'NGN' },
    withdrawnAt: { type: 'string', format: 'date-time' },
    productType: {
      type: 'string',
      enum: ['SAVINGS', 'INVESTMENT', 'COMMODITY'],
      description: 'Present on savings/investment responses'
    }
  }
};

const withdrawSuccessResponse = (message: string) => ({
  description: 'Withdrawal processed (or already processed — `duplicate: true`)',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        required: ['success', 'data'],
        properties: {
          success: { type: 'boolean', example: true },
          duplicate: { type: 'boolean', example: false },
          message: { type: 'string', example: message },
          data: { $ref: '#/components/schemas/MaturityWithdrawal' }
        }
      }
    }
  }
});

const errorEnvelope = {
  type: 'object',
  required: ['success', 'error'],
  properties: {
    success: { type: 'boolean', example: false },
    error: { type: 'string' }
  }
};

function withdrawOperation(args: {
  summary: string;
  description: string;
  tag: string;
  successMessage: string;
}) {
  return {
    summary: args.summary,
    description: args.description,
    tags: [args.tag],
    security: bearerSecurity,
    parameters: [applicationIdPathParam],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/MaturityWithdrawRequest' },
          example: { userId: 'user_abc123' }
        }
      }
    },
    responses: {
      '200': withdrawSuccessResponse(args.successMessage),
      '201': withdrawSuccessResponse(args.successMessage),
      '400': {
        description: 'Validation error or wrong product type',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } }
      },
      '401': { $ref: '#/components/responses/Unauthorized' },
      '402': {
        description: 'Insufficient creator Treasury balance',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } }
      },
      '403': {
        description: 'Not owner, or holding period has not ended',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } }
      },
      '404': {
        description: 'Account or product not found',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } }
      },
      '409': {
        description: 'Already withdrawn or no balance',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } }
      },
      '502': {
        description: 'Upstream wallet / Plata payout failed',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } }
      },
      '503': {
        description: 'Wallet settlement not configured',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } }
      }
    }
  };
}

const storefrontMaturityWithdrawSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Spring Storefront — Maturity Withdrawals',
    version: '1.0.0',
    description: STOREFRONT_MATURITY_WITHDRAW_GUIDE,
    contact: {
      name: 'Spring TD',
      url: 'https://account-ms.fly.dev/api-docs'
    }
  },
  servers: [
    { url: 'https://account-ms.fly.dev', description: 'Production gateway' },
    { url: 'https://www.crbc.tryspring.io', description: 'Tenant storefront (same-origin proxy)' },
    { url: 'http://localhost:4008', description: 'Local gateway' }
  ],
  tags: [
    {
      name: 'Savings withdrawal',
      description: 'Pay out matured savings principal + interest to the user PRIMARY wallet'
    },
    {
      name: 'Investment withdrawal',
      description: 'Pay out matured investment principal + interest to the user PRIMARY wallet'
    },
    {
      name: 'Commodity withdrawal',
      description: 'Pay out matured commodity principal + interest to the user PRIMARY wallet'
    }
  ],
  paths: {
    '/api/v1/savings-accounts/{applicationId}/withdraw': {
      post: withdrawOperation({
        summary: 'Withdraw savings (full or flex partial)',
        description:
          'Locked plans: full payout after holding period (principal + flat interest) into merchant approval. Flexible/anytime plans: optional `amount` for partial withdraw; daily interest is already in balance so no extra flat interest is added. Uses Plata creator Treasury approval queue.',
        tag: 'Savings withdrawal',
        successMessage: 'Savings withdrawal submitted for merchant approval.'
      })
    },
    '/api/v1/investment-accounts/{applicationId}/withdraw': {
      post: withdrawOperation({
        summary: 'Withdraw matured investment',
        description:
          'After the investment holding period ends, pays principal + flat interest. Credits the user’s PRIMARY wallet. Uses Plata creator Treasury when the product is upstream-linked.',
        tag: 'Investment withdrawal',
        successMessage: 'Investment principal and interest paid out successfully.'
      })
    },
    '/api/v1/commodity-accounts/{applicationId}/withdraw': {
      post: withdrawOperation({
        summary: 'Withdraw matured commodity',
        description:
          'After the commodity moratorium ends, pays principal + interest. Credits the user’s PRIMARY wallet. Uses Plata creator Treasury when the product is upstream-linked.',
        tag: 'Commodity withdrawal',
        successMessage: 'Commodity principal and interest paid out successfully.'
      })
    }
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Retail access token from `POST /api/v1/auth/login`'
      }
    },
    schemas: {
      MaturityWithdrawRequest: withdrawRequestSchema,
      MaturityWithdrawal: withdrawalDataSchema,
      ErrorEnvelope: errorEnvelope
    },
    responses: {
      Unauthorized: {
        description: 'Missing or invalid Bearer token',
        content: {
          'application/json': {
            schema: errorEnvelope
          }
        }
      }
    }
  }
};

export default storefrontMaturityWithdrawSpec;
