// src/services/kycService.ts
import { KYCProfileModel } from '../models/kycModels';
import { KYCProfile, KYCStatus } from '../types/kycTypes';
import { logger } from '../utils/logger';
import { auditLogger } from '../utils/audit';
import { KYCSubmissionRequest } from '../types/kycTypes';
import mongoose, { Document } from 'mongoose';
import { KYCDocumentModel } from '../models/KYCDocument';

// Service class for KYC operations
export class KYCService {
  // Submit KYC for verification
  static async submitKYC(data: KYCSubmissionRequest, userId: string) {
    try {
      // Create new KYC profile
      const kycProfile = new KYCProfileModel({
        userId: data.userId,
        userType: data.userType,
        documents: data.documents.map(doc => ({
          ...doc,
          status: KYCStatus.PENDING
        })),
        status: KYCStatus.PENDING,
        submittedAt: new Date()
      });
      
      // Save to database
      const result = await kycProfile.save();
      
      logger.info('KYC submitted successfully', {
        userId: data.userId,
        userType: data.userType,
        documentCount: data.documents.length
      });
      
      auditLogger('KYC_SUBMISSION', data.userId, {
        userType: data.userType,
        documentCount: data.documents.length
      });
      
      return {
        success: true,
        message: 'KYC submitted successfully for processing',
        data: {
          kycId: result._id,
          status: result.status,
          submittedAt: result.submittedAt
        }
      };
    } catch (error) {
      logger.error('Error submitting KYC', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        success: false,
        error: 'Error submitting KYC'
      };
    }
  }

  // Get KYC status for a user
  static async getKYCStatus(userId: string, requesterId: string) {
    try {
      // Find KYC profile
      const kycProfile = await KYCProfileModel.findOne({ userId });
      
      if (!kycProfile) {
        logger.warn('No KYC profile found', { userId });
        return {
          success: false,
          error: 'No KYC profile found for this user'
        };
      }
      
      logger.info('KYC status retrieved', {
        userId,
        status: kycProfile.status
      });
      
      auditLogger('KYC_STATUS', requesterId, {
        status: kycProfile.status
      });
      
      // Return KYC status
      return {
        success: true,
        data: {
          userId: kycProfile.userId,
          userType: kycProfile.userType,
          status: kycProfile.status,
          documentCount: kycProfile.documents.length,
          submittedAt: kycProfile.submittedAt,
          completedAt: kycProfile.completedAt
        }
      };
    } catch (error) {
      logger.error('Error getting KYC status', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        success: false,
        error: 'Error retrieving KYC status'
      };
    }
  }

  // Get all KYC profiles with filters
  static async getAllKYCProfiles(filters: any, requesterId: string) {
    try {
      // Build query
      const query: any = {};
      
      if (filters.userId) query.userId = filters.userId;
      if (filters.userType) query.userType = filters.userType;
      if (filters.status) query.status = filters.status;
      if (filters.merchantId) query.merchantId = filters.merchantId;
      
      // Handle date range
      if (filters.startDate || filters.endDate) {
        query.submittedAt = {};
        if (filters.startDate) query.submittedAt['$gte'] = new Date(filters.startDate);
        if (filters.endDate) query.submittedAt['$lte'] = new Date(filters.endDate);
      }
      
      // Execute query
      const profiles = await KYCProfileModel.find(query);
      
      logger.info('Retrieved KYC profiles', {
        count: profiles.length
      });
      
      auditLogger('KYC_LIST', requesterId, {
        count: profiles.length,
        filters
      });
      
      return {
        success: true,
        data: profiles
      };
    } catch (error) {
      logger.error('Error retrieving KYC profiles', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        success: false,
        error: 'Error retrieving KYC profiles'
      };
    }
  }

  // Update KYC status
  static async updateKYCStatus(kycId: string, status: KYCStatus, rejectionReason?: string, reviewedBy?: string) {
    try {
      // Find and update KYC profile
      const updatedProfile = await KYCProfileModel.findByIdAndUpdate(
        kycId,
        {
          status,
          ...(status === KYCStatus.COMPLETED && { completedAt: new Date() }),
          ...(rejectionReason && { rejectionReason })
        },
        { new: true }
      );
      
      if (!updatedProfile) {
        logger.warn('KYC profile not found', { kycId });
        return {
          success: false,
          error: 'KYC profile not found'
        };
      }
      
      logger.info('KYC status updated', {
        kycId,
        newStatus: status
      });
      
      auditLogger('KYC_UPDATE', filters.userId || 'anonymous', {
        kycId,
        newStatus: status,
        rejectionReason
      });
      
      return {
        success: true,
        message: 'KYC status updated successfully',
        data: {
          kycId: updatedProfile._id,
          status: updatedProfile.status,
          rejectionReason: updatedProfile.rejectionReason
        }
      };
    } catch (error) {
      logger.error('Error updating KYC status', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        success: false,
        error: 'Error updating KYC status'
      };
    }
  }

  // Upload document
  static async uploadDocument(userId: string, documentData: any, requesterId: string) {
    try {
      // Find KYC profile
      const kycProfile = await KYCProfileModel.findOne({ userId });
      
      if (!kycProfile) {
        logger.warn('KYC profile not found', { userId });
        return {
          success: false,
          error: 'KYC profile not found for this user'
        };
      }
      
      // Add document to profile
      kycProfile.documents.push({
        ...documentData,
        status: KYCStatus.PENDING
      });
      
      // Save updated profile
      await kycProfile.save();
      
      logger.info('Document uploaded successfully', {
        userId,
        documentType: documentData.type,
        fileName: documentData.fileName
      });
      
      auditLogger('DOCUMENT_UPLOAD', requesterId, {
        documentType: documentData.type,
        fileName: documentData.fileName,
        fileSize: documentData.fileSize
      });
      
      return {
        success: true,
        message: 'Document uploaded successfully',
        data: {
          documentType: documentData.type,
          fileName: documentData.fileName,
          status: KYCStatus.PENDING
        }
      };
    } catch (error) {
      logger.error('Error uploading document', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        success: false,
        error: 'Error uploading document'
      };
    }
  }

  // Delete document
  static async deleteDocument(userId: string, documentId: string, requesterId: string) {
    try {
      // Find KYC profile
      const kycProfile = await KYCProfileModel.findOne({ userId });
      
      if (!kycProfile) {
        logger.warn('KYC profile not found', { userId });
        return {
          success: false,
          error: 'KYC profile not found for this user'
        };
      }
      
      // Find document index
      const docIndex = kycProfile.documents.findIndex(doc => doc._id.toString() === documentId);
      
      if (docIndex === -1) {
        logger.warn('Document not found', { documentId });
        return {
          success: false,
          error: 'Document not found'
        };
      }
      
      // Remove document
      kycProfile.documents.splice(docIndex, 1);
      
      // Save updated profile
      await kycProfile.save();
      
      logger.info('Document deleted successfully', {
        userId,
        documentId
      });
      
      auditLogger('DOCUMENT_DELETE', requesterId, {
        documentId
      });
      
      return {
        success: true,
        message: 'Document deleted successfully'
      };
    } catch (error) {
      logger.error('Error deleting document', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        success: false,
        error: 'Error deleting document'
      };
    }
  }

  // Get all documents for a user
  static async getDocuments(userId: string, requesterId: string) {
    try {
      // Find KYC profile
      const kycProfile = await KYCProfileModel.findOne({ userId });
      
      if (!kycProfile) {
        logger.warn('KYC profile not found', { userId });
        return {
          success: false,
          error: 'KYC profile not found for this user'
        };
      }
      
      logger.info('Documents retrieved successfully', {
        userId,
        documentCount: kycProfile.documents.length
      });
      
      auditLogger('DOCUMENTS_FETCH', requesterId, {
        documentCount: kycProfile.documents.length
      });
      
      return {
        success: true,
        data: kycProfile.documents
      };
    } catch (error) {
      logger.error('Error retrieving documents', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        success: false,
        error: 'Error retrieving documents'
      };
    }
  }

  // Get document by ID
  static async getDocumentById(documentId: string, requesterId: string) {
    try {
      // Find document
      const document = await KYCDocumentModel.findById(documentId);
      
      if (!document) {
        logger.warn('Document not found', { documentId });
        return {
          success: false,
          error: 'Document not found'
        };
      }
      
      logger.info('Document retrieved successfully', {
        documentId
      });
      
      return {
        success: true,
        data: document
      };
    } catch (error) {
      logger.error('Error retrieving document', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        success: false,
        error: 'Error retrieving document'
      };
    }
  }

  // Update document status
  static async updateDocumentStatus(documentId: string, status: KYCStatus, rejectionReason?: string, requesterId?: string) {
    try {
      // Find document
      const document = await KYCDocumentModel.findById(documentId);
      
      if (!document) {
        logger.warn('Document not found', { documentId });
        return {
          success: false,
          error: 'Document not found'
        };
      }
      
      // Update document status and optional rejection reason
      document.status = status;
      if (rejectionReason) {
        document.rejectionReason = rejectionReason;
      }
      
      // Save updated document
      await document.save();
      
      logger.info('Document status updated successfully', {
        documentId,
        newStatus: status
      });
      
      auditLogger('DOCUMENT_UPDATE', requesterId || 'anonymous', {
        documentId,
        newStatus: status,
        rejectionReason
      });
      
      return {
        success: true,
        message: 'Document status updated successfully',
        data: {
          documentId,
          status,
          rejectionReason
        }
      };
    } catch (error) {
      logger.error('Error updating document status', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        success: false,
        error: 'Error updating document status'
      };
    }
  }

  // Review KYC submission
  static async reviewKYC(kycId: string, status: KYCStatus, rejectionReason?: string, reviewedBy?: string) {
    try {
      // Find and update KYC profile
      const updatedProfile = await KYCProfileModel.findByIdAndUpdate(
        kycId,
        {
          status,
          reviewedBy,
          reviewDate: new Date(),
          ...(rejectionReason && { rejectionReason })
        },
        { new: true }
      );
      
      if (!updatedProfile) {
        logger.warn('KYC profile not found', { kycId });
        return {
          success: false,
          error: 'KYC profile not found'
        };
      }
      
      logger.info('KYC submission reviewed', {
        kycId,
        newStatus: status
      });
      
      auditLogger('KYC_REVIEW', reviewedBy || 'anonymous', {
        kycId,
        newStatus: status,
        rejectionReason
      });
      
      return {
        success: true,
        message: 'KYC submission reviewed successfully',
        data: {
          kycId: updatedProfile._id,
          status: updatedProfile.status,
          rejectionReason: updatedProfile.rejectionReason
        }
      };
    } catch (error) {
      logger.error('Error reviewing KYC submission', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        success: false,
        error: 'Error reviewing KYC submission'
      };
    }
  }

  // Validate KYC submission
  static async validateKYC(data: KYCSubmissionRequest, userId: string) {
    try {
      const { error, value } = validateKYCSubmission(data);
      
      if (error) {
        logger.warn('KYC validation failed', {
          error: error.details.map(detail => detail.message)
        });
        
        return { error };
      }
      
      logger.info('KYC submission validated successfully', {
        userId,
        documentCount: value.documents.length
      });
      
      return { value };
    } catch (error) {
      logger.error('Error validating KYC submission', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return { error: { message: 'Error validating KYC submission' } };
    }
  }

  // Search KYC profiles
  static async searchKYCProfiles(filters: any, requesterId: string) {
    try {
      // Build query
      const query: any = {};
      
      if (filters.userId) query.userId = filters.userId;
      if (filters.userType) query.userType = filters.userType;
      if (filters.status) query.status = filters.status;
      if (filters.merchantId) query.merchantId = filters.merchantId;
      
      // Handle date range
      if (filters.startDate || filters.endDate) {
        query.submittedAt = {};
        if (filters.startDate) query.submittedAt['$gte'] = new Date(filters.startDate);
        if (filters.endDate) query.submittedAt['$lte'] = new Date(filters.endDate);
      }
      
      // Execute query
      const profiles = await KYCProfileModel.find(query);
      
      logger.info('Retrieved KYC profiles', {
        count: profiles.length
      });
      
      auditLogger('KYC_SEARCH', requesterId, {
        count: profiles.length,
        filters
      });
      
      return {
        success: true,
        data: profiles
      };
    } catch (error) {
      logger.error('Error searching KYC profiles', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        success: false,
        error: 'Error searching KYC profiles'
      };
    }
  }
}

export const kycService = new KYCService();
