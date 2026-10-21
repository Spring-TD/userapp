import { MerchantBankingConfig, MerchantBankingConfigPublic, UpsertMerchantBankingConfigInput } from '../models/MerchantBankingConfig';
export declare function getByMerchantId(merchantId: string): Promise<MerchantBankingConfig | null>;
export declare function listEnabledBankOneConfigs(): Promise<MerchantBankingConfig[]>;
export declare function toPublicConfig(config: MerchantBankingConfig): MerchantBankingConfigPublic;
/** Returns config with decrypted BankOne authToken for outbound API calls. */
export declare function getDecryptedBankOneConfig(merchantId: string): Promise<MerchantBankingConfig | null>;
export declare function upsert(input: UpsertMerchantBankingConfigInput): Promise<MerchantBankingConfig>;
export declare function isBankOneEnabledForMerchant(config: MerchantBankingConfig | null): boolean;
//# sourceMappingURL=merchantBankingConfigRepository.d.ts.map