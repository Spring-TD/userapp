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
  proxyLoanDownPayment,
  proxyRespondToLoanOffer,
  type UpstreamPendingApprovedLoan
} from './pendingApprovedLoanClient';
import { proxyUploadSignedLoanContract } from './pendingApprovedMultipartClient';
import { buildOfferLetterForProductApplication } from './offerLetterPresentationService';
import { collectToSettlementWallet } from './settlement/walletSettlementClient';
import { buildLoanOfferTerms } from '../utils/loanOfferTerms';

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
    let upstream: UpstreamPendingApprovedLoan | undefined;
    if (application.upstreamApplicationId) {
      try {
        upstream = await fetchUpstreamPendingApprovedLoan(application._id.toString());
        syncFulfillmentFromUpstream(application, upstream);
        await application.save();
      } catch {
        // Use the mirrored local state if Plata is temporarily unavailable.
      }
    }

    const fulfillment = application.postApprovalFulfillment;
    const upstreamApprovedAmount = Number(upstream?.approvedLoanAmount);
    const approvedAmount =
      Number.isFinite(upstreamApprovedAmount) && upstreamApprovedAmount > 0
        ? upstreamApprovedAmount
        : application.amount;
    const productApplication = toProductApplication(application);
    const applicantName =
      application.customerName?.trim() ||
      application.applicantName?.trim() ||
      application.email?.split('@')[0] ||
      'Customer';
    const offerLetter = await buildOfferLetterForProductApplication(
      { ...productApplication, amount: approvedAmount },
      applicantName
    );
    const merchantContract = fulfillment?.contract;
    const upstreamEquityPayment = asRecord(upstream?.equityPayment);
    const downPaymentPaid =
      upstreamEquityPayment?.status === 'paid' ||
      Boolean(fulfillment?.downPayment?.paidAt);
    const disbursement = asRecord(upstream?.loanDisbursement);

    return {
      application: productApplication,
      postApprovalFulfillment: fulfillment,
      approvedAmount,
      equityRequiredAmount: fulfillment?.downPayment?.requiredAmount,
      currency: fulfillment?.downPayment?.currency ?? application.currency,
      centralWalletAvailable: true,
      terms: buildLoanOfferTerms({
        approvedAmount,
        requiredDownPayment: fulfillment?.downPayment?.requiredAmount ?? 0,
        downPaymentPaid,
        contractSnapshot: application.contractSnapshot,
        disbursedAt:
          typeof disbursement?.disbursedAt === 'string'
            ? disbursement.disbursedAt
            : undefined
      }),
      offerLetter: {
        html: offerLetter.html,
        text: offerLetter.text,
        reference: offerLetter.content.reference,
        offerValidUntil: offerLetter.content.offerValidUntil,
        ...(merchantContract?.documentUrl
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

  async payDownPayment(
    applicationId: string,
    userId: string
  ): Promise<PendingApprovedLoanDetail> {
    const application = await this.loadOwnedApplication(applicationId, userId);
    if (!application.upstreamApplicationId) {
      throw new ApiError(409, 'Application is not linked to Plata upstream');
    }

    const upstream = await fetchUpstreamPendingApprovedLoan(application._id.toString());
    syncFulfillmentFromUpstream(application, upstream);
    const fulfillment = application.postApprovalFulfillment;
    if (!fulfillment?.offer?.sentAt || !fulfillment.contract?.documentUrl) {
      throw new ApiError(409, 'Offer letter has not been sent by the merchant');
    }
    if (fulfillment.status !== 'offer_pending' && fulfillment.status !== 'offer_accepted') {
      throw new ApiError(409, `Loan offer cannot be paid from status ${fulfillment.status}`);
    }
    const upstreamEquityPayment = asRecord(upstream.equityPayment);
    const alreadyPaid =
      upstreamEquityPayment?.status === 'paid' ||
      Boolean(fulfillment?.downPayment?.paidAt);
    const requiredAmount = fulfillment?.downPayment?.requiredAmount ?? 0;
    const amountDue = alreadyPaid ? 0 : requiredAmount;
    let providerReference: string | undefined;
    let walletResult: Awaited<ReturnType<typeof collectToSettlementWallet>> | undefined;

    if (amountDue > 0) {
      if (!application.merchantId || !application.appId) {
        throw new ApiError(409, 'Application is missing the merchant/app wallet scope');
      }

      try {
        walletResult = await collectToSettlementWallet({
          merchantId: application.merchantId,
          appId: application.appId,
          userId,
          amount: amountDue,
          referenceId: `loan-down-payment:${application.id}`,
          source: 'product-loan-down-payment',
          category: 'LOAN_EQUITY',
          description: `Loan down payment for application ${application.id}`,
          applicationId: application.id,
          productId: application.productId,
          productType: 'LOAN',
          currency: fulfillment?.downPayment?.currency ?? application.currency,
          debitUserWallet: true
        });
      } catch {
        throw new ApiError(503, 'Wallet service is unavailable');
      }

      if (!walletResult.success) {
        if (walletResult.insufficientFunds) {
          throw new ApiError(402, walletResult.error || 'Insufficient Central Wallet balance', true, {
            code: 'INSUFFICIENT_CENTRAL_WALLET_BALANCE',
            requiredAmount: amountDue,
            availableBalance: walletResult.userWallet?.mainBalance ?? null,
            currency: walletResult.userWallet?.currency ?? application.currency
          });
        }
        throw new ApiError(502, walletResult.error || 'Failed to collect loan down payment');
      }

      providerReference =
        walletResult.userTransactionId ??
        walletResult.transactionId ??
        `loan-down-payment:${application.id}`;
    }

    const updatedUpstream = await proxyLoanDownPayment(application._id.toString(), {
      ...(amountDue > 0 ? { amount: amountDue } : {}),
      ...(providerReference ? { providerReference } : {}),
      acceptedTerms: true,
      springUserId: userId
    });
    syncFulfillmentFromUpstream(application, updatedUpstream);
    await application.save();

    const detail = await this.getDetail(applicationId, userId);
    return {
      ...detail,
      payment: {
        method: 'wallet',
        amount: amountDue,
        currency: fulfillment?.downPayment?.currency ?? application.currency,
        duplicate: walletResult?.duplicate === true || amountDue === 0,
        centralWalletBalance: walletResult?.userWallet?.mainBalance ?? null,
        ...(walletResult?.userTransactionId
          ? { userTransactionId: walletResult.userTransactionId }
          : {}),
        ...(walletResult?.transactionId
          ? { repaymentTransactionId: walletResult.transactionId }
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
    return this.getDetail(applicationId, userId);
  }
}

export default new PendingApprovedLoanService();
