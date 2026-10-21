export type MerchantBankingProvider = 'bankone' | 'payonus';
export interface BankOneMerchantSettings {
    coreBaseUrl: string;
    channelsBaseUrl?: string;
    /** Encrypted at rest when persisted. */
    authToken: string;
    institutionCode: string;
    productCode: string;
    accountOfficerCode: string;
    apiVersion: string;
    /** Optional defaults applied when applicant profile omits fields. */
    defaultAccountTier?: string;
    defaultGender?: string;
    defaultPlaceOfBirth?: string;
    defaultAddress?: string;
    bankName?: string;
    bankCode?: string;
}
export interface MerchantBankingConfig {
    id: string;
    merchantId: string;
    provider: MerchantBankingProvider;
    enabled: boolean;
    fallbackToPayonus: boolean;
    bankone?: BankOneMerchantSettings;
    createdAt: Date;
    updatedAt: Date;
}
export interface MerchantBankingConfigPublic {
    id: string;
    merchantId: string;
    provider: MerchantBankingProvider;
    enabled: boolean;
    fallbackToPayonus: boolean;
    bankone?: Omit<BankOneMerchantSettings, 'authToken'> & {
        authTokenMasked?: string;
    };
    createdAt: Date;
    updatedAt: Date;
}
export interface UpsertMerchantBankingConfigInput {
    merchantId: string;
    provider: MerchantBankingProvider;
    enabled?: boolean;
    fallbackToPayonus?: boolean;
    bankone?: Partial<BankOneMerchantSettings> & {
        authToken?: string;
    };
}
//# sourceMappingURL=MerchantBankingConfig.d.ts.map