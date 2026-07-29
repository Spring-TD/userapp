import axios from 'axios';
import { config } from '../config/environment';
import type { Product } from '../types/product';

export interface GuarantorKycInput {
  applicationId: string;
  product: Product;
  guarantorId: string;
  fullName: string;
  email: string;
  phone: string;
  occupation?: string;
  relationship?: string;
  country?: string;
  callback?: string;
  redirect?: string;
}

export interface GuarantorKycResult {
  customerId?: string;
  userRef: string;
  verificationId?: string;
  verificationUrl?: string;
  reference?: unknown;
  status?: unknown;
  totalChecks?: unknown;
  raw?: unknown;
}

type GuarantorKycResponse = {
  success?: boolean;
  data?: Partial<GuarantorKycResult>;
  verification_url?: string;
  verification_id?: string;
  error?: string;
  message?: string;
};

class GuarantorKycService {
  async createVerification(input: GuarantorKycInput): Promise<GuarantorKycResult> {
    if (!config.complianceServiceUrl) {
      throw new Error('Compliance service URL is not configured');
    }

    const userRef = `guarantor_${input.applicationId}_${input.guarantorId}`;
    const response = await axios.post<GuarantorKycResponse>(
      `${config.complianceServiceUrl}/api/v1/kyc/modular/guarantor-verification`,
      {
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
        occupation: input.occupation,
        relationship: input.relationship,
        country: input.country || 'NG',
        userRef,
        applicationId: input.applicationId,
        productId: input.product.id,
        appId: input.product.appId,
        callback: input.callback,
        redirect: input.redirect
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.complianceServiceToken}`
        },
        timeout: config.walletServiceHttpTimeoutMs
      }
    );

    if (!response.data?.success) {
      throw new Error(response.data?.error || response.data?.message || 'Guarantor KYC request failed');
    }

    return {
      userRef: response.data.data?.userRef || userRef,
      customerId: response.data.data?.customerId,
      verificationId: response.data.data?.verificationId || response.data.verification_id,
      verificationUrl: response.data.data?.verificationUrl || response.data.verification_url,
      reference: response.data.data?.reference,
      status: response.data.data?.status,
      totalChecks: response.data.data?.totalChecks,
      raw: response.data.data?.raw
    };
  }
}

export default new GuarantorKycService();
