import mongoose, { Document, Model } from 'mongoose';
import type { MonoDebitAttempt } from '../types/monoDirectDebit';
export interface IMonoDirectDebitAttemptDocument extends Omit<MonoDebitAttempt, 'id'>, Document {
    _id: mongoose.Types.ObjectId;
}
export declare const MonoDirectDebitAttemptModel: Model<IMonoDirectDebitAttemptDocument>;
export declare function toMonoDirectDebitAttempt(doc: IMonoDirectDebitAttemptDocument | Record<string, unknown>): MonoDebitAttempt;
//# sourceMappingURL=MonoDirectDebitAttemptModel.d.ts.map