import mongoose, { Document, Model } from 'mongoose';
import type { MerchantBankingConfig } from './MerchantBankingConfig';
export interface IMerchantBankingConfigDocument extends Omit<MerchantBankingConfig, 'id'>, Document {
    _id: mongoose.Types.ObjectId;
}
export declare const MerchantBankingConfigModel: Model<IMerchantBankingConfigDocument>;
export declare function toMerchantBankingConfig(doc: IMerchantBankingConfigDocument | Record<string, unknown>): MerchantBankingConfig;
//# sourceMappingURL=MerchantBankingConfigModel.d.ts.map