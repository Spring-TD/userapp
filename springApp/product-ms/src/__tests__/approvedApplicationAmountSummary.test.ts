import { buildApprovedApplicationAmountSummary } from '../utils/approvedApplicationAmountSummary';

describe('approved application amount summary', () => {
  it('returns approved totals by product type with zero defaults', () => {
    const result = buildApprovedApplicationAmountSummary(
      'user-1',
      'app-1',
      [
        {
          _id: { productType: 'LOAN', currency: 'NGN' },
          totalAmount: 100000,
          applicationCount: 2
        },
        {
          _id: { productType: 'MORTGAGE', currency: 'NGN' },
          totalAmount: 12000000,
          applicationCount: 1
        }
      ]
    );

    expect(result).toMatchObject({
      userId: 'user-1',
      appId: 'app-1',
      status: 'APPROVED'
    });
    expect(result.summary.LOAN).toEqual({
      totalAmount: 100000,
      applicationCount: 2,
      currency: 'NGN'
    });
    expect(result.summary.MORTGAGE.totalAmount).toBe(12000000);
    expect(result.summary.SAVINGS).toEqual({
      totalAmount: 0,
      applicationCount: 0,
      currency: 'NGN'
    });
  });
});
