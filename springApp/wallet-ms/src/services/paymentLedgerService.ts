import axios from 'axios';
import { config } from '../config/environment';
import { logger } from '../utils/logger';

export interface WalletPayoutLedgerPayload {
  userId: string;
  amount: number;
  currency: string;
  txnRef: string;
  sessionId: string;
  description: string;
  thirdPartyRefId?: string;
  beneficiaryInfo: {
    beneficiary_fiat_ref: string;
    bank_name: string;
    bank_code: string;
    account_number: string;
    account_holder_name: string;
    other_data?: Record<string, unknown>;
  };
  feeBreakdown?: {
    payout_fee?: number;
    merchant_commission?: number;
    other_fee?: Array<{ name?: string; amount?: number }>;
  };
}

export class PaymentLedgerService {
  static isConfigured(): boolean {
    return Boolean(config.paymentServiceUrl && config.paymentInternalToken);
  }

  static async recordWalletPayout(payload: WalletPayoutLedgerPayload): Promise<{
    success: boolean;
    skipped?: boolean;
    duplicate?: boolean;
    error?: string;
  }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        skipped: true,
        error: 'Payment ledger integration is not configured (PAYMENT_SERVICE_URL, PAYMENT_INTERNAL_TOKEN)'
      };
    }

    try {
      const url = `${config.paymentServiceUrl}/api/v1/records/internal/wallet-payout-ledger`;
      const res = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Token': config.paymentInternalToken
        },
        timeout: 15000,
        validateStatus: () => true
      });

      if (res.status >= 200 && res.status < 300 && res.data?.success) {
        return {
          success: true,
          duplicate: res.data.duplicate === true
        };
      }

      return {
        success: false,
        error: res.data?.error || `payment-ms HTTP ${res.status}`
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'payment-ms ledger request failed';
      logger.warn('Payment ledger request failed', {
        userId: payload.userId,
        txnRef: payload.txnRef,
        error: message
      });
      return { success: false, error: message };
    }
  }
}

export default PaymentLedgerService;
