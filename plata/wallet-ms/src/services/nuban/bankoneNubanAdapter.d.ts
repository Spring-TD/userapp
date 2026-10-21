import type { MerchantWallet, UserWallet } from '../../models/Wallet';
import type { BankOneMerchantSettings } from '../../models/MerchantBankingConfig';
import type { ProvisionUserNubanOptions } from './types';
export declare function provisionBankOneNubanForUserWallet(wallet: UserWallet, settings: BankOneMerchantSettings, options?: ProvisionUserNubanOptions): Promise<UserWallet>;
export declare function reprovisionIfNeeded(wallet: MerchantWallet | UserWallet, settings: BankOneMerchantSettings, options: ProvisionUserNubanOptions): Promise<MerchantWallet | UserWallet>;
//# sourceMappingURL=bankoneNubanAdapter.d.ts.map