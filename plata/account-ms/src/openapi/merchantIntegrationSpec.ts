/**
 * Plata Merchant Integration Documentation — OpenAPI 3.0 served at /docs and /api-docs.
 * Documents gateway routes that require PLATA_PUBLIC_KEY + PLATA_SECRET_KEY.
 */
const INTEGRATION_GUIDE = `
# Plata Merchant Integration Documentation

Stateless **API gateway** for programmatic merchant integration. All paths below are relative to the gateway base URL.

**Production:** \`https://account-ms-plata.fly.dev\`

The **FI merchant is the integrator**. There is no separate third-party integrator persona. API keys are that merchant’s programmatic channel (same tenant as the dashboard). **springApp** is a reference merchant stack calling this gateway upstream — not an external party.

**Merchant dashboard APIs** (JWT) and **Treasury console** are documented separately at \`/frontendplata\`.

---

## Authentication

Every route in this document requires **merchant API keys** on each request, except the two public product reads (\`GET /api/v1/products/{id}\` and \`POST /api/v1/products/{id}/loan-schedule\`):

| Header | Description |
|--------|-------------|
| \`PLATA_PUBLIC_KEY\` | Public key (\`pk_live_...\` / \`pk_test_...\`) |
| \`PLATA_SECRET_KEY\` | Secret key (\`sk_live_...\` / \`sk_test_...\`) |

The gateway verifies keys and IP policy via service-auth-ms, then forwards merchant context upstream.

Create keys in the Plata dashboard → **Settings → API Keys** (JWT session; not documented here).

---

## How to read this guide

Pick **one product section** below and stay inside it. Each section lists every call you need for that product, in order. The same URL is repeated in every section that uses it — that is intentional.

| Section | \`type\` filter | You will also see |
|---------|-----------------|-------------------|
| **1. Loan** | \`LOAN\` | Apply, then status, offer accept/decline, loan account, and repayment schedule. Plata also **calls you** on \`loanWorkflowCallbackUrl\`. |
| **2. Mortgage** | \`MORTGAGE\` | Apply, then status, mortgage account, and repayment schedule. Include equity / down-payment fields in the snapshot if the product requires them. |
| **3. Commodity** | \`COMMODITY\` | Plus principal repayment, maturity approval request, and Treasury payout. |
| **4. Savings** | \`SAVINGS\` | Plus principal repayment, savings activity, maturity approval request, and Treasury payout. |
| **5. Investment** | \`INVESTMENT\` | Plus principal repayment, maturity approval request, and Treasury payout. |
| **Wallets** | (all guides) | Merchant wallet details/history and customer wallet details/history via API keys. |

Reference stack: **springApp** (\`PLATA_ACCOUNT_SERVICE_URL\`, \`PLATA_PUBLIC_KEY\`, \`PLATA_SECRET_KEY\`).

---

## Money

Amounts are **NGN naira** (major units) unless noted.

---

## Errors

| Status | Meaning |
|--------|---------|
| \`401\` | Missing or invalid API keys |
| \`403\` | IP not allowlisted |
| \`429\` | Rate limited |
| \`502\` / \`503\` | Upstream unavailable |
`.trim();

const integratorComponents = {
  securitySchemes: {
    plataApiKeys: {
      type: 'apiKey',
      in: 'header',
      name: 'PLATA_PUBLIC_KEY',
      description:
        'Send **both** `PLATA_PUBLIC_KEY` and `PLATA_SECRET_KEY` headers. Verified at the gateway before proxying.'
    }
  },
  parameters: {
    ExternalApplicationId: {
      in: 'path',
      name: 'applicationId',
      required: true,
      schema: { type: 'string' },
      example: 'loan-app-1001',
      description:
        'Either the Plata application id (`data.application.id` from submit) or your own `localApplicationId`.'
    }
  },
  responses: {
    UnauthorizedKeys: {
      description: 'Missing or invalid PLATA_PUBLIC_KEY / PLATA_SECRET_KEY',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: { type: 'string' }
            }
          }
        }
      }
    }
  },
  schemas: {
    SubMerchantRef: {
      type: 'object',
      required: ['id', 'name'],
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        email: { type: 'string', format: 'email' },
        phone: { type: 'string' }
      }
    },
    ExternalUserRef: {
      type: 'object',
      required: ['id', 'name'],
      properties: {
        id: { type: 'string', description: 'Integrator-side user id' },
        name: { type: 'string' },
        email: { type: 'string', format: 'email' },
        phone: { type: 'string' },
        bvn: { type: 'string', description: '11-digit BVN when wallet provisioning requires it' }
      }
    },
    ExternalAccountRequest: {
      type: 'object',
      required: ['appId', 'productId', 'user'],
      properties: {
        appId: { type: 'string' },
        productId: { type: 'string' },
        user: { $ref: '#/components/schemas/ExternalUserRef' },
        currency: { type: 'string', default: 'NGN' },
        country: { type: 'string', default: 'NG' }
      }
    },
    ExternalAccountResponse: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            externalPlatformMerchantId: { type: 'string' },
            productCreatorMerchantId: { type: 'string' },
            productCreatorCompanyName: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                created: { type: 'boolean' }
              }
            },
            wallet: {
              type: 'object',
              properties: {
                virtualNuban: { type: 'object' },
                payonusNubanAccountNumber: { type: 'string' }
              }
            }
          }
        }
      }
    },
    ExternalApplicationRequest: {
      type: 'object',
      required: ['appId', 'productId', 'offeringMerchantId', 'user', 'application'],
      properties: {
        appId: { type: 'string' },
        productId: { type: 'string' },
        offeringMerchantId: { type: 'string' },
        offeringMerchantName: { type: 'string' },
        subMerchant: { $ref: '#/components/schemas/SubMerchantRef' },
        user: { $ref: '#/components/schemas/ExternalUserRef' },
        application: { type: 'object', description: 'Contract snapshot + platform fields' },
        loanWorkflowCallbackUrl: { type: 'string', format: 'uri' },
        guarantorKycCallbackUrl: { type: 'string', format: 'uri' },
        currency: { type: 'string' },
        country: { type: 'string' }
      }
    },
    ExternalApplicationResponse: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            application: {
              type: 'object',
              description: 'Stored application. Keep `id` (or your `localApplicationId`) to check status later.',
              properties: {
                id: { type: 'string', description: 'Plata application id' },
                localApplicationId: { type: 'string' },
                status: { type: 'string' },
                loanWorkflowStatus: { type: 'string' }
              }
            },
            applicationCreated: { type: 'boolean' },
            usageEventRecorded: { type: 'boolean' }
          }
        }
      }
    },
    PrincipalRepaymentRequest: {
      type: 'object',
      required: ['creatorMerchantId', 'creatorAppId', 'amount', 'referenceId'],
      properties: {
        creatorMerchantId: { type: 'string', description: 'Product-creator merchant id (Treasury/REPAYMENT owner)' },
        creatorAppId: { type: 'string', description: 'Creator app id whose REPAYMENT wallet is credited' },
        amount: { type: 'number', description: 'NGN major units unless amountUnit is kobo' },
        amountUnit: { type: 'string', enum: ['naira', 'kobo'], default: 'naira' },
        currency: { type: 'string', default: 'NGN' },
        referenceId: { type: 'string', description: 'Idempotency key' },
        productId: { type: 'string' },
        productType: { type: 'string', enum: ['SAVINGS', 'INVESTMENT', 'COMMODITY'] },
        applicationId: { type: 'string' },
        category: { type: 'string', example: 'COMMODITY_DEPOSIT' },
        description: { type: 'string' },
        source: { type: 'string' },
        metadata: { type: 'object', additionalProperties: true }
      }
    },
    SubMerchantActivationRequest: {
      type: 'object',
      required: ['appId', 'productId', 'merchantId', 'merchantName', 'subMerchant', 'status'],
      properties: {
        appId: { type: 'string' },
        productId: { type: 'string' },
        productName: { type: 'string' },
        merchantId: { type: 'string', description: 'Parent merchant id on the calling platform' },
        merchantName: { type: 'string' },
        subMerchant: {
          type: 'object',
          required: ['id', 'name', 'email', 'phone'],
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' }
          }
        },
        status: { type: 'string', enum: ['active', 'deactivated'] },
        complianceStatus: { type: 'string', enum: ['not_started', 'pending', 'completed'] },
        complianceDocuments: {
          type: 'array',
          items: {
            type: 'object',
            required: ['url'],
            properties: {
              url: { type: 'string' },
              name: { type: 'string' },
              uploadedAt: { type: 'string', format: 'date-time' }
            }
          }
        }
      }
    },
    SubMerchantUsageEventRequest: {
      type: 'object',
      required: ['appId', 'productId', 'merchantId', 'merchantName', 'subMerchant', 'externalUser'],
      properties: {
        appId: { type: 'string' },
        productId: { type: 'string' },
        productName: { type: 'string' },
        merchantId: { type: 'string' },
        merchantName: { type: 'string' },
        subMerchant: {
          type: 'object',
          required: ['id', 'name', 'email', 'phone'],
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' }
          }
        },
        externalUser: {
          type: 'object',
          required: ['id', 'name', 'email', 'phone'],
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' }
          }
        },
        startedAt: { type: 'string', format: 'date-time' }
      }
    },
    SavingsApplicationActivityRequest: {
      type: 'object',
      properties: {
        applicationId: { type: 'string' },
        applicationIds: { type: 'array', items: { type: 'string' } },
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 }
      },
      description: 'Provide applicationId or applicationIds (at least one).'
    },
    MaturityPayoutRequest: {
      type: 'object',
      required: ['creatorMerchantId', 'creatorAppId', 'referenceId'],
      properties: {
        creatorMerchantId: { type: 'string' },
        creatorAppId: { type: 'string' },
        amount: { type: 'number', description: 'Payout total in naira unless amountUnit is kobo' },
        principalAmount: { type: 'number' },
        interestAmount: { type: 'number' },
        amountUnit: { type: 'string', enum: ['naira', 'kobo'], default: 'naira' },
        currency: { type: 'string', default: 'NGN' },
        referenceId: { type: 'string', description: 'Idempotency key' },
        description: { type: 'string' },
        productId: { type: 'string' },
        productType: { type: 'string', enum: ['COMMODITY', 'SAVINGS', 'INVESTMENT'] },
        applicationId: { type: 'string' },
        offeringMerchantId: { type: 'string' },
        category: { type: 'string' },
        metadata: { type: 'object', additionalProperties: true }
      }
    },
    MaturityWithdrawalRequest: {
      allOf: [
        { $ref: '#/components/schemas/MaturityPayoutRequest' },
        {
          type: 'object',
          properties: {
            offeringAppId: { type: 'string' },
            userId: { type: 'string' },
            customerName: { type: 'string' },
            customerEmail: { type: 'string', format: 'email' },
            productName: { type: 'string' },
            maturityAt: { type: 'string', format: 'date-time' },
            springLocalApplicationId: { type: 'string' }
          }
        }
      ]
    },
    DownPayment: {
      type: 'object',
      description: 'Equity / down payment the product requires before disbursement.',
      properties: {
        requiredAmount: { type: 'number', example: 50000 },
        paidAmount: { type: 'number', example: 0 },
        outstandingAmount: { type: 'number', example: 50000 },
        status: { type: 'string', enum: ['not_required', 'pending', 'paid'] },
        paidAt: { type: 'string', format: 'date-time' },
        providerReference: { type: 'string' }
      }
    },
    ExternalApplicationStatus: {
      type: 'object',
      properties: {
        applicationId: { type: 'string', description: 'Plata application id', example: '6650a1b2c3d4e5f607182930' },
        localApplicationId: { type: 'string', description: 'Your own id, as sent on submit', example: 'loan-app-1001' },
        productId: { type: 'string' },
        productName: { type: 'string' },
        productType: { type: 'string', enum: ['LOAN', 'MORTGAGE', 'COMMODITY', 'SAVINGS', 'INVESTMENT'] },
        applicationStatus: { type: 'string', enum: ['draft', 'submitted', 'signed', 'cancelled', 'withdrawn'] },
        loanWorkflowStatus: {
          type: 'string',
          enum: ['requested', 'under_review', 'approved', 'declined', 'blacklisted'],
          description: 'The lender’s decision. Same value as the `loan_workflow_status.updated` webhook.'
        },
        loanWorkflowReason: { type: 'string', description: 'Lender note, e.g. why it was declined' },
        stage: {
          type: 'string',
          description:
            'One word for where the application is now: `draft`, `submitted`, `under_review`, `declined`, `blacklisted`, ' +
            '`approved`, `offer_pending`, `offer_accepted`, `offer_declined`, `disbursed`, `cancelled`, `withdrawn`. ' +
            'Mortgages can also show their own post-approval steps (e.g. `contract_issued`).'
        },
        nextAction: {
          type: 'string',
          enum: [
            'submit_application',
            'wait_for_review',
            'wait_for_offer_letter',
            'accept_or_decline_offer',
            'pay_down_payment',
            'wait_for_disbursement',
            'continue_mortgage_workflow',
            'repay',
            'deposit',
            'request_maturity_withdrawal',
            'wait_for_withdrawal_approval',
            'none'
          ],
          description:
            'What should happen next. Loan: `accept_or_decline_offer` means call `POST .../offer`. ' +
            'Commodity / savings / investment: `deposit` or `request_maturity_withdrawal`.'
        },
        currency: { type: 'string', example: 'NGN' },
        approvedAmount: { type: 'number', description: 'Only once approved', example: 500000 },
        downPayment: { $ref: '#/components/schemas/DownPayment' },
        offer: {
          type: 'object',
          properties: {
            sentAt: { type: 'string', format: 'date-time' },
            acceptedAt: { type: 'string', format: 'date-time' },
            declinedAt: { type: 'string', format: 'date-time' }
          }
        },
        disbursedAt: { type: 'string', format: 'date-time' },
        submittedAt: { type: 'string', format: 'date-time' },
        createdAt: { type: 'string', format: 'date-time' }
      }
    },
    ExternalLoanOfferResponseRequest: {
      type: 'object',
      required: ['action'],
      properties: {
        action: { type: 'string', enum: ['accept', 'decline'] },
        acceptedTerms: {
          type: 'boolean',
          description: 'Must be `true` when `action` is `accept` (the borrower agreed to the offer letter).'
        },
        downPayment: {
          type: 'object',
          description:
            'Only when the loan needs a down payment that **you** collected from the borrower. Plata records it and accepts the offer in one step. `amount` must equal `downPayment.requiredAmount`.',
          required: ['amount', 'providerReference'],
          properties: {
            amount: { type: 'number', example: 50000 },
            providerReference: { type: 'string', description: 'Your payment reference', example: 'pay_20260928_0001' }
          }
        }
      }
    },
    ExternalLoanOffer: {
      type: 'object',
      properties: {
        status: { $ref: '#/components/schemas/ExternalApplicationStatus' },
        offerStatus: { type: 'string', enum: ['not_sent', 'pending', 'accepted', 'declined'] },
        offerLetter: {
          type: 'object',
          description: 'Present once the lender has sent the offer letter.',
          properties: {
            reference: { type: 'string' },
            offerValidUntil: { type: 'string', format: 'date-time' },
            pdfUrl: { type: 'string', description: 'Offer letter PDF to show the borrower' },
            pdfFileName: { type: 'string' },
            signedPdfUrl: { type: 'string' },
            signedPdfFileName: { type: 'string' },
            text: { type: 'string', description: 'Plain-text offer letter' },
            html: { type: 'string', description: 'HTML offer letter' }
          }
        }
      }
    },
    ExternalLoanAccount: {
      type: 'object',
      description:
        'Account summary for any product. LOAN/MORTGAGE use principal/disbursement/schedule fields; ' +
        'COMMODITY/SAVINGS/INVESTMENT use balance, quantity, maturity, and pendingWithdrawal.',
      properties: {
        applicationId: { type: 'string' },
        localApplicationId: { type: 'string' },
        productId: { type: 'string' },
        productName: { type: 'string' },
        productType: {
          type: 'string',
          enum: ['LOAN', 'MORTGAGE', 'COMMODITY', 'SAVINGS', 'INVESTMENT']
        },
        accountStatus: {
          type: 'string',
          description:
            'Lending: `not_disbursed` | `active` | `overdue` | `paid_off` | `closed`. ' +
            'Deposit products: `enrolled` | `active` | `withdrawal_pending` | `withdrawn` | `cancelled`.'
        },
        stage: { type: 'string' },
        currency: { type: 'string', example: 'NGN' },
        userId: { type: 'string', description: 'Customer user id (deposit products)' },
        principal: { type: 'number', description: 'Approved loan amount (repayments are calculated on this)' },
        disbursedAmount: { type: 'number', description: 'Amount actually credited to the borrower after fees' },
        managementFees: {
          type: 'object',
          properties: { plata: { type: 'number' }, spring: { type: 'number' } }
        },
        disbursedAt: { type: 'string', format: 'date-time' },
        disbursementAccount: {
          type: 'object',
          description: 'Borrower Plata wallet that received the loan',
          properties: {
            walletId: { type: 'string' },
            accountNumber: { type: 'string' },
            bankName: { type: 'string' },
            bankCode: { type: 'string' }
          }
        },
        interestRate: { type: 'number', description: 'Annual rate in percent' },
        repaymentFrequency: { type: 'string', example: 'monthly' },
        durationMonths: { type: 'number' },
        totalInterest: { type: 'number' },
        totalRepayment: { type: 'number' },
        amountPaid: { type: 'number' },
        outstandingAmount: { type: 'number' },
        installmentCount: { type: 'number' },
        paidInstallmentCount: { type: 'number' },
        overdueInstallmentCount: { type: 'number' },
        overdueAmount: { type: 'number' },
        daysOverdue: { type: 'number' },
        nextInstallment: {
          type: 'object',
          nullable: true,
          properties: {
            number: { type: 'number' },
            dueDate: { type: 'string', format: 'date-time' },
            amount: { type: 'number' },
            status: { type: 'string' }
          }
        },
        maturityDate: { type: 'string', format: 'date-time', description: 'Due date of the last instalment (loans)' },
        repaymentScheduleAvailable: {
          type: 'boolean',
          description: 'True for disbursed loans/mortgages with a billing schedule. False for deposit products.'
        },
        balance: { type: 'number', description: 'Current holding balance (commodity / savings / investment)' },
        quantity: { type: 'number', description: 'Units held (commodity / investment)' },
        unitAmount: { type: 'number', description: 'Price per unit' },
        amount: { type: 'number', description: 'Purchase / subscription total' },
        expectedInterest: { type: 'number' },
        interestPaid: { type: 'number' },
        totalWithdrawals: { type: 'number' },
        targetAmount: { type: 'number', description: 'Savings target lock goal' },
        monthlyContribution: { type: 'number' },
        maturityAt: { type: 'string', format: 'date-time', description: 'Holding maturity (deposit products)' },
        holdingStatus: { type: 'string', description: 'Raw holding status from the contract snapshot' },
        pendingWithdrawal: {
          type: 'object',
          properties: {
            amount: { type: 'number' },
            requestedAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    RepaymentSchedule: {
      type: 'object',
      properties: {
        source: { type: 'string', enum: ['confirmed'], description: 'Always the live schedule from Plata billing' },
        interestRate: { type: 'number' },
        repaymentFrequency: { type: 'string' },
        scheduleType: { type: 'string', example: 'EMI' },
        durationMonths: { type: 'number' },
        loanAmount: { type: 'number' },
        instalment: { type: 'number', description: 'Regular instalment amount when the schedule has one' },
        totalInterest: { type: 'number' },
        totalRepayment: { type: 'number' },
        periodCount: { type: 'number' },
        currency: { type: 'string' },
        planStatus: { type: 'string', example: 'active' },
        paidInstallmentCount: { type: 'number' },
        outstandingAmount: { type: 'number' },
        nextInstallmentNumber: { type: 'number' },
        periods: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              period: { type: 'number' },
              label: { type: 'string' },
              dueDate: { type: 'string', format: 'date-time' },
              payment: { type: 'number' },
              principal: { type: 'number' },
              interest: { type: 'number' },
              fees: { type: 'number' },
              balance: { type: 'number', description: 'Balance left after this payment' },
              status: { type: 'string', enum: ['pending', 'collecting', 'paid', 'failed', 'overdue'] },
              isNext: { type: 'boolean' },
              paidAt: { type: 'string', format: 'date-time' }
            }
          }
        }
      }
    },
    ProductSchedulePreviewRequest: {
      type: 'object',
      required: ['amount'],
      properties: {
        amount: { type: 'number', description: 'Amount the customer wants, naira', example: 500000 },
        duration: { type: 'number', example: 12 },
        durationUnit: { type: 'string', enum: ['months', 'years'], default: 'months' },
        propertyValue: { type: 'number', description: 'Mortgage only' },
        startDate: { type: 'string', format: 'date' }
      }
    },
    LoanWorkflowWebhook: {
      type: 'object',
      description: 'Outbound webhook Plata POSTs to integrator loanWorkflowCallbackUrl (not a gateway route)',
      properties: {
        event: {
          type: 'string',
          enum: ['loan_application.submitted', 'loan_workflow_status.updated']
        },
        eventId: { type: 'string' },
        occurredAt: { type: 'string', format: 'date-time' },
        data: { type: 'object' }
      }
    }
  }
};

const ALL_PRODUCTS = ['1. Loan', '2. Mortgage', '3. Commodity', '4. Savings', '5. Investment'];

const merchantIntegrationSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Plata Merchant Integration Documentation',
    version: '1.5.1',
    description: INTEGRATION_GUIDE,
    contact: {
      name: 'Plata Support',
      url: 'https://account-ms-plata.fly.dev/docs'
    }
  },
  servers: [
    { url: 'https://account-ms-plata.fly.dev', description: 'Production (Plata)' },
    { url: 'http://localhost:3008', description: 'Local gateway' }
  ],
  tags: [
    {
      name: '1. Loan',
      description:
        'Build a **loan** integration using only the calls in this section.\n\n' +
        '1. **List products** — `GET /api/v1/products?type=LOAN`. Do not send `appId`.\n' +
        '2. **Get one product** — `GET /api/v1/products/{id}`.\n' +
        '3. **Preview repayments** (optional) — `POST /api/v1/products/{id}/loan-schedule`.\n' +
        '4. **Create the customer bank account** (optional, before apply) — `POST /api/v1/products/external-accounts`.\n' +
        '5. **Apply** — `POST /api/v1/products/external-applications`. Set `loanWorkflowCallbackUrl` so Plata can tell you when the loan moves.\n' +
        '6. **Get status** — `GET /api/v1/products/external-applications/{applicationId}`.\n' +
        '7. **Read the offer letter** — `GET .../external-applications/{applicationId}/offer`.\n' +
        '8. **Accept or decline the offer** — `POST .../external-applications/{applicationId}/offer`.\n' +
        '9. **Loan account details** — `GET .../external-applications/{applicationId}/account`.\n' +
        '10. **Repayment schedule** — `GET .../external-applications/{applicationId}/repayment-schedule`.\n' +
        '11. **Sub-merchant turned the loan on or off** — `POST /api/v1/products/sub-merchant-activations`.\n' +
        '12. **Customer started using the loan** — `POST /api/v1/products/sub-merchant-usage-events`.\n\n' +
        '`{applicationId}` can be the Plata id or your own `localApplicationId`.\n\n' +
        '**Webhook (Plata calls you):** `POST` to your `loanWorkflowCallbackUrl` with header `X-Plata-Signature` when configured. Events: `loan_application.submitted`, `loan_workflow_status.updated`. Step 6 gives the same status on demand.\n\n' +
        'Loans do **not** use principal-repayment or maturity payout. Those live under Commodity, Savings, and Investment.'
    },
    {
      name: '2. Mortgage',
      description:
        'Build a **mortgage** integration using only the calls in this section. The HTTP routes are the same as loans; the product type and snapshot are not.\n\n' +
        '1. **List products** — `GET /api/v1/products?type=MORTGAGE`. Do not send `appId`.\n' +
        '2. **Get one product** — `GET /api/v1/products/{id}`.\n' +
        '3. **Preview repayments** (optional) — `POST /api/v1/products/{id}/loan-schedule` with `amount` and `propertyValue`.\n' +
        '4. **Create the customer bank account** (optional) — `POST /api/v1/products/external-accounts`.\n' +
        '5. **Apply** — `POST /api/v1/products/external-applications`. Put equity / down-payment fields in `application.contractSnapshot` when the product requires them. Set `loanWorkflowCallbackUrl` for status updates.\n' +
        '6. **Get status** — `GET /api/v1/products/external-applications/{applicationId}`.\n' +
        '7. **Mortgage account details** — `GET .../external-applications/{applicationId}/account`.\n' +
        '8. **Repayment schedule** — `GET .../external-applications/{applicationId}/repayment-schedule`.\n' +
        '9. **Sub-merchant turned the mortgage on or off** — `POST /api/v1/products/sub-merchant-activations`.\n' +
        '10. **Customer started using the mortgage** — `POST /api/v1/products/sub-merchant-usage-events`.\n\n' +
        '**Webhook (Plata calls you):** same loan-workflow callback as loans (`loan_application.submitted`, `loan_workflow_status.updated`). Verify `X-Plata-Signature` when configured.\n\n' +
        'Mortgages do **not** use principal-repayment or maturity payout.'
    },
    {
      name: '3. Commodity',
      description:
        'Build a **commodity** integration using only the calls in this section.\n\n' +
        '1. **List products** — `GET /api/v1/products?type=COMMODITY`.\n' +
        '2. **Create the customer bank account** (optional) — `POST /api/v1/products/external-accounts`.\n' +
        '3. **Submit the purchase / application snapshot** — `POST /api/v1/products/external-applications`.\n' +
        '4. **Get status** — `GET /api/v1/products/external-applications/{applicationId}`.\n' +
        '5. **Get commodity account details** — `GET .../external-applications/{applicationId}/account`.\n' +
        '6. **Sub-merchant on/off** — `POST /api/v1/products/sub-merchant-activations`.\n' +
        '7. **Customer started usage** — `POST /api/v1/products/sub-merchant-usage-events`.\n' +
        '8. **Customer paid principal** — `POST /api/v1/wallets/commodity/principal-repayment` credits the product-creator **Repayment** wallet. Body needs `creatorMerchantId`, `creatorAppId`, `amount`, `referenceId`.\n' +
        '9. **Customer wants funds at maturity** — `POST /api/v1/wallets/commodity/maturity-withdrawal-request` only **asks the FI to approve**. No money moves yet.\n' +
        '10. **After the FI approves** — `POST /api/v1/wallets/commodity/maturity-payout` debits creator **Treasury**. You credit the customer on your own platform.\n\n' +
        'Old URL `.../principal-settlement` still works. Prefer `.../principal-repayment`.'
    },
    {
      name: '4. Savings',
      description:
        'Build a **savings** integration (flex or target/lock) using only the calls in this section.\n\n' +
        '1. **List products** — `GET /api/v1/products?type=SAVINGS`.\n' +
        '2. **Create the customer bank account** (optional) — `POST /api/v1/products/external-accounts`.\n' +
        '3. **Submit the savings application / plan snapshot** — `POST /api/v1/products/external-applications`.\n' +
        '4. **Get status** — `GET /api/v1/products/external-applications/{applicationId}`.\n' +
        '5. **Get savings account details** — `GET .../external-applications/{applicationId}/account`.\n' +
        '6. **Sub-merchant on/off** — `POST /api/v1/products/sub-merchant-activations`.\n' +
        '7. **Customer started saving** — `POST /api/v1/products/sub-merchant-usage-events`.\n' +
        '8. **Customer deposited or topped up** — `POST /api/v1/wallets/savings/principal-repayment` credits creator **Repayment**.\n' +
        '9. **Show the activity feed** — `POST /api/v1/wallets/savings/application-activity` with the application id. Returns deposits, top-ups, and withdrawals.\n' +
        '10. **Maturity withdrawal request** — `POST /api/v1/wallets/savings/maturity-withdrawal-request` (FI approval queue; no debit yet).\n' +
        '11. **After the FI approves** — `POST /api/v1/wallets/savings/maturity-payout` debits creator **Treasury**. You credit the customer on your platform.\n\n' +
        'Old URL `.../principal-settlement` still works. Prefer `.../principal-repayment`.'
    },
    {
      name: '5. Investment',
      description:
        'Build an **investment** integration using only the calls in this section.\n\n' +
        '1. **List products** — `GET /api/v1/products?type=INVESTMENT`.\n' +
        '2. **Create the customer bank account** (optional) — `POST /api/v1/products/external-accounts`.\n' +
        '3. **Submit the investment application** — `POST /api/v1/products/external-applications`.\n' +
        '4. **Get status** — `GET /api/v1/products/external-applications/{applicationId}`.\n' +
        '5. **Get investment account details** — `GET .../external-applications/{applicationId}/account`.\n' +
        '6. **Sub-merchant on/off** — `POST /api/v1/products/sub-merchant-activations`.\n' +
        '7. **Customer started the investment** — `POST /api/v1/products/sub-merchant-usage-events`.\n' +
        '8. **Customer paid principal** — `POST /api/v1/wallets/investment/principal-repayment` credits creator **Repayment**.\n' +
        '9. **Maturity / liquidation request** — `POST /api/v1/wallets/investment/maturity-withdrawal-request` (FI approval queue; no debit yet).\n' +
        '10. **After the FI approves** — `POST /api/v1/wallets/investment/maturity-payout` debits creator **Treasury**. You credit the customer on your platform.\n\n' +
        'Old URL `.../principal-settlement` still works. Prefer `.../principal-repayment`.'
    }
  ],
  paths: {
    '/api/v1/products': {
      get: {
        tags: ALL_PRODUCTS,
        summary: '1. List products for this section',
        description:
          'This call is repeated in every product section. Stay in the section you opened and send only that section’s `type`:\n\n' +
          '| Section | Send |\n|---|---|\n| 1. Loan | `type=LOAN` |\n| 2. Mortgage | `type=MORTGAGE` |\n| 3. Commodity | `type=COMMODITY` |\n| 4. Savings | `type=SAVINGS` |\n| 5. Investment | `type=INVESTMENT` |\n\n' +
          '**Do not** pass `appId`. That query is for the dashboard, not API keys.',
        security: [{ plataApiKeys: [] }],
        parameters: [
          {
            in: 'query',
            name: 'type',
            schema: {
              type: 'string',
              enum: ['LOAN', 'MORTGAGE', 'SAVINGS', 'INVESTMENT', 'COMMODITY']
            },
            description:
              'Optional catalog filter — e.g. `type=LOAN` returns loan products only. Omit for all types.'
          },
          {
            in: 'query',
            name: 'page',
            schema: { type: 'integer', minimum: 1, default: 1 },
            description: 'Page number (1-based).'
          },
          {
            in: 'query',
            name: 'limit',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            description: 'Page size (max 100).'
          }
        ],
        responses: {
          '200': { description: 'Product list' },
          '401': { $ref: '#/components/responses/UnauthorizedKeys' }
        }
      }
    },
    '/api/v1/products/{id}': {
      get: {
        tags: ALL_PRODUCTS,
        summary: 'Get one product by id',
        description:
          'Full details of a single catalog product (rate, tenure, amounts, requirements). Use the `id` from the product list. ' +
          'Public read: API keys are not required here, and sending them does no harm.',
        security: [],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string' },
            example: '674a1b2c3d4e5f6789012345',
            description: 'Product id from the product list'
          }
        ],
        responses: {
          '200': { description: 'Product details' },
          '404': { description: 'Product not found' }
        }
      }
    },
    '/api/v1/products/{id}/loan-schedule': {
      post: {
        tags: ['1. Loan', '2. Mortgage'],
        summary: 'Preview repayments before applying',
        description:
          'Shows the customer what they would pay back for an amount and tenure, using this product’s rate and repayment structure. ' +
          'Nothing is saved; this is a calculator. Public read: API keys are not required.',
        security: [],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string' },
            example: '674a1b2c3d4e5f6789012345',
            description: 'Loan or mortgage product id'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ProductSchedulePreviewRequest' },
              example: { amount: 500000, duration: 12, durationUnit: 'months' }
            }
          }
        },
        responses: {
          '200': { description: 'Instalment rows plus totals (total interest, total repayment)' },
          '400': { description: 'Amount or tenure outside what the product allows' },
          '404': { description: 'Product not found' }
        }
      }
    },
    '/api/v1/products/external-accounts': {
      post: {
        tags: ALL_PRODUCTS,
        summary: '2. Create the customer’s Plata bank account',
        description:
          'Repeated in every product section. Call this before submit when the customer needs a NUBAN. ' +
          'Creates a Plata user + wallet under the product creator merchant. Idempotent on `user.id`. ' +
          '`user.bvn` is required (11 digits).',
        security: [{ plataApiKeys: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ExternalAccountRequest' },
              example: {
                appId: 'app_123',
                productId: '674a1b2c3d4e5f6789012345',
                user: {
                  id: 'user_7788',
                  name: 'Jane Doe',
                  email: 'jane@example.com',
                  phone: '+2348099991111',
                  bvn: '22123456789'
                },
                currency: 'NGN',
                country: 'NG'
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'User and wallet provisioned',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ExternalAccountResponse' }
              }
            }
          },
          '401': { $ref: '#/components/responses/UnauthorizedKeys' }
        }
      }
    },
    '/api/v1/products/external-applications': {
      post: {
        tags: ALL_PRODUCTS,
        summary: '3. Submit the customer’s application',
        description:
          'Repeated in every product section. Stores the application under the product creator.\n\n' +
          '- **Loan / Mortgage:** set `loanWorkflowCallbackUrl`. Plata will POST status changes to that URL. Mortgage snapshots should include equity / down-payment fields when the product requires them.\n' +
          '- **Commodity / Savings / Investment:** send the purchase or plan in `application.contractSnapshot`.\n\n' +
          'Idempotent: same user + productId + offeringMerchantId returns the existing application. ' +
          '`user.bvn` is required.',
        security: [{ plataApiKeys: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ExternalApplicationRequest' },
              example: {
                appId: 'app_123',
                productId: '674a1b2c3d4e5f6789012345',
                offeringMerchantId: 'subm_1001',
                offeringMerchantName: 'Sub Merchant Store',
                subMerchant: { id: 'subm_1001', name: 'Sub Merchant' },
                user: {
                  id: 'user_7788',
                  name: 'Jane Doe',
                  email: 'jane@example.com',
                  phone: '+2348099991111',
                  bvn: '22123456789'
                },
                application: {
                  contractSnapshot: { principal: 500000, currency: 'NGN' },
                  localApplicationId: 'spring-local-app-id',
                  status: 'submitted',
                  monthlyIncome: 250000,
                  repaymentSource: 'salary'
                },
                loanWorkflowCallbackUrl: 'https://spring.example.com/webhooks/plata/loan-workflow',
                currency: 'NGN',
                country: 'NG'
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Application stored',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ExternalApplicationResponse' }
              }
            }
          },
          '401': { $ref: '#/components/responses/UnauthorizedKeys' }
        }
      }
    },
    '/api/v1/products/external-applications/{applicationId}': {
      get: {
        tags: ALL_PRODUCTS,
        summary: 'Get application status',
        description:
          'Ask Plata where an application is right now. Use this any time, e.g. on page load or if you missed a webhook.\n\n' +
          '- `stage` — where it is (loans: `submitted` → `disbursed`; deposit products: `enrolled` → `active` → `withdrawal_pending`)\n' +
          '- `nextAction` — what happens next (`wait_for_review`, `accept_or_decline_offer`, `deposit`, `request_maturity_withdrawal`, …)\n' +
          '- `downPayment` — equity still owed (loans/mortgages; usually `not_required` for commodity/savings/investment)\n\n' +
          'You can only read applications you submitted with your own API keys.',
        security: [{ plataApiKeys: [] }],
        parameters: [{ $ref: '#/components/parameters/ExternalApplicationId' }],
        responses: {
          '200': {
            description: 'Current status',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/ExternalApplicationStatus' }
                  }
                },
                example: {
                  success: true,
                  data: {
                    applicationId: '6650a1b2c3d4e5f607182930',
                    localApplicationId: 'loan-app-1001',
                    productId: '674a1b2c3d4e5f6789012345',
                    productName: 'Salary loan',
                    productType: 'LOAN',
                    applicationStatus: 'submitted',
                    loanWorkflowStatus: 'approved',
                    stage: 'offer_pending',
                    nextAction: 'accept_or_decline_offer',
                    currency: 'NGN',
                    approvedAmount: 500000,
                    downPayment: { requiredAmount: 0, paidAmount: 0, outstandingAmount: 0, status: 'not_required' },
                    offer: { sentAt: '2026-09-20T09:30:00.000Z' },
                    submittedAt: '2026-09-18T14:02:11.000Z'
                  }
                }
              }
            }
          },
          '401': { $ref: '#/components/responses/UnauthorizedKeys' },
          '404': { description: 'No application with this id was submitted with your keys' }
        }
      }
    },
    '/api/v1/products/external-applications/{applicationId}/offer': {
      get: {
        tags: ['1. Loan'],
        summary: 'Get the loan offer letter',
        description:
          'After the lender approves, they send an offer letter. Show it to the borrower before they accept.\n\n' +
          '`offerStatus`: `not_sent` (wait), `pending` (borrower should decide), `accepted`, or `declined`. ' +
          'When sent, `offerLetter.pdfUrl` is the document to display.',
        security: [{ plataApiKeys: [] }],
        parameters: [{ $ref: '#/components/parameters/ExternalApplicationId' }],
        responses: {
          '200': {
            description: 'Offer state and letter',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/ExternalLoanOffer' }
                  }
                }
              }
            }
          },
          '400': { description: 'Not a LOAN application' },
          '401': { $ref: '#/components/responses/UnauthorizedKeys' },
          '404': { description: 'No application with this id was submitted with your keys' }
        }
      },
      post: {
        tags: ['1. Loan'],
        summary: 'Accept or decline the loan offer',
        description:
          'Send the borrower’s decision on the offer letter.\n\n' +
          '- **Accept:** `{ "action": "accept", "acceptedTerms": true }`\n' +
          '- **Decline:** `{ "action": "decline" }`\n\n' +
          '**Down payment.** If `downPayment.status` is `pending` on the status call, the offer cannot be accepted until it is paid. Either:\n' +
          '1. the borrower pays by bank transfer to the lender’s Repayment account with reference `equity-payment:{applicationId}` (Plata marks it paid automatically), then accept; or\n' +
          '2. you collect it yourself and send `downPayment: { amount, providerReference }` in this same accept call.\n\n' +
          'Accepting does not move money. The lender then disburses, and the loan moves to `disbursed`. Accepting twice is safe.',
        security: [{ plataApiKeys: [] }],
        parameters: [{ $ref: '#/components/parameters/ExternalApplicationId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ExternalLoanOfferResponseRequest' },
              examples: {
                accept: { summary: 'Accept', value: { action: 'accept', acceptedTerms: true } },
                acceptWithDownPayment: {
                  summary: 'Accept and record a down payment you collected',
                  value: {
                    action: 'accept',
                    acceptedTerms: true,
                    downPayment: { amount: 50000, providerReference: 'pay_20260928_0001' }
                  }
                },
                decline: { summary: 'Decline', value: { action: 'decline' } }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Decision recorded. Plata also sends `loan_workflow_status.updated` to your callback.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string', example: 'Loan offer accepted' },
                    data: { $ref: '#/components/schemas/ExternalLoanOffer' }
                  }
                }
              }
            }
          },
          '400': { description: 'Invalid body (e.g. acceptedTerms missing) or not a LOAN application' },
          '401': { $ref: '#/components/responses/UnauthorizedKeys' },
          '402': { description: 'Down payment is required and has not been paid' },
          '404': { description: 'No application with this id was submitted with your keys' },
          '409': { description: 'Offer letter not sent yet, or the offer was already declined' }
        }
      }
    },
    '/api/v1/products/external-applications/{applicationId}/account': {
      get: {
        tags: ALL_PRODUCTS,
        summary: 'Get application account details',
        description:
          'Live account for the application you submitted.\n\n' +
          '**LOAN / MORTGAGE:** before disbursement `accountStatus` is `not_disbursed`; after you get principal, ' +
          '`disbursedAmount`, outstanding balance, next instalment, and overdue info.\n\n' +
          '**COMMODITY / SAVINGS / INVESTMENT:** holding summary from the contract snapshot — `balance`, units, ' +
          '`maturityAt`, `holdingStatus`, and any `pendingWithdrawal`. `accountStatus` is `enrolled`, `active`, ' +
          '`withdrawal_pending`, or `withdrawn`.',
        security: [{ plataApiKeys: [] }],
        parameters: [{ $ref: '#/components/parameters/ExternalApplicationId' }],
        responses: {
          '200': {
            description: 'Account summary',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/ExternalLoanAccount' }
                  }
                },
                examples: {
                  loan: {
                    summary: 'Disbursed loan',
                    value: {
                      success: true,
                      data: {
                        applicationId: '6650a1b2c3d4e5f607182930',
                        localApplicationId: 'loan-app-1001',
                        productId: '674a1b2c3d4e5f6789012345',
                        productType: 'LOAN',
                        accountStatus: 'active',
                        stage: 'disbursed',
                        currency: 'NGN',
                        principal: 500000,
                        disbursedAmount: 492500,
                        outstandingAmount: 533061.92,
                        repaymentScheduleAvailable: true
                      }
                    }
                  },
                  commodity: {
                    summary: 'Commodity holding',
                    value: {
                      success: true,
                      data: {
                        applicationId: '6650a1b2c3d4e5f607182931',
                        localApplicationId: 'commodity-1001',
                        productId: '674a1b2c3d4e5f6789012347',
                        productType: 'COMMODITY',
                        accountStatus: 'active',
                        stage: 'active',
                        currency: 'NGN',
                        userId: 'user_7788',
                        balance: 90000,
                        quantity: 2,
                        unitAmount: 45000,
                        amount: 90000,
                        holdingStatus: 'LOCKED',
                        repaymentScheduleAvailable: false
                      }
                    }
                  }
                }
              }
            }
          },
          '401': { $ref: '#/components/responses/UnauthorizedKeys' },
          '404': { description: 'Application not found for this merchant' }
        }
      }
    },
    '/api/v1/products/external-applications/{applicationId}/repayment-schedule': {
      get: {
        tags: ['1. Loan', '2. Mortgage'],
        summary: 'Get loan repayment details (schedule)',
        description:
          'Every instalment: due date, amount, principal / interest split, balance after payment, and whether it is `paid`, `pending`, or `overdue`. ' +
          '`isNext: true` marks the next one to pay.\n\n' +
          'The schedule is created when the loan is disbursed. Before that this returns **409** with the current stage.',
        security: [{ plataApiKeys: [] }],
        parameters: [{ $ref: '#/components/parameters/ExternalApplicationId' }],
        responses: {
          '200': {
            description: 'Repayment schedule',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/RepaymentSchedule' }
                  }
                }
              }
            }
          },
          '400': { description: 'Not a LOAN or MORTGAGE application' },
          '401': { $ref: '#/components/responses/UnauthorizedKeys' },
          '404': { description: 'No application with this id was submitted with your keys' },
          '409': { description: 'Loan not disbursed yet, so no schedule exists' },
          '503': { description: 'Billing temporarily unavailable; retry' }
        }
      }
    },
    '/api/v1/products/sub-merchant-activations': {
      post: {
        tags: ALL_PRODUCTS,
        summary: '4. Report sub-merchant product on or off',
        description:
          'Repeated in every product section. Call when a sub-merchant activates or deactivates the product you are integrating. ' +
          '`status` is `active` or `deactivated`. Optional `complianceStatus` is stored for that sub-merchant.',
        security: [{ plataApiKeys: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SubMerchantActivationRequest' },
              example: {
                appId: 'app_123',
                productId: '674a1b2c3d4e5f6789012345',
                merchantId: 'merchant_parent',
                merchantName: 'Parent Store',
                subMerchant: {
                  id: 'subm_1001',
                  name: 'Sub Merchant',
                  email: 'sub@example.com',
                  phone: '+2348011112222'
                },
                status: 'active',
                complianceStatus: 'completed'
              }
            }
          }
        },
        responses: {
          '200': { description: 'Activation recorded' },
          '401': { $ref: '#/components/responses/UnauthorizedKeys' }
        }
      }
    },
    '/api/v1/products/sub-merchant-usage-events': {
      post: {
        tags: ALL_PRODUCTS,
        summary: '5. Report that a customer started using the product',
        description:
          'Repeated in every product section. Call once when an external customer starts a loan, mortgage, commodity purchase, savings plan, or investment.',
        security: [{ plataApiKeys: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SubMerchantUsageEventRequest' }
            }
          }
        },
        responses: {
          '200': { description: 'Usage event recorded' },
          '401': { $ref: '#/components/responses/UnauthorizedKeys' }
        }
      }
    },
    '/api/v1/wallets/commodity/principal-repayment': {
      post: {
        tags: ['3. Commodity'],
        summary: '6. Record commodity principal (credit Repayment)',
        description:
          'Call when the customer pays commodity principal. Credits the product-creator **Repayment** wallet. ' +
          'Required: `creatorMerchantId`, `creatorAppId`, `amount`, `referenceId`. ' +
          'Old URL with the same body: `POST /api/v1/wallets/commodity/principal-settlement`.',
        security: [{ plataApiKeys: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PrincipalRepaymentRequest' },
              example: {
                creatorMerchantId: 'merchant_creator',
                creatorAppId: 'app_creator',
                productId: '674a1b2c3d4e5f6789012345',
                amount: 48600,
                referenceId: 'commodity-sale-abc123',
                applicationId: '66app001',
                category: 'COMMODITY_DEPOSIT'
              }
            }
          }
        },
        responses: {
          '200': { description: 'REPAYMENT wallet credited' },
          '401': { $ref: '#/components/responses/UnauthorizedKeys' }
        }
      }
    },
    '/api/v1/wallets/savings/principal-repayment': {
      post: {
        tags: ['4. Savings'],
        summary: '6. Record a savings deposit or top-up (credit Repayment)',
        description:
          'Call when the customer deposits or tops up. Credits the product-creator **Repayment** wallet. ' +
          'Required: `creatorMerchantId`, `creatorAppId`, `amount`, `referenceId`. ' +
          'Old URL with the same body: `POST /api/v1/wallets/savings/principal-settlement`.',
        security: [{ plataApiKeys: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PrincipalRepaymentRequest' }
            }
          }
        },
        responses: {
          '200': { description: 'REPAYMENT wallet credited' },
          '401': { $ref: '#/components/responses/UnauthorizedKeys' }
        }
      }
    },
    '/api/v1/wallets/investment/principal-repayment': {
      post: {
        tags: ['5. Investment'],
        summary: '6. Record investment principal (credit Repayment)',
        description:
          'Call when the customer pays investment principal. Credits the product-creator **Repayment** wallet. ' +
          'Required: `creatorMerchantId`, `creatorAppId`, `amount`, `referenceId`. ' +
          'Old URL with the same body: `POST /api/v1/wallets/investment/principal-settlement`.',
        security: [{ plataApiKeys: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PrincipalRepaymentRequest' }
            }
          }
        },
        responses: {
          '200': { description: 'REPAYMENT wallet credited' },
          '401': { $ref: '#/components/responses/UnauthorizedKeys' }
        }
      }
    },
    '/api/v1/wallets/savings/application-activity': {
      post: {
        tags: ['4. Savings'],
        summary: '7. Read savings activity for one plan',
        description:
          'Savings section only. Returns successful deposits, top-ups, and withdrawals for `applicationId` or `applicationIds`. Amounts are NGN naira. Use this for the earnings and activity feed.',
        security: [{ plataApiKeys: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SavingsApplicationActivityRequest' },
              example: {
                applicationId: '66app001',
                limit: 50
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Activity items',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        items: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              reference: { type: 'string' },
                              applicationId: { type: 'string' },
                              productId: { type: 'string' },
                              amount: { type: 'number' },
                              at: { type: 'string', format: 'date-time' },
                              activity: { type: 'string', enum: ['DEPOSIT', 'TOP_UP', 'WITHDRAWAL'] },
                              status: { type: 'string', example: 'successful' }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          '400': { description: 'applicationId or applicationIds required' },
          '401': { $ref: '#/components/responses/UnauthorizedKeys' }
        }
      }
    },
    '/api/v1/wallets/commodity/maturity-withdrawal-request': {
      post: {
        tags: ['3. Commodity'],
        summary: '7. Ask the FI to approve a commodity maturity withdrawal',
        description:
          'Does **not** move money. Puts the request on the FI approval queue (`pending_approval`). Same body shape as savings and investment. Idempotent on `referenceId`.',
        security: [{ plataApiKeys: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MaturityWithdrawalRequest' }
            }
          }
        },
        responses: {
          '201': { description: 'Queued (status pending_approval)' },
          '200': { description: 'Duplicate referenceId' },
          '401': { $ref: '#/components/responses/UnauthorizedKeys' }
        }
      }
    },
    '/api/v1/wallets/savings/maturity-withdrawal-request': {
      post: {
        tags: ['4. Savings'],
        summary: '8. Ask the FI to approve a savings maturity withdrawal',
        description:
          'Does **not** move money. Use for both flex (after lock rules) and target/lock plans. Status comes back as `pending_approval`. Idempotent on `referenceId`.',
        security: [{ plataApiKeys: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MaturityWithdrawalRequest' }
            }
          }
        },
        responses: {
          '201': { description: 'Queued (status pending_approval)' },
          '200': { description: 'Duplicate referenceId' },
          '401': { $ref: '#/components/responses/UnauthorizedKeys' }
        }
      }
    },
    '/api/v1/wallets/investment/maturity-withdrawal-request': {
      post: {
        tags: ['5. Investment'],
        summary: '7. Ask the FI to approve an investment maturity withdrawal',
        description:
          'Does **not** move money. Puts the request on the FI approval queue. Idempotent on `referenceId`.',
        security: [{ plataApiKeys: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MaturityWithdrawalRequest' }
            }
          }
        },
        responses: {
          '201': { description: 'Queued (status pending_approval)' },
          '200': { description: 'Duplicate referenceId' },
          '401': { $ref: '#/components/responses/UnauthorizedKeys' }
        }
      }
    },
    '/api/v1/wallets/commodity/maturity-payout': {
      post: {
        tags: ['3. Commodity'],
        summary: '8. Debit Treasury after commodity maturity is approved',
        description:
          'Call only after the FI approved the withdrawal request. Debits the product-creator **Treasury** wallet. ' +
          'You credit the customer on your own platform — this call does not credit their wallet. ' +
          'Send `amount`, or `principalAmount` + `interestAmount`. `402` means Treasury does not have enough.',
        security: [{ plataApiKeys: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MaturityPayoutRequest' }
            }
          }
        },
        responses: {
          '201': { description: 'Treasury debited' },
          '200': { description: 'Duplicate referenceId' },
          '402': { description: 'Insufficient Treasury balance' },
          '401': { $ref: '#/components/responses/UnauthorizedKeys' }
        }
      }
    },
    '/api/v1/wallets/savings/maturity-payout': {
      post: {
        tags: ['4. Savings'],
        summary: '9. Debit Treasury after savings maturity is approved',
        description:
          'Call only after the FI approved the withdrawal request. Debits creator **Treasury**. Credit the customer on your platform. `402` means Treasury does not have enough.',
        security: [{ plataApiKeys: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MaturityPayoutRequest' }
            }
          }
        },
        responses: {
          '201': { description: 'Treasury debited' },
          '200': { description: 'Duplicate referenceId' },
          '402': { description: 'Insufficient Treasury balance' },
          '401': { $ref: '#/components/responses/UnauthorizedKeys' }
        }
      }
    },
    '/api/v1/wallets/investment/maturity-payout': {
      post: {
        tags: ['5. Investment'],
        summary: '8. Debit Treasury after investment maturity is approved',
        description:
          'Call only after the FI approved the withdrawal request. Debits creator **Treasury**. Credit the customer on your platform. `402` means Treasury does not have enough.',
        security: [{ plataApiKeys: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MaturityPayoutRequest' }
            }
          }
        },
        responses: {
          '201': { description: 'Treasury debited' },
          '200': { description: 'Duplicate referenceId' },
          '402': { description: 'Insufficient Treasury balance' },
          '401': { $ref: '#/components/responses/UnauthorizedKeys' }
        }
      }
    },
    '/api/v1/wallets/merchant/{merchantId}/all': {
      get: {
        tags: ALL_PRODUCTS,
        summary: 'Fetch merchant wallet details',
        description:
          'Returns this merchant’s Treasury, Billing, and Repayment wallets for one app. `merchantId` must match your API key merchant. `appId` is required (wallets are app-scoped).',
        security: [{ plataApiKeys: [] }],
        parameters: [
          {
            in: 'path',
            name: 'merchantId',
            required: true,
            schema: { type: 'string' },
            description: 'Your merchant id (must match the API key)'
          },
          {
            in: 'query',
            name: 'appId',
            required: true,
            schema: { type: 'string' },
            description: 'App whose wallets to return'
          }
        ],
        responses: {
          '200': { description: 'Merchant wallets' },
          '400': { description: 'appId missing' },
          '401': { $ref: '#/components/responses/UnauthorizedKeys' },
          '403': { description: 'merchantId does not match your API key' }
        }
      }
    },
    '/api/v1/wallets/merchant/{merchantId}/type/{walletType}': {
      get: {
        tags: ALL_PRODUCTS,
        summary: 'Fetch one merchant wallet by type',
        description:
          '`walletType` is `TREASURY`, `BILLING`, or `REPAYMENT` (legacy aliases may work). `appId` is required.',
        security: [{ plataApiKeys: [] }],
        parameters: [
          { in: 'path', name: 'merchantId', required: true, schema: { type: 'string' } },
          {
            in: 'path',
            name: 'walletType',
            required: true,
            schema: { type: 'string', enum: ['TREASURY', 'BILLING', 'REPAYMENT'] }
          },
          {
            in: 'query',
            name: 'appId',
            required: true,
            schema: { type: 'string' },
            description: 'App whose wallet to return'
          }
        ],
        responses: {
          '200': { description: 'Wallet' },
          '400': { description: 'appId missing' },
          '401': { $ref: '#/components/responses/UnauthorizedKeys' },
          '403': { description: 'merchantId does not match your API key' },
          '404': { description: 'Wallet not found' }
        }
      }
    },
    '/api/v1/wallets/treasury/{merchantId}/transactions': {
      get: {
        tags: ALL_PRODUCTS,
        summary: 'Fetch Treasury wallet history',
        description:
          'Transaction history for the merchant Treasury wallet for one app. `appId` is required. Scoped to your API key merchant.',
        security: [{ plataApiKeys: [] }],
        parameters: [
          { in: 'path', name: 'merchantId', required: true, schema: { type: 'string' } },
          {
            in: 'query',
            name: 'appId',
            required: true,
            schema: { type: 'string' },
            description: 'App whose Treasury history to return'
          },
          { in: 'query', name: 'startDate', schema: { type: 'string', format: 'date-time' } },
          { in: 'query', name: 'endDate', schema: { type: 'string', format: 'date-time' } },
          { in: 'query', name: 'type', schema: { type: 'string' } },
          { in: 'query', name: 'limit', schema: { type: 'integer' } },
          { in: 'query', name: 'skip', schema: { type: 'integer' } }
        ],
        responses: {
          '200': { description: 'Transactions + pagination' },
          '400': { description: 'appId missing' },
          '401': { $ref: '#/components/responses/UnauthorizedKeys' },
          '403': { description: 'merchantId does not match your API key' }
        }
      }
    },
    '/api/v1/wallets/billing/{merchantId}/transactions': {
      get: {
        tags: ALL_PRODUCTS,
        summary: 'Fetch Billing wallet history',
        description:
          'Transaction history for the merchant Billing wallet (platform fees) for one app. `appId` is required.',
        security: [{ plataApiKeys: [] }],
        parameters: [
          { in: 'path', name: 'merchantId', required: true, schema: { type: 'string' } },
          {
            in: 'query',
            name: 'appId',
            required: true,
            schema: { type: 'string' },
            description: 'App whose Billing history to return'
          },
          { in: 'query', name: 'startDate', schema: { type: 'string', format: 'date-time' } },
          { in: 'query', name: 'endDate', schema: { type: 'string', format: 'date-time' } },
          { in: 'query', name: 'type', schema: { type: 'string' } },
          { in: 'query', name: 'limit', schema: { type: 'integer' } },
          { in: 'query', name: 'skip', schema: { type: 'integer' } }
        ],
        responses: {
          '200': { description: 'Transactions + pagination' },
          '400': { description: 'appId missing' },
          '401': { $ref: '#/components/responses/UnauthorizedKeys' },
          '403': { description: 'merchantId does not match your API key' }
        }
      }
    },
    '/api/v1/wallets/repayment/{merchantId}/transactions': {
      get: {
        tags: ALL_PRODUCTS,
        summary: 'Fetch Repayment wallet history',
        description:
          'Transaction history for the merchant Repayment wallet (collections, deposits) for one app. `appId` is required.',
        security: [{ plataApiKeys: [] }],
        parameters: [
          { in: 'path', name: 'merchantId', required: true, schema: { type: 'string' } },
          {
            in: 'query',
            name: 'appId',
            required: true,
            schema: { type: 'string' },
            description: 'App whose Repayment history to return'
          },
          { in: 'query', name: 'startDate', schema: { type: 'string', format: 'date-time' } },
          { in: 'query', name: 'endDate', schema: { type: 'string', format: 'date-time' } },
          { in: 'query', name: 'type', schema: { type: 'string' } },
          { in: 'query', name: 'limit', schema: { type: 'integer' } },
          { in: 'query', name: 'skip', schema: { type: 'integer' } }
        ],
        responses: {
          '200': { description: 'Transactions + pagination' },
          '400': { description: 'appId missing' },
          '401': { $ref: '#/components/responses/UnauthorizedKeys' },
          '403': { description: 'merchantId does not match your API key' }
        }
      }
    },
    '/api/v1/wallets/user/{userId}': {
      get: {
        tags: ALL_PRODUCTS,
        summary: 'Fetch user wallet details',
        description:
          'Returns the customer wallet for `userId`. Only wallets under your merchant are visible with API keys.',
        security: [{ plataApiKeys: [] }],
        parameters: [
          {
            in: 'path',
            name: 'userId',
            required: true,
            schema: { type: 'string' },
            description: 'Plata / external user id that owns the wallet'
          }
        ],
        responses: {
          '200': { description: 'User wallet' },
          '401': { $ref: '#/components/responses/UnauthorizedKeys' },
          '403': { description: 'Wallet belongs to another merchant' },
          '404': { description: 'Wallet not found' }
        }
      }
    },
    '/api/v1/wallets/user/{userId}/transactions': {
      get: {
        tags: ALL_PRODUCTS,
        summary: 'Fetch user wallet history',
        description: 'Transaction history for a customer wallet under your merchant.',
        security: [{ plataApiKeys: [] }],
        parameters: [
          { in: 'path', name: 'userId', required: true, schema: { type: 'string' } },
          { in: 'query', name: 'startDate', schema: { type: 'string', format: 'date-time' } },
          { in: 'query', name: 'endDate', schema: { type: 'string', format: 'date-time' } },
          { in: 'query', name: 'type', schema: { type: 'string' } },
          { in: 'query', name: 'limit', schema: { type: 'integer' } },
          { in: 'query', name: 'skip', schema: { type: 'integer' } }
        ],
        responses: {
          '200': { description: 'Transactions + pagination' },
          '401': { $ref: '#/components/responses/UnauthorizedKeys' },
          '403': { description: 'Wallet belongs to another merchant' },
          '404': { description: 'Wallet not found' }
        }
      }
    }
  },
  components: integratorComponents,
  security: [{ plataApiKeys: [] }]
};

export default merchantIntegrationSpec;
