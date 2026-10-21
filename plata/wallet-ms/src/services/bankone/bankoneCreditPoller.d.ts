export interface BankOneCreditSyncResult {
    merchantId: string;
    walletsScanned: number;
    creditsApplied: number;
    duplicates: number;
    errors: string[];
}
export declare function syncBankOneCreditsForMerchant(merchantId: string): Promise<BankOneCreditSyncResult>;
export declare function runBankOneCreditPollerTick(): Promise<void>;
export declare function startBankOneCreditPoller(): void;
export declare function stopBankOneCreditPoller(): void;
//# sourceMappingURL=bankoneCreditPoller.d.ts.map