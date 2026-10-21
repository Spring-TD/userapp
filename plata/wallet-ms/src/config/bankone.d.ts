export declare const bankoneConfig: {
    /** Background GetTransactions poller for bankone-provisioned user wallets. */
    creditPollerEnabled: boolean;
    creditPollerIntervalMs: number;
    /** Rolling lookback window for GetTransactions. */
    creditPollerLookbackDays: number;
    creditPollerBatchSize: number;
    httpTimeoutMs: number;
    /**
     * Shared secret Charis/BankOne must send on activity webhooks
     * (`X-BankOne-Webhook-Token`, `Authorization: Bearer`, or `?authToken=`).
     * Alias: CHARIS_WEBHOOK_TOKEN.
     */
    webhookToken: string;
    /** Reject webhooks when token is missing/invalid (default true when token is set). */
    webhookEnforceToken: boolean;
};
//# sourceMappingURL=bankone.d.ts.map