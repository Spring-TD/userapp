export type NubanProviderId = 'bankone' | 'payonus';
export interface ApplicantProfile {
    fullName?: string;
    firstName?: string;
    lastName?: string;
    otherNames?: string;
    email?: string;
    phone?: string;
    bvn?: string;
    gender?: string;
    dateOfBirth?: string;
    placeOfBirth?: string;
    address?: string;
    accountTier?: string;
}
export interface ProvisionUserNubanOptions {
    bvn?: string;
    applicantProfile?: ApplicantProfile;
}
export interface NubanProvisionResultDetails {
    provider: NubanProviderId;
    accountType: 'static' | 'reserved' | 'dynamic';
    accountNumber?: string;
    bankName?: string;
    bankCode?: string;
    providerReference?: string;
    provisionError?: string;
}
//# sourceMappingURL=types.d.ts.map