/** Shared OpenAPI fragments for Frontend Plata dashboard docs. */

export const appIdQuery = {
  in: 'query' as const,
  name: 'appId',
  required: true,
  schema: { type: 'string', minLength: 1, maxLength: 100 },
  description: 'Plata app id (create-app). Required for app-scoped treasury/wallet/product list filters.'
};

export const optionalAppIdQuery = {
  in: 'query' as const,
  name: 'appId',
  required: false,
  schema: { type: 'string', minLength: 1, maxLength: 100 },
  description: 'Optional app scope when supported by the endpoint'
};

export const bearer = [{ bearerAuth: [] as string[] }];

export const successEnvelope = {
  type: 'object',
  required: ['success'],
  properties: {
    success: { type: 'boolean', example: true },
    data: { type: 'object', additionalProperties: true },
    message: { type: 'string' }
  }
};

export const errorEnvelope = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    error: { type: 'string' },
    message: { type: 'string' },
    details: { type: 'array', items: { type: 'object', additionalProperties: true } }
  }
};

export const paginationQuery = [
  { in: 'query' as const, name: 'page', schema: { type: 'integer', minimum: 1, default: 1 } },
  { in: 'query' as const, name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } }
];

export const jsonBody = (schema: Record<string, unknown>, example?: unknown) => ({
  required: true,
  content: {
    'application/json': {
      schema,
      ...(example !== undefined ? { example } : {})
    }
  }
});

export const okData = (description: string, dataSchema: Record<string, unknown> = { type: 'object', additionalProperties: true }) => ({
  description,
  content: {
    'application/json': {
      schema: {
        allOf: [successEnvelope, { properties: { data: dataSchema } }]
      }
    }
  }
});

/** Full response schema (e.g. AppListResponse where pagination is sibling of data) */
export const okSchema = (description: string, schema: Record<string, unknown>) => ({
  description,
  content: {
    'application/json': { schema }
  }
});

export const standardErrors = {
  '400': { description: 'Bad request', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
  '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
  '403': { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } },
  '404': { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } }
};

/** Concise authenticated GET */
export function getOp(opts: {
  tags: string[];
  summary: string;
  description?: string;
  parameters?: unknown[];
  dataSchema?: Record<string, unknown>;
  /** When set, replaces the default success+data wrapper (use for sibling pagination). */
  responseSchema?: Record<string, unknown>;
}) {
  return {
    get: {
      tags: opts.tags,
      summary: opts.summary,
      description: opts.description,
      security: bearer,
      parameters: opts.parameters || [],
      responses: {
        '200': opts.responseSchema
          ? okSchema(opts.summary, opts.responseSchema)
          : okData(opts.summary, opts.dataSchema),
        ...standardErrors
      }
    }
  };
}

/** Concise authenticated mutation */
export function mutOp(
  method: 'post' | 'put' | 'patch' | 'delete',
  opts: {
    tags: string[];
    summary: string;
    description?: string;
    parameters?: unknown[];
    body?: Record<string, unknown>;
    example?: unknown;
    dataSchema?: Record<string, unknown>;
    responseSchema?: Record<string, unknown>;
  }
) {
  const success = opts.responseSchema
    ? okSchema(opts.summary, opts.responseSchema)
    : okData(opts.summary, opts.dataSchema);
  return {
    [method]: {
      tags: opts.tags,
      summary: opts.summary,
      description: opts.description,
      security: bearer,
      parameters: opts.parameters || [],
      ...(opts.body
        ? { requestBody: jsonBody(opts.body, opts.example) }
        : {}),
      responses: {
        '200': success,
        ...(method === 'post' ? { '201': success } : {}),
        ...standardErrors
      }
    }
  };
}

export const pendingRow = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    reference: { type: 'string' },
    applicationId: { type: 'string' },
    userId: { type: 'string' },
    productId: { type: 'string' },
    productName: { type: 'string' },
    customerName: { type: 'string' },
    principal: { type: 'number' },
    returnAmount: { type: 'number' },
    amount: { type: 'number', description: 'Payout amount in NGN naira' },
    requestedOn: { type: 'string', format: 'date-time' },
    maturity: { type: 'string', format: 'date-time' },
    requestingFrom: { type: 'string' },
    status: { type: 'string', enum: ['pending'] },
    metadata: { type: 'object', additionalProperties: true }
  }
};

export const approveBatchResult = {
  type: 'object',
  properties: {
    paidCount: { type: 'integer' },
    blockedCount: { type: 'integer' },
    paid: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          reference: { type: 'string' },
          amount: { type: 'number' },
          userId: { type: 'string' }
        }
      }
    },
    blocked: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          reference: { type: 'string' },
          amount: { type: 'number' },
          reason: { type: 'string' }
        }
      }
    },
    treasuryBalanceAfter: { type: 'number', nullable: true },
    revertedToManual: { type: 'boolean', nullable: true }
  }
};

export const approveBatchBody = {
  type: 'object',
  required: ['appId', 'references'],
  properties: {
    appId: { type: 'string' },
    references: { type: 'array', items: { type: 'string' }, minItems: 1 },
    automaticAll: { type: 'boolean', description: 'When true, approve all pending for the queue (ignore references)' }
  }
};

export const rejectBatchBody = {
  type: 'object',
  required: ['appId', 'references'],
  properties: {
    appId: { type: 'string' },
    references: { type: 'array', items: { type: 'string' }, minItems: 1 },
    reason: { type: 'string', description: 'Optional reject reason shown to storefront user' }
  }
};
