import { Request, Response } from 'express';
import crypto from 'crypto';
import { ApiError } from '../middleware/errorHandler';
import productApplicationService from '../services/productApplicationService';
import {
  isSpacesConfigured,
  uploadToSpaces,
  validateApplicationDocumentUpload
} from '../services/spacesService';
import type {
  ApplicationListQuery,
  CreateApplicationGuarantorRequest,
  CreateProductApplicationRequest,
  ProductApplicationStatus,
  SubmitProductApplicationRequest,
  SubmitProductApplicationRequirementsRequest,
  UpdateProductApplicationStatusRequest
} from '../types/productApplication';
import type { ApplicationAuthRequest } from '../middleware/applicationAuth';

class ProductApplicationController {
  uploadApplicationDocument = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file || !req.file.buffer) {
        throw new ApiError(400, 'No file uploaded. Send a single file in the "file" field.');
      }

      if (!isSpacesConfigured()) {
        throw new ApiError(503, 'Document upload is not configured (Spaces).');
      }

      const mimeType = req.file.mimetype || 'application/octet-stream';
      const fileSize = req.file.size ?? req.file.buffer.length;
      const validation = validateApplicationDocumentUpload(mimeType, fileSize);
      if (!validation.valid) {
        throw new ApiError(400, validation.error ?? 'Invalid file upload');
      }

      const userId = this.safePathSegment(
        typeof req.body.userId === 'string' && req.body.userId.trim() ? req.body.userId : 'anonymous'
      );
      const ext = req.file.originalname?.match(/\.[a-zA-Z0-9]+$/)?.[0] || (mimeType === 'application/pdf' ? '.pdf' : '.bin');
      const key = `product-applications/${userId}/${crypto.randomUUID()}${ext}`;
      const result = await uploadToSpaces(req.file.buffer, key, mimeType);

      res.status(200).json({
        success: true,
        url: result.url,
        key: result.key,
        fileName: req.file.originalname,
        fileType: mimeType,
        fileSize
      });
    } catch (error) {
      this.handleError(error, res, 'Error uploading product application document');
    }
  };

  createApplication = async (req: Request, res: Response): Promise<void> => {
    try {
      const body = (req.validatedBody ?? req.body) as CreateProductApplicationRequest;
      const application = await productApplicationService.createApplication(body);

      res.status(201).json({
        success: true,
        message: 'Application submitted successfully. Pending approval.',
        data: application
      });
    } catch (error) {
      this.handleError(error, res, 'Error creating product application');
    }
  };

  initializeApplication = async (req: Request, res: Response): Promise<void> => {
    try {
      const body = (req.validatedBody ?? req.body) as CreateProductApplicationRequest;
      const application = await productApplicationService.initializeApplication(body);

      res.status(201).json({
        success: true,
        message: 'Application initialized. Bank account created; continue with requirements.',
        data: application
      });
    } catch (error) {
      this.handleError(error, res, 'Error initializing product application');
    }
  };

  submitRequirements = async (req: Request, res: Response): Promise<void> => {
    try {
      const body = (req.validatedBody ?? req.body) as SubmitProductApplicationRequirementsRequest;
      const application = await productApplicationService.submitRequirements(req.params.id, body);

      res.json({
        success: true,
        message: 'Application requirements submitted.',
        data: application
      });
    } catch (error) {
      this.handleError(error, res, 'Error submitting product application requirements');
    }
  };

  createGuarantor = async (req: Request, res: Response): Promise<void> => {
    try {
      const body = (req.validatedBody ?? req.body) as CreateApplicationGuarantorRequest;
      const result = await productApplicationService.createGuarantor(req.params.id, body);

      res.status(201).json({
        success: true,
        message: 'Guarantor KYC verification link created.',
        data: result
      });
    } catch (error) {
      this.handleError(error, res, 'Error creating guarantor KYC verification');
    }
  };

  submitApplication = async (req: Request, res: Response): Promise<void> => {
    try {
      const body = (req.validatedBody ?? req.body) as SubmitProductApplicationRequest;
      const application = await productApplicationService.submitApplication(req.params.id, body);

      res.json({
        success: true,
        message: 'Application submitted for review.',
        data: application
      });
    } catch (error) {
      this.handleError(error, res, 'Error submitting product application');
    }
  };

  getApplicationById = async (req: Request, res: Response): Promise<void> => {
    try {
      const application = await productApplicationService.getApplicationById(req.params.id);
      if (!application) {
        throw new ApiError(404, 'Application not found');
      }

      res.json({
        success: true,
        data: application
      });
    } catch (error) {
      this.handleError(error, res, 'Error getting product application');
    }
  };

  listApplications = async (req: Request, res: Response): Promise<void> => {
    try {
      const applications = await productApplicationService.listApplications(
        this.listQueryFromRequest(req)
      );

      res.json({
        success: true,
        data: applications
      });
    } catch (error) {
      this.handleError(error, res, 'Error listing product applications');
    }
  };

  getApplicationsSummary = async (req: Request, res: Response): Promise<void> => {
    try {
      const summary = await productApplicationService.summarizeApplications(
        this.listQueryFromRequest(req)
      );

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      this.handleError(error, res, 'Error summarizing product applications');
    }
  };

  listPendingApplications = async (req: Request, res: Response): Promise<void> => {
    try {
      const applications = await productApplicationService.listApplications({
        merchantId: (req as ApplicationAuthRequest).applicationsMerchantIdFilter,
        status: 'PENDING'
      });

      res.json({
        success: true,
        data: applications
      });
    } catch (error) {
      this.handleError(error, res, 'Error listing pending product applications');
    }
  };

  listUserApplications = async (req: Request, res: Response): Promise<void> => {
    try {
      const query = this.listQueryFromRequest(req);
      query.userId = req.params.userId;
      const applications = await productApplicationService.listApplications(query);

      res.json({
        success: true,
        data: applications
      });
    } catch (error) {
      this.handleError(error, res, 'Error listing user product applications');
    }
  };

  approveApplication = async (req: Request, res: Response): Promise<void> => {
    try {
      const application = await productApplicationService.updateApplicationStatus(req.params.id, 'APPROVED');

      res.json({
        success: true,
        message: 'Application approved.',
        data: {
          application
        }
      });
    } catch (error) {
      this.handleError(error, res, 'Error approving product application');
    }
  };

  rejectApplication = async (req: Request, res: Response): Promise<void> => {
    try {
      const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';
      if (!reason) {
        throw new ApiError(400, 'Rejection reason is required');
      }

      const application = await productApplicationService.updateApplicationStatus(req.params.id, 'REJECTED', reason);

      res.json({
        success: true,
        message: 'Application rejected.',
        data: application
      });
    } catch (error) {
      this.handleError(error, res, 'Error rejecting product application');
    }
  };

  updateApplicationStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const body = (req.validatedBody ?? req.body) as UpdateProductApplicationStatusRequest;
      const application = await productApplicationService.updateApplicationStatus(
        req.params.id,
        body.status,
        body.reason
      );

      res.json({
        success: true,
        data: application
      });
    } catch (error) {
      this.handleError(error, res, 'Error updating product application status');
    }
  };

  private listQueryFromRequest(req: Request): ApplicationListQuery {
    const authReq = req as ApplicationAuthRequest;
    const appId =
      typeof req.query.appId === 'string' && req.query.appId.trim()
        ? req.query.appId.trim()
        : undefined;

    return {
      merchantId:
        authReq.applicationsMerchantIdFilter ??
        (typeof req.query.merchantId === 'string' ? req.query.merchantId : undefined),
      userId: typeof req.query.userId === 'string' ? req.query.userId : undefined,
      appId,
      status: this.statusQuery(req.query.status),
      productType: typeof req.query.productType === 'string' ? req.query.productType : undefined
    };
  }

  private statusQuery(value: unknown): ProductApplicationStatus | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }
    const normalized = value.trim().toUpperCase();
    if (
      normalized === 'PENDING' ||
      normalized === 'APPROVED' ||
      normalized === 'REJECTED' ||
      normalized === 'BLACKLISTED'
    ) {
      return normalized;
    }
    return undefined;
  }

  private safePathSegment(value: string): string {
    return value.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'anonymous';
  }

  private handleError(error: unknown, res: Response, context: string): void {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message
      });
      return;
    }

    console.error(context, error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

export default new ProductApplicationController();
