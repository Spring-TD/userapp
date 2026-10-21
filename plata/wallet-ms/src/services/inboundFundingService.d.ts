export type InboundFundingProvider = 'bankone' | 'payonus';
export interface ProcessInboundFundingInput {
    provider: InboundFundingProvider;
    transactionId: string;
    /** Provider major units (Naira). Converted to kobo before ledger write. */
    amount: number;
    amountUnit?: 'kobo' | 'naira';
    currency?: string;
    walletId: string;
    userId?: string;
    merchantId?: string;
    appId?: string;
    description?: string;
    merchantReference?: string;
    narration?: string;
    accountNumber?: string;
    payload?: Record<string, unknown>;
}
export interface ProcessInboundFundingResult {
    success: boolean;
    duplicate?: boolean;
    skipped?: boolean;
    error?: string;
    statusCode?: number;
    data?: Record<string, unknown>;
}
/**
 * Shared inbound credit path for PayOnUs webhooks and BankOne poller.
 * Idempotent on (provider, transactionId) via WebhookEventModel.
 */
export declare function processInboundFundingCredit(input: ProcessInboundFundingInput): Promise<ProcessInboundFundingResult>;
//# sourceMappingURL=inboundFundingService.d.ts.map