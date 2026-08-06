import { buildLoanOfferTerms } from '../utils/loanOfferTerms';

describe('loan offer terms', () => {
  it('returns typed terms from the frozen contract snapshot', () => {
    expect(
      buildLoanOfferTerms({
        approvedAmount: 50000,
        requiredDownPayment: 10000,
        downPaymentPaid: false,
        contractSnapshot: {
          structure: {
            interestRate: '12.5',
            repaymentFrequency: 'Monthly',
            automaticRepayment: true,
            loanTenure: { value: 1, unit: 'year' }
          },
          calculations: {
            totalRepayable: 57500
          }
        }
      })
    ).toEqual({
      approvedAmount: 50000,
      downPaymentDue: 10000,
      interestRate: 12.5,
      totalRepayable: 57500,
      repaymentFrequency: 'Monthly',
      tenorMonths: 12,
      automaticRepayment: true,
      estimatedDisbursementDate: null
    });
  });

  it('reports no remaining down payment after payment and does not invent missing terms', () => {
    expect(
      buildLoanOfferTerms({
        approvedAmount: 50000,
        requiredDownPayment: 10000,
        downPaymentPaid: true
      })
    ).toMatchObject({
      downPaymentDue: 0,
      interestRate: null,
      totalRepayable: null,
      repaymentFrequency: null,
      tenorMonths: null,
      automaticRepayment: null
    });
  });
});
