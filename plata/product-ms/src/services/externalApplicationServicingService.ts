import mongoose from 'mongoose';
import {
  UserProductApplicationModel,
  toUserProductApplication
} from '../models/UserProductApplicationModel';
import { ApiError } from '../middleware/errorHandler';
import { UserProductApplicationService } from './userProductApplicationService';
import { enrichApplicationWithOfferLetter } from './offerLetterPresentationService';
import { resolveAmortizationScheduleForApplication } from './amortizationScheduleService';
import { resolveLoanApprovedAmount } from './loanDisbursementService';
import { resolveRequiredEquityContribution } from '../utils/lendingEquity';
import { normalizeProductType } from '../utils/productType';
import {
  buildExternalApplicationStatusView,
  buildExternalDepositAccountView,
  buildExternalLoanAccountView,
  isDepositProductType,
  isLendingProductType,
  type ExternalApplicationAccountView,
  type ExternalApplicationStatusView
} from '../utils/externalLoanServicingView';
import type { AmortizationScheduleView } from '../types/amortizationSchedule';
import type { UserProductApplication } from '../types/userProductApplication';

const LENDING_TYPES = new Set(['LOAN', 'MORTGAGE']);

export interface ExternalLoanOfferResponseInput {
  action: 'accept' | 'decline';
  acceptedTerms?: boolean;
  downPayment?: { amount: number; providerReference: string };
}

export interface ExternalLoanOfferView {
  status: ExternalApplicationStatusView;
  offerStatus: 'not_sent' | 'pending' | 'accepted' | 'declined';
  offerLetter?: {
    reference: string;
    offerValidUntil: string;
    pdfUrl?: string;
    pdfFileName?: string;
    signedPdfUrl?: string;
    signedPdfFileName?: string;
    text: string;
    html: string;
  };
}

export class ExternalApplicationServicingService {
  constructor(private readonly applicationService = new UserProductApplicationService()) {}

  /**
   * Accepts either the Plata application id or the caller's own localApplicationId,
   * and only returns applications submitted with the calling merchant's API keys.
   */
  async resolveOwnedApplication(merchantId: string, reference: string): Promise<UserProductApplication> {
    const ref = reference.trim();
    if (!ref) {
      throw new ApiError(400, 'applicationId is required');
    }

    const byId = mongoose.isValidObjectId(ref)
      ? await UserProductApplicationModel.findOne({ _id: ref, externalPlatformMerchantId: merchantId }).lean()
      : null;
    const doc =
      byId ??
      (await UserProductApplicationModel.findOne({
        localApplicationId: ref,
        externalPlatformMerchantId: merchantId
      })
        .sort({ createdAt: -1 })
        .lean());

    if (!doc) {
      throw new ApiError(404, 'Application not found for this merchant');
    }
    return toUserProductApplication(doc as unknown as Record<string, unknown>);
  }

  async getStatus(merchantId: string, reference: string): Promise<ExternalApplicationStatusView> {
    const application = await this.resolveOwnedApplication(merchantId, reference);
    return this.buildStatus(application);
  }

  async getOffer(merchantId: string, reference: string): Promise<ExternalLoanOfferView> {
    const application = await this.resolveOwnedApplication(merchantId, reference);
    this.assertLoan(application);
    return this.buildOffer(application);
  }

  async respondToOffer(
    merchantId: string,
    reference: string,
    input: ExternalLoanOfferResponseInput
  ): Promise<ExternalLoanOfferView> {
    const application = await this.resolveOwnedApplication(merchantId, reference);
    this.assertLoan(application);

    const updated =
      input.action === 'accept' && input.downPayment
        ? await this.applicationService.payLoanDownPaymentAndAccept(application.id, application.userId, {
            amount: input.downPayment.amount,
            providerReference: input.downPayment.providerReference,
            acceptedTerms: true
          })
        : await this.applicationService.respondToLoanOffer(application.id, application.userId, {
            action: input.action,
            acceptedTerms: input.acceptedTerms
          });

    return this.buildOffer(updated);
  }

  async getAccount(merchantId: string, reference: string): Promise<ExternalApplicationAccountView> {
    const application = await this.resolveOwnedApplication(merchantId, reference);
    const status = this.buildStatus(application);
    const productType = normalizeProductType(String(application.productType));

    if (isDepositProductType(productType)) {
      return buildExternalDepositAccountView(application, { stage: status.stage });
    }

    if (!isLendingProductType(productType)) {
      throw new ApiError(400, `Account details are not available for product type ${productType}`);
    }

    const schedule = application.loanDisbursement?.amount
      ? await resolveAmortizationScheduleForApplication(application)
      : null;
    return buildExternalLoanAccountView(application, {
      stage: status.stage,
      approvedAmount: status.approvedAmount,
      schedule
    });
  }

  async getRepaymentSchedule(merchantId: string, reference: string): Promise<AmortizationScheduleView> {
    const application = await this.resolveOwnedApplication(merchantId, reference);
    this.assertLending(application);
    if (!application.loanDisbursement?.amount) {
      const { stage } = this.buildStatus(application);
      throw new ApiError(
        409,
        `The repayment schedule is created when the loan is disbursed. Current stage: ${stage}`
      );
    }
    const schedule = await resolveAmortizationScheduleForApplication(application);
    if (!schedule) {
      throw new ApiError(503, 'Repayment schedule is temporarily unavailable; retry shortly');
    }
    return schedule;
  }

  private buildStatus(application: UserProductApplication): ExternalApplicationStatusView {
    const productType = normalizeProductType(String(application.productType));
    const approvedAmount = LENDING_TYPES.has(productType)
      ? resolveLoanApprovedAmount(application, application.approvedLoanAmount)
      : undefined;
    const downPaymentRequiredAmount = LENDING_TYPES.has(productType)
      ? application.equityPayment?.requiredAmount ??
        resolveRequiredEquityContribution(application.contractSnapshot ?? {}, productType, approvedAmount)
          .requiredAmount
      : 0;
    return buildExternalApplicationStatusView(application, { approvedAmount, downPaymentRequiredAmount });
  }

  private async buildOffer(application: UserProductApplication): Promise<ExternalLoanOfferView> {
    const status = this.buildStatus(application);
    const fulfillment = application.postApprovalFulfillment;
    const offerStatus: ExternalLoanOfferView['offerStatus'] =
      fulfillment?.status === 'offer_declined'
        ? 'declined'
        : fulfillment?.offer?.acceptedAt || fulfillment?.status === 'offer_accepted' || fulfillment?.status === 'disbursed'
          ? 'accepted'
          : fulfillment?.offer?.sentAt
            ? 'pending'
            : 'not_sent';

    if (offerStatus === 'not_sent') {
      return { status, offerStatus };
    }

    const enriched = await enrichApplicationWithOfferLetter(application);
    const letter = enriched.offerLetter;
    return {
      status,
      offerStatus,
      ...(letter
        ? {
            offerLetter: {
              reference: letter.reference,
              offerValidUntil: letter.offerValidUntil,
              ...(letter.pdfUrl ? { pdfUrl: letter.pdfUrl } : {}),
              ...(letter.pdfFileName ? { pdfFileName: letter.pdfFileName } : {}),
              ...(letter.signedPdfUrl ? { signedPdfUrl: letter.signedPdfUrl } : {}),
              ...(letter.signedPdfFileName ? { signedPdfFileName: letter.signedPdfFileName } : {}),
              text: letter.text,
              html: letter.html
            }
          }
        : {})
    };
  }

  private assertLoan(application: UserProductApplication): void {
    if (normalizeProductType(String(application.productType)) !== 'LOAN') {
      throw new ApiError(400, 'Loan offer endpoints apply only to LOAN applications');
    }
  }

  private assertLending(application: UserProductApplication): void {
    if (!LENDING_TYPES.has(normalizeProductType(String(application.productType)))) {
      throw new ApiError(400, 'Loan account endpoints apply only to LOAN and MORTGAGE applications');
    }
  }
}
