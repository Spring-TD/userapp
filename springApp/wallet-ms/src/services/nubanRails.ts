import {
  isLegerblockPayoutReady,
  resolveDefaultNubanProvider,
  type NubanProviderId
} from '../config/legerblockNuban';
import { isPayonusPayoutReady } from '../config/payonusNuban';
import {
  fetchBanks as fetchPayonusBanks,
  initiateBankPayout as initiatePayonusBankPayout,
  nameEnquiry as payonusNameEnquiry,
  type PayonusBank,
  type PayonusBankListResult,
  type PayonusBankPayoutRequest,
  type PayonusBankPayoutResult,
  type PayonusNameEnquiryResult
} from './payonusNubanClient';
import {
  fetchLegerblockBanks,
  initiateLegerblockBankPayout,
  legerblockNameEnquiry
} from './legerblockNubanClient';
import { logger } from '../utils/logger';

export type RailsBank = PayonusBank;
export type RailsBankListResult = PayonusBankListResult;
export type RailsNameEnquiryResult = PayonusNameEnquiryResult;
export type RailsBankPayoutRequest = PayonusBankPayoutRequest & {
  /** Required when rails provider is LegerBlock. */
  legerblockUserRef?: string;
};
export type RailsBankPayoutResult = PayonusBankPayoutResult;

function resolveRailsProvider(explicit?: NubanProviderId): NubanProviderId {
  if (explicit === 'legerblock' || explicit === 'payonus') return explicit;
  const preferred = resolveDefaultNubanProvider();
  if (preferred === 'legerblock' && isLegerblockPayoutReady()) return 'legerblock';
  if (preferred === 'payonus' && isPayonusPayoutReady()) return 'payonus';
  if (isLegerblockPayoutReady()) return 'legerblock';
  return 'payonus';
}

export async function railsFetchBanks(options?: {
  key?: string;
  forceRefresh?: boolean;
  provider?: NubanProviderId;
}): Promise<RailsBankListResult> {
  const provider = resolveRailsProvider(options?.provider);
  if (provider === 'legerblock') {
    const currency = options?.key === 'ZAR' ? 'ZAR' : 'NGN';
    const result = await fetchLegerblockBanks({ currency, forceRefresh: options?.forceRefresh });
    return {
      ok: result.ok,
      banks: result.banks,
      errorMessage: result.errorMessage,
      httpStatus: result.httpStatus,
      cached: result.cached
    };
  }
  return fetchPayonusBanks(options);
}

export async function railsNameEnquiry(params: {
  accountNumber: string;
  bankCode: string;
  currency?: string;
  provider?: NubanProviderId;
}): Promise<RailsNameEnquiryResult> {
  const provider = resolveRailsProvider(params.provider);
  if (provider === 'legerblock') {
    return legerblockNameEnquiry(params);
  }
  return payonusNameEnquiry(params);
}

export async function railsInitiateBankPayout(
  input: RailsBankPayoutRequest,
  options?: { provider?: NubanProviderId }
): Promise<RailsBankPayoutResult> {
  const provider = resolveRailsProvider(options?.provider);
  if (provider === 'legerblock') {
    const userRef = input.legerblockUserRef?.trim();
    if (!userRef) {
      return {
        ok: false,
        errorMessage:
          'LegerBlock payout requires legerblockUserRef on the source wallet (re-provision or set NUBAN via LegerBlock).'
      };
    }
    // Optional name enquiry first for consistent account names.
    const enquiry = await legerblockNameEnquiry({
      accountNumber: input.destinationAccountNumber,
      bankCode: input.destinationBankCode,
      currency: input.currency
    });
    if (!enquiry.ok) {
      logger.warn('LegerBlock name enquiry failed before payout', { error: enquiry.errorMessage });
      // Continue — some environments may not enable verify; initiate still needs bank_code.
    }

    const result = await initiateLegerblockBankPayout({
      userRef,
      amount: input.amount,
      currency: input.currency,
      reference: input.reference,
      destinationAccountNumber: input.destinationAccountNumber,
      destinationBankCode: input.destinationBankCode,
      destinationAccountName: enquiry.accountName || input.destinationAccountName,
      narration: input.narration
    });
    return {
      ok: result.ok,
      providerReference: result.providerReference,
      providerStatus: result.providerStatus,
      raw: result.raw,
      errorMessage: result.errorMessage,
      httpStatus: result.httpStatus
    };
  }
  return initiatePayonusBankPayout(input);
}

export { resolveRailsProvider };
