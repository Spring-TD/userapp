import { getOp, mutOp } from './frontendPlataCommon';
import { schemaRef } from './frontendPlataSchemas';

const loanWorkflowListQuery = [
  {
    in: 'query' as const,
    name: 'loanWorkflowStatus',
    schema: schemaRef('LoanWorkflowStatus')
  },
  { in: 'query' as const, name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
  { in: 'query' as const, name: 'skip', schema: { type: 'integer', minimum: 0, default: 0 } }
];

export const applicationsKycNotifyPaths: Record<string, unknown> = {
  '/api/v1/products/applications/me/loan-workflow': getOp({
    tags: ['Applications — Loan Workflow'],
    summary: 'Merchant loan/mortgage workflow queue (me)',
    description:
      'Applications for the logged-in merchant. Response: `data` array + `meta: { total, limit, skip }` (see `LoanWorkflowListResponse`).',
    parameters: loanWorkflowListQuery,
    responseSchema: schemaRef('LoanWorkflowListResponse')
  }),

  '/api/v1/products/app/{appId}/applications/loan-workflow': getOp({
    tags: ['Applications — Loan Workflow'],
    summary: 'App-scoped loan workflow queue',
    parameters: [
      { in: 'path', name: 'appId', required: true, schema: { type: 'string' } },
      ...loanWorkflowListQuery
    ],
    responseSchema: schemaRef('LoanWorkflowListResponse')
  }),

  '/api/v1/products/applications/{applicationId}': getOp({
    tags: ['Applications — Loan Workflow'],
    summary: 'Application detail',
    parameters: [{ in: 'path', name: 'applicationId', required: true, schema: { type: 'string' } }],
    dataSchema: schemaRef('UserProductApplication')
  }),

  '/api/v1/products/applications/{applicationId}/loan-workflow': mutOp('patch', {
    tags: ['Applications — Loan Workflow'],
    summary: 'Set loan workflow status',
    description:
      'Originating product merchant only. `approved` with unpaid equity returns **409**. Successful approve auto-disburses from Treasury when equity gates pass. `blacklisted` is terminal and requires `reason`.',
    parameters: [{ in: 'path', name: 'applicationId', required: true, schema: { type: 'string' } }],
    body: schemaRef('LoanWorkflowPatchRequest'),
    example: { loanWorkflowStatus: 'approved' },
    dataSchema: schemaRef('UserProductApplication')
  }),

  '/api/v1/products/applications/{applicationId}/loan-workflow/offer-letter/generate': mutOp('post', {
    tags: ['Applications — Loan Workflow'],
    summary: 'Generate system offer letter PDF',
    parameters: [{ in: 'path', name: 'applicationId', required: true, schema: { type: 'string' } }]
  }),

  '/api/v1/products/applications/{applicationId}/loan-workflow/offer-letter': mutOp('post', {
    tags: ['Applications — Loan Workflow'],
    summary: 'Upload offer letter (multipart)',
    parameters: [{ in: 'path', name: 'applicationId', required: true, schema: { type: 'string' } }]
  }),

  '/api/v1/products/applications/{applicationId}/pending-approved-mortgage/down-payment/confirm': mutOp(
    'post',
    {
      tags: ['Applications — Loan Workflow'],
      summary: 'Confirm mortgage down payment received',
      parameters: [{ in: 'path', name: 'applicationId', required: true, schema: { type: 'string' } }]
    }
  ),

  '/api/v1/products/applications/{applicationId}/pending-approved-mortgage/disburse': mutOp('post', {
    tags: ['Applications — Loan Workflow'],
    summary: 'Manual mortgage disburse (when not auto)',
    parameters: [{ in: 'path', name: 'applicationId', required: true, schema: { type: 'string' } }]
  }),

  '/api/v1/products/applications/{applicationId}/pending-approved-loan/disburse': mutOp('post', {
    tags: ['Applications — Loan Workflow'],
    summary: 'Manual loan disburse (when not auto)',
    parameters: [{ in: 'path', name: 'applicationId', required: true, schema: { type: 'string' } }]
  }),

  '/api/v1/products/applications/{applicationId}/spring-applicant-profile': getOp({
    tags: ['Applications — Loan Workflow'],
    summary: 'Spring applicant profile pull',
    parameters: [{ in: 'path', name: 'applicationId', required: true, schema: { type: 'string' } }]
  }),

  '/api/v1/kyc/business/submit': mutOp('post', {
    tags: ['KYC — Business'],
    summary: 'Submit business KYC',
    description: 'First successful submit may charge Billing wallet (one-time business KYC fee).',
    body: { type: 'object', additionalProperties: true }
  }),

  '/api/v1/kyc/business/status': getOp({
    tags: ['KYC — Business'],
    summary: 'Business KYC status',
    dataSchema: schemaRef('BusinessKycStatus')
  }),

  '/api/v1/kyc/business/documents': {
    ...getOp({ tags: ['KYC — Business'], summary: 'List business KYC documents' }),
    ...mutOp('put', {
      tags: ['KYC — Business'],
      summary: 'Upsert business KYC documents',
      body: { type: 'object', additionalProperties: true }
    })
  },

  '/api/v1/kyc/business/document/{documentId}': getOp({
    tags: ['KYC — Business'],
    summary: 'Get one KYC document',
    parameters: [{ in: 'path', name: 'documentId', required: true, schema: { type: 'string' } }]
  }),

  '/api/v1/kyc/business/business-info': {
    ...getOp({ tags: ['KYC — Business'], summary: 'Get company / business info' }),
    ...mutOp('put', {
      tags: ['KYC — Business'],
      summary: 'Update business info',
      body: { type: 'object', additionalProperties: true }
    })
  },

  '/api/v1/kyc/business/business-survey': {
    ...getOp({ tags: ['KYC — Business'], summary: 'Get business survey' }),
    ...mutOp('put', {
      tags: ['KYC — Business'],
      summary: 'Update business survey',
      body: { type: 'object', additionalProperties: true }
    })
  },

  '/api/v1/kyc/business/business-type-options': getOp({
    tags: ['KYC — Business'],
    summary: 'Business type options'
  }),
  '/api/v1/kyc/business/industry-type-options': getOp({
    tags: ['KYC — Business'],
    summary: 'Industry type options'
  }),
  '/api/v1/kyc/business/business-model-options': getOp({
    tags: ['KYC — Business'],
    summary: 'Business model options'
  }),

  '/api/v1/kyc/business/{merchantId}/beneficial-owners': getOp({
    tags: ['KYC — Business'],
    summary: 'List beneficial owners / shareholders',
    parameters: [{ in: 'path', name: 'merchantId', required: true, schema: { type: 'string' } }]
  }),

  '/api/v1/kyc/business/beneficial-owners': mutOp('put', {
    tags: ['KYC — Business'],
    summary: 'Update beneficial owners',
    body: { type: 'object', additionalProperties: true }
  }),

  '/api/v1/kyc/business/risk-assessment': getOp({
    tags: ['KYC — Business'],
    summary: 'Risk assessment'
  }),

  '/api/v1/kyc/business/enhanced-due-diligence': getOp({
    tags: ['KYC — Business'],
    summary: 'Enhanced due diligence'
  }),

  '/api/v1/kyc/business/corporate-structure': getOp({
    tags: ['KYC — Business'],
    summary: 'Corporate structure'
  }),

  '/api/v1/kyc/business/messages': getOp({
    tags: ['KYC — Business'],
    summary: 'Compliance message thread'
  }),

  '/api/v1/kyc/business/message': mutOp('post', {
    tags: ['KYC — Business'],
    summary: 'Post compliance message',
    body: {
      type: 'object',
      required: ['message'],
      properties: { message: { type: 'string' } }
    }
  }),

  '/api/v1/kyc/upload': mutOp('post', {
    tags: ['KYC — Business'],
    summary: 'Upload KYC file (multipart)'
  }),

  '/api/v1/notifications/user/{recipient}': getOp({
    tags: ['Notifications'],
    summary: 'Merchant notification inbox',
    description:
      '`recipient` is usually the staff/owner `userId`. Pagination uses `limit` + `offset` (not page).',
    parameters: [
      { in: 'path', name: 'recipient', required: true, schema: { type: 'string' } },
      { in: 'query', name: 'limit', schema: { type: 'integer', default: 20 } },
      { in: 'query', name: 'offset', schema: { type: 'integer', default: 0 } }
    ],
    dataSchema: schemaRef('NotificationInboxData')
  }),

  '/api/v1/notifications/push/vapid-public-key': {
    get: {
      tags: ['Notifications'],
      summary: 'Web Push VAPID public key',
      responses: { '200': { description: 'Public key' } }
    }
  },

  '/api/v1/notifications/push/subscribe': {
    ...mutOp('post', {
      tags: ['Notifications'],
      summary: 'Subscribe to web push',
      body: { type: 'object', additionalProperties: true }
    }),
    ...mutOp('delete', {
      tags: ['Notifications'],
      summary: 'Unsubscribe web push',
      body: { type: 'object', additionalProperties: true }
    })
  },

  '/api/v1/notifications/{id}/status': getOp({
    tags: ['Notifications'],
    summary: 'Notification delivery status',
    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }]
  })
};
