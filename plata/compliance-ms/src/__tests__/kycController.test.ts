// src/__tests__/kycController.test.ts
import request from 'supertest';
import { app } from '../index';
import { KYCProfile, KYCStatus, UserType, DocumentType } from '../types/kycTypes';
import mongoose from 'mongoose';
import { MockKYCProfileModel } from '../utils/mockDb';
import { testBearer } from './testAuth';
import { BusinessDocumentModel } from '../models/BusinessDocumentModel';
import { BusinessSurveyModel } from '../models/BusinessSurveyModel';

jest.mock('../utils/kycProfileMongo', () => {
  const { MockKYCProfileModel, MockKYCDocumentModel } = require('../utils/mockDb');
  return {
    KYCProfileModelMongo: MockKYCProfileModel,
    KYCDocumentModelMongo: MockKYCDocumentModel
  };
});

jest.mock('../models/BusinessInfoModel', () => ({
  BusinessInfoModel: {
    findOneAndUpdate: jest.fn().mockResolvedValue({})
  }
}));

jest.mock('../models/ShareholderModel', () => ({
  ShareholderModel: {
    create: jest.fn(async (doc: unknown) => doc),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    insertMany: jest.fn(async (docs: unknown[]) => docs),
    find: jest.fn(() => ({
      lean: jest.fn().mockResolvedValue([])
    }))
  }
}));

jest.mock('../models/BusinessDocumentModel', () => ({
  BusinessDocumentModel: {
    findByIdAndUpdate: jest.fn(),
    findOneAndUpdate: jest.fn().mockResolvedValue({}),
    find: jest.fn(() => ({ lean: jest.fn().mockResolvedValue([]) })),
    findById: jest.fn(() => ({ lean: jest.fn().mockResolvedValue(null) }))
  }
}));

jest.mock('../models/BusinessSurveyModel', () => ({
  BusinessSurveyModel: {
    findOne: jest.fn(() => ({ lean: jest.fn().mockResolvedValue(null) })),
    findOneAndUpdate: jest.fn().mockResolvedValue({})
  }
}));

jest.mock('../services/livenessService', () => ({
  livenessService: {
    generateLivenessTest: jest.fn().mockResolvedValue({
      url: 'https://liveness.test/session',
      expiresAt: new Date(Date.now() + 86400000),
      providerReference: 'pref-1'
    }),
    processLivenessResult: jest.fn()
  }
}));

// Mock data
const mockUserId = 'user_001';
const mockMerchantId = 'merchant_001';
const mockAdminId = 'admin_user_001';
// Valid individual KYC submission (matches `individualKYCSubmissionSchema`)
const mockKYCSubmission = {
  userId: mockUserId,
  userType: UserType.INDIVIDUAL,
  personalInfo: {
    firstName: 'Jane',
    lastName: 'Doe',
    dateOfBirth: new Date('1990-05-15'),
    nationality: 'US',
    occupation: 'Software engineer',
    sourceOfFunds: 'Employment salary and savings'
  },
  documents: [
    {
      type: DocumentType.IDENTITY,
      fileName: 'passport.pdf',
      fileType: 'application/pdf',
      fileSize: 2000000,
      fileUrl: 'https://example.com/documents/passport.pdf'
    },
    {
      type: DocumentType.ADDRESS,
      fileName: 'utility.pdf',
      fileType: 'application/pdf',
      fileSize: 1500000,
      fileUrl: 'https://example.com/documents/utility.pdf'
    }
  ],
  riskAssessment: {
    politicallyExposed: false,
    sanctionListCheck: false
  }
};

/** Valid merchant business submit body (matches `businessKYCSubmissionSchema`). */
const validBusinessKYCSubmission = {
  userId: mockMerchantId,
  userType: UserType.MERCHANT,
  businessInfo: {
    companyName: 'Test Business Inc.',
    industry: 'Technology' as const,
    businessDescription: 'Software products and consulting services for SMB customers in multiple regions.',
    countryOfIncorporation: 'US',
    website: 'https://testbusiness.com',
    companyRegId: 'REG123456',
    companyLogoUrl: 'https://example.com/logo.png'
  },
  businessSurvey: {
    businessType: 'E-commerce',
    country: 'US',
    businessModel: 'B2B',
    monthlyProcessedVolume: 500000
  },
  shareholders: [
    {
      fullName: 'John Shareholder',
      ownershipPercentage: 100,
      bankStatement: {
        fileName: 'stmt.pdf',
        fileType: 'application/pdf',
        fileSize: 102400,
        fileUrl: 'https://example.com/stmt.pdf',
        uploadDate: new Date()
      },
      status: KYCStatus.PENDING
    }
  ],
  businessDocuments: [],
  riskAssessment: {
    annualTurnover: 1000000,
    expectedTransactionVolume: 500000,
    highRiskJurisdiction: false,
    sanctionListCheck: false,
    adverseMediaCheck: false
  }
};

// Test KYC review
const mockKYCReview = {
  status: KYCStatus.APPROVED,
  rejectionReason: '',
  reviewedBy: mockAdminId
};

describe('KYC Controller Tests', () => {
  beforeAll(async () => {
    // Skip MongoDB connection for mock database tests
    // const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/compliance_db';
    // await mongoose.connect(MONGODB_URI);
    // logger.info('Connected to MongoDB for testing');
  });

  afterAll(async () => {
    // Clean up database
    // Since we're using a mock database, we'll just reset the arrays
    const mockDb = require('../utils/mockDb');
    mockDb.mockDb.kycProfiles = [];
    mockDb.mockDb.documents = [];
    // await mongoose.disconnect();
    // logger.info('Disconnected from MongoDB after testing');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (BusinessDocumentModel.findByIdAndUpdate as jest.Mock).mockImplementation(
      (id: string, update: { status?: KYCStatus; rejectionReason?: string }) => ({
        lean: jest.fn().mockResolvedValue({
          _id: id,
          status: update.status,
          rejectionReason: update.rejectionReason
        })
      })
    );
  });

  // Test KYC submission endpoint
  describe('POST /api/v1/kyc/submit', () => {
    it('should submit KYC for an individual user', async () => {
      const response = await request(app)
        .post('/api/v1/kyc/submit')
        .set('Authorization', testBearer(mockUserId, UserType.INDIVIDUAL))
        .send(mockKYCSubmission);
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(KYCStatus.PENDING);
      expect(response.body.data.documents.length).toBe(mockKYCSubmission.documents.length);
    });

    it('should return error for invalid document type', async () => {
      const invalidSubmission = {
        ...mockKYCSubmission,
        documents: [
          {
            type: 'invalid_type' as any,
            fileName: 'id_document.jpg',
            fileType: 'image/jpeg',
            fileSize: 2000000,
            fileUrl: 'https://example.com/documents/id_document.jpg'
          }
        ]
      };
      
      const response = await request(app)
        .post('/api/v1/kyc/submit')
        .set('Authorization', testBearer(mockUserId, UserType.INDIVIDUAL))
        .send(invalidSubmission);
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should return error for missing required fields', async () => {
      const invalidSubmission = {
        userId: mockUserId,
        // Missing userType
        documents: mockKYCSubmission.documents
      };
      
      const response = await request(app)
        .post('/api/v1/kyc/submit')
        .set('Authorization', testBearer(mockUserId, UserType.INDIVIDUAL))
        .send(invalidSubmission);
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  // Test KYC status endpoint
  describe('GET /api/v1/kyc/status/:userId', () => {
    it('should retrieve KYC status for a user', async () => {
      // Create a KYC profile in the database
      const kycProfile = {
        userId: mockUserId,
        userType: UserType.INDIVIDUAL,
        documents: mockKYCSubmission.documents.map(doc => ({ ...doc, status: KYCStatus.PENDING, uploadDate: new Date() })),
        status: KYCStatus.PENDING
      };
      await MockKYCProfileModel.save(kycProfile);
      
      const response = await request(app)
        .get(`/api/v1/kyc/status/${mockUserId}`)
        .set('Authorization', testBearer(mockUserId, UserType.INDIVIDUAL));
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.userId).toBe(mockUserId);
      expect(response.body.data.status).toBe(KYCStatus.PENDING);
      expect(response.body.data.documentCount).toBe(mockKYCSubmission.documents.length);
    });

    it('should return error for non-existent user', async () => {
      const nonExistentUserId = 'user_999';
      
      const response = await request(app)
        .get(`/api/v1/kyc/status/${nonExistentUserId}`)
        .set('Authorization', testBearer(nonExistentUserId, UserType.INDIVIDUAL));
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  // Legacy route not implemented — use POST /api/v1/kyc/upload (multipart) instead.
  describe.skip('POST /api/v1/kyc/document/:userId', () => {
    it('should upload a document successfully', async () => {
      // Create a KYC profile in the database
      const kycProfile = {
        userId: mockUserId,
        userType: UserType.INDIVIDUAL,
        documents: [],
        status: KYCStatus.PENDING
      };
      await MockKYCProfileModel.save(kycProfile);
      
      const documentData = {
        type: DocumentType.IDENTITY,
        fileName: 'new_id_document.jpg',
        fileType: 'image/jpeg',
        fileSize: 2500000,
        fileUrl: 'https://example.com/documents/new_id_document.jpg'
      };
      
      const response = await request(app)
        .post(`/api/v1/kyc/document/${mockUserId}`)
        .set('Authorization', testBearer(mockUserId, UserType.INDIVIDUAL))
        .send(documentData);
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.documentType).toBe(documentData.type);
      expect(response.body.data.fileName).toBe(documentData.fileName);
      expect(response.body.data.status).toBe(KYCStatus.PENDING);
    });

    it('should return error for invalid document type', async () => {
      // Create a KYC profile in the database
      const kycProfile = {
        userId: mockUserId,
        userType: UserType.INDIVIDUAL,
        documents: [],
        status: KYCStatus.PENDING
      };
      await MockKYCProfileModel.save(kycProfile);
      
      const documentData = {
        type: 'invalid_type' as any,
        fileName: 'new_id_document.jpg',
        fileType: 'image/jpeg',
        fileSize: 2500000,
        fileUrl: 'https://example.com/documents/new_id_document.jpg'
      };
      
      const response = await request(app)
        .post(`/api/v1/kyc/document/${mockUserId}`)
        .set('Authorization', testBearer(mockUserId, UserType.INDIVIDUAL))
        .send(documentData);
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe.skip('DELETE /api/v1/kyc/document/:userId/:documentId', () => {
    it('should delete a document successfully', async () => {
      // Create a KYC profile with a document in the database
      const kycProfile = {
        userId: mockUserId,
        userType: UserType.INDIVIDUAL,
        documents: [{
          type: DocumentType.IDENTITY,
          fileName: 'id_document.jpg',
          fileType: 'image/jpeg',
          fileSize: 2000000,
          status: KYCStatus.PENDING,
          uploadDate: new Date()
        } as any],
        status: KYCStatus.PENDING
      };
      const savedProfile = await MockKYCProfileModel.save(kycProfile);
      
      // Get the document ID from the saved profile
      const documentId = (savedProfile.documents[0] as any)._id.toString();
      
      const response = await request(app)
        .delete(`/api/v1/kyc/document/${mockUserId}/${documentId}`)
        .set('Authorization', testBearer(mockUserId, UserType.INDIVIDUAL));
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Document deleted successfully');
      
      // Verify document was deleted
      const updatedProfile = await MockKYCProfileModel.findOne({ userId: mockUserId });
      expect(updatedProfile?.documents.length).toBe(0);
    });

    it('should return error for non-existent document', async () => {
      // Create a KYC profile without documents in the database
      const kycProfile = {
        userId: mockUserId,
        userType: UserType.INDIVIDUAL,
        documents: [],
        status: KYCStatus.PENDING
      };
      await MockKYCProfileModel.save(kycProfile);
      
      const nonExistentDocumentId = new mongoose.Types.ObjectId().toString();
      
      const response = await request(app)
        .delete(`/api/v1/kyc/document/${mockUserId}/${nonExistentDocumentId}`)
        .set('Authorization', testBearer(mockUserId, UserType.INDIVIDUAL));
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe.skip('PUT /api/v1/kyc/:kycId/status', () => {
    it('should update KYC status to APPROVED', async () => {
      // Create a KYC profile in the database
      const kycProfile = {
        userId: mockUserId,
        userType: UserType.INDIVIDUAL,
        documents: mockKYCSubmission.documents.map(doc => ({ ...doc, status: KYCStatus.PENDING, uploadDate: new Date() })),
        status: KYCStatus.PENDING
      };
      const savedProfile = await MockKYCProfileModel.save(kycProfile);
      
      const response = await request(app)
        .put(`/api/v1/kyc/${savedProfile._id}/status`)
        .set('Authorization', testBearer(mockAdminId, UserType.ADMIN))
        .send({
          status: KYCStatus.APPROVED,
          reviewedBy: mockAdminId
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(KYCStatus.APPROVED);
      
      // Verify KYC profile was updated
      const updatedProfile = await MockKYCProfileModel.findById(savedProfile._id);
      expect(updatedProfile?.status).toBe(KYCStatus.APPROVED);
      expect(updatedProfile?.reviewedBy).toBe(mockAdminId);
    });

    it('should return error for invalid KYC status', async () => {
      // Create a KYC profile in the database
      const kycProfile = {
        userId: mockUserId,
        userType: UserType.INDIVIDUAL,
        documents: mockKYCSubmission.documents.map(doc => ({ ...doc, status: KYCStatus.PENDING, uploadDate: new Date() })),
        status: KYCStatus.PENDING
      };
      const savedProfile = await MockKYCProfileModel.save(kycProfile);
      
      const response = await request(app)
        .put(`/api/v1/kyc/${savedProfile._id}/status`)
        .set('Authorization', testBearer(mockAdminId, UserType.ADMIN))
        .send({
          status: 'invalid_status' as any,
          reviewedBy: mockAdminId
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  // Test document status update endpoint
  describe('PUT /api/v1/kyc/document/:kycId/status', () => {
    it('should update document status to APPROVED', async () => {
      // Create a KYC profile with a document in the database
      const kycProfile = {
        userId: mockUserId,
        userType: UserType.INDIVIDUAL,
        documents: [{
          type: DocumentType.IDENTITY,
          fileName: 'id_document.jpg',
          fileType: 'image/jpeg',
          fileSize: 2000000,
          status: KYCStatus.PENDING,
          uploadDate: new Date()
        } as any],
        status: KYCStatus.PENDING
      };
      const savedProfile = await MockKYCProfileModel.save(kycProfile);
      
      // Get the document ID from the saved profile
      const documentId = (savedProfile.documents[0] as any)._id.toString();
      
      const response = await request(app)
        .put(`/api/v1/kyc/document/${documentId}/status`)
        .set('Authorization', testBearer(mockAdminId, UserType.ADMIN))
        .send({
          status: KYCStatus.APPROVED,
          reviewedBy: mockAdminId
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(KYCStatus.APPROVED);
    });

    it('should return error for non-existent document', async () => {
      const nonExistentDocumentId = new mongoose.Types.ObjectId().toString();

      (BusinessDocumentModel.findByIdAndUpdate as jest.Mock).mockImplementationOnce(() => ({
        lean: jest.fn().mockResolvedValue(null)
      }));

      const response = await request(app)
        .put(`/api/v1/kyc/document/${nonExistentDocumentId}/status`)
        .set('Authorization', testBearer(mockAdminId, UserType.ADMIN))
        .send({
          status: KYCStatus.APPROVED,
          reviewedBy: mockAdminId
        });
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/v1/kyc/business/submit', () => {
    it('should submit Business KYC with Business Survey', async () => {
      const response = await request(app)
        .post('/api/v1/kyc/business/submit')
        .set('Authorization', testBearer(mockMerchantId, UserType.MERCHANT))
        .send(validBusinessKYCSubmission);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(KYCStatus.PENDING);
      expect(response.body.data.shareholderCount).toBe(validBusinessKYCSubmission.shareholders.length);
    });

    it('should return error for invalid Business Survey data', async () => {
      const invalidSubmission = {
        ...validBusinessKYCSubmission,
        businessSurvey: {
          ...validBusinessKYCSubmission.businessSurvey,
          monthlyProcessedVolume: -1
        }
      };

      const response = await request(app)
        .post('/api/v1/kyc/business/submit')
        .set('Authorization', testBearer(mockMerchantId, UserType.MERCHANT))
        .send(invalidSubmission);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  // Test Business Survey endpoint
  describe('GET /api/v1/kyc/business/business-survey', () => {
    it('should retrieve Business Survey for a merchant user', async () => {
      const surveyData = {
        businessType: 'E-commerce',
        country: 'US',
        businessModel: 'B2B',
        monthlyProcessedVolume: 500000
      };

      const kycProfile: KYCProfile = {
        userId: mockMerchantId,
        userType: UserType.MERCHANT,
        documents: [],
        businessInfo: {
          companyName: 'Test Business Inc.',
          industry: 'Technology',
          countryOfIncorporation: 'US',
          website: 'https://testbusiness.com',
          companyRegId: 'REG123456',
          companyLogoUrl: 'https://example.com/logo.png'
        },
        businessSurvey: surveyData,
        status: KYCStatus.PENDING
      };
      await MockKYCProfileModel.save(kycProfile);

      const lean = jest.fn().mockResolvedValue({
        ...surveyData,
        _id: 'survey1',
        userId: mockMerchantId
      });
      (BusinessSurveyModel.findOne as jest.Mock).mockReturnValueOnce({ lean });

      const response = await request(app)
        .get('/api/v1/kyc/business/business-survey')
        .set('Authorization', testBearer(mockMerchantId, UserType.MERCHANT));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.monthlyProcessedVolume).toBe(surveyData.monthlyProcessedVolume);
      expect(response.body.data.businessType).toBe(surveyData.businessType);
    });

    it('should reject individual users for business survey route', async () => {
      const kycProfile: KYCProfile = {
        userId: mockUserId,
        userType: UserType.INDIVIDUAL,
        documents: mockKYCSubmission.documents.map((doc) => ({
          ...doc,
          status: KYCStatus.PENDING,
          uploadDate: new Date()
        })),
        status: KYCStatus.PENDING
      };
      await MockKYCProfileModel.save(kycProfile);

      const response = await request(app)
        .get('/api/v1/kyc/business/business-survey')
        .set('Authorization', testBearer(mockUserId, UserType.INDIVIDUAL));

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/Business customer access required/i);
    });
  });

});