import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import mongoose from 'mongoose';
import { ProductApplicationModel } from '../models/ProductApplicationModel';
import productApplicationService from '../services/productApplicationService';
import { fetchUpstreamAmortizationSchedule } from '../services/amortizationScheduleClient';

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
    findById: jest.fn()
  },
  toProductApplication: (doc: Record<string, unknown>) => ({
    id: String((doc._id as { toString(): string }).toString()),
    userId: doc.userId,
    productId: doc.productId,
    productName: doc.productName,
    productType: doc.productType,
    amount: doc.amount,
    currency: doc.currency,
    status: doc.status,
    appId: doc.appId,
    requirementSubmissions: [],
    amortizationSchedule: doc.amortizationSchedule,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })
}));

jest.mock('../services/walletService', () => ({
  __esModule: true,
  default: {
    applyProductApplicationApproval: jest.fn(),
    ensureProductWallet: jest.fn(async () => ({
      wallet: { id: 'w1', mainBalance: 0, balance: 0 },
      reusedUpstreamAccount: true
    }))
  }
}));

jest.mock('../services/settlement/settlementChargeService', () => ({
  collectMortgageCharge: jest.fn(),
  collectLoanCharge: jest.fn()
}));

jest.mock('../services/amortizationScheduleClient', () => ({
  fetchUpstreamAmortizationSchedule: jest.fn()
}));

const mockedFindById = ProductApplicationModel.findById as jest.MockedFunction<
  typeof ProductApplicationModel.findById
>;
const mockedFetch = fetchUpstreamAmortizationSchedule as jest.MockedFunction<
  typeof fetchUpstreamAmortizationSchedule
>;

const applicationId = new mongoose.Types.ObjectId();

describe('amortization schedule live overlay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('overlays live paid/next statuses on GET application', async () => {
    mockedFindById.mockResolvedValue({
      _id: applicationId,
      userId: 'user-1',
      productId: 'product-1',
      productName: 'Loan Test Product',
      productType: 'LOAN',
      amount: 500000,
      currency: 'NGN',
      status: 'APPROVED',
      appId: 'app-1',
      merchantId: 'merchant-1',
      save: jest.fn(async () => undefined),
      amortizationSchedule: {
        source: 'confirmed',
        loanAmount: 500000,
        totalInterest: 50,
        totalRepayment: 550,
        periodCount: 2,
        currency: 'NGN',
        paidInstallmentCount: 0,
        outstandingAmount: 550,
        periods: [
          { period: 1, label: 'Payment 1', payment: 275, principal: 250, interest: 25, fees: 0, balance: 250, status: 'pending', isNext: true }
        ]
      }
    } as never);
    mockedFetch.mockResolvedValue({
      source: 'confirmed',
      loanAmount: 500000,
      totalInterest: 50,
      totalRepayment: 550,
      periodCount: 2,
      currency: 'NGN',
      paidInstallmentCount: 1,
      outstandingAmount: 275,
      nextInstallmentNumber: 2,
      periods: [
        {
          period: 1,
          label: 'Payment 1',
          payment: 275,
          principal: 250,
          interest: 25,
          fees: 0,
          balance: 250,
          status: 'paid',
          isNext: false,
          paidAt: '2026-08-20T00:00:00.000Z'
        },
        {
          period: 2,
          label: 'Payment 2',
          payment: 275,
          principal: 250,
          interest: 25,
          fees: 0,
          balance: 0,
          status: 'pending',
          isNext: true
        }
      ]
    });

    const result = await productApplicationService.getApplicationById(applicationId.toString());
    expect(result?.amortizationSchedule?.periods[0].status).toBe('paid');
    expect(result?.amortizationSchedule?.periods[0].isNext).toBe(false);
    expect(result?.amortizationSchedule?.periods[1].isNext).toBe(true);
  });

  it('rejects amortization GET for a different user', async () => {
    mockedFindById.mockResolvedValue({
      _id: applicationId,
      userId: 'user-1',
      productId: 'product-1',
      productName: 'Loan Test Product',
      productType: 'LOAN',
      amount: 500000,
      currency: 'NGN',
      status: 'APPROVED',
      appId: 'app-1'
    } as never);

    await expect(
      productApplicationService.getAmortizationSchedule(applicationId.toString(), 'other-user')
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});
