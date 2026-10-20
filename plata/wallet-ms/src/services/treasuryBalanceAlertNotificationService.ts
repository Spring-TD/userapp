import axios from 'axios';
import type { MerchantWallet } from '../models/Wallet';
import { koboToNaira } from '../utils/money';
import { config } from '../config/environment';
import { logger } from '../utils/logger';
import { fetchMerchantOwner } from './merchantOwnerClient';

const INSUFFICIENT_TEMPLATE = 'treasury-insufficient-disbursement-merchant';
const LOW_BALANCE_TEMPLATE = 'treasury-low-balance-merchant';

/** Avoid repeat alerts for the same disbursement reference. */
const insufficientNotifiedRefs = new Set<string>();
/** walletId → last low-balance alert epoch ms */
const lowBalanceLastNotifiedAt = new Map<string, number>();

function formatMoney(amountNaira: number, currency = 'NGN'): string {
  return `${currency} ${amountNaira.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
}

function productTypeLabel(productType?: string): string {
  const t = (productType || '').trim().toUpperCase();
  if (t === 'MORTGAGE') return 'mortgage';
  if (t === 'LOAN') return 'loan';
  return t ? t.toLowerCase() : 'loan';
}

function fundingHintForTreasury(wallet: MerchantWallet, requiredAmountKobo: number): string {
  const balance = wallet.mainBalance ?? wallet.balance ?? 0;
  const shortfallNaira = koboToNaira(Math.max(0, requiredAmountKobo - balance));
  const nuban = wallet.virtualNuban;
  const hasActiveNuban =
    nuban?.provisionStatus === 'active' && Boolean(nuban.accountNumber?.trim());
  if (hasActiveNuban) {
    return `Transfer ${wallet.currency} ${shortfallNaira.toLocaleString('en-NG', {
      maximumFractionDigits: 2
    })} to the Treasury wallet account ${nuban!.accountNumber} (${nuban!.bankName || 'bank'}).`;
  }
  return 'Top up the merchant Treasury wallet via bank transfer to disburse loans and mortgages.';
}

async function postDual(body: Record<string, unknown>): Promise<void> {
  const baseUrl = config.notificationsServiceUrl.replace(/\/+$/, '');
  await axios.post(`${baseUrl}/api/v1/notifications/send-dual`, body, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 12_000
  });
}

function recipientName(owner: { firstName?: string; lastName?: string }): string {
  return [owner.firstName, owner.lastName].filter(Boolean).join(' ').trim() || 'Merchant';
}

function shouldSendLowBalance(walletId: string): boolean {
  const now = Date.now();
  const last = lowBalanceLastNotifiedAt.get(walletId) || 0;
  if (now - last < config.treasuryLowBalanceCooldownMs) {
    return false;
  }
  lowBalanceLastNotifiedAt.set(walletId, now);
  return true;
}

export type TreasuryDisbursementInsufficientNotifyInput = {
  merchantId: string;
  appId: string;
  referenceId: string;
  requiredAmountKobo: number;
  treasuryWallet: MerchantWallet;
  applicationId?: string;
  productId?: string;
  productType?: string;
  userId?: string;
};

/**
 * Email + in-app when a loan/mortgage Treasury disbursement fails for insufficient funds.
 * Fire-and-forget from walletService; idempotent per referenceId in-process.
 */
export async function notifyMerchantInsufficientTreasuryForDisbursement(
  input: TreasuryDisbursementInsufficientNotifyInput
): Promise<void> {
  const merchantId = input.merchantId.trim();
  const referenceId = input.referenceId.trim();
  if (!merchantId || !referenceId) return;

  const dedupeKey = `${merchantId}:${input.appId}:${referenceId}`;
  if (insufficientNotifiedRefs.has(dedupeKey)) {
    return;
  }
  insufficientNotifiedRefs.add(dedupeKey);

  const merchantOwner = await fetchMerchantOwner(merchantId);
  if (!merchantOwner?.email.trim()) {
    logger.warn('Skipping insufficient Treasury disbursement alert: merchant owner email unavailable', {
      merchantId,
      referenceId
    });
    return;
  }

  const currency = input.treasuryWallet.currency || 'NGN';
  const balanceKobo = input.treasuryWallet.mainBalance ?? input.treasuryWallet.balance ?? 0;
  const requiredKobo = input.requiredAmountKobo;
  const shortfallKobo = Math.max(0, requiredKobo - balanceKobo);
  const fundingHint = fundingHintForTreasury(input.treasuryWallet, requiredKobo);
  const requiredAmount = formatMoney(koboToNaira(requiredKobo), currency);
  const currentBalance = formatMoney(koboToNaira(balanceKobo), currency);
  const shortfall = formatMoney(koboToNaira(shortfallKobo), currency);
  const typeLabel = productTypeLabel(input.productType);

  try {
    await postDual({
      userId: merchantOwner.userId,
      email: merchantOwner.email.trim(),
      template: INSUFFICIENT_TEMPLATE,
      priority: 'high',
      data: {
        recipientName: recipientName(merchantOwner),
        productTypeLabel: typeLabel,
        requiredAmount,
        currentBalance,
        shortfall,
        reference: referenceId,
        applicationId: input.applicationId || '',
        productId: input.productId || '',
        appId: input.appId,
        userId: input.userId || '',
        fundingHint,
        detail: `A ${typeLabel} disbursement request failed because Treasury has ${currentBalance} but needs ${requiredAmount} (short ${shortfall}).`,
        year: new Date().getFullYear(),
        appName: 'Plata'
      }
    });
  } catch (error) {
    logger.error('Failed to send insufficient Treasury disbursement alert', {
      merchantId,
      referenceId,
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

export type TreasuryLowBalanceNotifyInput = {
  merchantId: string;
  appId: string;
  treasuryWallet: MerchantWallet;
  /** Balance after the operation (kobo). */
  balanceAfterKobo: number;
  context?: string;
};

/**
 * Email + in-app when Treasury balance falls at/below the configured threshold.
 * Cooldown per wallet to avoid spam on successive debits.
 */
export async function notifyMerchantTreasuryLowBalance(
  input: TreasuryLowBalanceNotifyInput
): Promise<void> {
  const threshold = config.treasuryLowBalanceThresholdKobo;
  if (!Number.isFinite(threshold) || threshold < 0) return;
  if (input.balanceAfterKobo > threshold) return;

  const walletId = input.treasuryWallet.id;
  if (!walletId || !shouldSendLowBalance(walletId)) return;

  const merchantId = input.merchantId.trim();
  if (!merchantId) return;

  const merchantOwner = await fetchMerchantOwner(merchantId);
  if (!merchantOwner?.email.trim()) {
    logger.warn('Skipping Treasury low-balance alert: merchant owner email unavailable', {
      merchantId,
      walletId
    });
    return;
  }

  const currency = input.treasuryWallet.currency || 'NGN';
  const currentBalance = formatMoney(koboToNaira(input.balanceAfterKobo), currency);
  const thresholdLabel = formatMoney(koboToNaira(threshold), currency);
  const topUpTargetKobo = Math.max(threshold - input.balanceAfterKobo, threshold);
  const fundingHint = fundingHintForTreasury(
    { ...input.treasuryWallet, mainBalance: input.balanceAfterKobo },
    input.balanceAfterKobo + topUpTargetKobo
  );

  try {
    await postDual({
      userId: merchantOwner.userId,
      email: merchantOwner.email.trim(),
      template: LOW_BALANCE_TEMPLATE,
      priority: 'high',
      data: {
        recipientName: recipientName(merchantOwner),
        currentBalance,
        threshold: thresholdLabel,
        appId: input.appId,
        walletId,
        fundingHint,
        detail:
          input.context?.trim() ||
          `Treasury balance is ${currentBalance}, at or below the alert threshold of ${thresholdLabel}.`,
        year: new Date().getFullYear(),
        appName: 'Plata'
      }
    });
  } catch (error) {
    logger.error('Failed to send Treasury low-balance alert', {
      merchantId,
      walletId,
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

/** Test helpers */
export function _resetTreasuryBalanceAlertStateForTests(): void {
  insufficientNotifiedRefs.clear();
  lowBalanceLastNotifiedAt.clear();
}
