import type { CreateMonoMandateRequest, InitiateMonoDebitRequest, MonoBalanceInquiryResult } from '../types/monoDirectDebit';
export interface MonoMandateProviderResult {
    monoMandateId?: string;
    monoUrl?: string;
    nibssCode?: string;
    status?: string;
    readyToDebit?: boolean;
    accountName?: string;
    bankName?: string;
    rawResponse: Record<string, unknown>;
}
export interface MonoDebitProviderResult {
    status?: string;
    rawResponse: Record<string, unknown>;
}
export declare class MonoDirectDebitClient {
    private readonly http;
    isConfigured(): boolean;
    initiateMandate(input: CreateMonoMandateRequest): Promise<MonoMandateProviderResult>;
    createMandate(input: CreateMonoMandateRequest): Promise<MonoMandateProviderResult>;
    balanceInquiry(localMandateId: string, monoMandateId: string, amountKobo?: number): Promise<MonoBalanceInquiryResult>;
    debit(monoMandateId: string, input: Required<Pick<InitiateMonoDebitRequest, 'amountKobo' | 'reference' | 'narration'>> & InitiateMonoDebitRequest): Promise<MonoDebitProviderResult>;
    private authHeaders;
    private assertConfigured;
}
export declare const monoDirectDebitClient: MonoDirectDebitClient;
//# sourceMappingURL=monoDirectDebitClient.d.ts.map