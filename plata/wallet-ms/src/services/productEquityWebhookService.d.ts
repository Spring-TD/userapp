export interface ForwardExternalEquityPaymentInput {
    applicationId: string;
    amount: number;
    currency: string;
    providerReference: string;
    merchantId?: string;
    appId?: string;
}
export declare function forwardExternalEquityPaymentToProductMs(input: ForwardExternalEquityPaymentInput): Promise<{
    success: boolean;
    duplicate?: boolean;
    error?: string;
    status?: number;
}>;
//# sourceMappingURL=productEquityWebhookService.d.ts.map