import type { MerchantWallet, UserWallet } from '../models/Wallet';
import { isPayonusNubanReady, payonusNubanConfig } from '../config/payonusNuban';
import { db } from '../db/database';
import { createDynamicMerchantNuban, createReservedUserNuban } from './payonusNubanClient';
import { logger } from '../utils/logger';

async function refetch(walletId: string): Promise<MerchantWallet | UserWallet | null> {
  const w = await db.getWalletById(walletId);
  if (!w) return null;
  if (w.walletType !== 'MERCHANT' && w.walletType !== 'USER') return null;
  return w as MerchantWallet | UserWallet;
}

/**
 * Calls Payonus after a wallet row exists. Updates the wallet with NUBAN fields or failure status.
 * No-ops when Payonus is disabled, misconfigured, or the wallet currency is not in PAYONUS_NUBAN_CURRENCIES.
 */
export async function provisionPayonusNubanForWallet(
  wallet: MerchantWallet | UserWallet
): Promise<MerchantWallet | UserWallet> {
  if (!isPayonusNubanReady()) {
    return wallet;
  }

  const currency = wallet.currency.toUpperCase();
  if (!payonusNubanConfig.currencies.includes(currency)) {
    return wallet;
  }

  const accountType = wallet.walletType === 'MERCHANT' ? 'dynamic' : 'reserved';

  try {
    const result =
      wallet.walletType === 'MERCHANT'
        ? await createDynamicMerchantNuban(wallet as MerchantWallet)
        : await createReservedUserNuban(wallet as UserWallet);

    if (result.ok && result.details.accountNumber) {
      await db.patchWalletPayonusNuban(wallet.id, {
        payonusNubanAccountNumber: result.details.accountNumber,
        payonusNubanBankName: result.details.bankName ?? undefined,
        payonusNubanBankCode: result.details.bankCode ?? undefined,
        payonusNubanProviderReference: result.details.providerReference ?? undefined,
        payonusNubanAccountType: accountType,
        payonusNubanProvisionStatus: 'active',
        payonusNubanProvisionError: null,
        payonusNubanProvisionedAt: new Date(),
        nubanProvider: 'payonus'
      });
      logger.info('Payonus NUBAN provisioned', { walletId: wallet.id, accountType });
    } else {
      await db.patchWalletPayonusNuban(wallet.id, {
        payonusNubanAccountType: accountType,
        payonusNubanProvisionStatus: 'failed',
        payonusNubanProvisionError: result.errorMessage || 'Payonus did not return an account number',
        nubanProvider: 'payonus'
      });
      logger.warn('Payonus NUBAN provisioning failed', {
        walletId: wallet.id,
        accountType,
        error: result.errorMessage
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await db.patchWalletPayonusNuban(wallet.id, {
      payonusNubanAccountType: accountType,
      payonusNubanProvisionStatus: 'failed',
      payonusNubanProvisionError: message,
      nubanProvider: 'payonus'
    });
    logger.error('Payonus NUBAN provisioning threw', { walletId: wallet.id, error: message });
  }

  const updated = await refetch(wallet.id);
  return updated ?? wallet;
}
