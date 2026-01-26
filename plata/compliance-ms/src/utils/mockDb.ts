// src/utils/mockDb.ts
import { randomUUID } from 'crypto';
import { KYCProfile, KYCDocument, KYCStatus, UserType, DocumentType } from '../types/kycTypes';

// Mock database interface
interface MockDatabase {
  kycProfiles: (KYCProfile & { _id: string })[];
  documents: (KYCDocument & { _id: string; userId: string })[];
}

// In-memory mock database
const mockDb: MockDatabase = {
  kycProfiles: [],
  documents: []
};

// Mock KYC Profile operations
export class MockKYCProfileModel {
  static async save(profile: KYCProfile): Promise<KYCProfile & { _id: string }> {
    const newProfile = {
      ...profile,
      _id: randomUUID(),
      documents: profile.documents.map(doc => ({
        ...doc,
        _id: randomUUID()
      }))
    };
    mockDb.kycProfiles.push(newProfile);
    return newProfile;
  }

  static async findOne(query: any): Promise<(KYCProfile & { _id: string }) | null> {
    return mockDb.kycProfiles.find(profile => {
      if (query.userId && profile.userId !== query.userId) return false;
      if (query._id && profile._id !== query._id) return false;
      return true;
    }) || null;
  }

  static async findById(id: string): Promise<(KYCProfile & { _id: string }) | null> {
    return mockDb.kycProfiles.find(profile => profile._id === id) || null;
  }

  static async find(query: any = {}): Promise<(KYCProfile & { _id: string })[]> {
    return mockDb.kycProfiles.filter(profile => {
      if (query.userId && profile.userId !== query.userId) return false;
      if (query.userType && profile.userType !== query.userType) return false;
      if (query.status && profile.status !== query.status) return false;
      if (query.submittedAt && query.submittedAt.$gte && profile.submittedAt && profile.submittedAt < query.submittedAt.$gte) return false;
      if (query.submittedAt && query.submittedAt.$lte && profile.submittedAt && profile.submittedAt > query.submittedAt.$lte) return false;
      return true;
    });
  }

  static async findByIdAndUpdate(
    id: string, 
    update: any, 
    options: any = {}
  ): Promise<(KYCProfile & { _id: string }) | null> {
    const profileIndex = mockDb.kycProfiles.findIndex(profile => profile._id === id);
    if (profileIndex === -1) return null;

    mockDb.kycProfiles[profileIndex] = {
      ...mockDb.kycProfiles[profileIndex],
      ...update
    };

    return options.new ? mockDb.kycProfiles[profileIndex] : mockDb.kycProfiles[profileIndex];
  }

  static async deleteOne(query: any): Promise<{ deletedCount: number }> {
    const initialLength = mockDb.kycProfiles.length;
    mockDb.kycProfiles = mockDb.kycProfiles.filter(profile => {
      if (query.userId && profile.userId === query.userId) return false;
      if (query._id && profile._id === query._id) return false;
      return true;
    });
    return { deletedCount: initialLength - mockDb.kycProfiles.length };
  }
}

// Mock KYC Document operations
export class MockKYCDocumentModel {
  static async save(document: KYCDocument & { userId: string }): Promise<KYCDocument & { _id: string; userId: string }> {
    const newDocument = {
      ...document,
      _id: randomUUID()
    };
    mockDb.documents.push(newDocument);
    return newDocument;
  }

  static async findById(id: string): Promise<(KYCDocument & { _id: string; userId: string }) | null> {
    return mockDb.documents.find(doc => doc._id === id) || null;
  }

  static async find(query: any = {}): Promise<(KYCDocument & { _id: string; userId: string })[]> {
    return mockDb.documents.filter(doc => {
      if (query.userId && doc.userId !== query.userId) return false;
      if (query.type && doc.type !== query.type) return false;
      if (query.status && doc.status !== query.status) return false;
      return true;
    });
  }

  static async findByIdAndUpdate(
    id: string, 
    update: any, 
    options: any = {}
  ): Promise<(KYCDocument & { _id: string; userId: string }) | null> {
    const docIndex = mockDb.documents.findIndex(doc => doc._id === id);
    if (docIndex === -1) return null;

    mockDb.documents[docIndex] = {
      ...mockDb.documents[docIndex],
      ...update
    };

    return options.new ? mockDb.documents[docIndex] : mockDb.documents[docIndex];
  }

  static async deleteOne(query: any): Promise<{ deletedCount: number }> {
    const initialLength = mockDb.documents.length;
    mockDb.documents = mockDb.documents.filter(doc => {
      if (query._id && doc._id === query._id) return false;
      return true;
    });
    return { deletedCount: initialLength - mockDb.documents.length };
  }
}

// Utility functions for seeding mock data
export const seedMockData = () => {
  // Clear existing data
  mockDb.kycProfiles = [];
  mockDb.documents = [];

  // Seed sample KYC profiles
  const sampleProfiles: (KYCProfile & { _id: string })[] = [
    {
      _id: randomUUID(),
      userId: 'user-123',
      userType: UserType.INDIVIDUAL,
      documents: [
        {
          _id: randomUUID(),
          type: DocumentType.IDENTITY,
          fileName: 'passport.pdf',
          fileType: 'application/pdf',
          fileSize: 2048000,
          uploadDate: new Date('2024-01-15'),
          status: KYCStatus.APPROVED
        } as any,
        {
          _id: randomUUID(),
          type: DocumentType.ADDRESS,
          fileName: 'utility_bill.pdf',
          fileType: 'application/pdf',
          fileSize: 1024000,
          uploadDate: new Date('2024-01-15'),
          status: KYCStatus.PENDING
        } as any
      ],
      status: KYCStatus.IN_PROGRESS,
      submittedAt: new Date('2024-01-15'),
    },
    {
      _id: randomUUID(),
      userId: 'merchant-456',
      userType: UserType.MERCHANT,
      documents: [
        {
          _id: randomUUID(),
          type: DocumentType.BUSINESS_REGISTRATION,
          fileName: 'business_registration.pdf',
          fileType: 'application/pdf',
          fileSize: 3072000,
          uploadDate: new Date('2024-01-10'),
          status: KYCStatus.APPROVED
        } as any,
        {
          _id: randomUUID(),
          type: DocumentType.TAX_CERTIFICATE,
          fileName: 'tax_certificate.pdf',
          fileType: 'application/pdf',
          fileSize: 1536000,
          uploadDate: new Date('2024-01-10'),
          status: KYCStatus.APPROVED
        } as any
      ],
      status: KYCStatus.COMPLETED,
      submittedAt: new Date('2024-01-10'),
      completedAt: new Date('2024-01-12'),
    },
    {
      _id: randomUUID(),
      userId: 'user-789',
      userType: UserType.INDIVIDUAL,
      documents: [
        {
          _id: randomUUID(),
          type: DocumentType.IDENTITY,
          fileName: 'drivers_license.pdf',
          fileType: 'application/pdf',
          fileSize: 1800000,
          uploadDate: new Date('2024-01-20'),
          status: KYCStatus.REJECTED,
          rejectionReason: 'Document quality is too poor to verify'
        } as any
      ],
      status: KYCStatus.REJECTED,
      submittedAt: new Date('2024-01-20'),
      rejectionReason: 'Document quality issues'
    }
  ];

  mockDb.kycProfiles.push(...sampleProfiles);
  console.log('Mock data seeded successfully');
};

// Get database stats
export const getDbStats = () => {
  return {
    kycProfiles: mockDb.kycProfiles.length,
    documents: mockDb.documents.length,
    statuses: {
      pending: mockDb.kycProfiles.filter(p => p.status === KYCStatus.PENDING).length,
      inProgress: mockDb.kycProfiles.filter(p => p.status === KYCStatus.IN_PROGRESS).length,
      completed: mockDb.kycProfiles.filter(p => p.status === KYCStatus.COMPLETED).length,
      approved: mockDb.kycProfiles.filter(p => p.status === KYCStatus.APPROVED).length,
      rejected: mockDb.kycProfiles.filter(p => p.status === KYCStatus.REJECTED).length,
    },
    userTypes: {
      individual: mockDb.kycProfiles.filter(p => p.userType === UserType.INDIVIDUAL).length,
      merchant: mockDb.kycProfiles.filter(p => p.userType === UserType.MERCHANT).length,
    }
  };
};

// Clear all data (useful for testing)
export const clearMockData = () => {
  mockDb.kycProfiles = [];
  mockDb.documents = [];
};

// Export mock database for direct access if needed
export { mockDb };