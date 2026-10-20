import type { MerchantWallet, UserWallet } from '../models/Wallet';
import { isLegerblockNubanReady, legerblockNubanConfig } from '../config/legerblockNuban';
import { db } from '../db/database';
import { createMerchantLegerblockNuban, createUserLegerblockNuban } from './legerblockNubanClient';
import { logger } from '../utils/logger';

async function refetch(walletId: string): Promise<MerchantWallet | UserWallet | null> {
  const w = await db.getWalletById(walletId);
  if (!w) return null;
  if (w.walletType !== 'MERCHANT' && w.walletType !== 'USER') return null;
  return w as MerchantWallet | UserWallet;
}

/**
 * Provision a LegerBlock static NUBAN for a wallet. Stores account fields on the
 * existing payonusNuban* columns for lookup compatibility, and sets nubanProvider=legerblock.
 */
export async function provisionLegerblockNubanForWallet(
  wallet: MerchantWallet | UserWallet
): Promise<MerchantWallet | UserWallet> {
  if (!isLegerblockNubanReady()) {
    return wallet;
  }

  const currency = wallet.currency.toUpperCase();
  if (!legerblockNubanConfig.currencies.includes(currency)) {
    return wallet;
  }

  // Do not overwrite an already-active NUBAN (PayOnUs or LegerBlock).
  if (wallet.virtualNuban?.provisionStatus === 'active' && wallet.virtualNuban.accountNumber) {
    return wallet;
  }

  const accountType = wallet.walletType === 'MERCHANT' ? 'dynamic' : 'reserved';

  try {
    const result =
      wallet.walletType === 'MERCHANT'
        ? await createMerchantLegerblockNuban(wallet as MerchantWallet)
        : await createUserLegerblockNuban(wallet as UserWallet);

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
        nubanProvider: 'legerblock',
        legerblockUserRef: result.details.userRef ?? null,
        legerblockWalletId: result.details.walletId ?? null
      });
      logger.info('LegerBlock NUBAN provisioned', { walletId: wallet.id, accountType });
    } else {
      await db.patchWalletPayonusNuban(wallet.id, {
        payonusNubanAccountType: accountType,
        payonusNubanProvisionStatus: 'failed',
        payonusNubanProvisionError: result.errorMessage || 'LegerBlock did not return an account number',
        nubanProvider: 'legerblock'
      });
      logger.warn('LegerBlock NUBAN provisioning failed', {
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
      nubanProvider: 'legerblock'
    });
    logger.error('LegerBlock NUBAN provisioning threw', { walletId: wallet.id, error: message });
  }

  const updated = await refetch(wallet.id);
  return updated ?? wallet;
}
