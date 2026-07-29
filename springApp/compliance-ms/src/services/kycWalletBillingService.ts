import axios from 'axios';
import {
  buildKycLinkFeeReference,
  buildKycLinkFeeRefundReference,
  TenantContext
} from '../utils/tenantContext';
import {
  isWalletMsInternalConfigured,
  walletMsInternalHeaders,
  walletMsRequestTimeoutMs,
  walletServiceUrl
} from '../utils/walletMsClient';

function kycLinkFeeAmount(): number {
  const raw = process.env.KYC_LINK_FEE;
  const parsed = raw ? Number.parseFloat(raw) : 500;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 500;
}

export function isKycLinkBillingEnabled(): boolean {
  if (process.env.KYC_LINK_BILLING_ENABLED === 'false') {
    return false;
  }
  return isWalletMsInternalConfigured();
}

export type KycWalletFundingInstructions = {
  walletId: string;
  balance: number;
  currency: string;
  requiredAmount: number;
  shortfall: number;
  virtualNuban?: {
    accountNumber?: string;
    bankName?: string;
    bankCode?: string;
    provisionStatus?: string;
    accountType?: string;
  };
  fundingHint: string;
};

export type ChargeKycLinkFeeResult =
  | {
      success: true;
      duplicate?: boolean;
      amount: number;
      referenceId: string;
      transaction?: unknown;
      wallet?: unknown;
    }
  | {
      success: false;
      code: 'INSUFFICIENT_KYC_WALLET_BALANCE';
      error: string;
      amount: number;
      referenceId: string;
      fundingInstructions?: KycWalletFundingInstructions;
      wallet?: unknown;
    }
  | {
      success: false;
      code: 'WALLET_SERVICE_ERROR' | 'NOT_CONFIGURED';
      error: string;
      amount: number;
      referenceId: string;
    };

export type RefundKycLinkFeeResult =
  | {
      success: true;
      duplicate?: boolean;
      amount: number;
      referenceId: string;
      transaction?: unknown;
      wallet?: unknown;
    }
  | {
      success: false;
      error: string;
      amount: number;
      referenceId: string;
    };

export async function chargeKycLinkFee(input: {
  tenant: TenantContext;
  userId: string;
}): Promise<ChargeKycLinkFeeResult> {
  const base = walletServiceUrl();
  const amount = kycLinkFeeAmount();
  const referenceId = buildKycLinkFeeReference(input.tenant.appId, input.userId);

  if (!isWalletMsInternalConfigured()) {
    return {
      success: false,
      code: 'NOT_CONFIGURED',
      error: 'KYC wallet billing is not configured (WALLET_SERVICE_URL, JWT_SECRET)',
      amount,
      referenceId
    };
  }

  const url = `${base}/api/v1/internal/wallets/kyc-link/charge`;

  try {
    const response = await axios.post(
      url,
      {
        merchantId: input.tenant.merchantId,
        appId: input.tenant.appId,
        amount,
        referenceId,
        userId: input.userId,
        description: 'Customer KYC verification link fee'
      },
      {
        headers: walletMsInternalHeaders(),
        timeout: walletMsRequestTimeoutMs(),
        validateStatus: () => true
      }
    );

    const body = response.data as {
      success?: boolean;
      duplicate?: boolean;
      error?: string;
      code?: string;
      data?: {
        wallet?: unknown;
        transaction?: unknown;
        fundingInstructions?: KycWalletFundingInstructions;
      };
    };

    if (response.status === 402 || body.code === 'INSUFFICIENT_KYC_WALLET_BALANCE') {
      return {
        success: false,
        code: 'INSUFFICIENT_KYC_WALLET_BALANCE',
        error: body.error || 'Insufficient balance in merchant KYC wallet',
        amount,
        referenceId,
        fundingInstructions: body.data?.fundingInstructions,
        wallet: body.data?.wallet
      };
    }

    if (response.status >= 200 && response.status < 300 && body.success) {
      return {
        success: true,
        duplicate: body.duplicate === true,
        amount,
        referenceId,
        transaction: body.data?.transaction,
        wallet: body.data?.wallet
      };
    }

    return {
      success: false,
      code: 'WALLET_SERVICE_ERROR',
      error: body.error || 'Failed to charge KYC link fee',
      amount,
      referenceId
    };
  } catch (err: unknown) {
    const ax = err as { response?: { data?: { error?: string } }; message?: string };
    return {
      success: false,
      code: 'WALLET_SERVICE_ERROR',
      error: ax.response?.data?.error || ax.message || 'Wallet service unreachable',
      amount,
      referenceId
    };
  }
}

export async function refundKycLinkFee(input: {
  tenant: TenantContext;
  userId: string;
  amount: number;
  originalReferenceId: string;
  reason?: string;
}): Promise<RefundKycLinkFeeResult> {
  const base = walletServiceUrl();
  const referenceId = buildKycLinkFeeRefundReference(input.tenant.appId, input.userId);

  if (!isWalletMsInternalConfigured()) {
    return {
      success: false,
      error: 'KYC wallet billing is not configured (WALLET_SERVICE_URL, JWT_SECRET)',
      amount: input.amount,
      referenceId
    };
  }

  const url = `${base}/api/v1/internal/wallets/kyc-link/refund`;

  try {
    const response = await axios.post(
      url,
      {
        merchantId: input.tenant.merchantId,
        appId: input.tenant.appId,
        amount: input.amount,
        referenceId,
        originalReferenceId: input.originalReferenceId,
        userId: input.userId,
        description: input.reason || 'Refund: Fuspay KYC link creation failed'
      },
      {
        headers: walletMsInternalHeaders(),
        timeout: walletMsRequestTimeoutMs(),
        validateStatus: () => true
      }
    );

    const body = response.data as {
      success?: boolean;
      duplicate?: boolean;
      error?: string;
      data?: {
        wallet?: unknown;
        transaction?: unknown;
      };
    };

    if (response.status >= 200 && response.status < 300 && body.success) {
      return {
        success: true,
        duplicate: body.duplicate === true,
        amount: input.amount,
        referenceId,
        transaction: body.data?.transaction,
        wallet: body.data?.wallet
      };
    }

    return {
      success: false,
      error: body.error || 'Failed to refund KYC link fee',
      amount: input.amount,
      referenceId
    };
  } catch (err: unknown) {
    const ax = err as { response?: { data?: { error?: string } }; message?: string };
    return {
      success: false,
      error: ax.response?.data?.error || ax.message || 'Wallet service unreachable',
      amount: input.amount,
      referenceId
    };
  }
}

export { kycLinkFeeAmount };
