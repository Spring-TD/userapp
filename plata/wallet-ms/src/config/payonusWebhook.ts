import { MerchantWalletType } from '../models/Wallet';

function truthyEnv(v?: string): boolean {
  if (!v) return false;
  const s = v.trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes';
}

function parseMerchantWalletType(value?: string): MerchantWalletType {
  const v = (value || '').trim().toUpperCase();
  if (v === MerchantWalletType.OPERATION) return MerchantWalletType.OPERATION;
  if (v === MerchantWalletType.KYC) return MerchantWalletType.KYC;
  return MerchantWalletType.TREASURY;
}

export const payonusWebhookConfig = {
  enabled: truthyEnv(process.env.PAYONUS_WEBHOOK_ENABLED || 'true'),
  verificationKey: process.env.PAYONUS_WEBHOOK_VERIFICATION_KEY || '',
  enforceSignature: truthyEnv(process.env.PAYONUS_WEBHOOK_ENFORCE_SIGNATURE || 'true'),
  defaultMerchantWalletType: parseMerchantWalletType(process.env.PAYONUS_DEFAULT_MERCHANT_WALLET_TYPE)
};

