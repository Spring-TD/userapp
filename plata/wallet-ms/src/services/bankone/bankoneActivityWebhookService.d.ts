export type BankOneActivityEventType = 'account.created' | 'credit' | 'debit' | 'other';
export interface BankOneActivityWebhookResult {
    success: boolean;
    duplicate?: boolean;
    acknowledged?: boolean;
    eventType: BankOneActivityEventType;
    error?: string;
    statusCode?: number;
    data?: Record<string, unknown>;
}
export declare function extractBankOneWebhookToken(input: {
    headers: Record<string, string | string[] | undefined>;
    query?: Record<string, unknown>;
}): string | undefined;
export declare function verifyBankOneWebhookToken(expected: string, provided: string | undefined, enforce: boolean): boolean;
export declare function normalizeBankOneActivityEventType(raw?: string): BankOneActivityEventType;
/**
 * Process Charis/BankOne activity push webhooks (account create, credit, debit, other).
 * Credits reuse the shared inbound funding path (idempotent + equity routing).
 */
export declare function processBankOneActivityWebhook(body: unknown): Promise<BankOneActivityWebhookResult>;
//# sourceMappingURL=bankoneActivityWebhookService.d.ts.map