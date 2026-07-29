/**
 * @deprecated Use kycWalletBillingService.chargeKycLinkFee instead.
 * Retained for backward compatibility with older imports.
 */
export {
  chargeKycLinkFee as processKycLinkFee,
  kycLinkFeeAmount as KYC_LINK_FEE,
  isKycLinkBillingEnabled
} from '../services/kycWalletBillingService';
