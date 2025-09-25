export interface CACVerificationResult {
    success: boolean;
    valid: boolean;
    message: string;
    data?: {
        companyName?: string;
        registrationNumber?: string;
        registrationDate?: string;
        status?: string;
        address?: string;
        directors?: Array<{
            name: string;
            position: string;
        }>;
    };
    error?: string;
}
export declare class CACService {
    verifyCertificateOfIncorporation(registrationNumber: string, companyName: string): Promise<CACVerificationResult>;
    mockVerifyCertificateOfIncorporation(registrationNumber: string, companyName: string): Promise<CACVerificationResult>;
}
export declare const cacService: CACService;
//# sourceMappingURL=cacService.d.ts.map