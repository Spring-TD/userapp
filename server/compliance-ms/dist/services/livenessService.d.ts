import { Shareholder } from '../types/kycTypes';
export declare class LivenessService {
    private livenessProvider;
    constructor();
    generateLivenessTest(shareholderId: string, callbackUrl: string): Promise<{
        url: string;
        expiresAt: Date;
        providerReference: string;
    }>;
    processLivenessResult(providerReference: string): Promise<{
        success: boolean;
        score?: number;
        details?: string;
        completedAt: Date;
    }>;
    initializeShareholderLiveness(shareholder: any, callbackUrl: string): Promise<Shareholder>;
    updateShareholderWithLivenessResult(shareholder: Shareholder, providerReference: string): Promise<Shareholder>;
}
export declare const livenessService: LivenessService;
//# sourceMappingURL=livenessService.d.ts.map