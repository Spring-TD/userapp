"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockDb = exports.clearMockData = exports.getDbStats = exports.seedMockData = exports.MockKYCDocumentModel = exports.MockKYCProfileModel = void 0;
const crypto_1 = require("crypto");
const kycTypes_1 = require("../types/kycTypes");
const mockDb = {
    kycProfiles: [],
    documents: []
};
exports.mockDb = mockDb;
class MockKYCProfileModel {
    static async save(profile) {
        const newProfile = {
            ...profile,
            _id: (0, crypto_1.randomUUID)(),
            documents: profile.documents.map(doc => ({
                ...doc,
                _id: (0, crypto_1.randomUUID)()
            }))
        };
        mockDb.kycProfiles.push(newProfile);
        return newProfile;
    }
    static async findOne(query) {
        return mockDb.kycProfiles.find(profile => {
            if (query.userId && profile.userId !== query.userId)
                return false;
            if (query._id && profile._id !== query._id)
                return false;
            return true;
        }) || null;
    }
    static async findById(id) {
        return mockDb.kycProfiles.find(profile => profile._id === id) || null;
    }
    static async find(query = {}) {
        return mockDb.kycProfiles.filter(profile => {
            if (query.userId && profile.userId !== query.userId)
                return false;
            if (query.userType && profile.userType !== query.userType)
                return false;
            if (query.status && profile.status !== query.status)
                return false;
            if (query.submittedAt && query.submittedAt.$gte && profile.submittedAt && profile.submittedAt < query.submittedAt.$gte)
                return false;
            if (query.submittedAt && query.submittedAt.$lte && profile.submittedAt && profile.submittedAt > query.submittedAt.$lte)
                return false;
            return true;
        });
    }
    static async findByIdAndUpdate(id, update, options = {}) {
        const profileIndex = mockDb.kycProfiles.findIndex(profile => profile._id === id);
        if (profileIndex === -1)
            return null;
        mockDb.kycProfiles[profileIndex] = {
            ...mockDb.kycProfiles[profileIndex],
            ...update
        };
        return options.new ? mockDb.kycProfiles[profileIndex] : mockDb.kycProfiles[profileIndex];
    }
    static async deleteOne(query) {
        const initialLength = mockDb.kycProfiles.length;
        mockDb.kycProfiles = mockDb.kycProfiles.filter(profile => {
            if (query.userId && profile.userId === query.userId)
                return false;
            if (query._id && profile._id === query._id)
                return false;
            return true;
        });
        return { deletedCount: initialLength - mockDb.kycProfiles.length };
    }
}
exports.MockKYCProfileModel = MockKYCProfileModel;
class MockKYCDocumentModel {
    static async save(document) {
        const newDocument = {
            ...document,
            _id: (0, crypto_1.randomUUID)()
        };
        mockDb.documents.push(newDocument);
        return newDocument;
    }
    static async findById(id) {
        return mockDb.documents.find(doc => doc._id === id) || null;
    }
    static async find(query = {}) {
        return mockDb.documents.filter(doc => {
            if (query.userId && doc.userId !== query.userId)
                return false;
            if (query.type && doc.type !== query.type)
                return false;
            if (query.status && doc.status !== query.status)
                return false;
            return true;
        });
    }
    static async findByIdAndUpdate(id, update, options = {}) {
        const docIndex = mockDb.documents.findIndex(doc => doc._id === id);
        if (docIndex === -1)
            return null;
        mockDb.documents[docIndex] = {
            ...mockDb.documents[docIndex],
            ...update
        };
        return options.new ? mockDb.documents[docIndex] : mockDb.documents[docIndex];
    }
    static async deleteOne(query) {
        const initialLength = mockDb.documents.length;
        mockDb.documents = mockDb.documents.filter(doc => {
            if (query._id && doc._id === query._id)
                return false;
            return true;
        });
        return { deletedCount: initialLength - mockDb.documents.length };
    }
}
exports.MockKYCDocumentModel = MockKYCDocumentModel;
const seedMockData = () => {
    mockDb.kycProfiles = [];
    mockDb.documents = [];
    const sampleProfiles = [
        {
            _id: (0, crypto_1.randomUUID)(),
            userId: 'user-123',
            userType: kycTypes_1.UserType.INDIVIDUAL,
            documents: [
                {
                    _id: (0, crypto_1.randomUUID)(),
                    type: kycTypes_1.DocumentType.IDENTITY,
                    fileName: 'passport.pdf',
                    fileType: 'application/pdf',
                    fileSize: 2048000,
                    uploadDate: new Date('2024-01-15'),
                    status: kycTypes_1.KYCStatus.APPROVED
                },
                {
                    _id: (0, crypto_1.randomUUID)(),
                    type: kycTypes_1.DocumentType.ADDRESS,
                    fileName: 'utility_bill.pdf',
                    fileType: 'application/pdf',
                    fileSize: 1024000,
                    uploadDate: new Date('2024-01-15'),
                    status: kycTypes_1.KYCStatus.PENDING
                }
            ],
            status: kycTypes_1.KYCStatus.IN_PROGRESS,
            submittedAt: new Date('2024-01-15'),
        },
        {
            _id: (0, crypto_1.randomUUID)(),
            userId: 'merchant-456',
            userType: kycTypes_1.UserType.MERCHANT,
            documents: [
                {
                    _id: (0, crypto_1.randomUUID)(),
                    type: kycTypes_1.DocumentType.BUSINESS_REGISTRATION,
                    fileName: 'business_registration.pdf',
                    fileType: 'application/pdf',
                    fileSize: 3072000,
                    uploadDate: new Date('2024-01-10'),
                    status: kycTypes_1.KYCStatus.APPROVED
                },
                {
                    _id: (0, crypto_1.randomUUID)(),
                    type: kycTypes_1.DocumentType.TAX_CERTIFICATE,
                    fileName: 'tax_certificate.pdf',
                    fileType: 'application/pdf',
                    fileSize: 1536000,
                    uploadDate: new Date('2024-01-10'),
                    status: kycTypes_1.KYCStatus.APPROVED
                }
            ],
            status: kycTypes_1.KYCStatus.COMPLETED,
            submittedAt: new Date('2024-01-10'),
            completedAt: new Date('2024-01-12'),
        },
        {
            _id: (0, crypto_1.randomUUID)(),
            userId: 'user-789',
            userType: kycTypes_1.UserType.INDIVIDUAL,
            documents: [
                {
                    _id: (0, crypto_1.randomUUID)(),
                    type: kycTypes_1.DocumentType.IDENTITY,
                    fileName: 'drivers_license.pdf',
                    fileType: 'application/pdf',
                    fileSize: 1800000,
                    uploadDate: new Date('2024-01-20'),
                    status: kycTypes_1.KYCStatus.REJECTED,
                    rejectionReason: 'Document quality is too poor to verify'
                }
            ],
            status: kycTypes_1.KYCStatus.REJECTED,
            submittedAt: new Date('2024-01-20'),
            rejectionReason: 'Document quality issues'
        }
    ];
    mockDb.kycProfiles.push(...sampleProfiles);
    console.log('Mock data seeded successfully');
};
exports.seedMockData = seedMockData;
const getDbStats = () => {
    return {
        kycProfiles: mockDb.kycProfiles.length,
        documents: mockDb.documents.length,
        statuses: {
            pending: mockDb.kycProfiles.filter(p => p.status === kycTypes_1.KYCStatus.PENDING).length,
            inProgress: mockDb.kycProfiles.filter(p => p.status === kycTypes_1.KYCStatus.IN_PROGRESS).length,
            completed: mockDb.kycProfiles.filter(p => p.status === kycTypes_1.KYCStatus.COMPLETED).length,
            approved: mockDb.kycProfiles.filter(p => p.status === kycTypes_1.KYCStatus.APPROVED).length,
            rejected: mockDb.kycProfiles.filter(p => p.status === kycTypes_1.KYCStatus.REJECTED).length,
        },
        userTypes: {
            individual: mockDb.kycProfiles.filter(p => p.userType === kycTypes_1.UserType.INDIVIDUAL).length,
            merchant: mockDb.kycProfiles.filter(p => p.userType === kycTypes_1.UserType.MERCHANT).length,
        }
    };
};
exports.getDbStats = getDbStats;
const clearMockData = () => {
    mockDb.kycProfiles = [];
    mockDb.documents = [];
};
exports.clearMockData = clearMockData;
//# sourceMappingURL=mockDb.js.map