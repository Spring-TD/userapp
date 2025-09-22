// src/__tests__/kycController.test.ts
import request from 'supertest';
import { app } from '../index';
import { KYCProfileModel } from '../models/kycModels';
import { KYCStatus, UserType, DocumentType } from '../types/kycTypes';
import mongoose from 'mongoose';
import { logger } from '../utils/logger';
import { MockKYCProfileModel } from '../utils/mockDb';

// Mock the KYCService
jest.mock('../services/kycService');

// Mock data
const mockUserId = 'user_001';
const mockMerchantId = 'merchant_001';
const mockAdminId = 'admin_user_001';
const mockKycId = new mongoose.Types.ObjectId().toString();

// Test KYC submission
const mockKYCSubmission = {
  userId: mockUserId,
  userType: UserType.INDIVIDUAL,
  documents: [
    {
      type: DocumentType.IDENTITY,
      fileName: 'id_document.jpg',
      fileType: 'image/jpeg',
      fileSize: 2000000,
      fileUrl: 'https://example.com/documents/id_document.jpg'
    }
  ]
};

// Test Business KYC submission with Business Survey
const mockBusinessKYCSubmission = {
  userId: mockMerchantId,
  userType: UserType.MERCHANT,
  businessInfo: {
    legalName: 'Test Business Inc.',
    tradingName: 'Test Business',
    registrationNumber: 'REG123456',
    incorporationDate: new Date('2020-01-01'),
    jurisdiction: 'US',
    businessType: 'corporation',
    industry: 'Technology',
    website: 'https://testbusiness.com',
    physicalAddress: '123 Main St, City, State 12345',
    mailingAddress: '123 Main St, City, State 12345'
  },
  businessSurvey: {
    annualTurnover: 1000000,
    expectedTransactionVolume: 500000,
    expectedTransactionValue: 1000,
    sourceOfFunds: 'Business revenue',
    businessPurpose: 'Software development and consulting',
    numberOfEmployees: 50,
    operatingSince: new Date('2020-01-01'),
    websiteTraffic: 10000,
    socialMediaPresence: true,
    marketingChannels: 'Digital marketing, SEO, Social media',
    paymentMethods: 'Credit card, Bank transfer',
    businessModelDescription: 'We provide software development services to clients worldwide',
    customerBaseDescription: 'Small to medium businesses in technology sector',
    geographicMarkets: 'North America, Europe',
    regulatoryLicenses: 'ISO 27001',
    insuranceCoverage: 'General liability, Professional indemnity',
    previousBankingRelationship: 'Previous bank was XYZ Bank',
    reasonForOpeningAccount: 'To expand our business operations'
  },
  beneficialOwners: [
    {
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: new Date('1980-01-01'),
      nationality: 'US',
      ownershipPercentage: 50,
      isPoliticallyExposed: false
    }
  ],
  directors: [
    {
      firstName: 'John',
      lastName: 'Doe',
      position: 'CEO',
      dateOfBirth: new Date('1980-01-01'),
      nationality: 'US'
    }
  ],
  documents: [
    {
      type: DocumentType.BUSINESS_REGISTRATION,
      fileName: 'business_reg.pdf',
      fileType: 'application/pdf',
      fileSize: 3000000,
      fileUrl: 'https://example.com/documents/business_reg.pdf'
    },
    {
      type: DocumentType.BENEFICIAL_OWNERSHIP,
      fileName: 'beneficial_owners.pdf',
      fileType: 'application/pdf',
      fileSize: 2000000,
      fileUrl: 'https://example.com/documents/beneficial_owners.pdf'
    },
    {
      type: DocumentType.DIRECTOR_IDENTIFICATION,
      fileName: 'director_id.pdf',
      fileType: 'application/pdf',
      fileSize: 2000000,
      fileUrl: 'https://example.com/documents/director_id.pdf'
    },
    {
      type: DocumentType.BANK,
      fileName: 'bank_statement.pdf',
      fileType: 'application/pdf',
      fileSize: 2500000,
      fileUrl: 'https://example.com/documents/bank_statement.pdf'
    }
  ],
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
    // Set up database connection
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/compliance_db';
    await mongoose.connect(MONGODB_URI);
    logger.info('Connected to MongoDB for testing');
  });

  afterAll(async () => {
    // Clean up database
    // Since we're using a mock database, we'll just reset the arrays
    const mockDb = require('../utils/mockDb');
    mockDb.mockDb.kycProfiles = [];
    mockDb.mockDb.documents = [];
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB after testing');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test KYC submission endpoint
  describe('POST /api/v1/kyc/submit', () => {
    it('should submit KYC for an individual user', async () => {
      const response = await request(app)
        .post('/api/v1/kyc/submit')
        .set('Authorization', `Bearer ${mockUserId}`)
        .send(mockKYCSubmission);
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.userId).toBe(mockKYCSubmission.userId);
      expect(response.body.data.status).toBe(KYCStatus.PENDING);
      expect(response.body.data.documentCount).toBe(mockKYCSubmission.documents.length);
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
        .set('Authorization', `Bearer ${mockUserId}`)
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
        .set('Authorization', `Bearer ${mockUserId}`)
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
        .set('Authorization', `Bearer ${mockUserId}`);
      
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
        .set('Authorization', `Bearer ${nonExistentUserId}`);
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  // Test document upload endpoint
  describe('POST /api/v1/kyc/document/:userId', () => {
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
        .set('Authorization', `Bearer ${mockUserId}`)
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
        .set('Authorization', `Bearer ${mockUserId}`)
        .send(documentData);
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  // Test document deletion endpoint
  describe('DELETE /api/v1/kyc/document/:userId/:documentId', () => {
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
        .set('Authorization', `Bearer ${mockUserId}`);
      
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
        .set('Authorization', `Bearer ${mockUserId}`);
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  // Test KYC review endpoint
  describe('PUT /api/v1/kyc/:kycId/status', () => {
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
        .set('Authorization', `Bearer ${mockAdminId}`)
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
        .set('Authorization', `Bearer ${mockAdminId}`)
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
        .set('Authorization', `Bearer ${mockAdminId}`)
        .send({
          status: KYCStatus.APPROVED,
          reviewedBy: mockAdminId
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(KYCStatus.APPROVED);
      
      // Verify document status was updated
      const updatedProfile = await MockKYCProfileModel.findById(savedProfile._id);
      expect(updatedProfile?.documents[0].status).toBe(KYCStatus.APPROVED);
    });

    it('should return error for non-existent document', async () => {
      const nonExistentDocumentId = new mongoose.Types.ObjectId().toString();
      
      const response = await request(app)
        .put(`/api/v1/kyc/document/${nonExistentDocumentId}/status`)
        .set('Authorization', `Bearer ${mockAdminId}`)
        .send({
          status: KYCStatus.APPROVED,
          reviewedBy: mockAdminId
        });
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  // Test Business KYC submission endpoint
  describe('POST /api/v1/kyc/business/submit', () => {
    it('should submit Business KYC with Business Survey', async () => {
      const response = await request(app)
        .post('/api/v1/kyc/business/submit')
        .set('Authorization', `Bearer ${mockMerchantId}`)
        .send(mockBusinessKYCSubmission);
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.userId).toBe(mockBusinessKYCSubmission.userId);
      expect(response.body.data.status).toBe(KYCStatus.PENDING);
      expect(response.body.data.beneficialOwnerCount).toBe(mockBusinessKYCSubmission.beneficialOwners.length);
    });

    it('should return error for invalid Business Survey data', async () => {
      const invalidSubmission = {
        ...mockBusinessKYCSubmission,
        businessSurvey: {
          ...mockBusinessKYCSubmission.businessSurvey,
          annualTurnover: -1000 // Invalid negative value
        }
      };
      
      const response = await request(app)
        .post('/api/v1/kyc/business/submit')
        .set('Authorization', `Bearer ${mockMerchantId}`)
        .send(invalidSubmission);
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  // Test Business Survey endpoint
  describe('GET /api/v1/kyc/business/business-survey', () => {
    it('should retrieve Business Survey for a merchant user', async () => {
      // Create a Business KYC profile in the database
      const kycProfile = {
        userId: mockMerchantId,
        userType: UserType.MERCHANT,
        businessInfo: mockBusinessKYCSubmission.businessInfo,
        businessSurvey: mockBusinessKYCSubmission.businessSurvey,
        beneficialOwners: mockBusinessKYCSubmission.beneficialOwners,
        directors: mockBusinessKYCSubmission.directors,
        documents: mockBusinessKYCSubmission.documents.map(doc => ({ ...doc, status: KYCStatus.PENDING, uploadDate: new Date() })),
        status: KYCStatus.PENDING
      };
      await MockKYCProfileModel.save(kycProfile);
      
      const response = await request(app)
        .get('/api/v1/kyc/business/business-survey')
        .set('Authorization', `Bearer ${mockMerchantId}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.annualTurnover).toBe(mockBusinessKYCSubmission.businessSurvey.annualTurnover);
      expect(response.body.data.businessPurpose).toBe(mockBusinessKYCSubmission.businessSurvey.businessPurpose);
    });

    it('should return error for non-existent Business Survey', async () => {
      // Create a KYC profile without Business Survey in the database
      const kycProfile = {
        userId: mockUserId,
        userType: UserType.INDIVIDUAL,
        documents: mockKYCSubmission.documents.map(doc => ({ ...doc, status: KYCStatus.PENDING, uploadDate: new Date() })),
        status: KYCStatus.PENDING
      };
      await MockKYCProfileModel.save(kycProfile);
      
      const response = await request(app)
        .get('/api/v1/kyc/business/business-survey')
        .set('Authorization', `Bearer ${mockUserId}`);
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User is not a business customer');
    });
  });

});