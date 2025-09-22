import { KYCDocument, KYCProfile } from '../types/kycTypes';
export interface MockKYCDocument extends KYCDocument {
    _id?: string;
}
export interface MockKYCProfile extends KYCProfile {
    _id?: string;
    documents: MockKYCDocument[];
}
export declare const KYCDocumentModel: {};
export declare const KYCProfileModel: {};
//# sourceMappingURL=kycModels.d.ts.map