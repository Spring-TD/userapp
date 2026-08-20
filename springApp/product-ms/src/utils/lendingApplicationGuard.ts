import type { ProductApplicationStatus } from '../types/productApplication';

export const LENDING_PRODUCT_TYPES = ['LOAN', 'MORTGAGE'] as const;

const BLOCKING_LENDING_STATUSES: ProductApplicationStatus[] = ['PENDING', 'APPROVED', 'BLACKLISTED'];

export function isBlockingLendingApplicationStatus(
  status: string | undefined
): status is ProductApplicationStatus {
  const normalized = String(status || '').trim().toUpperCase();
  return BLOCKING_LENDING_STATUSES.includes(normalized as ProductApplicationStatus);
}

export function lendingApplicationBlockMessage(status: string | undefined): string {
  const normalized = String(status || '').trim().toUpperCase();
  if (normalized === 'PENDING') {
    return 'You already have a pending application for this loan. Please complete or wait for a decision on your existing application.';
  }
  if (normalized === 'APPROVED') {
    return 'You already have an approved application for this loan and cannot apply again.';
  }
  if (normalized === 'BLACKLISTED') {
    return 'You are not eligible to apply for this loan.';
  }
  return 'You already have an active application for this loan and cannot apply again.';
}
