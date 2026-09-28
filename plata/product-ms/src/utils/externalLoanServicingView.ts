import type { AmortizationScheduleView } from '../types/amortizationSchedule';
import type { UserProductApplication } from '../types/userProductApplication';
import {
  extractDepositBalanceFromContractSnapshot,
  extractInterestPaidFromContractSnapshot,
  extractPendingLiquidationRequestFromContractSnapshot,
  extractPendingWithdrawalRequestFromContractSnapshot,
  extractWithdrawalsFromContractSnapshot
} from './savingsInvestmentSnapshotAmounts';
import { normalizeProductType } from './productType';

export type ExternalApplicationStage =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'declined'
  | 'blacklisted'
  | 'approved'
  | 'offer_pending'
  | 'offer_accepted'
  | 'offer_declined'
  | 'disbursed'
  | 'cancelled'
  | 'withdrawn'
  | string;

export type ExternalApplicationNextAction =
  | 'submit_application'
  | 'wait_for_review'
  | 'wait_for_offer_letter'
  | 'accept_or_decline_offer'
  | 'pay_down_payment'
  | 'wait_for_disbursement'
  | 'continue_mortgage_workflow'
  | 'repay'
  | 'deposit'
  | 'request_maturity_withdrawal'
  | 'wait_for_withdrawal_approval'
  | 'none';

export interface ExternalDownPaymentView {
  requiredAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  status: 'not_required' | 'pending' | 'paid';
  paidAt?: string;
  providerReference?: string;
}

export interface ExternalApplicationStatusView {
  applicationId: string;
  localApplicationId?: string;
  productId: string;
  productName?: string;
  productType: string;
  applicationStatus: string;
  loanWorkflowStatus?: string;
  loanWorkflowReason?: string;
  stage: ExternalApplicationStage;
  nextAction: ExternalApplicationNextAction;
  currency: string;
  approvedAmount?: number;
  downPayment: ExternalDownPaymentView;
  offer?: {
    sentAt?: string;
    acceptedAt?: string;
    declinedAt?: string;
  };
  disbursedAt?: string;
  submittedAt?: string;
  createdAt?: string;
}

export type ExternalLoanAccountStatus = 'not_disbursed' | 'active' | 'overdue' | 'paid_off' | 'closed';

export type ExternalDepositAccountStatus =
  | 'enrolled'
  | 'active'
  | 'withdrawal_pending'
  | 'withdrawn'
  | 'cancelled'
  | 'closed';

/** Lending account fields (LOAN / MORTGAGE). */
export interface ExternalLoanAccountView {
  applicationId: string;
  localApplicationId?: string;
  productId: string;
  productName?: string;
  productType: string;
  accountStatus: ExternalLoanAccountStatus | ExternalDepositAccountStatus | string;
  stage: ExternalApplicationStage;
  currency: string;
  userId?: string;
  principal?: number;
  disbursedAmount?: number;
  managementFees?: {
    plata?: number;
    spring?: number;
  };
  disbursedAt?: string;
  disbursementAccount?: {
    walletId: string;
    accountNumber?: string;
    bankName?: string;
    bankCode?: string;
  };
  interestRate?: number;
  repaymentFrequency?: string;
  durationMonths?: number;
  totalInterest?: number;
  totalRepayment?: number;
  amountPaid?: number;
  outstandingAmount?: number;
  installmentCount?: number;
  paidInstallmentCount?: number;
  overdueInstallmentCount?: number;
  overdueAmount?: number;
  daysOverdue?: number;
  nextInstallment?: {
    number: number;
    dueDate?: string;
    amount: number;
    status: string;
  } | null;
  maturityDate?: string;
  repaymentScheduleAvailable: boolean;
  /** Deposit products (COMMODITY / SAVINGS / INVESTMENT) */
  balance?: number;
  quantity?: number;
  unitAmount?: number;
  amount?: number;
  expectedInterest?: number;
  interestPaid?: number;
  totalWithdrawals?: number;
  targetAmount?: number;
  monthlyContribution?: number;
  maturityAt?: string;
  holdingStatus?: string;
  pendingWithdrawal?: {
    amount: number;
    requestedAt: string;
  };
}

export type ExternalApplicationAccountView = ExternalLoanAccountView;

const DEPOSIT_PRODUCT_TYPES = new Set(['COMMODITY', 'SAVINGS', 'INVESTMENT']);
const LENDING_PRODUCT_TYPES = new Set(['LOAN', 'MORTGAGE']);

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function money(value: number): number {
  return Math.round(value * 100) / 100;
}

function firstPositiveMoney(...values: unknown[]): number {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) return money(value);
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number.parseFloat(value.replace(/,/g, ''));
      if (Number.isFinite(parsed) && parsed > 0) return money(parsed);
    }
  }
  return 0;
}

function resolveCurrency(application: UserProductApplication): string {
  return String(
    application.loanDisbursement?.currency ||
      application.payoutSplit?.currency ||
      (application.contractSnapshot?.currency as string | undefined) ||
      'NGN'
  )
    .trim()
    .toUpperCase();
}

export function buildDownPaymentView(
  application: UserProductApplication,
  requiredAmount: number
): ExternalDownPaymentView {
  const required = money(Math.max(0, requiredAmount));
  if (!(required > 0)) {
    return { requiredAmount: 0, paidAmount: 0, outstandingAmount: 0, status: 'not_required' };
  }
  const equity = application.equityPayment;
  const paid = equity?.status === 'paid' ? money(equity.paidAmount ?? required) : 0;
  const outstanding = money(Math.max(0, required - paid));
  return {
    requiredAmount: required,
    paidAmount: paid,
    outstandingAmount: outstanding,
    status: outstanding > 0.009 ? 'pending' : 'paid',
    ...(equity?.paidAt ? { paidAt: equity.paidAt } : {}),
    ...(equity?.providerReference ? { providerReference: equity.providerReference } : {})
  };
}

export function resolveStageAndNextAction(
  application: UserProductApplication,
  downPayment: ExternalDownPaymentView
): { stage: ExternalApplicationStage; nextAction: ExternalApplicationNextAction } {
  const productType = normalizeProductType(String(application.productType));
  if (DEPOSIT_PRODUCT_TYPES.has(productType)) {
    return resolveDepositStageAndNextAction(application);
  }

  if (application.status === 'cancelled' || application.status === 'withdrawn') {
    return { stage: application.status, nextAction: 'none' };
  }
  if (application.status === 'draft') {
    return { stage: 'draft', nextAction: 'submit_application' };
  }

  switch (application.loanWorkflowStatus) {
    case undefined:
    case 'requested':
      return { stage: 'submitted', nextAction: 'wait_for_review' };
    case 'under_review':
      return { stage: 'under_review', nextAction: 'wait_for_review' };
    case 'declined':
      return { stage: 'declined', nextAction: 'none' };
    case 'blacklisted':
      return { stage: 'blacklisted', nextAction: 'none' };
    default:
      break;
  }

  if (application.loanDisbursement?.amount) {
    return { stage: 'disbursed', nextAction: 'repay' };
  }

  const fulfillment = application.postApprovalFulfillment;
  const downPaymentDue = downPayment.status === 'pending';
  if (!fulfillment) {
    return {
      stage: 'approved',
      nextAction: downPaymentDue ? 'pay_down_payment' : 'wait_for_disbursement'
    };
  }

  switch (fulfillment.status) {
    case 'offer_pending':
      return {
        stage: 'offer_pending',
        nextAction: fulfillment.offer?.sentAt ? 'accept_or_decline_offer' : 'wait_for_offer_letter'
      };
    case 'offer_accepted':
      return { stage: 'offer_accepted', nextAction: 'wait_for_disbursement' };
    case 'offer_declined':
      return { stage: 'offer_declined', nextAction: 'none' };
    case 'disbursed':
      return { stage: 'disbursed', nextAction: 'repay' };
    default:
      return { stage: fulfillment.status, nextAction: 'continue_mortgage_workflow' };
  }
}

function snapshotOf(application: UserProductApplication): Record<string, unknown> {
  return application.contractSnapshot && typeof application.contractSnapshot === 'object'
    ? (application.contractSnapshot as Record<string, unknown>)
    : {};
}

function holdingStatusOf(snapshot: Record<string, unknown>): string {
  return String(
    snapshot.holdingStatus ||
      snapshot.accountHoldingStatus ||
      snapshot.commodityHoldingStatus ||
      snapshot.savingsHoldingStatus ||
      ''
  )
    .trim()
    .toUpperCase();
}

function resolveDepositStageAndNextAction(
  application: UserProductApplication
): { stage: ExternalApplicationStage; nextAction: ExternalApplicationNextAction } {
  if (application.status === 'cancelled') {
    return { stage: 'cancelled', nextAction: 'none' };
  }
  if (application.status === 'withdrawn') {
    return { stage: 'withdrawn', nextAction: 'none' };
  }
  if (application.status === 'draft') {
    return { stage: 'draft', nextAction: 'submit_application' };
  }

  const snapshot = snapshotOf(application);
  const holding = holdingStatusOf(snapshot);
  if (holding === 'WITHDRAWN') {
    return { stage: 'withdrawn', nextAction: 'none' };
  }

  const pending =
    extractPendingLiquidationRequestFromContractSnapshot(snapshot) ||
    extractPendingWithdrawalRequestFromContractSnapshot(snapshot);
  if (
    pending ||
    holding === 'WITHDRAWAL_PENDING' ||
    holding === 'PENDING_WITHDRAWAL' ||
    holding === 'LIQUIDATION_PENDING'
  ) {
    return { stage: 'withdrawal_pending', nextAction: 'wait_for_withdrawal_approval' };
  }

  const paidBalance = firstPositiveMoney(
    snapshot.currentBalance,
    snapshot.accountBalance,
    snapshot.savingsBalance,
    snapshot.depositBalance,
    snapshot.commodityPrincipal,
    snapshot.investmentBalance,
    snapshot.portfolioValue,
    snapshot.totalDeposits
  );
  const funded =
    paidBalance > 0 ||
    holding === 'LOCKED' ||
    holding === 'ACTIVE' ||
    holding === 'MATURED' ||
    Boolean(snapshot.fundedAt);

  if (!funded) {
    return { stage: 'enrolled', nextAction: 'deposit' };
  }

  if (holding === 'MATURED') {
    return { stage: 'active', nextAction: 'request_maturity_withdrawal' };
  }

  const flexibility = String(
    snapshot.withdrawalFlexibility ||
      (snapshot.structure && typeof snapshot.structure === 'object'
        ? (snapshot.structure as { withdrawalFlexibility?: string }).withdrawalFlexibility
        : '') ||
      ''
  )
    .trim()
    .toLowerCase();
  const locked = flexibility === 'locked' || flexibility === 'fixed' || holding === 'LOCKED';
  return {
    stage: 'active',
    nextAction: locked ? 'request_maturity_withdrawal' : 'deposit'
  };
}

export function buildExternalDepositAccountView(
  application: UserProductApplication,
  input: { stage: ExternalApplicationStage }
): ExternalApplicationAccountView {
  const snapshot = snapshotOf(application);
  const holding = holdingStatusOf(snapshot);
  const balance = extractDepositBalanceFromContractSnapshot(snapshot);
  const interestPaid = extractInterestPaidFromContractSnapshot(snapshot);
  const totalWithdrawals = extractWithdrawalsFromContractSnapshot(snapshot);
  const pending =
    extractPendingLiquidationRequestFromContractSnapshot(snapshot) ||
    extractPendingWithdrawalRequestFromContractSnapshot(snapshot);

  const quantity = Number(snapshot.quantity);
  const unitAmount = Number(snapshot.unitAmount);
  const amount = Number(snapshot.amount ?? snapshot.commodityPrincipal);
  const expectedInterest = Number(snapshot.expectedInterest);
  const targetAmount = Number(snapshot.targetAmount);
  const monthlyContribution = Number(snapshot.monthlyContribution);
  const maturityAt =
    typeof snapshot.maturityAt === 'string'
      ? snapshot.maturityAt
      : typeof snapshot.maturityDate === 'string'
        ? snapshot.maturityDate
        : undefined;

  let accountStatus: ExternalDepositAccountStatus = 'enrolled';
  if (application.status === 'cancelled') accountStatus = 'cancelled';
  else if (application.status === 'withdrawn' || holding === 'WITHDRAWN') accountStatus = 'withdrawn';
  else if (pending || holding.includes('PENDING')) accountStatus = 'withdrawal_pending';
  else if (
    firstPositiveMoney(
      snapshot.currentBalance,
      snapshot.accountBalance,
      snapshot.savingsBalance,
      snapshot.depositBalance,
      snapshot.commodityPrincipal,
      snapshot.investmentBalance,
      snapshot.portfolioValue,
      snapshot.totalDeposits
    ) > 0 ||
    holding === 'LOCKED' ||
    holding === 'ACTIVE' ||
    holding === 'MATURED' ||
    Boolean(snapshot.fundedAt)
  ) {
    accountStatus = 'active';
  }

  return {
    applicationId: application.id,
    ...(application.localApplicationId ? { localApplicationId: application.localApplicationId } : {}),
    productId: application.globalProductId,
    ...(application.productName ? { productName: application.productName } : {}),
    productType: String(application.productType),
    accountStatus,
    stage: input.stage,
    currency: resolveCurrency(application),
    userId: application.userId,
    balance: money(balance),
    ...(Number.isFinite(quantity) && quantity > 0 ? { quantity } : {}),
    ...(Number.isFinite(unitAmount) && unitAmount > 0 ? { unitAmount: money(unitAmount) } : {}),
    ...(Number.isFinite(amount) && amount > 0 ? { amount: money(amount) } : {}),
    ...(Number.isFinite(expectedInterest) && expectedInterest > 0
      ? { expectedInterest: money(expectedInterest) }
      : {}),
    ...(interestPaid > 0 ? { interestPaid: money(interestPaid) } : {}),
    ...(totalWithdrawals > 0 ? { totalWithdrawals: money(totalWithdrawals) } : {}),
    ...(Number.isFinite(targetAmount) && targetAmount > 0 ? { targetAmount: money(targetAmount) } : {}),
    ...(Number.isFinite(monthlyContribution) && monthlyContribution > 0
      ? { monthlyContribution: money(monthlyContribution) }
      : {}),
    ...(maturityAt ? { maturityAt } : {}),
    ...(holding ? { holdingStatus: holding } : {}),
    ...(pending
      ? { pendingWithdrawal: { amount: money(pending.amount), requestedAt: pending.requestedOn } }
      : {}),
    repaymentScheduleAvailable: false
  };
}

export function isDepositProductType(productType: string): boolean {
  return DEPOSIT_PRODUCT_TYPES.has(normalizeProductType(productType));
}

export function isLendingProductType(productType: string): boolean {
  return LENDING_PRODUCT_TYPES.has(normalizeProductType(productType));
}

export function buildExternalApplicationStatusView(
  application: UserProductApplication,
  input: { approvedAmount?: number; downPaymentRequiredAmount: number }
): ExternalApplicationStatusView {
  const downPayment = buildDownPaymentView(application, input.downPaymentRequiredAmount);
  const { stage, nextAction } = resolveStageAndNextAction(application, downPayment);
  const offer = application.postApprovalFulfillment?.offer;
  const isApproved = application.loanWorkflowStatus === 'approved';

  return {
    applicationId: application.id,
    ...(application.localApplicationId ? { localApplicationId: application.localApplicationId } : {}),
    productId: application.globalProductId,
    ...(application.productName ? { productName: application.productName } : {}),
    productType: String(application.productType),
    applicationStatus: application.status,
    ...(application.loanWorkflowStatus ? { loanWorkflowStatus: application.loanWorkflowStatus } : {}),
    ...(application.loanWorkflowReason ? { loanWorkflowReason: application.loanWorkflowReason } : {}),
    stage,
    nextAction,
    currency: resolveCurrency(application),
    ...(isApproved && input.approvedAmount ? { approvedAmount: money(input.approvedAmount) } : {}),
    downPayment,
    ...(offer
      ? {
          offer: {
            ...(offer.sentAt ? { sentAt: offer.sentAt } : {}),
            ...(offer.acceptedAt ? { acceptedAt: offer.acceptedAt } : {}),
            ...(offer.declinedAt ? { declinedAt: offer.declinedAt } : {})
          }
        }
      : {}),
    ...(application.loanDisbursement?.disbursedAt
      ? { disbursedAt: application.loanDisbursement.disbursedAt }
      : {}),
    ...(application.submittedAt ? { submittedAt: application.submittedAt } : {}),
    ...(application.createdAt ? { createdAt: application.createdAt } : {})
  };
}

export function buildExternalLoanAccountView(
  application: UserProductApplication,
  input: {
    stage: ExternalApplicationStage;
    approvedAmount?: number;
    schedule: AmortizationScheduleView | null;
    now?: Date;
  }
): ExternalLoanAccountView {
  const disbursement = application.loanDisbursement;
  const base = {
    applicationId: application.id,
    ...(application.localApplicationId ? { localApplicationId: application.localApplicationId } : {}),
    productId: application.globalProductId,
    ...(application.productName ? { productName: application.productName } : {}),
    productType: String(application.productType),
    stage: input.stage,
    currency: resolveCurrency(application)
  };

  if (!disbursement?.amount) {
    return {
      ...base,
      accountStatus: 'not_disbursed',
      ...(input.approvedAmount ? { principal: money(input.approvedAmount) } : {}),
      repaymentScheduleAvailable: false
    };
  }

  const principal = disbursement.grossAmount ?? application.approvedLoanAmount ?? input.approvedAmount;
  const account: ExternalLoanAccountView = {
    ...base,
    accountStatus: 'active',
    ...(principal ? { principal: money(principal) } : {}),
    disbursedAmount: money(disbursement.amount),
    ...(disbursement.plataManagementFee || disbursement.springManagementFee
      ? {
          managementFees: {
            ...(disbursement.plataManagementFee ? { plata: money(disbursement.plataManagementFee) } : {}),
            ...(disbursement.springManagementFee ? { spring: money(disbursement.springManagementFee) } : {})
          }
        }
      : {}),
    disbursedAt: disbursement.disbursedAt,
    disbursementAccount: {
      walletId: disbursement.walletId,
      ...(disbursement.accountNumber ? { accountNumber: disbursement.accountNumber } : {}),
      ...(disbursement.bankName ? { bankName: disbursement.bankName } : {}),
      ...(disbursement.bankCode ? { bankCode: disbursement.bankCode } : {})
    },
    repaymentScheduleAvailable: Boolean(input.schedule)
  };

  const schedule = input.schedule;
  if (!schedule) {
    return account;
  }

  const nowMs = (input.now ?? new Date()).getTime();
  let amountPaid = 0;
  let overdueCount = 0;
  let overdueAmount = 0;
  let oldestOverdueMs: number | null = null;
  let maturityMs: number | null = null;

  for (const period of schedule.periods) {
    const dueMs = period.dueDate ? new Date(period.dueDate).getTime() : Number.NaN;
    if (Number.isFinite(dueMs) && (maturityMs === null || dueMs > maturityMs)) {
      maturityMs = dueMs;
    }
    if (period.status === 'paid') {
      amountPaid += period.payment;
      continue;
    }
    const isLate =
      period.status === 'overdue' || (period.status === 'failed' && Number.isFinite(dueMs) && dueMs <= nowMs);
    if (isLate) {
      overdueCount += 1;
      overdueAmount += period.payment;
      if (Number.isFinite(dueMs) && (oldestOverdueMs === null || dueMs < oldestOverdueMs)) {
        oldestOverdueMs = dueMs;
      }
    }
  }

  const next =
    schedule.periods.find((period) => period.isNext) ??
    schedule.periods.find((period) => period.status !== 'paid');

  const planStatus = String(schedule.planStatus || '').toLowerCase();
  const accountStatus: ExternalLoanAccountStatus =
    planStatus === 'paid'
      ? 'paid_off'
      : planStatus === 'cancelled'
        ? 'closed'
        : overdueCount > 0
          ? 'overdue'
          : 'active';

  return {
    ...account,
    accountStatus,
    ...(schedule.interestRate !== undefined ? { interestRate: schedule.interestRate } : {}),
    ...(schedule.repaymentFrequency ? { repaymentFrequency: schedule.repaymentFrequency } : {}),
    ...(schedule.durationMonths !== undefined ? { durationMonths: schedule.durationMonths } : {}),
    totalInterest: money(schedule.totalInterest),
    totalRepayment: money(schedule.totalRepayment),
    amountPaid: money(amountPaid),
    outstandingAmount: accountStatus === 'paid_off' ? 0 : money(schedule.outstandingAmount),
    installmentCount: schedule.periodCount,
    paidInstallmentCount: schedule.paidInstallmentCount,
    overdueInstallmentCount: overdueCount,
    overdueAmount: money(overdueAmount),
    daysOverdue:
      oldestOverdueMs !== null ? Math.max(0, Math.floor((nowMs - oldestOverdueMs) / MS_PER_DAY)) : 0,
    nextInstallment:
      accountStatus === 'paid_off' || accountStatus === 'closed' || !next
        ? null
        : {
            number: next.period,
            ...(next.dueDate ? { dueDate: next.dueDate } : {}),
            amount: money(next.payment),
            status: next.status
          },
    ...(maturityMs !== null ? { maturityDate: new Date(maturityMs).toISOString() } : {})
  };
}
