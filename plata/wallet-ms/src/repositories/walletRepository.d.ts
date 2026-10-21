import { Wallet, MerchantWallet, UserWallet, MerchantWalletType } from '../models/Wallet';
export declare function createWallet(doc: {
    walletType: 'MERCHANT' | 'USER';
    merchantId: string;
    complianceShareholderUserId?: string;
    appId?: string;
    appName?: string;
    payonusSubaccountCode?: string;
    name: string;
    currency: string;
    merchantWalletType?: MerchantWalletType;
    userId?: string;
}): Promise<Wallet>;
export declare function getWalletById(walletId: string): Promise<Wallet | null>;
export declare function getWalletByPayonusAccountNumber(accountNumber: string): Promise<Wallet | null>;
export declare function getMerchantWalletByType(merchantId: string, walletType: MerchantWalletType, appId?: string): Promise<MerchantWallet | null>;
export declare function getAllMerchantWallets(merchantId: string, appId?: string): Promise<MerchantWallet[]>;
export declare function getUserWallet(userId: string): Promise<UserWallet | null>;
export declare function getUserWalletForMerchant(userId: string, merchantId: string): Promise<UserWallet | null>;
export declare function getUserWalletsByMerchant(merchantId: string, opts?: {
    limit?: number;
    skip?: number;
}): Promise<{
    wallets: UserWallet[];
    total: number;
    limit: number;
    skip: number;
}>;
export declare function updateWallet(walletId: string, updates: {
    mainBalance?: number;
    ledgerBalance?: number;
    balanceUnit?: 'kobo' | 'naira';
    updatedAt?: Date;
}): Promise<Wallet | null>;
/**
 * Atomic balance adjustment ($inc). Prefer this over updateWallet for credits/debits.
 */
export declare function adjustWalletBalance(walletId: string, deltas: {
    mainDelta: number;
    ledgerDelta?: number;
}): Promise<{
    wallet: Wallet;
    balanceBefore: number;
    balanceAfter: number;
} | {
    insufficientFunds: true;
} | null>;
export declare function findAllWallets(): Promise<Wallet[]>;
export type PayonusNubanPatchFields = {
    payonusNubanAccountNumber?: string;
    payonusNubanBankName?: string;
    payonusNubanBankCode?: string;
    payonusNubanProviderReference?: string;
    payonusNubanAccountType?: 'static' | 'reserved' | 'dynamic';
    payonusNubanProvisionStatus?: 'active' | 'failed';
    /** Pass `null` to clear a previous error after a successful reprovision */
    payonusNubanProvisionError?: string | null;
    payonusNubanProvisionedAt?: Date | null;
};
export type VirtualNubanPatchFields = PayonusNubanPatchFields & {
    nubanProvider?: 'bankone' | 'payonus' | 'legerblock';
    legerblockUserRef?: string | null;
    legerblockWalletId?: string | null;
};
export declare function patchWalletVirtualNuban(walletId: string, patch: VirtualNubanPatchFields): Promise<Wallet | null>;
/** @deprecated Prefer patchWalletVirtualNuban */
export declare function patchWalletPayonusNuban(walletId: string, patch: PayonusNubanPatchFields | VirtualNubanPatchFields): Promise<Wallet | null>;
export declare function getWalletByVirtualAccountNumber(accountNumber: string): Promise<Wallet | null>;
//# sourceMappingURL=walletRepository.d.ts.map