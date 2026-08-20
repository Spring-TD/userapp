import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import mongoose from 'mongoose';
import pendingApprovedLoanService from '../services/pendingApprovedLoanService';
import { ProductApplicationModel } from '../models/ProductApplicationModel';
import * as pendingApprovedLoanClient from '../services/pendingApprovedLoanClient';
import { collectLoanDownPayment } from '../services/settlement/settlementChargeService';

jest.mock('../middleware/errorHandler', () => ({
  ApiError: class ApiError extends Error {
    statusCode: number;
    data?: unknown;

    constructor(statusCode: number, message: string, _isOperational = true, data?: unknown) {
      super(message);
      this.statusCode = statusCode;
      this.name = 'ApiError';
      this.data = data;
    }
  }
}));

jest.mock('../models/ProductApplicationModel', () => ({
  ProductApplicationModel: {
    findById: jest.fn()
  },
  toProductApplication: (doc: Record<string, unknown>) => ({
    id: String((doc._id as { toString?: () => string })?.toString?.() ?? doc._id),
    userId: doc.userId,
    productType: doc.productType,
    loanWorkflowStatus: doc.loanWorkflowStatus,
    postApprovalFulfillment: doc.postApprovalFulfillment,
    amount: doc.amount,
    currency: doc.currency,
    productId: doc.productId,
    appId: doc.appId,
    merchantId: doc.merchantId
  })
}));

jest.mock('../services/pendingApprovedLoanClient', () => ({
  fetchUpstreamPendingApprovedLoan: jest.fn(),
  proxyLoanDownPayment: jest.fn(),
  proxyRespondToLoanOffer: jest.fn()
}));

jest.mock('../services/settlement/settlementChargeService', () => ({
  collectLoanDownPayment: jest.fn()
}));

jest.mock('../services/offerLetterPresentationService', () => ({
  buildOfferLetterForProductApplication: jest.fn(async () => ({
    html: '<p>offer</p>',
    text: 'offer',
    content: { reference: 'REF', offerValidUntil: '2026-12-31' }
  }))
}));

jest.mock('../utils/loanOfferTerms', () => ({
  buildLoanOfferTerms: jest.fn(() => ({
    approvedAmount: 100000,
    downPaymentDue: 20000,
    interestRate: 15,
    totalRepayable: 115000,
    tenureMonths: 12,
    repaymentFrequency: 'Monthly'
  }))
}));

const mockedFindById = ProductApplicationModel.findById as jest.MockedFunction<
  typeof ProductApplicationModel.findById
>;
const mockedFetchUpstream =
  pendingApprovedLoanClient.fetchUpstreamPendingApprovedLoan as jest.MockedFunction<
    typeof pendingApprovedLoanClient.fetchUpstreamPendingApprovedLoan
  >;
const mockedProxyDownPayment = pendingApprovedLoanClient.proxyLoanDownPayment as jest.MockedFunction<
  typeof pendingApprovedLoanClient.proxyLoanDownPayment
>;
const mockedCollectDownPayment = collectLoanDownPayment as jest.MockedFunction<
  typeof collectLoanDownPayment
>;

const applicationId = new mongoose.Types.ObjectId().toString();

describe('PendingApprovedLoanService down payment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debits Central Wallet and credits Plata creator before recording loan down payment', async () => {
    const now = new Date();
    const save = jest.fn(async function (this: Record<string, unknown>) {
      return this;
    });
    const applicationDoc = {
      _id: { toString: () => applicationId },
      id: applicationId,
      userId: 'owner-1',
      productType: 'LOAN',
      productId: 'product-1',
      productName: 'Loan Test Product',
      amount: 100000,
      currency: 'NGN',
      email: 'owner@example.com',
      status: 'approved',
      merchantId: 'merchant-spring',
      appId: 'app-spring',
      loanWorkflowStatus: 'approved',
      upstreamApplicationId: 'upstream-1',
      postApprovalFulfillment: {
        status: 'offer_pending',
        offer: { sentAt: now.toISOString() },
        contract: { documentUrl: 'https://cdn.example/offer.pdf' },
        downPayment: { requiredAmount: 20000, currency: 'NGN' }
      },
      createdAt: now,
      updatedAt: now,
      save
    };

    mockedFindById.mockResolvedValue(applicationDoc as never);
    mockedFetchUpstream.mockResolvedValue({
      postApprovalFulfillment: applicationDoc.postApprovalFulfillment
    } as never);
    mockedCollectDownPayment.mockResolvedValue({
      success: true,
      userTransactionId: 'user-tx-loan-1',
      transactionId: 'plata-creator-tx-loan-1',
      userWallet: { id: 'uw-1', mainBalance: 80000, currency: 'NGN' }
    } as never);
    mockedProxyDownPayment.mockResolvedValue({
      postApprovalFulfillment: {
        status: 'offer_accepted',
        offer: { sentAt: now.toISOString(), acceptedAt: now.toISOString(), acceptedTerms: true },
        contract: { documentUrl: 'https://cdn.example/offer.pdf' },
        downPayment: {
          requiredAmount: 20000,
          currency: 'NGN',
          paidAt: now.toISOString(),
          providerReference: 'user-tx-loan-1'
        }
      },
      equityPayment: { status: 'paid', providerReference: 'user-tx-loan-1' }
    } as never);

    const detail = await pendingApprovedLoanService.payDownPayment(applicationId, 'owner-1');

    expect(mockedCollectDownPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        merchantId: 'merchant-spring',
        appId: 'app-spring',
        userId: 'owner-1',
        amount: 20000,
        referenceId: `loan-down-payment:${applicationId}`
      })
    );
    expect(mockedProxyDownPayment).toHaveBeenCalledWith(applicationId, {
      amount: 20000,
      providerReference: 'user-tx-loan-1',
      acceptedTerms: true,
      springUserId: 'owner-1'
    });
    expect(detail.payment).toMatchObject({
      method: 'wallet',
      amount: 20000,
      userTransactionId: 'user-tx-loan-1',
      repaymentTransactionId: 'plata-creator-tx-loan-1'
    });
  });
});
