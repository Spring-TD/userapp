import { describe, expect, it } from '@jest/globals';
import {
  buildExternalApplicationStatusView,
  buildExternalDepositAccountView,
  buildExternalLoanAccountView
} from '../utils/externalLoanServicingView';
import type { AmortizationScheduleView } from '../types/amortizationSchedule';
import type { UserProductApplication } from '../types/userProductApplication';

function application(overrides: Partial<UserProductApplication> = {}): UserProductApplication {
  return {
    id: 'app-1',
    appId: 'plata-app',
    externalPlatformMerchantId: 'merchant-1',
    merchantId: 'creator-1',
    offeringMerchantId: 'offering-1',
    userId: 'user-1',
    productType: 'LOAN',
    globalProductId: 'product-1',
    productName: 'Salary Advance',
    localApplicationId: 'local-1',
    status: 'submitted',
    submittedAt: '2026-09-01T10:00:00.000Z',
    contractSnapshot: {},
    payoutSplit: { currency: 'NGN' } as UserProductApplication['payoutSplit'],
    snapshotVersion: 1,
    isPoliticallyExposedPerson: false,
    repayingWithSpouse: false,
    spouseFullName: null,
    spouseEmail: null,
    spousePhone: null,
    spouseOccupation: null,
    spouseCountry: null,
    spouseKyc: null,
    createdAt: '2026-09-01T10:00:00.000Z',
    ...overrides
  };
}

function schedule(overrides: Partial<AmortizationScheduleView> = {}): AmortizationScheduleView {
  return {
    source: 'confirmed',
    interestRate: 24,
    repaymentFrequency: 'monthly',
    durationMonths: 3,
    loanAmount: 300000,
    totalInterest: 12000,
    totalRepayment: 312000,
    periodCount: 3,
    currency: 'NGN',
    planStatus: 'active',
    paidInstallmentCount: 1,
    outstandingAmount: 208000,
    periods: [
      { period: 1, label: 'Month 1', dueDate: '2026-08-01T00:00:00.000Z', payment: 104000, principal: 100000, interest: 4000, fees: 0, balance: 200000, status: 'paid', isNext: false },
      { period: 2, label: 'Month 2', dueDate: '2026-09-01T00:00:00.000Z', payment: 104000, principal: 100000, interest: 4000, fees: 0, balance: 100000, status: 'overdue', isNext: true },
      { period: 3, label: 'Month 3', dueDate: '2026-10-01T00:00:00.000Z', payment: 104000, principal: 100000, interest: 4000, fees: 0, balance: 0, status: 'pending', isNext: false }
    ],
    ...overrides
  };
}

describe('buildExternalApplicationStatusView', () => {
  it('reports a submitted application as waiting for review', () => {
    const view = buildExternalApplicationStatusView(application(), { downPaymentRequiredAmount: 0 });
    expect(view.stage).toBe('submitted');
    expect(view.nextAction).toBe('wait_for_review');
    expect(view.downPayment.status).toBe('not_required');
    expect(view.approvedAmount).toBeUndefined();
  });

  it('asks the integrator to accept or decline once the offer letter is sent', () => {
    const view = buildExternalApplicationStatusView(
      application({
        loanWorkflowStatus: 'approved',
        postApprovalFulfillment: { status: 'offer_pending', offer: { sentAt: '2026-09-02T10:00:00.000Z' } }
      }),
      { approvedAmount: 300000, downPaymentRequiredAmount: 30000 }
    );
    expect(view.stage).toBe('offer_pending');
    expect(view.nextAction).toBe('accept_or_decline_offer');
    expect(view.approvedAmount).toBe(300000);
    expect(view.downPayment).toMatchObject({ requiredAmount: 30000, outstandingAmount: 30000, status: 'pending' });
  });

  it('waits for the offer letter before the merchant sends it', () => {
    const view = buildExternalApplicationStatusView(
      application({ loanWorkflowStatus: 'approved', postApprovalFulfillment: { status: 'offer_pending' } }),
      { approvedAmount: 300000, downPaymentRequiredAmount: 0 }
    );
    expect(view.nextAction).toBe('wait_for_offer_letter');
  });

  it('moves to repay once the loan is disbursed', () => {
    const view = buildExternalApplicationStatusView(
      application({
        loanWorkflowStatus: 'approved',
        postApprovalFulfillment: { status: 'disbursed' },
        loanDisbursement: { amount: 295000, currency: 'NGN', walletId: 'w-1', disbursedAt: '2026-07-01T00:00:00.000Z' }
      }),
      { approvedAmount: 300000, downPaymentRequiredAmount: 0 }
    );
    expect(view.stage).toBe('disbursed');
    expect(view.nextAction).toBe('repay');
    expect(view.disbursedAt).toBe('2026-07-01T00:00:00.000Z');
  });

  it('stops at declined', () => {
    const view = buildExternalApplicationStatusView(
      application({ loanWorkflowStatus: 'declined', loanWorkflowReason: 'Income too low' }),
      { downPaymentRequiredAmount: 0 }
    );
    expect(view.stage).toBe('declined');
    expect(view.nextAction).toBe('none');
    expect(view.loanWorkflowReason).toBe('Income too low');
  });
});

describe('buildExternalLoanAccountView', () => {
  it('returns not_disbursed before the loan is paid out', () => {
    const view = buildExternalLoanAccountView(application({ loanWorkflowStatus: 'approved' }), {
      stage: 'offer_pending',
      approvedAmount: 300000,
      schedule: null
    });
    expect(view.accountStatus).toBe('not_disbursed');
    expect(view.principal).toBe(300000);
    expect(view.repaymentScheduleAvailable).toBe(false);
  });

  it('summarises balances, overdue instalments and the next payment', () => {
    const view = buildExternalLoanAccountView(
      application({
        loanWorkflowStatus: 'approved',
        loanDisbursement: {
          amount: 295000,
          grossAmount: 300000,
          plataManagementFee: 5000,
          currency: 'NGN',
          walletId: 'w-1',
          accountNumber: '0123456789',
          bankName: 'Providus',
          disbursedAt: '2026-07-01T00:00:00.000Z'
        }
      }),
      { stage: 'disbursed', schedule: schedule(), now: new Date('2026-09-11T00:00:00.000Z') }
    );
    expect(view.accountStatus).toBe('overdue');
    expect(view.principal).toBe(300000);
    expect(view.disbursedAmount).toBe(295000);
    expect(view.managementFees).toEqual({ plata: 5000 });
    expect(view.disbursementAccount).toMatchObject({ accountNumber: '0123456789', bankName: 'Providus' });
    expect(view.amountPaid).toBe(104000);
    expect(view.outstandingAmount).toBe(208000);
    expect(view.overdueInstallmentCount).toBe(1);
    expect(view.overdueAmount).toBe(104000);
    expect(view.daysOverdue).toBe(10);
    expect(view.nextInstallment).toEqual({
      number: 2,
      dueDate: '2026-09-01T00:00:00.000Z',
      amount: 104000,
      status: 'overdue'
    });
    expect(view.maturityDate).toBe('2026-10-01T00:00:00.000Z');
  });

  it('marks a fully repaid plan as paid_off with no next instalment', () => {
    const paid = schedule({
      planStatus: 'paid',
      outstandingAmount: 0,
      paidInstallmentCount: 3,
      periods: schedule().periods.map((p) => ({ ...p, status: 'paid' as const, isNext: false }))
    });
    const view = buildExternalLoanAccountView(
      application({
        loanWorkflowStatus: 'approved',
        loanDisbursement: { amount: 300000, currency: 'NGN', walletId: 'w-1', disbursedAt: '2026-07-01T00:00:00.000Z' }
      }),
      { stage: 'disbursed', schedule: paid }
    );
    expect(view.accountStatus).toBe('paid_off');
    expect(view.outstandingAmount).toBe(0);
    expect(view.amountPaid).toBe(312000);
    expect(view.nextInstallment).toBeNull();
  });
});

describe('buildExternalDepositAccountView', () => {
  it('reports an unfunded commodity enrollment as enrolled / deposit', () => {
    const status = buildExternalApplicationStatusView(
      application({
        productType: 'COMMODITY',
        loanWorkflowStatus: undefined,
        contractSnapshot: { quantity: 2, unitAmount: 45000, amount: 90000, currency: 'NGN' }
      }),
      { downPaymentRequiredAmount: 0 }
    );
    expect(status.stage).toBe('enrolled');
    expect(status.nextAction).toBe('deposit');

    const account = buildExternalDepositAccountView(
      application({
        productType: 'COMMODITY',
        contractSnapshot: { quantity: 2, unitAmount: 45000, amount: 90000, currency: 'NGN' }
      }),
      { stage: status.stage }
    );
    expect(account.accountStatus).toBe('enrolled');
    expect(account.quantity).toBe(2);
    expect(account.unitAmount).toBe(45000);
    expect(account.amount).toBe(90000);
    expect(account.repaymentScheduleAvailable).toBe(false);
  });

  it('reports a funded locked commodity as active with maturity withdrawal next', () => {
    const app = application({
      productType: 'COMMODITY',
      contractSnapshot: {
        quantity: 2,
        unitAmount: 45000,
        amount: 90000,
        currentBalance: 90000,
        commodityHoldingStatus: 'LOCKED',
        fundedAt: '2026-09-01T00:00:00.000Z',
        maturityAt: '2027-09-01T00:00:00.000Z',
        withdrawalFlexibility: 'locked'
      }
    });
    const status = buildExternalApplicationStatusView(app, { downPaymentRequiredAmount: 0 });
    expect(status.stage).toBe('active');
    expect(status.nextAction).toBe('request_maturity_withdrawal');

    const account = buildExternalDepositAccountView(app, { stage: status.stage });
    expect(account.accountStatus).toBe('active');
    expect(account.balance).toBe(90000);
    expect(account.holdingStatus).toBe('LOCKED');
    expect(account.maturityAt).toBe('2027-09-01T00:00:00.000Z');
  });

  it('surfaces pending liquidation as withdrawal_pending', () => {
    const app = application({
      productType: 'SAVINGS',
      contractSnapshot: {
        currentBalance: 50000,
        liquidationRequest: { status: 'pending', amount: 50000, requestedAt: '2026-09-20T12:00:00.000Z' }
      }
    });
    const status = buildExternalApplicationStatusView(app, { downPaymentRequiredAmount: 0 });
    expect(status.stage).toBe('withdrawal_pending');
    expect(status.nextAction).toBe('wait_for_withdrawal_approval');

    const account = buildExternalDepositAccountView(app, { stage: status.stage });
    expect(account.accountStatus).toBe('withdrawal_pending');
    expect(account.pendingWithdrawal).toEqual({
      amount: 50000,
      requestedAt: '2026-09-20T12:00:00.000Z'
    });
  });
});
