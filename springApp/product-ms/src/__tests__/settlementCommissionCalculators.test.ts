import {
  calculateAccountMaintenanceCharge,
  calculateCommodityCharge,
  calculateInvestmentCharge,
  calculateInvestmentSettlementSplit,
  calculateLoanCharge,
  calculateMortgageCharge,
  calculateOtherServiceCharge,
  calculateTransactionCharge
} from '../services/settlement/commissionCalculators';

describe('settlement commissionCalculators', () => {
  it('calculates commodity charge as percent of price', () => {
    expect(calculateCommodityCharge(100, 1)).toBe(1);
    expect(calculateCommodityCharge(2500, 2)).toBe(50);
  });

  it('calculates loan charge with equity split', () => {
    const result = calculateLoanCharge({
      loanPrincipal: 50_000_000,
      equityContribution: 20_000_000,
      merchantRatePercent: 1
    });
    expect(result.loanFeeComponent).toBe(500_000);
    expect(result.merchantAmount).toBe(500_000);
    expect(result.ofiAmount).toBe(19_500_000);
  });

  it('calculates mortgage charge with the same equity split as loan', () => {
    const result = calculateMortgageCharge({
      loanPrincipal: 50_000_000,
      equityContribution: 20_000_000,
      merchantRatePercent: 1
    });
    expect(result.loanFeeComponent).toBe(500_000);
    expect(result.merchantAmount).toBe(500_000);
    expect(result.ofiAmount).toBe(19_500_000);
  });

  it('calculates loan charge without equity as principal percent', () => {
    const result = calculateLoanCharge({
      loanPrincipal: 1_000_000,
      merchantRatePercent: 1
    });
    expect(result.merchantAmount).toBe(10_000);
    expect(result.ofiAmount).toBe(0);
  });

  it('calculates investment charge on principal', () => {
    expect(calculateInvestmentCharge(1000, 1)).toBe(10);
  });

  it('splits investment into full creator principal and fee-on-top commission', () => {
    expect(calculateInvestmentSettlementSplit(1000, 1)).toEqual({
      principalAmount: 1000,
      commissionAmount: 10,
      creatorPrincipalAmount: 1000,
      totalUserDebit: 1010
    });
  });

  it('uses merchant commission for transaction and other service charges', () => {
    expect(calculateTransactionCharge({ amount: 5000, merchantCommission: 50 })).toBe(50);
    expect(calculateOtherServiceCharge({ amount: 100, merchantCommission: 5 })).toBe(5);
  });

  it('defaults account maintenance fee to 100 NGN', () => {
    expect(calculateAccountMaintenanceCharge()).toBe(100);
  });
});
