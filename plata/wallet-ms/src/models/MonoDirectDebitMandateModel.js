"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonoDirectDebitMandateModel = void 0;
exports.toMonoDirectDebitMandate = toMonoDirectDebitMandate;
const mongoose_1 = __importStar(require("mongoose"));
const customerSchema = new mongoose_1.Schema({
    id: { type: String },
    name: { type: String },
    email: { type: String },
    phone: { type: String },
    bvn: { type: String }
}, { _id: false });
const monoDirectDebitMandateSchema = new mongoose_1.Schema({
    applicationId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    merchantId: { type: String, required: true, index: true },
    debitType: { type: String, enum: ['fixed', 'variable'], required: true },
    mandateType: { type: String, enum: ['emandate', 'sweep', 'signed_mandate'], required: true },
    amountKobo: { type: Number, required: true, min: 1 },
    reference: { type: String, required: true, unique: true },
    status: {
        type: String,
        enum: ['initiated', 'created', 'approved', 'ready', 'rejected', 'paused', 'cancelled', 'expired', 'failed'],
        default: 'initiated',
        required: true,
        index: true
    },
    readyToDebit: { type: Boolean, required: true, default: false },
    monoMandateId: { type: String, index: true, sparse: true },
    monoUrl: { type: String },
    nibssCode: { type: String },
    accountName: { type: String },
    accountNumber: { type: String, required: true },
    bankCode: { type: String, required: true },
    bankName: { type: String },
    customer: { type: customerSchema },
    description: { type: String },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    feeBearer: { type: String, enum: ['business', 'customer'] },
    redirectUrl: { type: String },
    schedule: { type: mongoose_1.Schema.Types.Mixed },
    meta: { type: mongoose_1.Schema.Types.Mixed },
    rawMonoResponse: { type: mongoose_1.Schema.Types.Mixed }
}, { timestamps: true });
monoDirectDebitMandateSchema.index({ applicationId: 1, createdAt: -1 });
monoDirectDebitMandateSchema.index({ merchantId: 1, status: 1, createdAt: -1 });
monoDirectDebitMandateSchema.index({ monoMandateId: 1 }, { sparse: true });
exports.MonoDirectDebitMandateModel = mongoose_1.default.models.MonoDirectDebitMandate ??
    mongoose_1.default.model('MonoDirectDebitMandate', monoDirectDebitMandateSchema);
function toMonoDirectDebitMandate(doc) {
    const raw = doc && typeof doc.toObject === 'function'
        ? doc.toObject()
        : doc;
    return {
        id: raw._id?.toString?.() ?? '',
        applicationId: String(raw.applicationId ?? ''),
        userId: String(raw.userId ?? ''),
        merchantId: String(raw.merchantId ?? ''),
        debitType: raw.debitType,
        mandateType: raw.mandateType,
        amountKobo: Number(raw.amountKobo ?? 0),
        reference: String(raw.reference ?? ''),
        status: raw.status,
        readyToDebit: Boolean(raw.readyToDebit),
        monoMandateId: raw.monoMandateId,
        monoUrl: raw.monoUrl,
        nibssCode: raw.nibssCode,
        accountName: raw.accountName,
        accountNumber: String(raw.accountNumber ?? ''),
        bankCode: String(raw.bankCode ?? ''),
        bankName: raw.bankName,
        customer: raw.customer,
        description: raw.description,
        startDate: String(raw.startDate ?? ''),
        endDate: String(raw.endDate ?? ''),
        feeBearer: raw.feeBearer,
        redirectUrl: raw.redirectUrl,
        schedule: raw.schedule,
        meta: raw.meta,
        rawMonoResponse: raw.rawMonoResponse,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt
    };
}
//# sourceMappingURL=MonoDirectDebitMandateModel.js.map