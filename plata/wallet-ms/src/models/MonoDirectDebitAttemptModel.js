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
exports.MonoDirectDebitAttemptModel = void 0;
exports.toMonoDirectDebitAttempt = toMonoDirectDebitAttempt;
const mongoose_1 = __importStar(require("mongoose"));
const beneficiarySchema = new mongoose_1.Schema({
    nuban: { type: String, required: true },
    nip_code: { type: String, required: true }
}, { _id: false });
const balanceInquirySchema = new mongoose_1.Schema({
    mandateId: { type: String, required: true },
    monoMandateId: { type: String, required: true },
    amountKobo: { type: Number },
    sufficient: { type: Boolean },
    balanceKobo: { type: Number },
    rawResponse: { type: mongoose_1.Schema.Types.Mixed, required: true }
}, { _id: false });
const monoDirectDebitAttemptSchema = new mongoose_1.Schema({
    mandateId: { type: String, required: true, index: true },
    monoMandateId: { type: String, required: true, index: true },
    applicationId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    merchantId: { type: String, required: true, index: true },
    amountKobo: { type: Number, required: true, min: 1 },
    reference: { type: String, required: true, unique: true },
    narration: { type: String, required: true },
    status: {
        type: String,
        enum: ['pending', 'processing', 'successful', 'failed', 'cancelled'],
        default: 'pending',
        required: true,
        index: true
    },
    feeBearer: { type: String, enum: ['business', 'customer'] },
    beneficiary: { type: beneficiarySchema },
    balanceInquiry: { type: balanceInquirySchema },
    rawMonoResponse: { type: mongoose_1.Schema.Types.Mixed },
    rawWebhookPayload: { type: mongoose_1.Schema.Types.Mixed },
    failureReason: { type: String }
}, { timestamps: true });
monoDirectDebitAttemptSchema.index({ mandateId: 1, createdAt: -1 });
monoDirectDebitAttemptSchema.index({ merchantId: 1, status: 1, createdAt: -1 });
exports.MonoDirectDebitAttemptModel = mongoose_1.default.models.MonoDirectDebitAttempt ??
    mongoose_1.default.model('MonoDirectDebitAttempt', monoDirectDebitAttemptSchema);
function toMonoDirectDebitAttempt(doc) {
    const raw = doc && typeof doc.toObject === 'function'
        ? doc.toObject()
        : doc;
    return {
        id: raw._id?.toString?.() ?? '',
        mandateId: String(raw.mandateId ?? ''),
        monoMandateId: String(raw.monoMandateId ?? ''),
        applicationId: String(raw.applicationId ?? ''),
        userId: String(raw.userId ?? ''),
        merchantId: String(raw.merchantId ?? ''),
        amountKobo: Number(raw.amountKobo ?? 0),
        reference: String(raw.reference ?? ''),
        narration: String(raw.narration ?? ''),
        status: raw.status,
        feeBearer: raw.feeBearer,
        beneficiary: raw.beneficiary,
        balanceInquiry: raw.balanceInquiry,
        rawMonoResponse: raw.rawMonoResponse,
        rawWebhookPayload: raw.rawWebhookPayload,
        failureReason: raw.failureReason,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt
    };
}
//# sourceMappingURL=MonoDirectDebitAttemptModel.js.map