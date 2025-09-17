// src/__tests__/kycController.test.ts
import request from 'supertest';
import { app } from '../index';
import { KYCProfileModel } from '../models/kycModels';
import { KYCStatus } from '../types/kycTypes';
import mongoose from 'mongoose';
import { logger } from '../utils/logger';

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
  userType: 'individual',
  documents: [
    {
      type: 'identity',
      fileName: 'id_document.jpg',
      fileType: 'image/jpeg',
      fileSize: 2000000,
      fileUrl: 'https://example.com/documents/id_document.jpg'
    }
  ]
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
    await KYCProfileModel.deleteMany({});
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
            type: 'invalid_type',
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
      const kycProfile = new KYCProfileModel({
        userId: mockUserId,
        userType: 'individual',
        documents: mockKYCSubmission.documents.map(doc => ({ ...doc, status: KYCStatus.PENDING })),
        status: KYCStatus.PENDING
      });
      await kycProfile.save();
      
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
      const kycProfile = new KYCProfileModel({
        userId: mockUserId,
        userType: 'individual',
        documents: [],
        status: KYCStatus.PENDING
      });
      await kycProfile.save();
      
      const documentData = {
        type: 'identity',
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
      const kycProfile = new KYCProfileModel({
        userId: mockUserId,
        userType: 'individual',
        documents: [],
        status: KYCStatus.PENDING
      });
      await kycProfile.save();
      
      const documentData = {
        type: 'invalid_type',
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
      const kycProfile = new KYCProfileModel({
        userId: mockUserId,
        userType: 'individual',
        documents: [{
          type: 'identity',
          fileName: 'id_document.jpg',
          fileType: 'image/jpeg',
          fileSize: 2000000,
          status: KYCStatus.PENDING
        }],
        status: KYCStatus.PENDING
      });
      await kycProfile.save();
      
      // Get the document ID
      const documentId = kycProfile.documents[0]._id.toString();
      
      const response = await request(app)
        .delete(`/api/v1/kyc/document/${mockUserId}/${documentId}`)
        .set('Authorization', `Bearer ${mockUserId}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Document deleted successfully');
      
      // Verify document was deleted
      const updatedProfile = await KYCProfileModel.findOne({ userId: mockUserId });
      expect(updatedProfile?.documents.length).toBe(0);
    });

    it('should return error for non-existent document', async () => {
      // Create a KYC profile without documents in the database
      const kycProfile = new KYCProfileModel({
        userId: mockUserId,
        userType: 'individual',
        documents: [],
        status: KYCStatus.PENDING
      });
      await kycProfile.save();
      
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
      const kycProfile = new KYCProfileModel({
        userId: mockUserId,
        userType: 'individual',
        documents: mockKYCSubmission.documents.map(doc => ({ ...doc, status: KYCStatus.PENDING })),
        status: KYCStatus.PENDING
      });
      await kycProfile.save();
      
      const response = await request(app)
        .put(`/api/v1/kyc/${kycProfile._id}/status`)
        .set('Authorization', `Bearer ${mockAdminId}`)
        .send({
          status: KYCStatus.APPROVED,
          reviewedBy: mockAdminId
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(KYCStatus.APPROVED);
      
      // Verify KYC profile was updated
      const updatedProfile = await KYCProfileModel.findById(kycProfile._id);
      expect(updatedProfile?.status).toBe(KYCStatus.APPROVED);
      expect(updatedProfile?.reviewedBy).toBe(mockAdminId);
    });

    it('should return error for invalid KYC status', async () => {
      // Create a KYC profile in the database
      const kycProfile = new KYCProfileModel({
        userId: mockUserId,
        userType: 'individual',
        documents: mockKYCSubmission.documents.map(doc => ({ ...doc, status: KYCStatus.PENDING })),
        status: KYCStatus.PENDING
      });
      await kycProfile.save();
      
      const response = await request(app)
        .put(`/api/v1/kyc/${kycProfile._id}/status`)
        .set('Authorization', `Bearer ${mockAdminId}`)
        .send({
          status: 'invalid_status',
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
      const kycProfile = new KYCProfileModel({
        userId: mockUserId,
        userType: 'individual',
        documents: [{
          type: 'identity',
          fileName: 'id_document.jpg',
          fileType: 'image/jpeg',
          fileSize: 2000000,
          status: KYCStatus.PENDING
        }],
        status: KYCStatus.PENDING
      });
      await kycProfile.save();
      
      // Get the document ID
      const documentId = kycProfile.documents[0]._id.toString();
      
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
      const updatedProfile = await KYCProfileModel.findById(kycProfile._id);
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
});