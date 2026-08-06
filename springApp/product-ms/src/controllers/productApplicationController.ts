import { Request, Response } from 'express';
import crypto from 'crypto';
import { config } from '../config/environment';
import { ApiError } from '../middleware/errorHandler';
import productApplicationService from '../services/productApplicationService';
import applicantProfileService from '../services/applicantProfileService';
import pendingApprovedMortgageService from '../services/pendingApprovedMortgageService';
import pendingApprovedLoanService from '../services/pendingApprovedLoanService';
import {
  resolveLoanChargeOnProductTransfer,
  collectLoanChargeOnProductTransfer
} from '../services/settlement/loanTransferSettlementService';
import productTransferOutService from '../services/productTransferOutService';
import {
  isSpacesConfigured,
  uploadToSpaces,
  validateApplicationDocumentUpload
} from '../services/spacesService';
import type {
  ApplicationListQuery,
  CreateApplicationGuarantorRequest,
  CreateApplicationSpouseKycRequest,
  CreateProductApplicationRequest,
  ProductApplicationStatus,
  SaveProductApplicationProgressRequest,
  SubmitProductApplicationRequest,
  SubmitProductApplicationRequirementsRequest,
  UpdateProductApplicationStatusRequest
} from '../types/productApplication';
import type { ApplicationAuthRequest } from '../middleware/applicationAuth';
import { getAccessTokenUser } from '../utils/gatewayUser';

class ProductApplicationController {
  getPlataLoanWorkflowWebhookStatus = async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json({
      success: true,
      message: 'Plata loan workflow webhook endpoint is active. Send POST requests with loan_workflow_status.updated events.',
      endpoint: '/api/v1/applications/webhooks/plata/loan-workflow',
      methods: ['GET', 'POST']
    });
  };

  getPlataGuarantorKycWebhookStatus = async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json({
      success: true,
      message: 'Plata guarantor KYC webhook endpoint is active. Send POST requests with guarantor_kyc.approved or guarantor_kyc.applicant_reported events.',
      endpoint: '/api/v1/applications/webhooks/plata/guarantor-kyc',
      methods: ['GET', 'POST']
    });
  };

  handlePlataLoanWorkflowWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!this.verifyPlataWebhookSignature(req)) {
        throw new ApiError(401, 'Invalid Plata webhook signature');
      }

      const result = await productApplicationService.applyPlataLoanWorkflowWebhook(req.body);

      res.status(result.ignored ? 202 : 200).json({
        success: true,
        duplicate: result.duplicate,
        ignored: result.ignored === true,
        data: result.application
      });
    } catch (error) {
      this.handleError(error, res, 'Error processing Plata loan workflow webhook');
    }
  };

  handlePlataGuarantorKycWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!this.verifyPlataWebhookSignature(req)) {
        throw new ApiError(401, 'Invalid Plata webhook signature');
      }

      const result = await productApplicationService.applyPlataGuarantorKycWebhook(req.body);

      res.status(result.ignored ? 202 : 200).json({
        success: true,
        duplicate: result.duplicate,
        ignored: result.ignored === true,
        notified: result.notified === true
      });
    } catch (error) {
      this.handleError(error, res, 'Error processing Plata guarantor KYC webhook');
    }
  };

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
      const application = await productApplicationService.createApplication(body, req.get('authorization'));

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
      const result = await productApplicationService.initializeApplication(body, req.get('authorization'));

      res.status(result.created ? 201 : 200).json({
        success: true,
        message: result.created
          ? 'Application initialized. Bank account created; continue with requirements.'
          : 'Application already initialized. Continue with requirements.',
        data: result.application
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

  saveProgress = async (req: Request, res: Response): Promise<void> => {
    try {
      const body = (req.validatedBody ?? req.body) as SaveProductApplicationProgressRequest;
      const application = await productApplicationService.saveProgress(req.params.id, body);

      res.json({
        success: true,
        message: 'Application progress saved.',
        data: application
      });
    } catch (error) {
      this.handleError(error, res, 'Error saving product application progress');
    }
  };

  createGuarantor = async (req: Request, res: Response): Promise<void> => {
    try {
      const body = (req.validatedBody ?? req.body) as CreateApplicationGuarantorRequest;
      const result = await productApplicationService.createGuarantor(req.params.id, body);

      if (result.alreadyAdded) {
        res.status(200).json({
          success: true,
          alreadyAdded: true,
          message: 'Guarantor already added for this application.',
          data: {
            application: result.application,
            guarantor: result.guarantor,
            guarantors: result.guarantors
          }
        });
        return;
      }

      res.status(201).json({
        success: true,
        alreadyAdded: false,
        message: 'Guarantor KYC verification link created.',
        data: {
          application: result.application,
          guarantor: result.guarantor,
          guarantors: result.guarantors
        }
      });
    } catch (error) {
      this.handleError(error, res, 'Error creating guarantor KYC verification');
    }
  };

  createSpouseKyc = async (req: Request, res: Response): Promise<void> => {
    try {
      const body = (req.validatedBody ?? req.body) as CreateApplicationSpouseKycRequest;
      const result = await productApplicationService.createSpouseKyc(req.params.id, body);

      res.status(201).json({
        success: true,
        message: 'Spouse KYC verification link created.',
        data: result,
        verificationUrl: result.spouse.verificationUrl
      });
    } catch (error) {
      this.handleError(error, res, 'Error creating spouse KYC verification');
    }
  };

  handleInternalGuarantorKycCompleted = async (req: Request, res: Response): Promise<void> => {
    try {
      const body = (req.body || {}) as { applicationId?: string; guarantorId?: string };
      const applicationId = typeof body.applicationId === 'string' ? body.applicationId.trim() : '';
      const guarantorId = typeof body.guarantorId === 'string' ? body.guarantorId.trim() : '';
      if (!applicationId || !guarantorId) {
        throw new ApiError(400, 'applicationId and guarantorId are required');
      }

      const result = await productApplicationService.handleGuarantorKycCompleted(applicationId, guarantorId);
      res.status(result.duplicate ? 200 : 201).json({
        success: true,
        duplicate: result.duplicate,
        notified: result.notified
      });
    } catch (error) {
      this.handleError(error, res, 'Error processing guarantor KYC completion');
    }
  };

  resolveLoanChargeOnProductTransfer = async (req: Request, res: Response): Promise<void> => {
    try {
      const applicationId = String(req.params.applicationId || '').trim();
      const body = (req.body || {}) as { userId?: string };
      const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
      if (!applicationId || !userId) {
        throw new ApiError(400, 'applicationId and userId are required');
      }

      const result = await resolveLoanChargeOnProductTransfer({ applicationId, userId });
      if ('error' in result) {
        const status = result.error.includes('not found') ? 404 : 400;
        res.status(status).json({ success: false, error: result.error });
        return;
      }

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      this.handleError(error, res, 'Error resolving loan charge on product transfer');
    }
  };

  collectLoanChargeOnProductTransfer = async (req: Request, res: Response): Promise<void> => {
    try {
      const applicationId = String(req.params.applicationId || '').trim();
      const body = (req.body || {}) as { userId?: string };
      const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
      if (!applicationId || !userId) {
        throw new ApiError(400, 'applicationId and userId are required');
      }

      const result = await collectLoanChargeOnProductTransfer({ applicationId, userId });

      if (result.insufficientFunds) {
        res.status(402).json({
          success: false,
          error: result.error || 'Insufficient balance in primary wallet for loan charge',
          code: 'INSUFFICIENT_USER_WALLET_BALANCE',
          data: { skipped: result.skipped, skippedReason: result.skippedReason }
        });
        return;
      }

      if (!result.success && !result.skipped) {
        const status = result.error?.includes('not found') ? 404 : 400;
        res.status(status).json({
          success: false,
          error: result.error || 'Failed to collect loan charge on product transfer'
        });
        return;
      }

      res.status(result.duplicate ? 200 : 201).json({
        success: true,
        duplicate: result.duplicate === true,
        skipped: result.skipped === true,
        skippedReason: result.skippedReason,
        data: { transactionId: result.transactionId }
      });
    } catch (error) {
      this.handleError(error, res, 'Error collecting loan charge on product transfer');
    }
  };

  applyProductTransferOut = async (req: Request, res: Response): Promise<void> => {
    try {
      const applicationId = String(req.params.applicationId || '').trim();
      const body = (req.body || {}) as {
        userId?: string;
        amount?: number;
        referenceId?: string;
        description?: string;
      };
      const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
      const amount = typeof body.amount === 'number' ? body.amount : Number(body.amount);
      if (!applicationId || !userId) {
        throw new ApiError(400, 'applicationId and userId are required');
      }
      if (!(amount > 0) || !Number.isFinite(amount)) {
        throw new ApiError(400, 'amount must be a positive number');
      }

      const result = await productTransferOutService.applyTransferOut(applicationId, {
        userId,
        amount,
        referenceId: typeof body.referenceId === 'string' ? body.referenceId : undefined,
        description: typeof body.description === 'string' ? body.description : undefined
      });

      res.status(200).json({
        success: true,
        duplicate: result.duplicate,
        data: {
          application: result.application,
          balance: result.balance
        }
      });
    } catch (error) {
      this.handleError(error, res, 'Error applying product transfer-out to application snapshot');
    }
  };

  syncProductWalletBalance = async (req: Request, res: Response): Promise<void> => {
    try {
      const applicationId = String(req.params.applicationId || '').trim();
      if (!applicationId) {
        throw new ApiError(400, 'applicationId is required');
      }

      const result = await productTransferOutService.syncProductWalletBalance(applicationId);

      res.status(200).json({
        success: true,
        duplicate: result.duplicate,
        data: {
          application: result.application,
          walletId: result.walletId,
          ledgerBalance: result.ledgerBalance,
          walletBalanceBefore: result.walletBalanceBefore,
          credited: result.credited
        }
      });
    } catch (error) {
      this.handleError(error, res, 'Error syncing product wallet balance');
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

  getInternalApplicantProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const localApplicationId = String(req.params.localApplicationId || '').trim();
      const plataApplicationId =
        typeof req.query.plataApplicationId === 'string' ? req.query.plataApplicationId.trim() : undefined;
      const offeringMerchantId =
        typeof req.query.offeringMerchantId === 'string' ? req.query.offeringMerchantId.trim() : undefined;

      const data = await applicantProfileService.buildApplicantProfile({
        localApplicationId,
        plataApplicationId,
        offeringMerchantId
      });

      res.status(200).json({ success: true, data });
    } catch (error) {
      this.handleError(error, res, 'Error building internal applicant profile');
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
      const result = await productApplicationService.listApplications(
        this.listQueryFromRequest(req)
      );

      res.json({
        success: true,
        data: result.applications,
        pagination: result.pagination
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
      const query = this.listQueryFromRequest(req);
      const result = await productApplicationService.listApplications({
        ...query,
        merchantId: (req as ApplicationAuthRequest).applicationsMerchantIdFilter ?? query.merchantId,
        status: 'PENDING'
      });

      res.json({
        success: true,
        data: result.applications,
        pagination: result.pagination
      });
    } catch (error) {
      this.handleError(error, res, 'Error listing pending product applications');
    }
  };

  listUserApplications = async (req: Request, res: Response): Promise<void> => {
    try {
      const query = this.listQueryFromRequest(req);
      query.userId = req.params.userId;
      const result = await productApplicationService.listApplications(query);

      res.json({
        success: true,
        data: result.applications,
        pagination: result.pagination
      });
    } catch (error) {
      this.handleError(error, res, 'Error listing user product applications');
    }
  };

  getUserApprovedAmountSummary = async (req: Request, res: Response): Promise<void> => {
    try {
      const appId =
        typeof req.query.appId === 'string' && req.query.appId.trim()
          ? req.query.appId.trim()
          : undefined;
      const summary = await productApplicationService.summarizeApprovedAmountsForUser(
        req.params.userId,
        appId
      );

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      this.handleError(error, res, 'Error summarizing approved user applications');
    }
  };

  getUserProductInitStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, productId } = req.params;
      const merchantId = typeof req.query.merchantId === 'string' ? req.query.merchantId.trim() : undefined;
      const appId = typeof req.query.appId === 'string' ? req.query.appId.trim() : undefined;

      const status = await productApplicationService.getInitStatus({
        userId,
        productId,
        ...(merchantId ? { merchantId } : {}),
        ...(appId ? { appId } : {})
      });

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      this.handleError(error, res, 'Error getting product application init status');
    }
  };

  updateApplicationStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const body = (req.validatedBody ?? req.body) as UpdateProductApplicationStatusRequest;
      if (body.status !== 'BLACKLISTED') {
        throw new ApiError(400, 'SpringApp does not approve or reject loan applications locally. Use Plata loan workflow.');
      }
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
      productId: typeof req.query.productId === 'string' ? req.query.productId : undefined,
      appId,
      status: this.statusQuery(req.query.status),
      productType: typeof req.query.productType === 'string' ? req.query.productType : undefined,
      page: this.positiveIntegerQuery(req.query.page),
      limit: this.positiveIntegerQuery(req.query.limit)
    };
  }

  private positiveIntegerQuery(value: unknown): number | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
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

  listPendingApprovedMortgages = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = String(req.params.userId ?? '').trim();
      if (!userId) {
        throw new ApiError(400, 'userId is required');
      }
      const data = await pendingApprovedMortgageService.listForUser(userId);
      res.status(200).json({ success: true, data });
    } catch (error) {
      this.handleError(error, res, 'Error listing pending approved mortgages');
    }
  };

  getPendingApprovedMortgage = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = String(req.query.userId ?? '').trim();
      if (!userId) {
        throw new ApiError(400, 'userId query parameter is required');
      }
      const data = await pendingApprovedMortgageService.getDetail(req.params.id, userId);
      res.status(200).json({ success: true, data });
    } catch (error) {
      this.handleError(error, res, 'Error getting pending approved mortgage');
    }
  };

  respondToPendingMortgageOffer = async (req: Request, res: Response): Promise<void> => {
    try {
      const body = req.validatedBody as {
        userId: string;
        action: 'accept' | 'decline';
        acceptedTerms?: boolean;
      };
      const data = await pendingApprovedMortgageService.respondToOffer(req.params.id, body.userId, {
        action: body.action,
        acceptedTerms: body.acceptedTerms
      });
      res.status(200).json({ success: true, data });
    } catch (error) {
      this.handleError(error, res, 'Error responding to mortgage offer');
    }
  };

  schedulePendingMortgageInspection = async (req: Request, res: Response): Promise<void> => {
    try {
      const body = req.validatedBody as {
        userId: string;
        scheduledFor: string;
        notes?: string;
        location?: string;
      };
      const data = await pendingApprovedMortgageService.scheduleAppointment(req.params.id, body.userId, body);
      res.status(200).json({ success: true, data });
    } catch (error) {
      this.handleError(error, res, 'Error scheduling mortgage inspection');
    }
  };

  startPendingMortgageInspection = async (req: Request, res: Response): Promise<void> => {
    try {
      const body = req.validatedBody as { userId: string };
      const data = await pendingApprovedMortgageService.startInspection(req.params.id, body.userId);
      res.status(200).json({ success: true, data });
    } catch (error) {
      this.handleError(error, res, 'Error starting mortgage inspection');
    }
  };

  completePendingMortgageVirtualInspection = async (req: Request, res: Response): Promise<void> => {
    try {
      const body = req.validatedBody as { userId: string; notes?: string };
      const data = await pendingApprovedMortgageService.completeVirtualInspection(
        req.params.id,
        body.userId,
        { notes: body.notes }
      );
      res.status(200).json({
        success: true,
        message: 'Virtual inspection completed',
        data
      });
    } catch (error) {
      this.handleError(error, res, 'Error completing mortgage virtual inspection');
    }
  };

  completePendingMortgageInspection = async (req: Request, res: Response): Promise<void> => {
    try {
      const body = req.validatedBody as { userId: string; outcome: 'completed' | 'declined_offer' };
      const data = await pendingApprovedMortgageService.completeInspection(req.params.id, body.userId, {
        outcome: body.outcome
      });
      res.status(200).json({ success: true, data });
    } catch (error) {
      this.handleError(error, res, 'Error completing mortgage inspection');
    }
  };

  signPendingMortgageContract = async (req: Request, res: Response): Promise<void> => {
    try {
      const body = req.validatedBody as { userId: string; acceptedTerms: boolean };
      const data = await pendingApprovedMortgageService.signContract(req.params.id, body.userId, {
        acceptedTerms: body.acceptedTerms
      });
      res.status(200).json({ success: true, data });
    } catch (error) {
      this.handleError(error, res, 'Error signing mortgage contract');
    }
  };

  uploadPendingMortgageSignedContract = async (req: Request & { file?: any }, res: Response): Promise<void> => {
    try {
      const userId = String(req.body?.userId ?? '').trim();
      if (!userId) {
        res.status(400).json({ success: false, error: 'userId is required' });
        return;
      }
      if (!req.file?.buffer) {
        res.status(400).json({ success: false, error: 'No file uploaded. Send a single PDF in the "file" field.' });
        return;
      }

      const data = await pendingApprovedMortgageService.uploadSignedContract(req.params.id, userId, {
        buffer: req.file.buffer,
        fileName: req.file.originalname || 'signed-contract.pdf',
        mimeType: req.file.mimetype || 'application/pdf'
      });
      res.status(200).json({ success: true, data });
    } catch (error) {
      this.handleError(error, res, 'Error uploading signed mortgage contract');
    }
  };

  payPendingMortgageDownPayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const body = req.validatedBody as { userId: string; amount?: number };
      const data = await pendingApprovedMortgageService.payDownPayment(
        req.params.id,
        body.userId,
        body.amount
      );
      res.status(200).json({ success: true, data });
    } catch (error) {
      this.handleError(error, res, 'Error paying mortgage down payment');
    }
  };

  listPendingApprovedLoans = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = String(req.params.userId ?? '').trim();
      if (!userId) {
        throw new ApiError(400, 'userId is required');
      }
      const data = await pendingApprovedLoanService.listForUser(userId);
      res.status(200).json({ success: true, data });
    } catch (error) {
      this.handleError(error, res, 'Error listing pending approved loans');
    }
  };

  getPendingApprovedLoan = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = String(req.query.userId ?? '').trim();
      if (!userId) {
        throw new ApiError(400, 'userId query parameter is required');
      }
      const data = await pendingApprovedLoanService.getDetail(req.params.id, userId);
      res.status(200).json({ success: true, data });
    } catch (error) {
      this.handleError(error, res, 'Error getting pending approved loan');
    }
  };

  respondToPendingLoanOffer = async (req: Request, res: Response): Promise<void> => {
    try {
      const body = req.validatedBody as {
        userId: string;
        action: 'accept' | 'decline';
        acceptedTerms?: boolean;
      };
      const data = await pendingApprovedLoanService.respondToOffer(req.params.id, body.userId, {
        action: body.action,
        acceptedTerms: body.acceptedTerms
      });
      res.status(200).json({ success: true, data });
    } catch (error) {
      this.handleError(error, res, 'Error responding to loan offer');
    }
  };

  payPendingLoanDownPayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const body = req.validatedBody as { userId: string; method: 'wallet' };
      const gatewayUser = getAccessTokenUser(req);
      if (!gatewayUser?.userId) {
        throw new ApiError(401, 'Valid user access token is required for loan down payment');
      }
      if (body.userId && body.userId !== gatewayUser.userId) {
        throw new ApiError(403, 'userId does not match the authenticated user');
      }
      const data = await pendingApprovedLoanService.payDownPayment(
        req.params.id,
        gatewayUser.userId
      );
      res.status(200).json({ success: true, data });
    } catch (error) {
      this.handleError(error, res, 'Error paying loan down payment');
    }
  };

  uploadPendingLoanSignedContract = async (req: Request & { file?: any }, res: Response): Promise<void> => {
    try {
      const userId = String(req.body?.userId ?? '').trim();
      if (!userId) {
        res.status(400).json({ success: false, error: 'userId is required' });
        return;
      }
      if (!req.file?.buffer) {
        res.status(400).json({ success: false, error: 'No file uploaded. Send a single PDF in the "file" field.' });
        return;
      }

      const data = await pendingApprovedLoanService.uploadSignedContract(req.params.id, userId, {
        buffer: req.file.buffer,
        fileName: req.file.originalname || 'signed-contract.pdf',
        mimeType: req.file.mimetype || 'application/pdf'
      });
      res.status(200).json({ success: true, data });
    } catch (error) {
      this.handleError(error, res, 'Error uploading signed loan contract');
    }
  };

  private verifyPlataWebhookSignature(req: Request): boolean {
    const secret = config.plataLoanWorkflowWebhookSecret;
    if (!secret) {
      return true;
    }

    const incoming = req.get('x-plata-signature')?.trim();
    if (!incoming) {
      return false;
    }

    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
    if (!rawBody) {
      return false;
    }

    const hmac = crypto.createHmac('sha256', secret).update(rawBody);
    const hexDigest = hmac.digest('hex');
    const base64Digest = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
    return this.signatureMatches(incoming, hexDigest) || this.signatureMatches(incoming, base64Digest);
  }

  private signatureMatches(incoming: string, expectedDigest: string): boolean {
    const normalizedIncoming = incoming.replace(/^sha256=/i, '').trim();
    const expected = Buffer.from(expectedDigest);
    const actual = Buffer.from(normalizedIncoming);
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  }

  private handleError(error: unknown, res: Response, context: string): void {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message,
        ...(error.data !== undefined ? { data: error.data } : {})
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
