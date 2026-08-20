import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import mongoose from 'mongoose';
import { ProductApplicationModel } from '../models/ProductApplicationModel';
import productApplicationService from '../services/productApplicationService';
import walletService from '../services/walletService';
import { collectMortgageCharge } from '../services/settlement/settlementChargeService';

jest.mock('../middleware/errorHandler', () => ({
  ApiError: class ApiError extends Error {
    statusCode: number;

    constructor(statusCode: number, message: string) {
      super(message);
      this.statusCode = statusCode;
      this.name = 'ApiError';
    }
  }
}));

jest.mock('../models/ProductApplicationModel', () => ({
  ProductApplicationModel: {
    findById: jest.fn(),
    findOne: jest.fn()
  },
  toProductApplication: (doc: Record<string, unknown>) => doc
}));

jest.mock('../services/walletService', () => ({
  __esModule: true,
  default: {
    applyProductApplicationApproval: jest.fn()
  }
}));

jest.mock('../services/settlement/settlementChargeService', () => ({
  collectMortgageCharge: jest.fn(),
  collectLoanCharge: jest.fn()
}));

const mockedFindById = ProductApplicationModel.findById as jest.MockedFunction<
  typeof ProductApplicationModel.findById
>;
const mockedWalletApproval = walletService.applyProductApplicationApproval as jest.MockedFunction<
  typeof walletService.applyProductApplicationApproval
>;
const mockedMortgageCharge = collectMortgageCharge as jest.MockedFunction<typeof collectMortgageCharge>;

const applicationId = new mongoose.Types.ObjectId();

function applicationDoc(overrides: Record<string, unknown> = {}) {
  const doc: Record<string, unknown> = {
    _id: applicationId,
    userId: 'user-1',
    productId: 'product-1',
    productName: 'Home Mortgage',
    productType: 'MORTGAGE',
    amount: 500000,
    currency: 'NGN',
    status: 'PENDING',
    appId: 'app-1',
    merchantId: 'merchant-1',
    loanWorkflowStatus: 'under_review',
    contractSnapshot: {},
    requirementSubmissions: [],
    save: jest.fn().mockResolvedValue(undefined as never),
    ...overrides
  };
  return doc;
}

describe('applyPlataLoanWorkflowWebhook post-approval', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedWalletApproval.mockResolvedValue({
      duplicate: false,
      wallet: { id: 'wallet-1', userId: 'user-1', merchantId: 'merchant-1' }
    });
    mockedMortgageCharge.mockResolvedValue({ success: true });
  });

  it('does not credit wallet on deferred mortgage approval', async () => {
    const doc = applicationDoc();
    mockedFindById.mockResolvedValue(doc as never);

    await productApplicationService.applyPlataLoanWorkflowWebhook({
      event: 'loan_workflow_status.updated',
      eventId: 'evt-1',
      data: {
        localApplicationId: applicationId.toString(),
        loanWorkflowStatus: 'approved',
        productType: 'MORTGAGE',
        approvedAmount: 500000,
        disbursementDeferred: true,
        postApprovalFulfillment: {
          status: 'offer_pending',
          disbursementDeferred: true,
          downPayment: { requiredAmount: 100000, currency: 'NGN' }
        }
      }
    });

    expect(mockedWalletApproval).not.toHaveBeenCalled();
    expect(doc.postApprovalFulfillment).toEqual(
      expect.objectContaining({ status: 'offer_pending' })
    );
    expect(doc.disbursementDeferred).toBe(true);
  });

  it('does not credit wallet on deferred loan approval', async () => {
    const doc = applicationDoc({
      productType: 'LOAN',
      productName: 'Personal Loan',
      amount: 200000
    });
    mockedFindById.mockResolvedValue(doc as never);

    await productApplicationService.applyPlataLoanWorkflowWebhook({
      event: 'loan_workflow_status.updated',
      eventId: 'evt-loan-1',
      data: {
        localApplicationId: applicationId.toString(),
        loanWorkflowStatus: 'approved',
        productType: 'LOAN',
        approvedAmount: 200000,
        disbursementDeferred: true,
        postApprovalFulfillment: {
          status: 'offer_pending',
          disbursementDeferred: true,
          downPayment: { requiredAmount: 0, currency: 'NGN' }
        }
      }
    });

    expect(mockedWalletApproval).not.toHaveBeenCalled();
    expect(doc.postApprovalFulfillment).toEqual(
      expect.objectContaining({ status: 'offer_pending' })
    );
    expect(doc.disbursementDeferred).toBe(true);
  });

  it('credits wallet when disbursement webhook includes loanDisbursement', async () => {
    const doc = applicationDoc({
      loanWorkflowStatus: 'approved',
      status: 'APPROVED',
      disbursementDeferred: true,
      postApprovalFulfillment: { status: 'down_payment_paid' }
    });
    mockedFindById.mockResolvedValue(doc as never);

    await productApplicationService.applyPlataLoanWorkflowWebhook({
      event: 'loan_workflow_status.updated',
      eventId: 'evt-2',
      data: {
        localApplicationId: applicationId.toString(),
        loanWorkflowStatus: 'approved',
        productType: 'MORTGAGE',
        approvedAmount: 500000,
        disbursementDeferred: false,
        loanDisbursement: {
          amount: 500000,
          currency: 'NGN',
          walletId: 'wallet-1'
        },
        amortizationSchedule: {
          source: 'confirmed',
          loanAmount: 500000,
          instalment: 45840,
          totalInterest: 50080,
          totalRepayment: 550080,
          periodCount: 2,
          currency: 'NGN',
          paidInstallmentCount: 0,
          outstandingAmount: 550080,
          nextInstallmentNumber: 1,
          periods: [
            {
              period: 1,
              label: 'Payment 1',
              dueDate: '2026-08-20T00:00:00.000Z',
              payment: 45840,
              principal: 38340,
              interest: 7500,
              fees: 0,
              balance: 461660,
              status: 'pending',
              isNext: true
            },
            {
              period: 2,
              label: 'Payment 2',
              dueDate: '2026-09-20T00:00:00.000Z',
              payment: 45840,
              principal: 40000,
              interest: 5840,
              fees: 0,
              balance: 421660,
              status: 'pending',
              isNext: false
            }
          ]
        },
        postApprovalFulfillment: { status: 'disbursed' }
      }
    });

    expect(mockedWalletApproval).toHaveBeenCalled();
    expect(doc.disbursementDeferred).toBe(false);
    expect(doc.amortizationSchedule).toEqual(
      expect.objectContaining({
        source: 'confirmed',
        periodCount: 2,
        periods: expect.arrayContaining([
          expect.objectContaining({ period: 1, isNext: true, status: 'pending' })
        ])
      })
    );
  });
});
