import mongoose from 'mongoose';
import {
  collectLoanChargeOnProductTransfer,
  resolveLoanChargeOnProductTransfer
} from '../services/settlement/loanTransferSettlementService';
import { collectLoanCharge, collectMortgageCharge } from '../services/settlement/settlementChargeService';
import { ProductApplicationModel } from '../models/ProductApplicationModel';

jest.mock('../services/settlement/settlementChargeService', () => ({
  collectLoanCharge: jest.fn(),
  collectMortgageCharge: jest.fn()
}));

jest.mock('../models/ProductApplicationModel', () => ({
  ProductApplicationModel: {
    findById: jest.fn()
  }
}));

jest.mock('../db/database', () => ({
  db: {
    findMerchantConfiguration: jest.fn()
  }
}));

import { db } from '../db/database';

const collectLoanChargeMock = collectLoanCharge as jest.MockedFunction<typeof collectLoanCharge>;
const findByIdMock = ProductApplicationModel.findById as jest.Mock;
const findMerchantConfigurationMock = db.findMerchantConfiguration as jest.Mock;

describe('collectLoanChargeOnProductTransfer', () => {
  const applicationId = new mongoose.Types.ObjectId().toString();
  const userId = 'user_123';

  beforeEach(() => {
    jest.clearAllMocks();
    findMerchantConfigurationMock.mockResolvedValue({ springTDFee: 1 });
  });

  it('skips non-loan applications', async () => {
    findByIdMock.mockResolvedValue({
      userId,
      productType: 'INVESTMENT',
      amount: 1000,
      merchantId: 'merchant_1'
    });

    const result = await collectLoanChargeOnProductTransfer({ applicationId, userId });
    expect(result.skipped).toBe(true);
    expect(result.skippedReason).toBe('not_lending_product');
    expect(collectLoanChargeMock).not.toHaveBeenCalled();
  });

  it('skips equity loans (charged on approval)', async () => {
    findByIdMock.mockResolvedValue({
      userId,
      productType: 'LOAN',
      amount: 1_000_000,
      merchantId: 'merchant_1',
      contractSnapshot: { equityContribution: 200_000 }
    });

    const result = await collectLoanChargeOnProductTransfer({ applicationId, userId });
    expect(result.skipped).toBe(true);
    expect(result.skippedReason).toBe('equity_lending_charged_on_approval');
    expect(collectLoanChargeMock).not.toHaveBeenCalled();
  });

  it('resolves LOAN_CHARGE params for no-equity loans', async () => {
    findByIdMock.mockResolvedValue({
      userId,
      productType: 'LOAN',
      amount: 1_000_000,
      merchantId: 'merchant_1',
      appId: 'app_1',
      productId: 'prod_1',
      currency: 'NGN',
      contractSnapshot: {}
    });

    const result = await resolveLoanChargeOnProductTransfer({ applicationId, userId });

    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.skipped).toBe(false);
    expect(result.chargeAmount).toBe(10_000);
    expect(result.collect?.referenceId).toBe(`settlement:loan:transfer:${applicationId}`);
    expect(collectLoanChargeMock).not.toHaveBeenCalled();
  });

  it('resolves MORTGAGE_CHARGE params for no-equity mortgages', async () => {
    findByIdMock.mockResolvedValue({
      userId,
      productType: 'MORTGAGE',
      amount: 1_000_000,
      merchantId: 'merchant_1',
      appId: 'app_1',
      productId: 'prod_1',
      currency: 'NGN',
      contractSnapshot: {}
    });

    const result = await resolveLoanChargeOnProductTransfer({ applicationId, userId });

    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.skipped).toBe(false);
    expect(result.chargeAmount).toBe(10_000);
    expect(result.collect?.category).toBe('MORTGAGE_CHARGE');
    expect(result.collect?.referenceId).toBe(`settlement:mortgage:transfer:${applicationId}`);
  });

  it('collects LOAN_CHARGE from PRIMARY for no-equity loans', async () => {
    findByIdMock.mockResolvedValue({
      userId,
      productType: 'LOAN',
      amount: 1_000_000,
      merchantId: 'merchant_1',
      appId: 'app_1',
      productId: 'prod_1',
      currency: 'NGN',
      contractSnapshot: {}
    });
    collectLoanChargeMock.mockResolvedValue({ success: true, transactionId: 'tx_1' });

    const result = await collectLoanChargeOnProductTransfer({ applicationId, userId });

    expect(result.success).toBe(true);
    expect(collectLoanChargeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        applicationId,
        userId,
        loanPrincipal: 1_000_000,
        debitUserWallet: true,
        referenceId: `settlement:loan:transfer:${applicationId}`
      })
    );
  });
});
