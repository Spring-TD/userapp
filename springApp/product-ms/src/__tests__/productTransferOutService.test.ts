import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const save = jest.fn(async function (this: Record<string, unknown>) {
  return this;
});

jest.mock('../models/ProductApplicationModel', () => ({
  ProductApplicationModel: {
    findById: jest.fn()
  },
  toProductApplication: (doc: Record<string, unknown>) => ({
    id: String(doc._id),
    userId: doc.userId,
    productType: doc.productType,
    amount: doc.amount,
    contractSnapshot: doc.contractSnapshot
  })
}));

jest.mock('../middleware/errorHandler', () => ({
  ApiError: class ApiError extends Error {
    statusCode: number;
    constructor(statusCode: number, message: string) {
      super(message);
      this.statusCode = statusCode;
    }
  }
}));

import { ProductApplicationModel } from '../models/ProductApplicationModel';
import productTransferOutService from '../services/productTransferOutService';

describe('productTransferOutService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debits investment snapshot and amount', async () => {
    const doc = {
      _id: 'app-1',
      userId: 'user-1',
      productType: 'INVESTMENT',
      amount: 1000,
      contractSnapshot: {
        investmentBalance: 1000,
        currentBalance: 1000,
        totalDeposits: 1000
      },
      save
    };
    (ProductApplicationModel.findById as jest.Mock).mockResolvedValue(doc);

    const result = await productTransferOutService.applyTransferOut('app-1', {
      userId: 'user-1',
      amount: 1000,
      referenceId: 'tx-1'
    });

    expect(result.duplicate).toBe(false);
    expect(result.balance).toBe(0);
    expect(doc.amount).toBe(0);
    expect(doc.contractSnapshot.investmentBalance).toBe(0);
    expect(doc.contractSnapshot.currentBalance).toBe(0);
    expect(doc.contractSnapshot.totalWithdrawals).toBe(1000);
    expect(doc.contractSnapshot.lastTransferToPrimaryReferenceId).toBe('tx-1');
    expect(save).toHaveBeenCalled();
  });

  it('is idempotent on referenceId', async () => {
    const doc = {
      _id: 'app-1',
      userId: 'user-1',
      productType: 'INVESTMENT',
      amount: 0,
      contractSnapshot: {
        investmentBalance: 0,
        lastTransferToPrimaryReferenceId: 'tx-1'
      },
      save
    };
    (ProductApplicationModel.findById as jest.Mock).mockResolvedValue(doc);

    const result = await productTransferOutService.applyTransferOut('app-1', {
      userId: 'user-1',
      amount: 1000,
      referenceId: 'tx-1'
    });

    expect(result.duplicate).toBe(true);
    expect(result.balance).toBe(0);
    expect(save).not.toHaveBeenCalled();
  });
});
