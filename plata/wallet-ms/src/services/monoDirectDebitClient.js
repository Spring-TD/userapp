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
exports.monoDirectDebitClient = exports.MonoDirectDebitClient = void 0;
const axios_1 = __importStar(require("axios"));
const environment_1 = require("../config/environment");
function asRecord(value) {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        return value;
    }
    return undefined;
}
function getPath(obj, path) {
    return path.split('.').reduce((cur, part) => {
        if (!cur || typeof cur !== 'object')
            return undefined;
        return cur[part];
    }, obj);
}
function firstString(obj, paths) {
    for (const path of paths) {
        const value = getPath(obj, path);
        if (typeof value === 'string' && value.trim())
            return value.trim();
    }
    return undefined;
}
function firstBoolean(obj, paths) {
    for (const path of paths) {
        const value = getPath(obj, path);
        if (typeof value === 'boolean')
            return value;
    }
    return undefined;
}
function firstNumber(obj, paths) {
    for (const path of paths) {
        const value = getPath(obj, path);
        if (typeof value === 'number' && Number.isFinite(value))
            return value;
        if (typeof value === 'string' && value.trim()) {
            const parsed = Number(value);
            if (Number.isFinite(parsed))
                return parsed;
        }
    }
    return undefined;
}
function monoErrorMessage(error) {
    if (error instanceof axios_1.AxiosError) {
        const payload = asRecord(error.response?.data);
        const message = firstString(payload, ['message', 'error', 'data.message', 'data.error']);
        return message ?? `Mono Direct Debit request failed with status ${error.response?.status ?? 'unknown'}`;
    }
    return error instanceof Error ? error.message : 'Mono Direct Debit request failed';
}
function buildMandatePayload(input) {
    const payload = {
        debit_type: input.debitType,
        mandate_type: input.mandateType ?? 'emandate',
        amount: input.amountKobo,
        reference: input.reference,
        account_number: input.accountNumber,
        bank_code: input.bankCode,
        fee_bearer: input.feeBearer ?? 'business',
        description: input.description ?? `Loan repayment mandate for ${input.applicationId}`,
        start_date: input.startDate,
        end_date: input.endDate,
        meta: {
            applicationId: input.applicationId,
            userId: input.userId,
            merchantId: input.merchantId,
            ...(input.meta ?? {})
        }
    };
    if (input.customer?.id) {
        payload.customer = input.customer.id;
    }
    else if (input.customer) {
        payload.customer = input.customer;
    }
    if (input.redirectUrl)
        payload.redirect_url = input.redirectUrl;
    if (input.schedule)
        payload.schedule = input.schedule;
    if (input.verificationMethod)
        payload.verification_method = input.verificationMethod;
    return payload;
}
function normalizeMandateResponse(payload) {
    return {
        monoMandateId: firstString(payload, ['data.id', 'id', 'data.mandate.id', 'mandate.id']),
        monoUrl: firstString(payload, ['data.mono_url', 'mono_url', 'data.url', 'url', 'data.link', 'link']),
        nibssCode: firstString(payload, ['data.nibss_code', 'nibss_code']),
        status: firstString(payload, ['data.status', 'status']),
        readyToDebit: firstBoolean(payload, ['data.ready_to_debit', 'ready_to_debit']),
        accountName: firstString(payload, ['data.account_name', 'account_name']),
        bankName: firstString(payload, ['data.bank', 'data.bank_name', 'bank', 'bank_name']),
        rawResponse: payload
    };
}
class MonoDirectDebitClient {
    constructor() {
        this.http = axios_1.default.create({
            baseURL: environment_1.config.monoBaseUrl.replace(/\/$/, ''),
            timeout: 30000,
            headers: {
                accept: 'application/json',
                'content-type': 'application/json'
            }
        });
    }
    isConfigured() {
        return environment_1.config.monoSecretKey.trim() !== '';
    }
    async initiateMandate(input) {
        this.assertConfigured();
        try {
            const response = await this.http.post('/v2/payments/initiate', buildMandatePayload(input), { headers: this.authHeaders() });
            return normalizeMandateResponse(response.data);
        }
        catch (error) {
            throw new Error(monoErrorMessage(error));
        }
    }
    async createMandate(input) {
        this.assertConfigured();
        try {
            const response = await this.http.post('/v3/payments/mandates', buildMandatePayload(input), { headers: this.authHeaders() });
            return normalizeMandateResponse(response.data);
        }
        catch (error) {
            throw new Error(monoErrorMessage(error));
        }
    }
    async balanceInquiry(localMandateId, monoMandateId, amountKobo) {
        this.assertConfigured();
        try {
            const response = await this.http.get(`/v3/payments/mandates/${encodeURIComponent(monoMandateId)}/balance-inquiry`, {
                headers: this.authHeaders(),
                params: amountKobo !== undefined ? { amount: amountKobo } : undefined
            });
            const rawResponse = response.data;
            return {
                mandateId: localMandateId,
                monoMandateId,
                amountKobo,
                sufficient: firstBoolean(rawResponse, ['data.sufficient', 'data.has_enough_balance', 'sufficient']),
                balanceKobo: firstNumber(rawResponse, ['data.balance', 'balance']),
                rawResponse
            };
        }
        catch (error) {
            throw new Error(monoErrorMessage(error));
        }
    }
    async debit(monoMandateId, input) {
        this.assertConfigured();
        try {
            const payload = {
                amount: input.amountKobo,
                reference: input.reference,
                narration: input.narration,
                fee_bearer: input.feeBearer ?? 'business'
            };
            if (input.beneficiary)
                payload.beneficiary = input.beneficiary;
            if (input.meta)
                payload.meta = input.meta;
            const response = await this.http.post(`/v3/payments/mandates/${encodeURIComponent(monoMandateId)}/debit`, payload, { headers: this.authHeaders() });
            return {
                status: firstString(response.data, ['data.status', 'status']),
                rawResponse: response.data
            };
        }
        catch (error) {
            throw new Error(monoErrorMessage(error));
        }
    }
    authHeaders() {
        return { 'mono-sec-key': environment_1.config.monoSecretKey };
    }
    assertConfigured() {
        if (!this.isConfigured()) {
            throw new Error('Mono Direct Debit is not configured. Set MONO_SECRET_KEY on wallet-ms.');
        }
    }
}
exports.MonoDirectDebitClient = MonoDirectDebitClient;
exports.monoDirectDebitClient = new MonoDirectDebitClient();
//# sourceMappingURL=monoDirectDebitClient.js.map