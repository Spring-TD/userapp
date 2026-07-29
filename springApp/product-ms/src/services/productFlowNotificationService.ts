import axios from 'axios';
import { config } from '../config/environment';

export type ProductFlowNotifyInput = {
  userId: string;
  email?: string;
  template: string;
  data: Record<string, unknown>;
  priority?: 'low' | 'normal' | 'high';
};

function notificationsBaseUrl(): string {
  return config.notificationsServiceUrl.replace(/\/+$/, '');
}

export async function postProductFlowNotification(
  input: ProductFlowNotifyInput,
  label = input.template
): Promise<void> {
  try {
    await axios.post(
      `${notificationsBaseUrl()}/api/v1/notifications/send-dual`,
      {
        userId: input.userId,
        ...(input.email?.trim() ? { email: input.email.trim() } : {}),
        template: input.template,
        data: input.data,
        priority: input.priority ?? 'normal'
      },
      { headers: { 'Content-Type': 'application/json' }, timeout: 12_000 }
    );
  } catch (error) {
    console.error(`[product-ms] Failed to send ${label} notification:`, error);
  }
}

export function formatMoney(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
}

export function resolvePropertyAddressFromSnapshot(
  contractSnapshot?: Record<string, unknown>,
  productName?: string
): string {
  const snapshot = contractSnapshot ?? {};
  const finalSubmission = snapshot.finalSubmission as Record<string, unknown> | undefined;
  const mortgageSelection = finalSubmission?.mortgageSelection as Record<string, unknown> | undefined;
  const fromSelection =
    (typeof mortgageSelection?.propertyName === 'string' && mortgageSelection.propertyName.trim()) ||
    (typeof snapshot.propertyAddress === 'string' && snapshot.propertyAddress.trim()) ||
    (typeof snapshot.propertyName === 'string' && snapshot.propertyName.trim());
  return fromSelection || productName?.trim() || 'your property';
}

export function applicantEmailFromSnapshot(
  contractSnapshot?: Record<string, unknown>
): string | undefined {
  const snapshot = contractSnapshot ?? {};
  const applicant = snapshot.applicant as Record<string, unknown> | undefined;
  const user = snapshot.user as Record<string, unknown> | undefined;
  return (
    (typeof applicant?.email === 'string' && applicant.email.trim()) ||
    (typeof user?.email === 'string' && user.email.trim()) ||
    (typeof snapshot.email === 'string' && snapshot.email.trim()) ||
    undefined
  );
}

export function workflowTemplateForProductType(
  productType: string,
  workflowStage: string
): string | null {
  const type = productType.trim().toUpperCase();
  const stage = workflowStage.trim().toLowerCase();

  if (type === 'LOAN') {
    if (stage === 'approved') return 'loan-application-approved';
    if (stage === 'declined' || stage === 'blacklisted') return 'loan-application-rejected';
    if (stage === 'requirements_submitted') return 'loan-documents-required';
  }
  if (type === 'MORTGAGE') {
    if (stage === 'approved') return 'mortgage-application-approved';
    if (stage === 'declined' || stage === 'blacklisted') return 'mortgage-application-rejected';
    if (stage === 'requirements_submitted') return 'loan-documents-required';
  }
  if (type === 'INVESTMENT' && stage === 'under_review') {
    return 'investment-application-received';
  }

  return null;
}

export function submissionTemplateForProductType(productType: string): string {
  const type = productType.trim().toUpperCase();
  if (type === 'MORTGAGE') return 'mortgage-application-submitted';
  if (type === 'LOAN') return 'loan-application-submitted';
  if (type === 'INVESTMENT') return 'investment-application-received';
  if (type === 'SAVINGS') return 'savings-plan-created';
  if (type === 'COMMODITY') return 'commodity-order-received';
  return 'product-application-submitted';
}

export async function notifySavingsPlanCreated(args: {
  userId: string;
  email?: string;
  userName: string;
  planName: string;
}): Promise<void> {
  await postProductFlowNotification({
    userId: args.userId,
    email: args.email,
    template: 'savings-plan-created',
    data: { userName: args.userName, planName: args.planName }
  });
}

export async function notifySavingsContribution(args: {
  userId: string;
  email?: string;
  userName: string;
  planName: string;
  amount: string;
}): Promise<void> {
  await postProductFlowNotification({
    userId: args.userId,
    email: args.email,
    template: 'savings-contribution-received',
    data: args
  });
}

export async function notifySavingsGoalMilestone(args: {
  userId: string;
  email?: string;
  userName: string;
  planName: string;
  milestone: string;
  goalAmount: string;
}): Promise<void> {
  await postProductFlowNotification({
    userId: args.userId,
    email: args.email,
    template: 'savings-goal-milestone',
    data: args
  });
}

export async function notifyInvestmentFundingConfirmed(args: {
  userId: string;
  email?: string;
  userName: string;
  productName: string;
  amount: string;
}): Promise<void> {
  await postProductFlowNotification({
    userId: args.userId,
    email: args.email,
    template: 'investment-funding-confirmed',
    data: args
  });
}

export async function notifyInvestmentActive(args: {
  userId: string;
  email?: string;
  userName: string;
  productName: string;
  amount: string;
  returnTerms: string;
}): Promise<void> {
  await postProductFlowNotification({
    userId: args.userId,
    email: args.email,
    template: 'investment-active',
    data: args
  });
}

export async function notifyCommodityOrderReceived(args: {
  userId: string;
  email?: string;
  userName: string;
  commodityName: string;
}): Promise<void> {
  await postProductFlowNotification({
    userId: args.userId,
    email: args.email,
    template: 'commodity-order-received',
    data: args
  });
}

export async function notifyCommodityPaymentConfirmed(args: {
  userId: string;
  email?: string;
  userName: string;
  commodityName: string;
  amount: string;
}): Promise<void> {
  await postProductFlowNotification({
    userId: args.userId,
    email: args.email,
    template: 'commodity-payment-confirmed',
    data: args
  });
}

export async function notifyCommodityOrderProcessing(args: {
  userId: string;
  email?: string;
  userName: string;
  commodityName: string;
}): Promise<void> {
  await postProductFlowNotification({
    userId: args.userId,
    email: args.email,
    template: 'commodity-order-processing',
    data: args
  });
}

export async function notifyCommoditySettlementScheduled(args: {
  userId: string;
  email?: string;
  userName: string;
  commodityName: string;
  settlementDate: string;
}): Promise<void> {
  await postProductFlowNotification({
    userId: args.userId,
    email: args.email,
    template: 'commodity-settlement-scheduled',
    data: args
  });
}

export async function notifyLoanDisbursedFromSpring(args: {
  userId: string;
  email?: string;
  userName: string;
  productName: string;
  productType: string;
  amount: string;
  propertyAddress?: string;
}): Promise<void> {
  const type = args.productType.trim().toUpperCase();
  const template = type === 'MORTGAGE' ? 'mortgage-disbursed' : 'loan-disbursed';
  await postProductFlowNotification({
    userId: args.userId,
    email: args.email,
    template,
    priority: 'high',
    data: {
      userName: args.userName,
      productName: args.productName,
      amount: args.amount,
      propertyAddress: args.propertyAddress || args.productName
    }
  });
}
