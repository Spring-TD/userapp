import type { CreateMonoMandateRequest, InitiateMonoDebitRequest, MonoDebitAttempt, MonoDirectDebitMandate, MonoDirectDebitWebhook } from '../types/monoDirectDebit';
import { MonoDirectDebitClient } from './monoDirectDebitClient';
export declare class MonoDirectDebitService {
    private readonly monoClient;
    constructor(monoClient?: MonoDirectDebitClient);
    createMandate(input: CreateMonoMandateRequest): Promise<MonoDirectDebitMandate>;
    balanceInquiry(mandateId: string, amountKobo?: number): Promise<import("../types/monoDirectDebit").MonoBalanceInquiryResult>;
    initiateDebit(mandateId: string, input: InitiateMonoDebitRequest): Promise<MonoDebitAttempt>;
    processWebhook(payload: MonoDirectDebitWebhook): Promise<{
        event?: string;
        processed: boolean;
        duplicate?: boolean;
    }>;
    private getMandateOrThrow;
    private processMandateWebhook;
    private processDebitWebhook;
    private creditRepaymentWallet;
    /** @deprecated Use creditRepaymentWallet */
    private creditSettlementForRepayment;
    /** @deprecated Use creditRepaymentWallet */
    private creditTreasuryForRepayment;
}
export declare const monoDirectDebitService: MonoDirectDebitService;
//# sourceMappingURL=monoDirectDebitService.d.ts.map