// src/controllers/kycController.ts
import { Request, Response, NextFunction } from 'express';
import { kycService } from '../services/kycService';
import { logger } from '../utils/logger';
import { auditLogger } from '../utils/audit';
import {
  KYCStatus,
  UserType,
  RiskLevel,
  BusinessType,
  ComplianceWorkflowStatus,
  BUSINESS_TYPE_OPTIONS,
  INDUSTRY_TYPE_OPTIONS,
  BUSINESS_MODEL_OPTIONS
} from '../types/kycTypes';
import { timingSafeEqual } from 'crypto';
import { livenessService } from '../services/livenessService';
import { amlVerificationService, AMLVerificationResult } from '../services/amlVerificationService';
import { sanctionsService, SanctionsCheckRequest } from '../services/sanctionsService';
import * as spacesService from '../services/spacesService';
import { fuspayModularKycService } from '../services/fuspayModularKycService';
import { applyFuspayModularWebhook } from '../services/fuspayWebhookService';
import { provisionUserNubanAfterKyc } from '../services/walletMsService';
import { KYCProfileModel } from '../models/KYCProfileModel';
import { v4 as uuidv4 } from 'uuid';
import { businessSurveyUpdateSchema, businessInfoUpdateSchema } from '../utils/validation';

/** Blocks polling/submitting another user's verification when the path id is stale or forged. */
async function modularVerificationBelongsToUser(userId: string, verificationId: string): Promise<boolean> {
  const profile = await KYCProfileModel.findOne({ userId }).lean();
  const stored = (profile as any)?.fuspay?.verification?.verificationId as string | undefined;
  return Boolean(stored && stored === verificationId);
}

// Enhanced KYC controller with separated individual and business methods
export class KYCController {
  // Submit Individual KYC
  static async submitIndividualKYC(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await kycService.submitIndividualKYC(req.body, req.user?.userId);
      
      if (!result.success) {
        logger.warn('Individual KYC submission failed', {
          userId: req.user?.userId,
          error: result.error
        });
        
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }
      
      logger.info('Individual KYC submitted successfully', {
        userId: req.user?.userId,
        kycId: result.data?.kycId,
        riskLevel: result.data?.riskLevel
      });
      
      return res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Submit Business KYC
  static async submitBusinessKYC(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await kycService.submitBusinessKYC(req.body, req.user?.userId, req.user?.token);
      
      if (!result.success) {
        logger.warn('Business KYC submission failed', {
          userId: req.user?.userId,
          error: result.error
        });
        
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }
      
      logger.info('Business KYC submitted successfully', {
        userId: req.user?.userId,
        kycId: result.data?.kycId,
        riskLevel: result.data?.riskLevel,
        shareholderCount: result.data?.shareholderCount
      });
      
      return res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Create Fuspay modular verification session for a customer
  static async createFuspayVerification(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body || {};
      const country = body.country as string | undefined;
      const tenantAppIdHeader = req.headers['x-tenant-app-id'];
      const tenantAppId = Array.isArray(tenantAppIdHeader) ? tenantAppIdHeader[0] : tenantAppIdHeader;
      const resolvedBranding =
        body.branding ||
        (await fuspayModularKycService.getBrandingForApp(
          typeof tenantAppId === 'string' && tenantAppId.trim().length > 0 ? tenantAppId.trim() : undefined
        ));

      const jwtUserId = req.user?.userId;
      let fuspayUserId: string | undefined;

      if (jwtUserId) {
        // Never trust user_id/customer_id from the body for browser clients: UIs often replay full
        // Fuspay status payloads and would accidentally start KYC for the wrong Fuspay customer.
        const profile = await KYCProfileModel.findOne({ userId: jwtUserId }).lean();
        fuspayUserId = (profile as any)?.fuspay?.customerId;
      } else {
        fuspayUserId =
          (body.user_id as string | undefined) ||
          (body.customer_id as string | undefined);
        if (!fuspayUserId) {
          return res.status(401).json({ success: false, error: 'Authentication required' });
        }
      }

      if (!fuspayUserId) {
        return res.status(400).json({
          success: false,
          error:
            'Fuspay user id missing: pass user_id (Create User id) or ensure fuspay.customerId exists on your KYC profile'
        });
      }

      const kyc_type = (body.kyc_type as string | undefined) || 'individual';

      let result;
      const usesCustomerPayload =
        Boolean(body.customer_id) ||
        Boolean(body.callback) ||
        Boolean(body.redirect) ||
        Boolean(country);

      if (usesCustomerPayload) {
        result = await fuspayModularKycService.createVerification({
          customer_id: fuspayUserId,
          ...(country ? { country } : {}),
          callback: body.callback,
          redirect: body.redirect,
          ...(resolvedBranding ? { branding: resolvedBranding } : {}),
          individual_checks: body.individual_checks,
          business_checks: body.business_checks,
          aml_checks: body.aml_checks,
          additional_fields: body.additional_fields
        });
      } else {
        result = await fuspayModularKycService.createVerification({
          user_id: fuspayUserId,
          kyc_type,
          callback: body.callback as string | undefined,
          redirect: body.redirect as string | undefined,
          ...(resolvedBranding ? { branding: resolvedBranding } : {})
        });
      }

      if (!result.success) {
        return res.status(400).json(result);
      }

      const data = result.data as Record<string, unknown> | undefined;
      const verificationId = data?.verification_id as string | undefined;
      const verificationUrl = data?.verification_url as string | undefined;

      if (jwtUserId && verificationId) {
        await KYCProfileModel.updateOne(
          { userId: jwtUserId },
          {
            $set: {
              'fuspay.customerId': fuspayUserId,
              'fuspay.verification.verificationId': verificationId,
              'fuspay.verification.verificationUrl': verificationUrl,
              'fuspay.verification.reference': data?.reference,
              'fuspay.verification.status': data?.status,
              'fuspay.verification.totalChecks': data?.total_checks,
              'fuspay.verification.lastSyncedAt': new Date()
            }
          }
        );
      }

      return res.status(201).json({
        ...result,
        verification_url: verificationUrl,
        verification_id: verificationId
      });
    } catch (error) {
      next(error);
    }
  }

  static async createGuarantorFuspayVerification(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body || {};
      const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
      const email = typeof body.email === 'string' ? body.email.trim() : '';
      const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
      const country = typeof body.country === 'string' && body.country.trim() ? body.country.trim().toUpperCase() : 'NG';
      const userRef =
        typeof body.userRef === 'string' && body.userRef.trim()
          ? body.userRef.trim()
          : `guarantor_${uuidv4()}`;

      if (!fullName || !email || !phone) {
        return res.status(400).json({
          success: false,
          error: 'fullName, email, and phone are required'
        });
      }

      const userResult = await fuspayModularKycService.createUser({
        email,
        phone,
        country,
        userRef
      });
      if (!userResult.success) {
        return res.status(400).json({
          success: false,
          error: `Fuspay guarantor user creation failed: ${userResult.error || 'Unknown error'}`
        });
      }

      const userData = userResult.data as Record<string, unknown> | undefined;
      const nestedUserData = userData?.data as Record<string, unknown> | undefined;
      const customerId =
        (userData?.customer_id as string | undefined) ||
        (nestedUserData?.customer_id as string | undefined) ||
        (nestedUserData?.id as string | undefined);

      if (!customerId) {
        return res.status(400).json({
          success: false,
          error: 'Fuspay guarantor user creation did not return a customer id'
        });
      }

      const verificationResult = await fuspayModularKycService.createVerification({
        customer_id: customerId,
        kyc_type: 'individual',
        country,
        callback: body.callback,
        redirect: body.redirect,
        individual_checks: body.individual_checks,
        business_checks: body.business_checks,
        aml_checks: body.aml_checks,
        additional_fields: [
          { key: 'fullName', value: fullName },
          { key: 'email', value: email },
          { key: 'phone', value: phone },
          ...(typeof body.occupation === 'string' ? [{ key: 'occupation', value: body.occupation }] : []),
          ...(typeof body.relationship === 'string' ? [{ key: 'relationship', value: body.relationship }] : []),
          ...(typeof body.applicationId === 'string' ? [{ key: 'applicationId', value: body.applicationId }] : []),
          ...(typeof body.productId === 'string' ? [{ key: 'productId', value: body.productId }] : [])
        ]
      });

      if (!verificationResult.success) {
        return res.status(400).json(verificationResult);
      }

      const verificationData = verificationResult.data as Record<string, unknown> | undefined;
      const verificationUrl = verificationData?.verification_url as string | undefined;
      const verificationId = verificationData?.verification_id as string | undefined;

      return res.status(201).json({
        success: true,
        message: 'Guarantor KYC verification created successfully',
        data: {
          customerId,
          userRef,
          verificationId,
          verificationUrl,
          reference: verificationData?.reference,
          status: verificationData?.status,
          totalChecks: verificationData?.total_checks,
          raw: verificationData
        },
        verification_url: verificationUrl,
        verification_id: verificationId
      });
    } catch (error) {
      next(error);
    }
  }

  /** Fuspay/Payonus webhook — no JWT; optional `FUSPAY_MODULAR_WEBHOOK_SECRET` via header `x-fuspay-webhook-secret`. */
  static async handleFuspayModularWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const secret = process.env.FUSPAY_MODULAR_WEBHOOK_SECRET?.trim();
      if (secret) {
        const headerSecret =
          (req.headers['x-fuspay-webhook-secret'] as string | undefined)?.trim() ||
          (req.headers['x-webhook-secret'] as string | undefined)?.trim();
        let authorized = false;
        if (headerSecret) {
          try {
            const a = Buffer.from(headerSecret, 'utf8');
            const b = Buffer.from(secret, 'utf8');
            authorized = a.length === b.length && timingSafeEqual(a, b);
          } catch {
            authorized = false;
          }
        }
        if (!authorized) {
          return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
      }

      const payload = (req.body || {}) as Record<string, unknown>;
      const nested =
        payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)
          ? (payload.data as Record<string, unknown>)
          : {};

      const hasIdentifier = Boolean(
        nested.user_id ||
          nested.customer_id ||
          nested.customerId ||
          nested.reference ||
          nested.verification_id ||
          nested.verificationId ||
          nested.id ||
          payload.user_id ||
          payload.customer_id
      );

      if (!hasIdentifier) {
        return res.status(400).json({
          success: false,
          error:
            'Webhook payload must include user/customer id, reference, or verification id in data'
        });
      }

      const result = await applyFuspayModularWebhook(payload);

      let nubanProvision: Awaited<ReturnType<typeof provisionUserNubanAfterKyc>> | undefined;
      if (result.shouldProvisionNuban && result.profileUserId) {
        nubanProvision = await provisionUserNubanAfterKyc(result.profileUserId);
        if (!nubanProvision.success) {
          logger.warn('PayOnUs NUBAN provision after Fuspay KYC failed', {
            userId: result.profileUserId,
            error: nubanProvision.error
          });
        } else {
          logger.info('PayOnUs NUBAN provision after Fuspay KYC', {
            userId: result.profileUserId,
            skipped: nubanProvision.skipped
          });
        }
      }

      return res.status(200).json({
        success: true,
        matched: result.matched,
        modified: result.modified,
        bvnStored: result.bvnStored ?? false,
        nubanProvisionTriggered: Boolean(result.shouldProvisionNuban),
        ...(nubanProvision
          ? {
              nubanProvision: {
                success: nubanProvision.success,
                skipped: nubanProvision.skipped,
                error: nubanProvision.error
              }
            }
          : {}),
        ...(result.matched === 0
          ? { warning: 'Webhook stored identifiers did not match any KYC profile' }
          : {})
      });
    } catch (error) {
      next(error);
    }
  }

  // Submit a verification check payload to Fuspay modular endpoint
  static async submitFuspayVerification(req: Request, res: Response, next: NextFunction) {
    try {
      const { verificationId } = req.params;
      if (!verificationId) {
        return res.status(400).json({
          success: false,
          error: 'verificationId is required'
        });
      }

      const userId = req.user?.userId;
      if (userId && !(await modularVerificationBelongsToUser(userId, verificationId))) {
        return res.status(403).json({
          success: false,
          error: 'Verification id does not match this account'
        });
      }

      const result = await fuspayModularKycService.submitVerification(verificationId, req.body || {});
      if (!result.success) {
        return res.status(400).json(result);
      }
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Get Fuspay modular verification status
  static async getFuspayVerificationStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { verificationId } = req.params;
      if (!verificationId) {
        return res.status(400).json({
          success: false,
          error: 'verificationId is required'
        });
      }

      const userId = req.user?.userId;
      if (userId && !(await modularVerificationBelongsToUser(userId, verificationId))) {
        return res.status(403).json({
          success: false,
          error: 'Verification id does not match this account'
        });
      }

      const result = await fuspayModularKycService.getVerificationStatus(verificationId);
      if (!result.success) {
        return res.status(400).json(result);
      }

      if (userId && result.data) {
        await KYCProfileModel.updateOne(
          { userId, 'fuspay.verification.verificationId': verificationId },
          {
            $set: {
              'fuspay.verification.status': (result.data as any)?.status,
              'fuspay.verification.overallStatus': (result.data as any)?.overall_status,
              'fuspay.verification.completedChecks': (result.data as any)?.completed_checks,
              'fuspay.verification.totalChecks': (result.data as any)?.total_checks,
              'fuspay.verification.lastSyncedAt': new Date()
            }
          }
        );
      }

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Ask Fuspay to complete verification when checks are done
  static async completeFuspayVerification(req: Request, res: Response, next: NextFunction) {
    try {
      const { verificationId } = req.params;
      if (!verificationId) {
        return res.status(400).json({
          success: false,
          error: 'verificationId is required'
        });
      }

      const userId = req.user?.userId;
      if (userId && !(await modularVerificationBelongsToUser(userId, verificationId))) {
        return res.status(403).json({
          success: false,
          error: 'Verification id does not match this account'
        });
      }

      const result = await fuspayModularKycService.completeVerification(verificationId);
      if (!result.success) {
        return res.status(400).json(result);
      }
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Get saved Fuspay modular verification details for the authenticated user
  static async getMyFuspayVerification(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const profile = await KYCProfileModel.findOne({ userId }).lean();
      if (!profile) {
        return res.status(404).json({
          success: false,
          error: 'No KYC profile found for this user'
        });
      }

      const fuspay = (profile as any)?.fuspay;
      const verification = fuspay?.verification;
      const verificationId = verification?.verificationId as string | undefined;
      const verificationUrl = verification?.verificationUrl as string | undefined;

      if (!verificationId && !verificationUrl) {
        return res.status(404).json({
          success: false,
          error: 'No saved Fuspay modular verification found for this user'
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          customerId: fuspay?.customerId,
          verificationId,
          verificationUrl,
          reference: verification?.reference,
          status: verification?.status,
          overallStatus: verification?.overallStatus,
          completedChecks: verification?.completedChecks,
          totalChecks: verification?.totalChecks,
          lastSyncedAt: verification?.lastSyncedAt
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get KYC status for a user
  static async getKYCStatus(req: Request, res: Response, next: NextFunction) {
    try {
      // For service-to-service requests, use the target user ID for both params
      // For user requests, use the authenticated user ID as the requester
      const requesterId = req.service ? req.params.userId : req.user?.userId;
      const result = await kycService.getKYCStatus(req.params.userId, requesterId);
      
      if (!result.success) {
        logger.warn('KYC status retrieval failed', {
          userId: req.params.userId,
          error: result.error
        });
        
        return res.status(404).json(result);
      }
      
      logger.info('KYC status retrieved successfully', {
        userId: req.params.userId,
        status: result.data?.status
      });
      
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Create a minimal KYC profile for a user
  static async createMinimalKYCProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const { userType, fuspay } = req.body;
      
      // For service-to-service requests, use the service as the requester
      // For user requests, use the authenticated user ID as the requester
      const requesterId = req.service ? 'service' : req.user?.userId;
      
      const result = await kycService.createMinimalKYCProfile(userId, userType, requesterId, fuspay);
      
      if (!result.success) {
        logger.warn('Failed to create minimal KYC profile', {
          userId,
          error: result.error
        });
        
        return res.status(400).json(result);
      }
      
      logger.info('Minimal KYC profile created successfully', {
        userId,
        userType,
        status: result.data?.status
      });
      
      return res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Upload KYC document to Spaces (backend upload)
  static async uploadKycDocument(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded. Send a single file in the "file" field.'
        });
      }
      if (!spacesService.isSpacesConfigured()) {
        return res.status(503).json({
          success: false,
          error: 'Document upload is not configured (Spaces).'
        });
      }
      const mimeType = req.file.mimetype || (req.file as any).mimeType || 'application/octet-stream';
      const fileSize = req.file.size ?? req.file.buffer.length;
      const validation = spacesService.validateKycUpload(mimeType, fileSize);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: validation.error
        });
      }
      const userId = req.user?.userId ?? req.service?.serviceId ?? 'anonymous';
      const ext = req.file.originalname?.match(/\.[a-zA-Z0-9]+$/)?.[0] || (mimeType === 'application/pdf' ? '.pdf' : '.bin');
      const key = `kyc/${userId}/${uuidv4()}${ext}`;
      const result = await spacesService.uploadToSpaces(req.file.buffer, key, mimeType);
      return res.status(200).json({
        success: true,
        url: result.url,
        key: result.key
      });
    } catch (error) {
      next(error);
    }
  }

  // Update KYC document status
  static async updateKYCDocumentStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { documentId } = req.params;
      const { status, rejectionReason } = req.body;
      const result = await kycService.updateKYCDocumentStatus(documentId, status as KYCStatus, rejectionReason);
      
      if (!result.success) {
        logger.warn('KYC document status update failed', {
          documentId,
          error: result.error
        });
        
        return res.status(404).json(result);
      }
      
      logger.info('KYC document status updated successfully', {
        documentId,
        newStatus: status
      });
      
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Get KYC document by ID
  static async getKYCDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await kycService.getKYCDocument(req.params.documentId);
      
      if (!result.success) {
        logger.warn('KYC document retrieval failed', {
          documentId: req.params.documentId,
          error: result.error
        });
        
        return res.status(404).json(result);
      }
      
      logger.info('KYC document retrieved successfully', {
        documentId: req.params.documentId,
        documentType: result.data?.type
      });
      
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Get all KYC documents for a user
  static async getAllKYCDocuments(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await kycService.getAllKYCDocuments(req.params.userId);
      
      if (!result.success) {
        logger.warn('KYC document retrieval failed', {
          userId: req.params.userId,
          error: result.error
        });
        
        return res.status(404).json(result);
      }
      
      logger.info('KYC documents retrieved successfully', {
        userId: req.params.userId,
        documentCount: result.data?.length
      });
      
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Search KYC profiles
  static async searchKYCProfiles(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await kycService.searchKYCProfiles(req.query);
      
      if (!result.success) {
        logger.warn('KYC profile search failed', {
          error: result.error
        });
        
        return res.status(400).json(result);
      }
      
      logger.info('KYC profiles retrieved successfully', {
        count: result.data?.length
      });
      
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Validate KYC submission
  static async validateKYCSubmission(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await kycService.validateKYC(req.body, req.user?.userId);
      
      if ('error' in result && result.error) {
        logger.warn('KYC validation failed', {
          userId: req.user?.userId,
          error: result.error.message
        });
        
        return res.status(400).json({
          success: false,
          error: result.error.message
        });
      }
      
      req.body = result.data;
      logger.info('KYC submission validated successfully', {
        userId: req.user?.userId,
        validationDate: result.data?.validationDate
      });
      
      next();
    } catch (error) {
      next(error);
    }
  }

  // Approve document for Prembly verification (Admin must approve before Prembly check)
  static async approveDocumentForVerification(req: Request, res: Response, next: NextFunction) {
    try {
      const { documentId } = req.params;
      const { notes } = req.body;
      const adminId = req.user?.userId;
      
      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: 'Admin authentication required'
        });
      }
      
      // Get the document by ID
      const documentResult = await kycService.getKYCDocument(documentId);
      
      if (!documentResult.success) {
        logger.warn('Document approval failed - document not found', {
          documentId,
          error: documentResult.error
        });
        
        return res.status(404).json({
          success: false,
          error: documentResult.error || 'Document not found'
        });
      }
      
      const document = documentResult.data;
      
      // Check if document is in PENDING or REVIEW status
      if (document.status !== KYCStatus.PENDING && document.status !== KYCStatus.REVIEW) {
        return res.status(400).json({
          success: false,
          error: `Document cannot be approved. Current status: ${document.status}. Only PENDING or REVIEW documents can be approved for verification.`
        });
      }
      
      // Update document status to ADMIN_APPROVED
      const result = await kycService.updateKYCDocumentStatus(
        documentId, 
        KYCStatus.ADMIN_APPROVED, 
        undefined,
        adminId,
        notes
      );
      
      if (!result.success) {
        logger.warn('Document approval failed', {
          documentId,
          error: result.error
        });
        
        return res.status(500).json(result);
      }
      
      logger.info('Document approved for Prembly verification', {
        documentId,
        approvedBy: adminId,
        notes
      });
      
      auditLogger('DOCUMENT_APPROVED_FOR_VERIFICATION', adminId, {
        documentId,
        previousStatus: document.status,
        newStatus: KYCStatus.ADMIN_APPROVED,
        notes
      });
      
      return res.status(200).json({
        success: true,
        message: 'Document approved for Prembly verification',
        data: {
          documentId,
          status: KYCStatus.ADMIN_APPROVED,
          approvedBy: adminId,
          approvedAt: new Date(),
          notes
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Verify AML document using third-party provider
  static async verifyAMLDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const { documentId, provider } = req.body;
      
      // Get the document by ID
      const documentResult = await kycService.getKYCDocument(documentId);
      
      if (!documentResult.success) {
        logger.warn('AML document verification failed - document not found', {
          documentId,
          error: documentResult.error
        });
        
        return res.status(404).json({
          success: false,
          error: documentResult.error || 'Document not found'
        });
      }
      
      const document = documentResult.data;
      
      // Check if document has been approved by admin before Prembly verification
      if (document.status !== KYCStatus.ADMIN_APPROVED) {
        return res.status(400).json({
          success: false,
          error: `Document must be approved by admin before Prembly verification. Current status: ${document.status}. Please approve the document first.`
        });
      }
      
      // Verify the document using the AML provider
      const verificationResult: AMLVerificationResult = await amlVerificationService.verifyDocument(document, provider);
      
      // Update document status based on verification result
      const updateSuccess = await amlVerificationService.updateDocumentStatusBasedOnVerification(documentId, verificationResult);
      
      if (!updateSuccess) {
        logger.error('Failed to update document status after AML verification', {
          documentId,
          verificationId: verificationResult.verificationId
        });
        
        return res.status(500).json({
          success: false,
          error: 'Failed to update document status after verification'
        });
      }
      
      logger.info('AML document verification completed', {
        documentId,
        provider: verificationResult.providerId,
        approved: verificationResult.overallApproved,
        suspicious: verificationResult.suspicious
      });
      
      // If the document is suspicious, return a special response
      if (verificationResult.suspicious) {
        return res.status(200).json({
          success: true,
          message: 'Document verification completed but requires manual review',
          data: {
            documentId,
            verificationResult,
            status: KYCStatus.REVIEW,
            message: 'Document flagged for manual review'
          }
        });
      }
      
      // If the document is rejected
      if (!verificationResult.overallApproved) {
        return res.status(200).json({
          success: true,
          message: 'Document verification completed but rejected',
          data: {
            documentId,
            verificationResult,
            status: KYCStatus.REJECTED,
            message: verificationResult.reason || 'Document did not pass verification'
          }
        });
      }
      
      // Document approved
      return res.status(200).json({
        success: true,
        message: 'Document verification completed and approved',
        data: {
          documentId,
          verificationResult,
          status: KYCStatus.APPROVED,
          message: 'Document approved'
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Review KYC submission
  static async reviewKYCSubmission(req: Request, res: Response, next: NextFunction) {
    try {
      const { kycId } = req.params;
      const { status, rejectionReason } = req.body;
      const result = await kycService.reviewKYC(kycId, status as KYCStatus, rejectionReason, req.user?.userId);
      
      if (!result.success) {
        logger.warn('KYC review failed', {
          kycId,
          error: result.error
        });
        
        return res.status(400).json(result);
      }
      
      logger.info('KYC submission reviewed successfully', {
        kycId,
        newStatus: status,
        reviewedBy: req.user?.userId
      });
      
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Submit KYC for backward compatibility
  static async submitKYC(req: Request, res: Response, next: NextFunction) {
    try {
      const result: any = await kycService.submitKYC(req.body, req.user?.userId);
      
      if (!result.success) {
        logger.warn('KYC submission failed', {
          userId: req.user?.userId,
          error: result.error || 'Unknown error'
        });
        
        return res.status(400).json({
          success: false,
          error: result.error || 'Unknown error'
        });
      }
      
      logger.info('KYC submitted successfully', {
        userId: req.user?.userId,
        documentCount: result.data?.documents?.length
      });
      
      return res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Get business information for a user
  static async getBusinessInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }
      
      const result = await kycService.getBusinessInfo(userId);
      
      if (!result.success) {
        logger.warn('Business info retrieval failed', {
          userId,
          error: result.error
        });
        
        return res.status(404).json(result);
      }
      
      logger.info('Business info retrieved successfully', {
        userId
      });
      
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Get business survey data for a user
  static async getBusinessSurvey(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }
      
      const result = await kycService.getBusinessSurvey(userId);
      
      if (!result.success) {
        logger.warn('Business survey retrieval failed', {
          userId,
          error: result.error
        });
        
        return res.status(404).json(result);
      }
      
      logger.info('Business survey retrieved successfully', {
        userId
      });
      
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /** Get business type options for the "Select a Business Type" dropdown (industry/sector list). */
  static async getBusinessTypeOptions(_req: Request, res: Response, next: NextFunction) {
    try {
      return res.status(200).json({
        success: true,
        data: BUSINESS_TYPE_OPTIONS.map((value) => ({ value, label: value }))
      });
    } catch (error) {
      next(error);
    }
  }

  /** Get industry type options for the "Select Industry Type" dropdown. */
  static async getIndustryTypeOptions(_req: Request, res: Response, next: NextFunction) {
    try {
      return res.status(200).json({
        success: true,
        data: INDUSTRY_TYPE_OPTIONS.map((value) => ({ value, label: value }))
      });
    } catch (error) {
      next(error);
    }
  }

  /** Get business model options for the "Select a Business Model" dropdown. */
  static async getBusinessModelOptions(_req: Request, res: Response, next: NextFunction) {
    try {
      return res.status(200).json({
        success: true,
        data: BUSINESS_MODEL_OPTIONS.map((value) => ({ value, label: value }))
      });
    } catch (error) {
      next(error);
    }
  }

  // Get shareholders (beneficial owners) for a merchant (by merchantId)
  static async getBeneficialOwners(req: Request, res: Response, next: NextFunction) {
    try {
      const { merchantId } = req.params;
      const userId = req.user?.userId;

      if (!merchantId) {
        return res.status(400).json({
          success: false,
          error: 'Merchant ID is required'
        });
      }

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      // Authenticated merchant can only fetch their own shareholders
      if (userId !== merchantId) {
        return res.status(403).json({
          success: false,
          error: 'You can only fetch shareholders for your own account'
        });
      }

      const result = await kycService.getShareholders(merchantId);

      if (!result.success) {
        logger.warn('Shareholders retrieval failed', {
          merchantId,
          error: result.error
        });

        return res.status(404).json(result);
      }

      logger.info('Shareholders retrieved successfully', {
        merchantId,
        shareholderCount: result.data?.length
      });

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Get business risk assessment for a user
  static async getBusinessRiskAssessment(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }
      
      const result = await kycService.getBusinessRiskAssessment(userId);
      
      if (!result.success) {
        logger.warn('Business risk assessment retrieval failed', {
          userId,
          error: result.error
        });
        
        return res.status(404).json(result);
      }
      
      logger.info('Business risk assessment retrieved successfully', {
        userId
      });
      
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Update business information for a user
  static async updateBusinessInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      const { error: validationError } = businessInfoUpdateSchema.validate(req.body, { abortEarly: false });
      if (validationError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationError.details.map((d) => d.message)
        });
      }
      
      const result = await kycService.updateBusinessInfo(userId, req.body);
      
      if (!result.success) {
        logger.warn('Business info update failed', {
          userId,
          error: result.error
        });
        
        return res.status(400).json(result);
      }
      
      logger.info('Business info updated successfully', {
        userId
      });
      
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Update business survey data for a user
  static async updateBusinessSurvey(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      const { error: validationError } = businessSurveyUpdateSchema.validate(req.body, { abortEarly: false });
      if (validationError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationError.details.map((d) => d.message)
        });
      }
      
      const result = await kycService.updateBusinessSurvey(userId, req.body);
      
      if (!result.success) {
        logger.warn('Business survey update failed', {
          userId,
          error: result.error
        });
        
        return res.status(400).json(result);
      }
      
      logger.info('Business survey updated successfully', {
        userId
      });
      
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Update shareholders (beneficial owners) for a user
  static async updateBeneficialOwners(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }
      
      const result = await kycService.updateShareholders(userId, req.body);
      
      if (!result.success) {
        logger.warn('Shareholders update failed', {
          userId,
          error: result.error
        });
        
        return res.status(400).json(result);
      }
      
      logger.info('Shareholders updated successfully', {
        userId
      });
      
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Get enhanced due diligence data for high-risk businesses
  static async getEnhancedDueDiligence(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }
      
      const result = await kycService.getEnhancedDueDiligence(userId);
      
      if (!result.success) {
        logger.warn('Enhanced due diligence retrieval failed', {
          userId,
          error: result.error
        });
        
        return res.status(404).json(result);
      }
      
      logger.info('Enhanced due diligence retrieved successfully', {
        userId
      });
      
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Get corporate structure information for corporations and LLCs
  static async getCorporateStructure(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }
      
      const result = await kycService.getCorporateStructure(userId);
      
      if (!result.success) {
        logger.warn('Corporate structure retrieval failed', {
          userId,
          error: result.error
        });
        
        return res.status(404).json(result);
      }
      
      logger.info('Corporate structure retrieved successfully', {
        userId
      });
      
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Get non-profit verification information
  static async getNonProfitVerification(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }
      
      const result = await kycService.getNonProfitVerification(userId);
      
      if (!result.success) {
        logger.warn('Non-profit verification retrieval failed', {
          userId,
          error: result.error
        });
        
        return res.status(404).json(result);
      }
      
      logger.info('Non-profit verification retrieved successfully', {
        userId
      });
      
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Get government verification information
  static async getGovernmentVerification(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }
      
      const result = await kycService.getGovernmentVerification(userId);
      
      if (!result.success) {
        logger.warn('Government verification retrieval failed', {
          userId,
          error: result.error
        });
        
        return res.status(404).json(result);
      }
      
      logger.info('Government verification retrieved successfully', {
        userId
      });
      
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Get individual profile
  static async getIndividualProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.userId || req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const result = await kycService.getFullProfile(userId);
      if (!result.success || !result.data) {
        return res.status(404).json(result);
      }

      const profile = result.data;
      if (profile.userType !== UserType.INDIVIDUAL) {
        return res.status(400).json({
          success: false,
          error: 'User is not an individual customer'
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          userId,
          personalInfo: profile.personalInfo,
          riskLevel: profile.riskLevel,
          riskAssessment: profile.riskAssessment,
          documents: profile.documents,
          status: profile.status,
          submittedAt: profile.submittedAt,
          completedAt: profile.completedAt,
          messages: profile.messages || []
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get business profile
  static async getBusinessProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.userId || req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const result = await kycService.getFullProfile(userId);
      if (!result.success || !result.data) {
        return res.status(404).json(result);
      }

      const profile = result.data;
      if (profile.userType !== UserType.MERCHANT) {
        return res.status(400).json({
          success: false,
          error: 'User is not a business customer'
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          userId,
          businessInfo: profile.businessInfo,
          beneficialOwners: profile.beneficialOwners ?? profile.shareholders,
          directors: profile.directors,
          riskLevel: profile.riskLevel,
          riskAssessment: profile.riskAssessment,
          documents: profile.documents,
          status: profile.status,
          submittedAt: profile.submittedAt,
          completedAt: profile.completedAt,
          messages: profile.messages || []
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Merchant (or individual) sends a message to compliance admin
  static async sendMessageToCompliance(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      const { message } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }
      if (!message || typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Message is required and must be a non-empty string'
        });
      }

      const result = await kycService.sendMessageToUser(userId, message.trim(), userId);
      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Get compliance messages for the authenticated user (merchant or individual)
  static async getComplianceMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      const result = await kycService.getMessages(userId);
      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json({
        success: true,
        data: result.data || []
      });
    } catch (error) {
      next(error);
    }
  }

  // Update individual risk level
  static async updateIndividualRiskLevel(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.userId;
      const { riskLevel, notes } = req.body;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      if (!riskLevel || !Object.values(RiskLevel).includes(riskLevel as RiskLevel)) {
        return res.status(400).json({
          success: false,
          error: 'Valid risk level is required'
        });
      }

      // Update risk level in the profile
      // This would typically involve updating the database
      logger.info('Individual risk level updated', {
        userId,
        newRiskLevel: riskLevel,
        updatedBy: req.user?.userId
      });

      return res.status(200).json({
        success: true,
        message: 'Individual risk level updated successfully',
        data: {
          userId,
          riskLevel
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Update business risk level
  static async updateBusinessRiskLevel(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.userId;
      const { riskLevel, notes } = req.body;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      if (!riskLevel || !Object.values(RiskLevel).includes(riskLevel as RiskLevel)) {
        return res.status(400).json({
          success: false,
          error: 'Valid risk level is required'
        });
      }

      // Update risk level in the profile
      // This would typically involve updating the database
      logger.info('Business risk level updated', {
        userId,
        newRiskLevel: riskLevel,
        updatedBy: req.user?.userId
      });

      return res.status(200).json({
        success: true,
        message: 'Business risk level updated successfully',
        data: {
          userId,
          riskLevel
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Review individual KYC
  static async reviewIndividualKYC(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.userId;
      const { status, rejectionReason, notes } = req.body;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      if (!status || !Object.values(KYCStatus).includes(status as KYCStatus)) {
        return res.status(400).json({
          success: false,
          error: 'Valid KYC status is required'
        });
      }

      // Review individual KYC
      // This would typically involve updating the database
      logger.info('Individual KYC reviewed', {
        userId,
        newStatus: status,
        reviewedBy: req.user?.userId
      });

      return res.status(200).json({
        success: true,
        message: 'Individual KYC reviewed successfully',
        data: {
          userId,
          status,
          reviewedBy: req.user?.userId,
          reviewDate: new Date()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Review business KYC
  static async reviewBusinessKYC(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.userId;
      const { status, rejectionReason, notes } = req.body;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      if (!status || !Object.values(KYCStatus).includes(status as KYCStatus)) {
        return res.status(400).json({
          success: false,
          error: 'Valid KYC status is required'
        });
      }

      // Review business KYC
      // This would typically involve updating the database
      logger.info('Business KYC reviewed', {
        userId,
        newStatus: status,
        reviewedBy: req.user?.userId
      });

      return res.status(200).json({
        success: true,
        message: 'Business KYC reviewed successfully',
        data: {
          userId,
          status,
          reviewedBy: req.user?.userId,
          reviewDate: new Date()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get business beneficial owners
  static async getBusinessBeneficialOwners(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.userId || req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Get current KYC profile
      const result = await kycService.getKYCStatus(userId, req.user?.userId);
      
      if (!result.success) {
        return res.status(404).json(result);
      }

      if (result.data?.userType !== UserType.MERCHANT) {
        return res.status(400).json({
          success: false,
          error: 'User is not a business customer'
        });
      }

      // Return beneficial owners information
      return res.status(200).json({
        success: true,
        data: {
          userId,
          beneficialOwners: (result.data as any).beneficialOwners,
          totalOwnership: (result.data as any).beneficialOwners.reduce(
            (sum: number, owner: any) => sum + (owner.ownershipPercentage || 0), 
            0
          )
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get business corporate structure
  static async getBusinessCorporateStructure(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.userId || req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Get current KYC profile
      const result = await kycService.getKYCStatus(userId, req.user?.userId);
      
      if (!result.success) {
        return res.status(404).json(result);
      }

      if (result.data?.userType !== UserType.MERCHANT) {
        return res.status(400).json({
          success: false,
          error: 'User is not a business customer'
        });
      }

      // Return corporate structure information
      return res.status(200).json({
        success: true,
        data: {
          userId,
          businessInfo: (result.data as any).businessInfo,
          beneficialOwners: (result.data as any).beneficialOwners,
          directors: (result.data as any).directors,
          corporateDocuments: (result.data as any).documents.filter(
            (doc: any) => doc.type === 'corporate_structure' || doc.type === 'articles_of_incorporation'
          )
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Update workflow status
  static async updateWorkflowStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const kycId = req.params.kycId;
      const { workflowStatus, notes } = req.body;
      
      if (!kycId) {
        return res.status(400).json({
          success: false,
          error: 'KYC ID is required'
        });
      }

      if (!workflowStatus || !Object.values(ComplianceWorkflowStatus).includes(workflowStatus as ComplianceWorkflowStatus)) {
        return res.status(400).json({
          success: false,
          error: 'Valid workflow status is required'
        });
      }

      // Update workflow status
      const result = await kycService.updateWorkflowStatus(kycId, workflowStatus as ComplianceWorkflowStatus, req.user?.userId);
      
      if (!result.success) {
        return res.status(500).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Get pending workflows
  static async getPendingWorkflows(req: Request, res: Response, next: NextFunction) {
    try {
      // Get pending workflows
      const result = await kycService.getPendingWorkflows();
      
      if (!result.success) {
        return res.status(500).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Get pending reviews
  static async getPendingReviews(req: Request, res: Response, next: NextFunction) {
    try {
      // Get pending reviews
      const result = await kycService.getPendingReviews();
      
      if (!result.success) {
        return res.status(500).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Get high risk profiles
  static async getHighRiskProfiles(req: Request, res: Response, next: NextFunction) {
    try {
      // Get high risk profiles
      const result = await kycService.getHighRiskProfiles();
      
      if (!result.success) {
        return res.status(500).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Get risk summary report
  static async getRiskSummaryReport(req: Request, res: Response, next: NextFunction) {
    try {
      // Get risk summary report
      const result = await kycService.getRiskSummaryReport();
      
      if (!result.success) {
        return res.status(500).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Get compliance metrics
  static async getComplianceMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      // Get compliance metrics
      const result = await kycService.getComplianceMetrics();
      
      if (!result.success) {
        return res.status(500).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Get document status report
  static async getDocumentStatusReport(req: Request, res: Response, next: NextFunction) {
    try {
      // Get document status report
      const result = await kycService.getDocumentStatusReport();
      
      if (!result.success) {
        return res.status(500).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Get all registered users (new admin function)
  static async getAllUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await kycService.getAllUsers();
      
      if (!result.success) {
        return res.status(500).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Get all compliance documents (new admin function)
  static async getAllComplianceDocuments(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await kycService.getAllComplianceDocuments();
      
      if (!result.success) {
        return res.status(500).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Approve/Disapprove with note (new admin function)
  static async approveDisapproveUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const { status, note } = req.body;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      if (!status || !['approved', 'rejected'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Valid status (approved/rejected) is required'
        });
      }

      const result = await kycService.approveDisapproveUser(userId, status as 'approved' | 'rejected', note, req.user?.userId);
      
      if (!result.success) {
        const statusCode = result.error === 'User profile not found' ? 404 : 500;
        return res.status(statusCode).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Send message to user (new admin function)
  static async sendMessageToUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const { message } = req.body;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      if (!message) {
        return res.status(400).json({
          success: false,
          error: 'Message is required'
        });
      }

      const result = await kycService.sendMessageToUser(userId, message, req.user?.userId);
      
      if (!result.success) {
        return res.status(500).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Block user (new admin function)
  static async blockUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const { reason } = req.body;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      const result = await kycService.blockUser(userId, reason, req.user?.userId);
      
      if (!result.success) {
        return res.status(500).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Unblock user (new admin function)
  static async unblockUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      const result = await kycService.unblockUser(userId, req.user?.userId);
      
      if (!result.success) {
        return res.status(500).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Verify Certificate of Incorporation with CAC (new admin function)
  static async verifyCertificateWithCAC(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const { registrationNumber, companyName } = req.body;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      if (!registrationNumber || !companyName) {
        return res.status(400).json({
          success: false,
          error: 'Registration number and company name are required'
        });
      }

      const result = await kycService.verifyCertificateWithCAC(
        userId, 
        registrationNumber, 
        companyName, 
        req.user?.userId
      );
      
      if (!result.success) {
        return res.status(500).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Check sanctions for an individual or business
  static async checkSanctions(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, companyId, country } = req.body;
      
      // Validate input
      if (!name) {
        logger.warn('Sanctions check failed: name is required');
        return res.status(400).json({
          success: false,
          error: 'Name is required for sanctions check'
        });
      }
      
      // Prepare the request
      const sanctionsRequest: SanctionsCheckRequest = {
        name,
        companyId,
        country
      };
      
      // Perform the sanctions check
      const result = await sanctionsService.checkSanctions(sanctionsRequest);
      
      logger.info('Sanctions check completed', {
        name,
        companyId,
        country,
        flagged: result.flagged,
        matchCount: result.matches.length
      });
      
      // Return the result
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error during sanctions check', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return res.status(500).json({
        success: false,
        error: 'Internal server error during sanctions check'
      });
    }
  }

  // Get individual risk assessment
  static async getIndividualRiskAssessment(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }
      
      // Get KYC status which includes risk assessment
      const result = await kycService.getKYCStatus(userId, userId);
      
      if (!result.success) {
        return res.status(404).json(result);
      }
      
      return res.status(200).json({
        success: true,
        data: {
          riskLevel: result.data?.riskLevel,
          riskAssessment: (result.data as any).riskAssessment
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Update personal info for individual
  static async updatePersonalInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }
      
      const result = await kycService.updatePersonalInfo(userId, req.body);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      logger.info('Personal info updated successfully', { userId });
      
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Get enhanced verification status
  static async getEnhancedVerificationStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }
      
      const result = await kycService.getEnhancedDueDiligence(userId);
      
      if (!result.success) {
        return res.status(404).json(result);
      }
      
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /** Internal: wallet-ms Payonus — retail user BVN from Fuspay KYC webhook. */
  static async getUserBvnForPayonusInternal(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const result = await kycService.getUserBvnForPayonusInternal(userId || '');
      if (result.success && result.bvn) {
        return res.status(200).json({ success: true, bvn: result.bvn });
      }
      return res.status(404).json({
        success: false,
        error: result.error || 'BVN not found'
      });
    } catch (error) {
      next(error);
    }
  }

  /** Internal: wallet-ms Payonus — first 11-digit BVN for merchant owner (client-auth user id). */
  static async getFirstShareholderBvnForPayonusInternal(req: Request, res: Response, next: NextFunction) {
    try {
      const { ownerUserId } = req.params;
      const result = await kycService.getFirstShareholderBvnForPayonusInternal(ownerUserId || '');
      if (result.success && result.bvn) {
        return res.status(200).json({ success: true, bvn: result.bvn });
      }
      return res.status(404).json({
        success: false,
        error: result.error || 'BVN not found'
      });
    } catch (error) {
      next(error);
    }
  }

  // Create shareholder data (legacy endpoint - use updateBeneficialOwners instead)
  static async createShareholderData(req: Request, res: Response, next: NextFunction) {
    try {
      const { merchantId } = req.params;
      
      if (!merchantId) {
        return res.status(400).json({
          success: false,
          error: 'Merchant ID is required'
        });
      }
      
      return res.status(400).json({
        success: false,
        error: 'This endpoint is deprecated. Use PUT /beneficial-owners to update shareholders.'
      });
    } catch (error) {
      next(error);
    }
  }

  // Get shareholder data
  static async getShareholderData(req: Request, res: Response, next: NextFunction) {
    try {
      const { merchantId } = req.params;
      
      if (!merchantId) {
        return res.status(400).json({
          success: false,
          error: 'Merchant ID is required'
        });
      }
      
      const result = await kycService.getShareholders(merchantId);
      
      if (!result.success) {
        return res.status(404).json(result);
      }
      
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Update shareholder data
  static async updateShareholderData(req: Request, res: Response, next: NextFunction) {
    try {
      const { merchantId } = req.params;
      
      if (!merchantId) {
        return res.status(400).json({
          success: false,
          error: 'Merchant ID is required'
        });
      }
      
      const result = await kycService.updateShareholders(merchantId, req.body);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      logger.info('Shareholder data updated successfully', { merchantId });
      
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export default KYCController;