/**
 * Named OpenAPI component schemas for Frontend Plata Swagger (Schemas panel).
 * Shapes mirror create-app-ms / product-ms / wallet-ms / client-auth-ms contracts.
 */

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });

export const frontendPlataComponentSchemas: Record<string, unknown> = {
  SuccessEnvelope: {
    type: 'object',
    required: ['success'],
    properties: {
      success: { type: 'boolean', example: true },
      data: { type: 'object', additionalProperties: true },
      message: { type: 'string' }
    }
  },

  ErrorEnvelope: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      error: { type: 'string' },
      message: { type: 'string' },
      details: { type: 'array', items: { type: 'object', additionalProperties: true } }
    }
  },

  /** create-app list pagination (sibling of `data`) */
  PaginationMeta: {
    type: 'object',
    required: ['page', 'limit', 'total', 'totalPages', 'hasNextPage', 'hasPreviousPage'],
    properties: {
      page: { type: 'integer', example: 1 },
      limit: { type: 'integer', example: 20 },
      total: { type: 'integer', example: 42 },
      totalPages: { type: 'integer', example: 3 },
      hasNextPage: { type: 'boolean' },
      hasPreviousPage: { type: 'boolean' }
    }
  },

  /** product-ms list pagination (nested under `data`) */
  ProductListPagination: {
    type: 'object',
    required: ['page', 'limit', 'total', 'totalPages'],
    properties: {
      page: { type: 'integer', example: 1 },
      limit: { type: 'integer', example: 20 },
      total: { type: 'integer' },
      totalPages: { type: 'integer' }
    }
  },

  SkipLimitMeta: {
    type: 'object',
    properties: {
      total: { type: 'integer' },
      limit: { type: 'integer' },
      skip: { type: 'integer' }
    }
  },

  OffsetLimitPagination: {
    type: 'object',
    properties: {
      limit: { type: 'integer' },
      offset: { type: 'integer' },
      total: { type: 'integer' }
    }
  },

  ProductType: {
    type: 'string',
    enum: ['LOAN', 'MORTGAGE', 'SAVINGS', 'INVESTMENT', 'COMMODITY']
  },

  MerchantWalletType: {
    type: 'string',
    enum: ['BILLING', 'TREASURY', 'REPAYMENT'],
    description: 'Canonical app merchant wallet roles. Legacy Mongo may still show OPERATION / SETTLEMENT / KYC.'
  },

  AppStatus: {
    type: 'string',
    enum: ['active', 'suspended']
  },

  App: {
    type: 'object',
    required: ['id', 'name', 'merchantId', 'status'],
    properties: {
      id: { type: 'string', example: '69efccf9a6f701fa458935e0' },
      name: { type: 'string' },
      websiteUrl: { type: 'string' },
      alias: { type: 'string' },
      description: { type: 'string' },
      merchantId: { type: 'string', example: 'merchant_1773335565089_odwk5b0dg' },
      status: ref('AppStatus'),
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
      productKeys: { type: 'array', items: { type: 'string' } },
      payonusSubaccountCode: { type: 'string' },
      payonusSubaccountId: { type: 'string' }
    }
  },

  CreateAppRequest: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string' },
      websiteUrl: { type: 'string' },
      alias: { type: 'string' },
      description: { type: 'string' }
    }
  },

  UpdateAppRequest: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      websiteUrl: { type: 'string' },
      alias: { type: 'string' },
      description: { type: 'string' },
      status: ref('AppStatus'),
      productKeys: { type: 'array', items: { type: 'string' } }
    }
  },

  /** GET /apps — `data` is the array; `pagination` is a sibling */
  AppListResponse: {
    type: 'object',
    required: ['success', 'data', 'pagination'],
    properties: {
      success: { type: 'boolean', example: true },
      data: { type: 'array', items: ref('App') },
      pagination: ref('PaginationMeta')
    }
  },

  AppTransaction: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      appId: { type: 'string' },
      amount: { type: 'number' },
      currency: { type: 'string', example: 'NGN' },
      type: { type: 'string', enum: ['credit', 'debit'] },
      status: { type: 'string', enum: ['pending', 'completed', 'failed', 'cancelled'] },
      description: { type: 'string' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' }
    }
  },

  AppTransactionListResponse: {
    type: 'object',
    required: ['success', 'data', 'pagination'],
    properties: {
      success: { type: 'boolean' },
      data: { type: 'array', items: ref('AppTransaction') },
      pagination: ref('PaginationMeta')
    }
  },

  MerchantWallet: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      merchantId: { type: 'string' },
      appId: { type: 'string' },
      type: ref('MerchantWalletType'),
      balance: { type: 'number', description: 'NGN naira' },
      currency: { type: 'string', example: 'NGN' },
      status: { type: 'string' },
      virtualNuban: { type: 'object', nullable: true, additionalProperties: true },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' }
    }
  },

  ProductMerchantDetails: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string', nullable: true },
      companyName: { type: 'string', nullable: true },
      companyLogoUrl: { type: 'string', nullable: true },
      website: { type: 'string', nullable: true }
    }
  },

  CommodityPriceEntry: {
    type: 'object',
    description: 'Historical Commodity Price tab row only — live purchase price is structure.unitAmount / legacy price.',
    properties: {
      source: { type: 'string' },
      date: { type: 'string', format: 'date' },
      price: { type: 'number' }
    }
  },

  ProductListItem: {
    type: 'object',
    required: ['id', 'name', 'type', 'appId'],
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      type: ref('ProductType'),
      status: { type: 'string', enum: ['active', 'inactive', 'draft'] },
      isActive: { type: 'boolean' },
      configured: { type: 'boolean' },
      isFeatured: { type: 'boolean' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
      appId: { type: 'string' },
      referenceNumber: { type: 'string' }
    }
  },

  ProductListData: {
    type: 'object',
    required: ['items', 'pagination'],
    description: 'GET /products?appId= — nested items + pagination',
    properties: {
      items: { type: 'array', items: ref('ProductListItem') },
      pagination: ref('ProductListPagination')
    }
  },

  Product: {
    type: 'object',
    required: ['id', 'name', 'type', 'appId', 'status'],
    properties: {
      id: { type: 'string' },
      referenceNumber: { type: 'string' },
      name: { type: 'string' },
      description: { type: 'string' },
      type: ref('ProductType'),
      subType: { type: 'string' },
      appId: { type: 'string' },
      companyName: { type: 'string', nullable: true },
      status: { type: 'string', enum: ['complete', 'incomplete'] },
      isActive: { type: 'boolean' },
      isFeatured: { type: 'boolean' },
      requireApplicantSignature: { type: 'boolean' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
      structure: { type: 'object', additionalProperties: true },
      about: { type: 'object', additionalProperties: true },
      requirements: { type: 'object', additionalProperties: true },
      feesAndCharges: { type: 'object', additionalProperties: true },
      properties: { type: 'array', items: { type: 'object', additionalProperties: true } },
      config: { type: 'object', additionalProperties: true },
      commodityPrices: { type: 'array', items: ref('CommodityPriceEntry') },
      price: { type: 'number' },
      minimumQuantity: { type: 'number' },
      unitOfMeasure: { type: 'string' },
      equityContribution: { type: 'number', deprecated: true },
      propertyValue: { type: 'number' },
      merchant: ref('ProductMerchantDetails'),
      metadata: { type: 'object', additionalProperties: true }
    }
  },

  LoginRequest: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string', format: 'password' }
    }
  },

  SessionUser: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      email: { type: 'string', format: 'email' },
      firstName: { type: 'string' },
      lastName: { type: 'string' },
      merchantId: { type: 'string' },
      userType: { type: 'string' },
      status: { type: 'string' }
    },
    additionalProperties: true
  },

  RbacSession: {
    type: 'object',
    description: 'RBAC fields on login /me / verify-token',
    properties: {
      permissions: { type: 'array', items: { type: 'string' }, example: ['view_products', 'invite_team_members'] },
      isOwner: { type: 'boolean' },
      roleId: { type: 'string', nullable: true },
      roleName: { type: 'string', nullable: true, example: 'Admin' }
    }
  },

  LoginData: {
    allOf: [
      {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
          user: ref('SessionUser')
        }
      },
      ref('RbacSession')
    ]
  },

  Role: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      description: { type: 'string' },
      permissions: { type: 'array', items: { type: 'string' } },
      merchantId: { type: 'string' },
      isSystem: { type: 'boolean' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' }
    }
  },

  PermissionCatalogEntry: {
    type: 'object',
    properties: {
      code: { type: 'string' },
      label: { type: 'string' },
      group: { type: 'string' },
      description: { type: 'string' }
    },
    additionalProperties: true
  },

  PermissionCatalogData: {
    type: 'object',
    properties: {
      catalog: { type: 'array', items: ref('PermissionCatalogEntry') }
    },
    additionalProperties: true
  },

  TeamMember: {
    type: 'object',
    properties: {
      userId: { type: 'string' },
      email: { type: 'string' },
      firstName: { type: 'string' },
      lastName: { type: 'string' },
      roleId: { type: 'string' },
      roleName: { type: 'string' },
      status: { type: 'string', enum: ['active', 'pending', 'suspended', 'deactivated'] },
      isOwner: { type: 'boolean' },
      invitedAt: { type: 'string', format: 'date-time' },
      lastActiveAt: { type: 'string', format: 'date-time' }
    },
    additionalProperties: true
  },

  Invitation: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      email: { type: 'string' },
      roleId: { type: 'string' },
      status: { type: 'string' },
      createdAt: { type: 'string', format: 'date-time' },
      expiresAt: { type: 'string', format: 'date-time' }
    },
    additionalProperties: true
  },

  ApiKey: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      publicKey: { type: 'string' },
      secretKey: { type: 'string', description: 'Only returned on create' },
      environment: { type: 'string', enum: ['test', 'live'] },
      merchantId: { type: 'string' },
      createdAt: { type: 'string', format: 'date-time' },
      lastUsedAt: { type: 'string', format: 'date-time', nullable: true }
    },
    additionalProperties: true
  },

  LoanWorkflowStatus: {
    type: 'string',
    enum: ['requested', 'under_review', 'approved', 'declined', 'blacklisted']
  },

  EquityPayment: {
    type: 'object',
    properties: {
      requiredAmount: { type: 'number' },
      paidAmount: { type: 'number' },
      currency: { type: 'string', example: 'NGN' },
      status: { type: 'string', enum: ['pending', 'paid'] },
      paidAt: { type: 'string', format: 'date-time' },
      repaymentTransactionId: { type: 'string' },
      settlementTransactionId: { type: 'string', deprecated: true }
    }
  },

  LoanWorkflowPatchRequest: {
    type: 'object',
    required: ['loanWorkflowStatus'],
    properties: {
      loanWorkflowStatus: ref('LoanWorkflowStatus'),
      reason: { type: 'string', description: 'Required when blacklisted' },
      approvedAmount: { type: 'number' },
      equityReceived: { type: 'boolean' },
      equityProviderReference: { type: 'string' }
    }
  },

  UserProductApplication: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      productId: { type: 'string' },
      appId: { type: 'string' },
      userId: { type: 'string' },
      merchantId: { type: 'string' },
      productType: ref('ProductType'),
      status: {
        type: 'string',
        enum: ['draft', 'submitted', 'signed', 'cancelled', 'withdrawn']
      },
      loanWorkflowStatus: ref('LoanWorkflowStatus'),
      approvedLoanAmount: { type: 'number' },
      equityPayment: ref('EquityPayment'),
      applicant: { type: 'object', additionalProperties: true },
      contractSnapshot: { type: 'object', additionalProperties: true },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' }
    },
    additionalProperties: true
  },

  LoanWorkflowListResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      data: { type: 'array', items: ref('UserProductApplication') },
      meta: ref('SkipLimitMeta')
    }
  },

  TreasuryWalletSummary: {
    type: 'object',
    properties: {
      balance: { type: 'number', description: 'NGN naira' },
      currency: { type: 'string', example: 'NGN' },
      virtualNuban: { type: 'object', nullable: true, additionalProperties: true },
      fundable: { type: 'boolean' }
    }
  },

  TreasuryOverview: {
    type: 'object',
    properties: {
      appId: { type: 'string' },
      merchantId: { type: 'string' },
      pendingTotal: { type: 'number' },
      wallets: {
        type: 'object',
        properties: {
          treasury: ref('TreasuryWalletSummary'),
          billing: ref('TreasuryWalletSummary'),
          repayment: ref('TreasuryWalletSummary')
        }
      }
    }
  },

  PendingPayoutRow: {
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
  },

  PendingPayoutListData: {
    type: 'object',
    properties: {
      items: { type: 'array', items: ref('PendingPayoutRow') },
      pagination: { type: 'object', additionalProperties: true }
    }
  },

  /**
   * Decided treasury-console payout (after Approve / Reject Returns).
   * `approved` ← tx COMPLETED; `rejected` ← tx FAILED.
   */
  TreasuryPayoutHistoryRow: {
    type: 'object',
    required: ['id', 'reference', 'amount', 'requestedOn', 'decidedAt', 'status'],
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
      decidedAt: { type: 'string', format: 'date-time', description: 'When merchant approved or rejected' },
      maturity: { type: 'string', format: 'date-time' },
      requestingFrom: { type: 'string' },
      status: { type: 'string', enum: ['approved', 'rejected'] },
      reason: { type: 'string', description: 'Reject reason when status=rejected' },
      metadata: { type: 'object', additionalProperties: true }
    }
  },

  TreasuryPayoutHistoryListData: {
    type: 'object',
    required: ['items', 'pagination'],
    properties: {
      items: { type: 'array', items: ref('TreasuryPayoutHistoryRow') },
      pagination: {
        type: 'object',
        required: ['total', 'limit', 'skip', 'hasMore'],
        properties: {
          total: { type: 'integer' },
          limit: { type: 'integer' },
          skip: { type: 'integer' },
          hasMore: { type: 'boolean' }
        }
      }
    }
  },

  WalletLedgerListData: {
    type: 'object',
    properties: {
      items: { type: 'array', items: { type: 'object', additionalProperties: true } },
      pagination: { type: 'object', additionalProperties: true }
    }
  },

  FundingInstructions: {
    type: 'object',
    properties: {
      walletType: { type: 'string', enum: ['treasury', 'billing'] },
      amount: { type: 'number' },
      currency: { type: 'string', example: 'NGN' },
      accountName: { type: 'string' },
      accountNumber: { type: 'string' },
      bankName: { type: 'string' },
      bankCode: { type: 'string' },
      narration: { type: 'string' },
      virtualNuban: { type: 'object', additionalProperties: true }
    },
    additionalProperties: true
  },

  ApproveBatchBody: {
    type: 'object',
    required: ['appId', 'references'],
    properties: {
      appId: { type: 'string' },
      references: { type: 'array', items: { type: 'string' }, minItems: 1 },
      automaticAll: { type: 'boolean' }
    }
  },

  RejectBatchBody: {
    type: 'object',
    required: ['appId', 'references'],
    properties: {
      appId: { type: 'string' },
      references: { type: 'array', items: { type: 'string' }, minItems: 1 },
      reason: { type: 'string' }
    }
  },

  ApproveBatchResult: {
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
  },

  SettlementMode: {
    type: 'object',
    properties: {
      mode: { type: 'string', enum: ['manual', 'automatic'] }
    }
  },

  SettlementType: {
    type: 'string',
    enum: ['investments', 'commodities', 'savings']
  },

  RepaymentPayoutRequest: {
    type: 'object',
    required: ['appId', 'accountNumber', 'bankCode', 'accountName', 'amount'],
    properties: {
      appId: { type: 'string' },
      accountNumber: { type: 'string' },
      bankCode: { type: 'string' },
      accountName: { type: 'string' },
      amount: { type: 'number', description: 'NGN naira' },
      narration: { type: 'string' },
      reference: { type: 'string' }
    }
  },

  BusinessKycStatus: {
    type: 'object',
    properties: {
      status: { type: 'string' },
      merchantId: { type: 'string' },
      submittedAt: { type: 'string', format: 'date-time' },
      reviewedAt: { type: 'string', format: 'date-time' },
      rejectionReason: { type: 'string' }
    },
    additionalProperties: true
  },

  NotificationItem: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      recipient: { type: 'string' },
      title: { type: 'string' },
      body: { type: 'string' },
      channel: { type: 'string' },
      priority: { type: 'string' },
      template: { type: 'string' },
      read: { type: 'boolean' },
      createdAt: { type: 'string', format: 'date-time' },
      metadata: { type: 'object', additionalProperties: true }
    },
    additionalProperties: true
  },

  NotificationInboxData: {
    type: 'object',
    properties: {
      items: { type: 'array', items: ref('NotificationItem') },
      pagination: ref('OffsetLimitPagination')
    },
    additionalProperties: true
  },

  /**
   * Account-table filter for product-overview by-type.
   * SAVINGS / INVESTMENT / COMMODITY: use `active` | `inactive` | `all`.
   *   - `active` = open / approved holdings (not cancelled or withdrawn)
   *   - `inactive` = closed — application `cancelled` or `withdrawn` (and matured/closed positions)
   * LOAN / MORTGAGE: also `non_performing` | `bad`.
   * Default when omitted: `all`.
   */
  PortfolioStatusFilter: {
    type: 'string',
    enum: ['active', 'inactive', 'non_performing', 'bad', 'all'],
    description:
      'Filter account tables. Deposit products (SAVINGS/INVESTMENT/COMMODITY): active=open/approved, inactive=cancelled/withdrawn/closed. Lending also supports non_performing and bad.'
  },

  PortfolioAccountsMeta: {
    type: 'object',
    required: ['portfolioStatus', 'total', 'limit', 'skip', 'hasMore'],
    properties: {
      portfolioStatus: ref('PortfolioStatusFilter'),
      total: { type: 'integer', description: 'Rows matching the filter before skip/limit' },
      limit: { type: 'integer' },
      skip: { type: 'integer' },
      hasMore: { type: 'boolean' }
    }
  },

  OverviewCountMetric: {
    type: 'object',
    properties: {
      count: { type: 'integer' },
      deltaThisMonth: { type: 'integer', description: 'Optional; new actives this calendar month (Lagos)' }
    }
  },

  /** Open / withdrawn savings plan row (`savingsAccounts[]`). */
  SavingsPortfolioAccountRow: {
    type: 'object',
    required: ['id', 'reference', 'customerName', 'productId', 'plan', 'balance', 'status', 'openedAt'],
    properties: {
      id: { type: 'string', description: 'Plata user_product_application id' },
      reference: { type: 'string', example: 'SV-A1B2C3' },
      customerName: { type: 'string' },
      productId: { type: 'string' },
      plan: { type: 'string', description: 'Flex / Fixed / Target (or product savingsType label)' },
      balance: { type: 'number', description: 'Current deposit balance (NGN naira)' },
      status: {
        type: 'string',
        enum: ['active', 'inactive'],
        description: 'active = open plan; inactive = cancelled or withdrawn'
      },
      openedAt: { type: 'string', format: 'date-time' }
    }
  },

  /** Open / closed investment position (`investmentAccounts[]`). */
  InvestmentPortfolioAccountRow: {
    type: 'object',
    required: ['id', 'reference', 'customerName', 'productId', 'instrument', 'amount', 'status', 'startedAt'],
    properties: {
      id: { type: 'string' },
      reference: { type: 'string' },
      customerName: { type: 'string' },
      productId: { type: 'string' },
      instrument: { type: 'string' },
      amount: { type: 'number', description: 'Position notional (NGN naira)' },
      status: {
        type: 'string',
        enum: ['active', 'inactive'],
        description: 'active = open; inactive = matured / closed / withdrawn'
      },
      startedAt: { type: 'string', format: 'date-time' }
    }
  },

  /** Open / closed commodity holding (`commodityAccounts[]`). */
  CommodityPortfolioAccountRow: {
    type: 'object',
    required: ['id', 'reference', 'customerName', 'productId', 'commodity', 'amount', 'status', 'startedAt'],
    properties: {
      id: { type: 'string' },
      reference: { type: 'string' },
      customerName: { type: 'string' },
      productId: { type: 'string' },
      commodity: { type: 'string', description: 'e.g. Rice, 50kg' },
      amount: { type: 'number', description: 'Holding value (NGN naira)' },
      status: {
        type: 'string',
        enum: ['active', 'inactive'],
        description: 'active = open holding; inactive = matured / closed / withdrawn'
      },
      startedAt: { type: 'string', format: 'date-time' }
    }
  },

  /** LOAN / MORTGAGE account row (`loanAccounts[]` / `mortgageAccounts[]`). */
  LendingPortfolioAccountRow: {
    type: 'object',
    required: ['id', 'reference', 'customerName', 'productId', 'productName', 'principal', 'outstanding', 'daysOverdue', 'status'],
    properties: {
      id: { type: 'string' },
      reference: { type: 'string' },
      customerName: { type: 'string' },
      productId: { type: 'string' },
      productName: { type: 'string' },
      principal: { type: 'number' },
      outstanding: { type: 'number' },
      daysOverdue: { type: 'integer' },
      status: {
        type: 'string',
        enum: ['active', 'inactive', 'non_performing', 'bad']
      },
      disbursedAt: { type: 'string', format: 'date-time' },
      maturedAt: { type: 'string', format: 'date-time', nullable: true }
    }
  },

  ProductOverviewHeadline: {
    type: 'object',
    properties: {
      requestedAmount: { type: 'number' },
      approvedAmount: { type: 'number' },
      lendingApplicationsRequestedCount: { type: 'integer' },
      lendingApplicationsApprovedCount: { type: 'integer' },
      totalTransactions: { type: 'number' },
      totalSavings: { type: 'number' },
      totalInterest: { type: 'number' }
    }
  },

  ProductOverviewCategoryRow: {
    type: 'object',
    properties: {
      type: ref('ProductType'),
      configuredProductCount: { type: 'integer' },
      applicationCount: { type: 'integer' },
      customerCount: { type: 'integer' },
      capitalAmount: { type: 'number' },
      issuedAmount: { type: 'number' },
      repaymentAmount: { type: 'number' },
      inventoryAmount: { type: 'number' },
      salesAmount: { type: 'number' }
    }
  },

  ProductOverviewData: {
    type: 'object',
    description: 'App-wide overview cards (`GET …/product-overview`).',
    required: ['schemaVersion', 'generatedAt', 'appId', 'headline', 'byCategory'],
    properties: {
      schemaVersion: { type: 'integer', example: 1 },
      generatedAt: { type: 'string', format: 'date-time' },
      appId: { type: 'string' },
      headline: ref('ProductOverviewHeadline'),
      byCategory: { type: 'array', items: ref('ProductOverviewCategoryRow') }
    }
  },

  ProductOverviewByTypeRow: {
    type: 'object',
    properties: {
      productId: { type: 'string' },
      referenceNumber: { type: 'string' },
      name: { type: 'string' },
      customerCount: { type: 'integer' },
      applicationCount: { type: 'integer' },
      capitalAmount: { type: 'number' },
      issuedAmount: { type: 'number' },
      repaymentAmount: { type: 'number' },
      inventoryAmount: { type: 'number' },
      salesAmount: { type: 'number' }
    }
  },

  ProductOverviewByTypeTotals: {
    type: 'object',
    properties: {
      distinctCustomerCount: { type: 'integer' },
      applicationCount: { type: 'integer' },
      capitalAmount: { type: 'number' },
      issuedAmount: { type: 'number' },
      repaymentAmount: { type: 'number' },
      inventoryAmount: { type: 'number' },
      salesAmount: { type: 'number' }
    }
  },

  /**
   * By-type drill-down. Account tables depend on `type`:
   * - SAVINGS → `savingsAccounts` + `savingsPortfolio` + `portfolioAccountsMeta`
   * - INVESTMENT → `investmentAccounts` + `investmentPortfolio` + `portfolioAccountsMeta`
   * - COMMODITY → `commodityAccounts` + `commodityPortfolio` + `portfolioAccountsMeta`
   * - LOAN → `loanAccounts` + `loanPortfolio` + `portfolioAccountsMeta`
   * - MORTGAGE → `mortgageAccounts` + `mortgagePortfolio` + `portfolioAccountsMeta`
   *
   * Filter with `?portfolioStatus=`. For deposit products, open/approved ≈ `active`; withdrawn/closed ≈ `inactive`.
   */
  ProductOverviewByTypeData: {
    type: 'object',
    required: ['schemaVersion', 'generatedAt', 'appId', 'type', 'products', 'totals'],
    properties: {
      schemaVersion: { type: 'integer', example: 2 },
      generatedAt: { type: 'string', format: 'date-time' },
      appId: { type: 'string' },
      type: ref('ProductType'),
      products: { type: 'array', items: ref('ProductOverviewByTypeRow') },
      totals: ref('ProductOverviewByTypeTotals'),
      savingsAccounts: {
        type: 'array',
        items: ref('SavingsPortfolioAccountRow'),
        description: 'Present when type=SAVINGS; filtered by portfolioStatus'
      },
      investmentAccounts: {
        type: 'array',
        items: ref('InvestmentPortfolioAccountRow'),
        description: 'Present when type=INVESTMENT; filtered by portfolioStatus'
      },
      commodityAccounts: {
        type: 'array',
        items: ref('CommodityPortfolioAccountRow'),
        description: 'Present when type=COMMODITY; filtered by portfolioStatus'
      },
      loanAccounts: {
        type: 'array',
        items: ref('LendingPortfolioAccountRow'),
        description: 'Present when type=LOAN; filtered by portfolioStatus'
      },
      mortgageAccounts: {
        type: 'array',
        items: ref('LendingPortfolioAccountRow'),
        description: 'Present when type=MORTGAGE; filtered by portfolioStatus'
      },
      portfolioAccountsMeta: ref('PortfolioAccountsMeta'),
      savingsPortfolio: {
        type: 'object',
        description: 'SAVINGS KPI buckets (active/inactive counts, pending withdrawals, recent activity)',
        additionalProperties: true,
        properties: {
          activeSavingsPlan: ref('OverviewCountMetric'),
          inactiveSavingsPlan: ref('OverviewCountMetric'),
          pendingWithdrawal: ref('OverviewCountMetric')
        }
      },
      investmentPortfolio: {
        type: 'object',
        description: 'INVESTMENT KPI buckets',
        additionalProperties: true,
        properties: {
          activeInvestment: ref('OverviewCountMetric'),
          maturedInvestment: ref('OverviewCountMetric'),
          pendingLiquidation: ref('OverviewCountMetric')
        }
      },
      commodityPortfolio: {
        type: 'object',
        description: 'COMMODITY KPI buckets',
        additionalProperties: true,
        properties: {
          activeCommodityPlan: ref('OverviewCountMetric'),
          completedCommodityPlan: ref('OverviewCountMetric'),
          pendingLiquidation: ref('OverviewCountMetric')
        }
      },
      loanPortfolio: { type: 'object', additionalProperties: true },
      mortgagePortfolio: { type: 'object', additionalProperties: true }
    }
  }
};

/** Helper: data payload $ref for getOp / mutOp */
export function schemaRef(name: string): Record<string, unknown> {
  return { $ref: `#/components/schemas/${name}` };
}
