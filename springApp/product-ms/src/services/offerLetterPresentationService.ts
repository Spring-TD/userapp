import type { ProductApplication } from '../types/productApplication';
import { buildOfferLetterForApplication } from './offerLetterBuilder';

function toOfferLetterApplication(application: ProductApplication) {
  return {
    id: application.id,
    localApplicationId: application.upstreamApplicationId ?? application.id,
    appId: application.appId,
    merchantId: application.merchantId ?? '',
    offeringMerchantId: application.merchantId,
    userId: application.userId,
    productType: application.productType,
    globalProductId: application.productId,
    productName: application.productName,
    merchantName: application.merchantId,
    customerName: application.customerName ?? application.applicantName,
    status: application.status,
    loanWorkflowStatus: application.loanWorkflowStatus,
    approvedLoanAmount: application.amount,
    postApprovalFulfillment: application.postApprovalFulfillment,
    contractSnapshot: application.contractSnapshot,
    payoutSplit: { currency: application.currency },
    submittedAt: application.createdAt,
    snapshotVersion: 1,
    createdAt: application.createdAt
  };
}

export async function buildOfferLetterForProductApplication(
  application: ProductApplication,
  applicantName: string
) {
  const mapped = toOfferLetterApplication(application);
  const equityRequiredAmount = application.postApprovalFulfillment?.downPayment?.requiredAmount ?? 0;
  const fulfillmentStatus = application.postApprovalFulfillment?.status;
  const acceptanceStatus =
    fulfillmentStatus === 'offer_accepted' || fulfillmentStatus === 'contract_signed'
      ? 'Accepted'
      : fulfillmentStatus === 'offer_declined'
        ? 'Declined'
        : 'Pending';

  return buildOfferLetterForApplication({
    application: mapped,
    applicantName,
    approvedAmount: application.amount,
    equityRequiredAmount,
    currency: application.currency,
    acceptanceStatus,
    acceptanceId: application.postApprovalFulfillment?.offer?.acceptedAt
      ? `${application.id}-${application.postApprovalFulfillment.offer.acceptedAt}`
      : undefined
  });
}
