import type { MerchantWallet, UserWallet } from '../models/Wallet';
import {
  isLegerblockNubanReady,
  resolveDefaultNubanProvider,
  type NubanProviderId
} from '../config/legerblockNuban';
import { isPayonusNubanReady } from '../config/payonusNuban';
import { provisionPayonusNubanForWallet } from './payonusNubanProvisioning';
import { provisionLegerblockNubanForWallet } from './legerblockNubanProvisioning';
import { logger } from '../utils/logger';

export function inferWalletNubanProvider(wallet: MerchantWallet | UserWallet): NubanProviderId {
  if (wallet.nubanProvider === 'legerblock' || wallet.nubanProvider === 'payonus') {
    return wallet.nubanProvider;
  }
  return 'payonus';
}

/**
 * Route new NUBAN provisioning to LegerBlock or PayOnUs based on NUBAN_PROVIDER_DEFAULT.
 * Never reissues when an active NUBAN already exists.
 */
export async function provisionVirtualNubanForWallet(
  wallet: MerchantWallet | UserWallet
): Promise<MerchantWallet | UserWallet> {
  if (wallet.virtualNuban?.provisionStatus === 'active' && wallet.virtualNuban.accountNumber) {
    return wallet;
  }

  const preferred = resolveDefaultNubanProvider();
  let provider: NubanProviderId = preferred;

  if (preferred === 'legerblock' && !isLegerblockNubanReady()) {
    if (isPayonusNubanReady()) {
      logger.warn('NUBAN_PROVIDER_DEFAULT=legerblock but LegerBlock is not ready; falling back to PayOnUs', {
        walletId: wallet.id
      });
      provider = 'payonus';
    } else {
      return wallet;
    }
  } else if (preferred === 'payonus' && !isPayonusNubanReady()) {
    if (isLegerblockNubanReady()) {
      logger.warn('PayOnUs is not ready; provisioning via LegerBlock', { walletId: wallet.id });
      provider = 'legerblock';
    } else {
      return wallet;
    }
  }

  if (provider === 'legerblock') {
    return provisionLegerblockNubanForWallet(wallet);
  }
  return provisionPayonusNubanForWallet(wallet);
}
