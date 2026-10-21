import mongoose, { Document, Model } from 'mongoose';
import type { MonoDirectDebitMandate } from '../types/monoDirectDebit';
export interface IMonoDirectDebitMandateDocument extends Omit<MonoDirectDebitMandate, 'id'>, Document {
    _id: mongoose.Types.ObjectId;
}
export declare const MonoDirectDebitMandateModel: Model<IMonoDirectDebitMandateDocument>;
export declare function toMonoDirectDebitMandate(doc: IMonoDirectDebitMandateDocument | Record<string, unknown>): MonoDirectDebitMandate;
//# sourceMappingURL=MonoDirectDebitMandateModel.d.ts.map