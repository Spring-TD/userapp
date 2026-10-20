import {
  appIdQuery,
  getOp,
  mutOp
} from './frontendPlataCommon';
import { schemaRef } from './frontendPlataSchemas';

const settlementTypeParam = {
  in: 'path' as const,
  name: 'settlementType',
  required: true,
  schema: schemaRef('SettlementType')
};

export const treasuryPaths: Record<string, unknown> = {
  '/api/v1/frontend-plata/treasury/overview': getOp({
    tags: ['Treasury — Overview'],
    summary: 'Treasury console overview',
    description: 'Treasury, Billing, Repayment balances + pending payout total for the app.',
    parameters: [appIdQuery],
    dataSchema: schemaRef('TreasuryOverview')
  }),

  '/api/v1/frontend-plata/treasury/wallets/{walletType}/transactions': getOp({
    tags: ['Treasury — Wallets'],
    summary: 'Wallet transaction ledger',
    parameters: [
      {
        in: 'path',
        name: 'walletType',
        required: true,
        schema: { type: 'string', enum: ['treasury', 'billing', 'repayment'] }
      },
      appIdQuery,
      { in: 'query', name: 'startDate', schema: { type: 'string', format: 'date' } },
      { in: 'query', name: 'endDate', schema: { type: 'string', format: 'date' } },
      { in: 'query', name: 'type', schema: { type: 'string', enum: ['CREDIT', 'DEBIT'] } },
      { in: 'query', name: 'limit', schema: { type: 'integer', default: 20 } },
      { in: 'query', name: 'skip', schema: { type: 'integer', default: 0 } }
    ],
    dataSchema: schemaRef('WalletLedgerListData')
  }),

  '/api/v1/frontend-plata/treasury/wallets/{walletType}/funding-instructions': getOp({
    tags: ['Treasury — Wallets'],
    summary: 'NUBAN funding instructions',
    description: 'Bank-transfer instructions for Treasury or Billing. Repayment is not fundable here.',
    parameters: [
      {
        in: 'path',
        name: 'walletType',
        required: true,
        schema: { type: 'string', enum: ['treasury', 'billing'] }
      },
      appIdQuery,
      {
        in: 'query',
        name: 'amount',
        required: true,
        schema: { type: 'number', minimum: 0.01 },
        description: 'Target amount in NGN naira'
      }
    ],
    dataSchema: schemaRef('FundingInstructions')
  }),

  '/api/v1/frontend-plata/treasury/withdrawals': getOp({
    tags: ['Treasury — Withdrawals'],
    summary: 'List pending withdrawals',
    description:
      'Pending savings / storefront maturity withdrawal requests. Creating a pending debit notifies the merchant owner (`treasury-withdrawal-pending-merchant`).',
    parameters: [
      appIdQuery,
      { in: 'query', name: 'limit', schema: { type: 'integer', default: 50 } }
    ],
    dataSchema: schemaRef('PendingPayoutListData')
  }),

  '/api/v1/frontend-plata/treasury/withdrawals/history': getOp({
    tags: ['Treasury — Withdrawals'],
    summary: 'List approved / rejected withdrawals',
    description:
      'History of withdrawal requests after merchant decision. `status=approved` (COMPLETED) or `rejected` (FAILED); omit or `all` for both. Sorted by decision time (`decidedAt`) desc.',
    parameters: [
      appIdQuery,
      {
        in: 'query',
        name: 'status',
        schema: { type: 'string', enum: ['approved', 'rejected', 'all'], default: 'all' }
      },
      { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 } },
      { in: 'query', name: 'skip', schema: { type: 'integer', minimum: 0, default: 0 } }
    ],
    dataSchema: schemaRef('TreasuryPayoutHistoryListData')
  }),

  '/api/v1/frontend-plata/treasury/withdrawals/approve': mutOp('post', {
    tags: ['Treasury — Withdrawals'],
    summary: 'Approve Selected withdrawals',
    description:
      'Debits Treasury. Storefront maturity rows (`metadata.springStorefrontPayout`) credit the Spring user wallet via callback; classic savings rows credit Plata user wallets.',
    body: schemaRef('ApproveBatchBody'),
    example: { appId: '69efccf9a6f701fa458935e0', references: ['commodity-withdrawal:…'] },
    dataSchema: schemaRef('ApproveBatchResult')
  }),

  '/api/v1/frontend-plata/treasury/withdrawals/reject': mutOp('post', {
    tags: ['Treasury — Withdrawals'],
    summary: 'Reject withdrawals',
    description:
      'Marks pending rows FAILED. Storefront maturity requests notify the user that the withdrawal was rejected and restore holding status.',
    body: schemaRef('RejectBatchBody'),
    example: {
      appId: '69efccf9a6f701fa458935e0',
      references: ['savings-withdrawal:…'],
      reason: 'Insufficient documentation'
    },
    dataSchema: schemaRef('ApproveBatchResult')
  }),

  '/api/v1/frontend-plata/treasury/settlements/{settlementType}': getOp({
    tags: ['Treasury — Settlements'],
    summary: 'List pending matured settlements',
    description: 'Matured commodities / investments / savings queues (Approve Returns).',
    parameters: [
      settlementTypeParam,
      appIdQuery,
      { in: 'query', name: 'limit', schema: { type: 'integer', default: 50 } }
    ],
    dataSchema: schemaRef('PendingPayoutListData')
  }),

  '/api/v1/frontend-plata/treasury/settlements/{settlementType}/history': getOp({
    tags: ['Treasury — Settlements'],
    summary: 'List approved / rejected matured settlements',
    description:
      'History for Matured Investments / Commodities / Savings after Approve or Reject Returns. Filter with `status=approved|rejected|all`.',
    parameters: [
      settlementTypeParam,
      appIdQuery,
      {
        in: 'query',
        name: 'status',
        schema: { type: 'string', enum: ['approved', 'rejected', 'all'], default: 'all' }
      },
      { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 } },
      { in: 'query', name: 'skip', schema: { type: 'integer', minimum: 0, default: 0 } }
    ],
    dataSchema: schemaRef('TreasuryPayoutHistoryListData')
  }),

  '/api/v1/frontend-plata/treasury/settlements/{settlementType}/mode': {
    get: {
      tags: ['Treasury — Settlements'],
      summary: 'Get settlement mode',
      security: [{ bearerAuth: [] }],
      parameters: [settlementTypeParam, appIdQuery],
      responses: {
        '200': {
          description: 'Current mode',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  schemaRef('SuccessEnvelope'),
                  { properties: { data: schemaRef('SettlementMode') } }
                ]
              }
            }
          }
        }
      }
    },
    put: {
      tags: ['Treasury — Settlements'],
      summary: 'Set settlement mode',
      description: '`automatic` immediately approves all pending; blocked rows revert mode to `manual`.',
      security: [{ bearerAuth: [] }],
      parameters: [settlementTypeParam],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['appId', 'mode'],
              properties: {
                appId: { type: 'string' },
                mode: { type: 'string', enum: ['manual', 'automatic'] }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Updated',
          content: { 'application/json': { schema: schemaRef('SuccessEnvelope') } }
        }
      }
    }
  },

  '/api/v1/frontend-plata/treasury/settlements/{settlementType}/approve': mutOp('post', {
    tags: ['Treasury — Settlements'],
    summary: 'Approve Returns (batch)',
    description:
      'Same money movement rules as withdrawal approve; used for Matured Commodities / Investments / Savings.',
    parameters: [settlementTypeParam],
    body: schemaRef('ApproveBatchBody'),
    dataSchema: schemaRef('ApproveBatchResult')
  }),

  '/api/v1/frontend-plata/treasury/settlements/{settlementType}/reject': mutOp('post', {
    tags: ['Treasury — Settlements'],
    summary: 'Reject matured settlements',
    parameters: [settlementTypeParam],
    body: schemaRef('RejectBatchBody'),
    dataSchema: schemaRef('ApproveBatchResult')
  }),

  '/api/v1/wallets/repayment/payout': mutOp('post', {
    tags: ['Wallets — Payout'],
    summary: 'Repayment wallet bank payout',
    description: 'PayOnUs bank transfer from app Repayment NUBAN (merchant JWT).',
    body: schemaRef('RepaymentPayoutRequest')
  }),

  '/api/v1/wallets/merchant/{merchantId}/all': getOp({
    tags: ['Wallets — Merchant'],
    summary: 'List all merchant wallets',
    description: 'App-scoped — `appId` is required.',
    parameters: [
      { in: 'path', name: 'merchantId', required: true, schema: { type: 'string' } },
      appIdQuery
    ],
    dataSchema: { type: 'array', items: schemaRef('MerchantWallet') }
  }),

  '/api/v1/wallets/merchant/{merchantId}/type/{walletType}': getOp({
    tags: ['Wallets — Merchant'],
    summary: 'Get merchant wallet by type',
    description: 'App-scoped — `appId` is required.',
    parameters: [
      { in: 'path', name: 'merchantId', required: true, schema: { type: 'string' } },
      {
        in: 'path',
        name: 'walletType',
        required: true,
        schema: {
          type: 'string',
          enum: ['BILLING', 'TREASURY', 'REPAYMENT', 'OPERATION', 'SETTLEMENT', 'KYC']
        }
      },
      appIdQuery
    ],
    dataSchema: schemaRef('MerchantWallet')
  }),

  '/api/v1/apps/{id}/transactions': getOp({
    tags: ['Apps'],
    summary: 'App transaction history',
    description:
      'Dashboard transaction list for an app (JWT). Response: `data` array + sibling `pagination` (see `AppTransactionListResponse`).',
    parameters: [
      { in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: 'App id' },
      { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
      { in: 'query', name: 'limit', schema: { type: 'integer', default: 20 } }
    ],
    responseSchema: schemaRef('AppTransactionListResponse')
  }),

  '/api/v1/apps/{id}/wallets': getOp({
    tags: ['Apps'],
    summary: 'App Billing / Treasury / Repayment wallets',
    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
    dataSchema: { type: 'array', items: schemaRef('MerchantWallet') }
  })
};
