import type { MerchantWallet, UserWallet } from '../../models/Wallet';
import type { ProvisionUserNubanOptions } from './types';
/**
 * Opt-in BankOne for user wallets when MerchantBankingConfig is enabled;
 * otherwise (and for merchant wallets) use PayOnUs.
 */
export declare function provisionUserWalletNuban(wallet: UserWallet, options?: ProvisionUserNubanOptions): Promise<UserWallet>;
export declare function reprovisionUserWalletNuban(wallet: UserWallet, options?: ProvisionUserNubanOptions): Promise<UserWallet>;
/** Merchant wallets always use PayOnUs (BankOne is applicant/user only). */
export declare function provisionMerchantWalletNuban(wallet: MerchantWallet): Promise<MerchantWallet>;
//# sourceMappingURL=provisionUserNuban.d.ts.map