import { appIdQuery, getOp, mutOp, optionalAppIdQuery, paginationQuery } from './frontendPlataCommon';
import { schemaRef } from './frontendPlataSchemas';

const productTypeEnum = schemaRef('ProductType');

export const appsProductsPaths: Record<string, unknown> = {
  '/api/v1/apps': {
    ...getOp({
      tags: ['Apps'],
      summary: 'List apps',
      description:
        'Merchant apps. Response: `data` = App[], `pagination` sibling (`PaginationMeta`).',
      parameters: paginationQuery,
      responseSchema: schemaRef('AppListResponse')
    }),
    ...mutOp('post', {
      tags: ['Apps'],
      summary: 'Create app',
      description: 'Creates app + provisions Billing / Treasury / Repayment wallets.',
      body: schemaRef('CreateAppRequest'),
      dataSchema: schemaRef('App')
    })
  },

  '/api/v1/apps/{id}': {
    ...getOp({
      tags: ['Apps'],
      summary: 'Get app',
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      dataSchema: schemaRef('App')
    }),
    ...mutOp('put', {
      tags: ['Apps'],
      summary: 'Update app',
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      body: schemaRef('UpdateAppRequest'),
      dataSchema: schemaRef('App')
    }),
    ...mutOp('delete', {
      tags: ['Apps'],
      summary: 'Delete app',
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }]
    })
  },

  '/api/v1/apps/merchant/{merchantId}': getOp({
    tags: ['Apps'],
    summary: 'List apps by merchant id',
    parameters: [{ in: 'path', name: 'merchantId', required: true, schema: { type: 'string' } }]
  }),

  '/api/v1/apps/{id}/status': mutOp('patch', {
    tags: ['Apps'],
    summary: 'Set app status',
    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
    body: {
      type: 'object',
      required: ['status'],
      properties: { status: { type: 'string', enum: ['active', 'suspended'] } }
    }
  }),

  '/api/v1/apps/{id}/analytics': getOp({
    tags: ['Apps'],
    summary: 'App analytics facade',
    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }]
  }),

  '/api/v1/apps/{id}/transaction-stats': getOp({
    tags: ['Apps'],
    summary: 'App transaction stats',
    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }]
  }),

  '/api/v1/products': {
    ...getOp({
      tags: ['Products — Catalog'],
      summary: 'List products (dashboard)',
      description:
        'JWT + `appId` → merchant product table. Response: `data.items` + `data.pagination` (see `ProductListData`). Unscoped GET without appId is the API-key catalog (see `/docs`).',
      parameters: [
        appIdQuery,
        { in: 'query', name: 'type', schema: productTypeEnum },
        { in: 'query', name: 'status', schema: { type: 'string' } },
        { in: 'query', name: 'search', schema: { type: 'string' } },
        { in: 'query', name: 'isActive', schema: { type: 'boolean' } },
        { in: 'query', name: 'configured', schema: { type: 'boolean' } },
        ...paginationQuery,
        {
          in: 'query',
          name: 'sortBy',
          schema: { type: 'string', enum: ['createdAt', 'updatedAt', 'name', 'type', 'status'] }
        },
        { in: 'query', name: 'sortOrder', schema: { type: 'string', enum: ['asc', 'desc'] } }
      ],
      dataSchema: schemaRef('ProductListData')
    }),
    ...mutOp('post', {
      tags: ['Products — Builder'],
      summary: 'Create product (full)',
      description: 'Optional one-shot create with tabs. Prefer wizard (`select-type` → `create-after-type` → `PUT /:id`).',
      body: {
        type: 'object',
        required: ['name', 'type', 'appId'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          type: productTypeEnum,
          appId: { type: 'string' },
          structure: { type: 'object', additionalProperties: true },
          about: { type: 'object', additionalProperties: true },
          feesAndCharges: { type: 'object', additionalProperties: true },
          requirements: { type: 'object', additionalProperties: true },
          commodityPrices: { type: 'array', items: schemaRef('CommodityPriceEntry') }
        }
      },
      dataSchema: schemaRef('Product')
    })
  },

  '/api/v1/products/overview': getOp({
    tags: ['Products — Catalog'],
    summary: 'Products overview summary',
    parameters: [appIdQuery]
  }),

  '/api/v1/products/types': getOp({
    tags: ['Products — Builder'],
    summary: 'Product types'
  }),

  '/api/v1/products/types/{type}/subtypes': getOp({
    tags: ['Products — Builder'],
    summary: 'Subtypes for a product type',
    parameters: [{ in: 'path', name: 'type', required: true, schema: productTypeEnum }]
  }),

  '/api/v1/products/select-type': mutOp('post', {
    tags: ['Products — Builder'],
    summary: 'Wizard step 1 — select type',
    body: {
      type: 'object',
      required: ['appId', 'type'],
      properties: { appId: { type: 'string' }, type: productTypeEnum }
    }
  }),

  '/api/v1/products/create-after-type': mutOp('post', {
    tags: ['Products — Builder'],
    summary: 'Wizard step 2 — name shell',
    body: {
      type: 'object',
      required: ['productId', 'name'],
      properties: {
        productId: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' }
      }
    }
  }),

  '/api/v1/products/{id}': {
    ...getOp({
      tags: ['Products — Catalog'],
      summary: 'Get product by id',
      description: 'Full product config. Note: `merchant` may be omitted on by-id; list/catalog enrich merchant.',
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      dataSchema: schemaRef('Product')
    }),
    ...mutOp('put', {
      tags: ['Products — Builder'],
      summary: 'Configure product tabs',
      description:
        'Deep-merge `structure`/`about`/`requirements`/`feesAndCharges`. Arrays (`commodityPrices`, fees) replace when sent. See product-ms docs/frontend-product-configuration.md.',
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      body: { type: 'object', additionalProperties: true },
      dataSchema: schemaRef('Product')
    }),
    ...mutOp('delete', {
      tags: ['Products — Builder'],
      summary: 'Archive / delete product',
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }]
    })
  },

  '/api/v1/products/{id}/manage': mutOp('put', {
    tags: ['Products — Builder'],
    summary: 'Manage live product',
    description: 'Same body as update; **403** unless `status === complete`.',
    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
    body: { type: 'object', additionalProperties: true }
  }),

  '/api/v1/products/{id}/action': getOp({
    tags: ['Products — Builder'],
    summary: 'Can manage? actionability check',
    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }]
  }),

  '/api/v1/products/app/{appId}': getOp({
    tags: ['Products — Catalog'],
    summary: 'Products by app',
    parameters: [
      { in: 'path', name: 'appId', required: true, schema: { type: 'string' } },
      ...paginationQuery
    ]
  }),

  '/api/v1/products/app/{appId}/product-overview': getOp({
    tags: ['Products — Catalog'],
    summary: 'App product overview cards',
    description:
      'Headline KPIs + per-type category cards (`data.headline`, `data.byCategory`). For filterable account tables (open vs withdrawn savings/invest/commodity), use `…/product-overview/by-type/{productType}`.',
    parameters: [{ in: 'path', name: 'appId', required: true, schema: { type: 'string' } }],
    dataSchema: schemaRef('ProductOverviewData')
  }),

  '/api/v1/products/app/{appId}/product-overview/by-type/{productType}': getOp({
    tags: ['Products — Catalog'],
    summary: 'Overview + account tables by product type',
    description: `
Merchant portfolio drill-down for one discriminator.

**Account tables (filter with \`portfolioStatus\`):**
| \`productType\` | Array on \`data\` | Open / approved | Withdrawn / closed |
|----------------|------------------|-----------------|--------------------|
| \`SAVINGS\` | \`savingsAccounts\` | \`status: active\` | \`status: inactive\` (\`cancelled\` / \`withdrawn\` apps) |
| \`INVESTMENT\` | \`investmentAccounts\` | \`active\` | \`inactive\` (matured / closed / withdrawn) |
| \`COMMODITY\` | \`commodityAccounts\` | \`active\` | \`inactive\` |
| \`LOAN\` / \`MORTGAGE\` | \`loanAccounts\` / \`mortgageAccounts\` | \`active\` | \`inactive\` (+ \`non_performing\`, \`bad\`) |

Examples:
- Open savings: \`?portfolioStatus=active\`
- Withdrawn/closed savings: \`?portfolioStatus=inactive\`
- All rows: omit or \`portfolioStatus=all\` (default)

Pagination for the account array: \`limit\` + \`skip\` → \`data.portfolioAccountsMeta\` (\`total\`, \`hasMore\`).
KPI buckets (counts, pending withdrawals, recent activity) remain on \`*Portfolio\` objects and are not re-filtered the same way as the account table.
`.trim(),
    parameters: [
      { in: 'path', name: 'appId', required: true, schema: { type: 'string' } },
      {
        in: 'path',
        name: 'productType',
        required: true,
        schema: productTypeEnum,
        description: 'LOAN | MORTGAGE | SAVINGS | INVESTMENT | COMMODITY'
      },
      {
        in: 'query',
        name: 'portfolioStatus',
        schema: schemaRef('PortfolioStatusFilter'),
        description:
          'Filter account tables. Deposit products: active ≈ approved/open; inactive ≈ withdrawn/closed. Default all.'
      },
      {
        in: 'query',
        name: 'limit',
        schema: { type: 'integer', minimum: 1, maximum: 200, default: 50 },
        description: 'Page size for the account table array'
      },
      {
        in: 'query',
        name: 'skip',
        schema: { type: 'integer', minimum: 0, default: 0 },
        description: 'Offset for the account table array'
      }
    ],
    dataSchema: schemaRef('ProductOverviewByTypeData')
  }),

  '/api/v1/products/upload-image': mutOp('post', {
    tags: ['Products — Builder'],
    summary: 'Upload product image (multipart)',
    description: 'multipart/form-data `file`. Returns CDN URL for `about.previewAssetUrl`.'
  }),

  '/api/v1/products/upload-document-template': mutOp('post', {
    tags: ['Products — Builder'],
    summary: 'Upload document template (multipart)'
  }),

  '/api/v1/products/loan-schedule/config': getOp({
    tags: ['Products — Builder'],
    summary: 'Loan schedule calculator config'
  }),

  '/api/v1/products/loan-schedule': mutOp('post', {
    tags: ['Products — Builder'],
    summary: 'Loan schedule calculator (preview)',
    body: { type: 'object', additionalProperties: true }
  }),

  '/api/v1/products/{id}/loan-schedule': mutOp('post', {
    tags: ['Products — Builder'],
    summary: 'Persist loan schedule on product',
    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
    body: { type: 'object', additionalProperties: true }
  }),

  ...Object.fromEntries(
    [
      'moratorium',
      'moratorium-duration',
      'moratorium-type',
      'repayment-cycle',
      'repayment-schedule',
      'repayment-structure',
      'equity-requirement',
      'acceptable-npa',
      'loan-other-requirement-type',
      'loan-tenure',
      'interest-method',
      'savings-interest-method',
      'withdrawal-flexibility',
      'repayment-workflow',
      'amortization',
      'currency',
      'fee-type',
      'penalty-type',
      'trigger-duration',
      'collateral-type',
      'property-type',
      'mortgage-facilities',
      'property-documentation',
      'mortgage-workflow-steps',
      'platform-application-fields',
      'repayment-source',
      'marital-status',
      'loan-reason',
      'security-requirements',
      'commodity-trading-cycle',
      'commodity-tenure',
      'investment-trading-cycle',
      'investment-tenure',
      'investment-type',
      'savings-tenure',
      'savings-type',
      'savings-repayment-cycle',
      'savings-deposit-cycle'
    ].map((slug) => [
      `/api/v1/products/options/${slug}`,
      getOp({
        tags: ['Products — Options'],
        summary: `Options: ${slug}`
      })
    ])
  ),

  '/api/v1/products/sub-merchants/merchant-dashboard': getOp({
    tags: ['Products — Catalog'],
    summary: 'Sub-merchant dashboard slice',
    parameters: [optionalAppIdQuery]
  }),

  '/api/v1/products/sub-merchants/customers-dashboard': getOp({
    tags: ['Products — Catalog'],
    summary: 'Customers dashboard slice',
    parameters: [optionalAppIdQuery]
  })
};
