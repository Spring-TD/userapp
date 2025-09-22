import { KYCProfile, KYCDocument } from '../types/kycTypes';
interface MockDatabase {
    kycProfiles: (KYCProfile & {
        _id: string;
    })[];
    documents: (KYCDocument & {
        _id: string;
        userId: string;
    })[];
}
declare const mockDb: MockDatabase;
export declare class MockKYCProfileModel {
    static save(profile: KYCProfile): Promise<KYCProfile & {
        _id: string;
    }>;
    static findOne(query: any): Promise<(KYCProfile & {
        _id: string;
    }) | null>;
    static findById(id: string): Promise<(KYCProfile & {
        _id: string;
    }) | null>;
    static find(query?: any): Promise<(KYCProfile & {
        _id: string;
    })[]>;
    static findByIdAndUpdate(id: string, update: any, options?: any): Promise<(KYCProfile & {
        _id: string;
    }) | null>;
    static deleteOne(query: any): Promise<{
        deletedCount: number;
    }>;
}
export declare class MockKYCDocumentModel {
    static save(document: KYCDocument & {
        userId: string;
    }): Promise<KYCDocument & {
        _id: string;
        userId: string;
    }>;
    static findById(id: string): Promise<(KYCDocument & {
        _id: string;
        userId: string;
    }) | null>;
    static find(query?: any): Promise<(KYCDocument & {
        _id: string;
        userId: string;
    })[]>;
    static findByIdAndUpdate(id: string, update: any, options?: any): Promise<(KYCDocument & {
        _id: string;
        userId: string;
    }) | null>;
    static deleteOne(query: any): Promise<{
        deletedCount: number;
    }>;
}
export declare const seedMockData: () => void;
export declare const getDbStats: () => {
    kycProfiles: number;
    documents: number;
    statuses: {
        pending: number;
        inProgress: number;
        completed: number;
        approved: number;
        rejected: number;
    };
    userTypes: {
        individual: number;
        merchant: number;
    };
};
export declare const clearMockData: () => void;
export { mockDb };
//# sourceMappingURL=mockDb.d.ts.map