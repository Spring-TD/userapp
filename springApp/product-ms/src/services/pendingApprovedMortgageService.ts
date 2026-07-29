import mongoose from 'mongoose';
import { ApiError } from '../middleware/errorHandler';
import {
  ProductApplicationModel,
  toProductApplication,
  type IProductApplicationDocument
} from '../models/ProductApplicationModel';
import type {
  PendingApprovedMortgageDetail,
  PostApprovalFulfillment,
  ProductApplication
} from '../types/productApplication';
import {
  fetchUpstreamPendingApprovedMortgage,
  proxyCompleteMortgageInspection,
  proxyMortgageDownPayment,
  proxyRespondToMortgageOffer,
  proxyScheduleMortgageInspection,
  proxySignMortgageContract,
  proxyStartMortgageInspection,
  type UpstreamPendingApprovedMortgage
} from './pendingApprovedMortgageClient';
import { proxyUploadSignedMortgageContract } from './pendingApprovedMultipartClient';
import { buildOfferLetterForProductApplication } from './offerLetterPresentationService';

const ACTIVE_STATUSES = [
  'offer_pending',
  'offer_accepted',
  'appointment_scheduled',
  'inspection_in_progress',
  'down_payment_pending',
  'down_payment_paid',
  'down_payment_confirmed',
  'contract_issued',
  'contract_signed'
];

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
  upstream: UpstreamPendingApprovedMortgage
): void {
  const fulfillment = fulfillmentFromUpstream(upstream.postApprovalFulfillment);
  if (fulfillment) {
    application.postApprovalFulfillment = fulfillment;
    application.disbursementDeferred = fulfillment.disbursementDeferred ?? fulfillment.status !== 'disbursed';
  }
}

function buildEquityPaymentReference(upstreamApplicationId?: string): string | undefined {
  if (!upstreamApplicationId?.trim()) {
    return undefined;
  }
  return `equity-payment:${upstreamApplicationId.trim()}`;
}

class PendingApprovedMortgageService {
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
    if (String(application.productType).toUpperCase() !== 'MORTGAGE') {
      throw new ApiError(400, 'Pending approved mortgage flow applies only to MORTGAGE applications');
    }
    if (application.loanWorkflowStatus !== 'approved') {
      throw new ApiError(400, 'Application is not in approved mortgage workflow');
    }

    return application;
  }

  async listForUser(userId: string): Promise<ProductApplication[]> {
    const rows = await ProductApplicationModel.find({
      userId,
      productType: 'MORTGAGE',
      loanWorkflowStatus: 'approved',
      'postApprovalFulfillment.status': { $in: ACTIVE_STATUSES }
    })
      .sort({ updatedAt: -1 })
      .exec();

    return rows.map((row) => toProductApplication(row));
  }

  async getDetail(applicationId: string, userId: string): Promise<PendingApprovedMortgageDetail> {
    const application = await this.loadOwnedApplication(applicationId, userId);
    const fulfillment = application.postApprovalFulfillment;
    const requiredAmount = fulfillment?.downPayment?.requiredAmount;
    const currency = fulfillment?.downPayment?.currency ?? application.currency;
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
      requiredAmount,
      currency,
      centralWalletAvailable: true,
      bankDetails: {
        merchantReference: buildEquityPaymentReference(application.upstreamApplicationId)
      },
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
    userId: string,
    action: () => Promise<UpstreamPendingApprovedMortgage>
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
      this.proxyAndMirror(application, userId, () =>
        proxyRespondToMortgageOffer(application._id.toString(), {
          ...input,
          springUserId: userId
        })
      )
    );
  }

  scheduleAppointment(
    applicationId: string,
    userId: string,
    input: { scheduledFor: string; notes?: string; location?: string }
  ): Promise<ProductApplication> {
    return this.loadOwnedApplication(applicationId, userId).then((application) =>
      this.proxyAndMirror(application, userId, () =>
        proxyScheduleMortgageInspection(application._id.toString(), {
          ...input,
          springUserId: userId
        })
      )
    );
  }

  startInspection(applicationId: string, userId: string): Promise<ProductApplication> {
    return this.loadOwnedApplication(applicationId, userId).then((application) =>
      this.proxyAndMirror(application, userId, () =>
        proxyStartMortgageInspection(application._id.toString(), userId)
      )
    );
  }

  completeInspection(
    applicationId: string,
    userId: string,
    input: { outcome: 'completed' | 'declined_offer' }
  ): Promise<ProductApplication> {
    return this.loadOwnedApplication(applicationId, userId).then((application) =>
      this.proxyAndMirror(application, userId, () =>
        proxyCompleteMortgageInspection(application._id.toString(), {
          ...input,
          springUserId: userId
        })
      )
    );
  }

  signContract(
    applicationId: string,
    userId: string,
    input: { acceptedTerms: boolean }
  ): Promise<ProductApplication> {
    return this.loadOwnedApplication(applicationId, userId).then((application) =>
      this.proxyAndMirror(application, userId, () =>
        proxySignMortgageContract(application._id.toString(), {
          acceptedTerms: input.acceptedTerms,
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
      this.proxyAndMirror(application, userId, () =>
        proxyUploadSignedMortgageContract(application._id.toString(), file)
      )
    );
  }

  async payDownPayment(
    applicationId: string,
    userId: string,
    amount?: number
  ): Promise<PendingApprovedMortgageDetail> {
    const application = await this.loadOwnedApplication(applicationId, userId);
    await this.proxyAndMirror(application, userId, () =>
      proxyMortgageDownPayment(application._id.toString(), {
        amount,
        springUserId: userId
      })
    );

    try {
      const upstream = await fetchUpstreamPendingApprovedMortgage(application._id.toString());
      syncFulfillmentFromUpstream(application, upstream);
      await application.save();
    } catch {
      // Best-effort refresh after wallet debit.
    }

    return this.getDetail(applicationId, userId);
  }
}

export default new PendingApprovedMortgageService();
