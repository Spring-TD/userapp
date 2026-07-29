import mongoose from 'mongoose';
import { ApiError } from '../middleware/errorHandler';
import {
  ProductApplicationModel,
  toProductApplication,
  type IProductApplicationDocument
} from '../models/ProductApplicationModel';
import type {
  PendingApprovedLoanDetail,
  PostApprovalFulfillment,
  ProductApplication
} from '../types/productApplication';
import {
  fetchUpstreamPendingApprovedLoan,
  proxyRespondToLoanOffer,
  type UpstreamPendingApprovedLoan
} from './pendingApprovedLoanClient';
import { proxyUploadSignedLoanContract } from './pendingApprovedMultipartClient';
import { buildOfferLetterForProductApplication } from './offerLetterPresentationService';

const ACTIVE_STATUSES = ['offer_pending', 'offer_accepted'];

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== undefined && value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function fulfillmentFromUpstream(value: unknown): PostApprovalFulfillment | undefined {
  const record = asRecord(value);
  if (!record || typeof record.status !== 'string') {
    return undefined;
  }
  return record as unknown as PostApprovalFulfillment;
}

function syncFulfillmentFromUpstream(
  application: IProductApplicationDocument,
  upstream: UpstreamPendingApprovedLoan
): void {
  const fulfillment = fulfillmentFromUpstream(upstream.postApprovalFulfillment);
  if (fulfillment) {
    application.postApprovalFulfillment = fulfillment;
    application.disbursementDeferred = fulfillment.disbursementDeferred ?? fulfillment.status !== 'disbursed';
  }

  if (upstream.loanDisbursement) {
    application.disbursementDeferred = false;
  }
}

class PendingApprovedLoanService {
  private async loadOwnedApplication(applicationId: string, userId: string): Promise<IProductApplicationDocument> {
    if (!mongoose.isValidObjectId(applicationId)) {
      throw new ApiError(404, 'Application not found');
    }

    const application = await ProductApplicationModel.findById(applicationId);
    if (!application) {
      throw new ApiError(404, 'Application not found');
    }
    if (application.userId !== userId) {
      throw new ApiError(403, 'Application does not belong to this user');
    }
    if (String(application.productType).toUpperCase() !== 'LOAN') {
      throw new ApiError(400, 'Pending approved loan flow applies only to LOAN applications');
    }
    if (application.loanWorkflowStatus !== 'approved') {
      throw new ApiError(400, 'Application is not in approved loan workflow');
    }

    return application;
  }

  async listForUser(userId: string): Promise<ProductApplication[]> {
    const rows = await ProductApplicationModel.find({
      userId,
      productType: 'LOAN',
      loanWorkflowStatus: 'approved',
      'postApprovalFulfillment.status': { $in: ACTIVE_STATUSES }
    })
      .sort({ updatedAt: -1 })
      .exec();

    return rows.map((row) => toProductApplication(row));
  }

  async getDetail(applicationId: string, userId: string): Promise<PendingApprovedLoanDetail> {
    const application = await this.loadOwnedApplication(applicationId, userId);
    const fulfillment = application.postApprovalFulfillment;
    const applicantName =
      application.customerName?.trim() ||
      application.applicantName?.trim() ||
      application.email?.split('@')[0] ||
      'Customer';
    const offerLetter = await buildOfferLetterForProductApplication(
      toProductApplication(application),
      applicantName
    );
    const merchantContract = fulfillment?.contract;

    return {
      application: toProductApplication(application),
      postApprovalFulfillment: fulfillment,
      approvedAmount: application.amount,
      equityRequiredAmount: fulfillment?.downPayment?.requiredAmount,
      currency: fulfillment?.downPayment?.currency ?? application.currency,
      centralWalletAvailable: true,
      offerLetter: {
        html: offerLetter.html,
        text: offerLetter.text,
        reference: offerLetter.content.reference,
        offerValidUntil: offerLetter.content.offerValidUntil,
        ...(merchantContract?.documentSource === 'merchant_upload' && merchantContract.documentUrl
          ? {
              pdfUrl: merchantContract.documentUrl,
              pdfFileName: merchantContract.documentFileName
            }
          : {}),
        ...(merchantContract?.signedDocumentUrl
          ? {
              signedPdfUrl: merchantContract.signedDocumentUrl,
              signedPdfFileName: merchantContract.signedDocumentFileName
            }
          : {})
      }
    };
  }

  private async proxyAndMirror(
    application: IProductApplicationDocument,
    action: () => Promise<UpstreamPendingApprovedLoan>
  ): Promise<ProductApplication> {
    if (!application.upstreamApplicationId) {
      throw new ApiError(409, 'Application is not linked to Plata upstream');
    }

    const upstream = await action();
    syncFulfillmentFromUpstream(application, upstream);
    await application.save();

    return toProductApplication(application);
  }

  respondToOffer(
    applicationId: string,
    userId: string,
    input: { action: 'accept' | 'decline'; acceptedTerms?: boolean }
  ): Promise<ProductApplication> {
    return this.loadOwnedApplication(applicationId, userId).then((application) =>
      this.proxyAndMirror(application, () =>
        proxyRespondToLoanOffer(application._id.toString(), {
          ...input,
          springUserId: userId
        })
      )
    );
  }

  uploadSignedContract(
    applicationId: string,
    userId: string,
    file: { buffer: Buffer; fileName: string; mimeType: string }
  ): Promise<ProductApplication> {
    return this.loadOwnedApplication(applicationId, userId).then((application) =>
      this.proxyAndMirror(application, () =>
        proxyUploadSignedLoanContract(application._id.toString(), file)
      )
    );
  }

  async refreshFromUpstream(applicationId: string, userId: string): Promise<PendingApprovedLoanDetail> {
    const application = await this.loadOwnedApplication(applicationId, userId);
    if (!application.upstreamApplicationId) {
      throw new ApiError(409, 'Application is not linked to Plata upstream');
    }

    try {
      const upstream = await fetchUpstreamPendingApprovedLoan(application._id.toString());
      syncFulfillmentFromUpstream(application, upstream);
      await application.save();
    } catch {
      // Best-effort refresh.
    }

    return this.getDetail(applicationId, userId);
  }
}

export default new PendingApprovedLoanService();
