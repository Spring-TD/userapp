import { MerchantWalletType } from '../models/Wallet';
import { normalizeMerchantWalletType } from '../utils/merchantWalletType';

function truthyEnv(v?: string): boolean {
  if (!v) return false;
  const s = v.trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes';
}

function parseMerchantWalletType(value?: string): MerchantWalletType {
  return normalizeMerchantWalletType(value) ?? MerchantWalletType.SETTLEMENT;
}

export const payonusWebhookConfig = {
  enabled: truthyEnv(process.env.PAYONUS_WEBHOOK_ENABLED || 'true'),
  verificationKey: process.env.PAYONUS_WEBHOOK_VERIFICATION_KEY || '',
  enforceSignature: truthyEnv(process.env.PAYONUS_WEBHOOK_ENFORCE_SIGNATURE || 'true'),
  defaultMerchantWalletType: parseMerchantWalletType(process.env.PAYONUS_DEFAULT_MERCHANT_WALLET_TYPE)
};
