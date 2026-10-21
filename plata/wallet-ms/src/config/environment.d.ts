export interface Config {
    port: number;
    nodeEnv: string;
    mongoUri: string;
    authServiceUrl: string;
    complianceServiceUrl: string;
    jwtSecret: string;
    jwtExpiresIn: string;
    monoBaseUrl: string;
    monoSecretKey: string;
    monoWebhookSecret: string;
    productServiceUrl: string;
    notificationsServiceUrl: string;
    /** Alert when Treasury mainBalance (kobo) is at/below this after a debit. Default ₦1,000. */
    treasuryLowBalanceThresholdKobo: number;
    /** Minimum gap between low-balance alerts for the same wallet. Default 24h. */
    treasuryLowBalanceCooldownMs: number;
}
export declare const config: Config;
//# sourceMappingURL=environment.d.ts.map