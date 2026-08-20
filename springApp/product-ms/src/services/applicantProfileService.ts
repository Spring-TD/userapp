import axios from 'axios';
import { config } from '../config/environment';
import { ApiError } from '../middleware/errorHandler';
import { ProductApplicationModel, toProductApplication } from '../models/ProductApplicationModel';
import type { ProductApplication } from '../types/productApplication';

export const APPLICANT_PROFILE_SCHEMA_VERSION = 1;

export type ApplicantProfileResponse = {
  schemaVersion: number;
  fetchedAt: string;
  localApplicationId: string;
  plataApplicationId?: string;
  userId: string;
  auth?: Record<string, unknown>;
  kyc?: Record<string, unknown>;
  application: Record<string, unknown>;
  partialErrors?: string[];
};

type InternalAuthProfile = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  userType: string;
  status: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  country?: string;
  appId?: string;
  profilePictureUrl?: string;
  lastLoginAt?: string;
  kycStatus?: string;
  kycCompleted: boolean;
};

type InternalKycProfile = {
  status: string;
  completed: boolean;
  completedAt?: string;
  personalInfo?: Record<string, unknown>;
  documents: Array<{
    type: string;
    fileName: string;
    fileType?: string;
    fileSize?: number;
    status: string;
  }>;
  verification?: Record<string, unknown>;
};

class ApplicantProfileService {
  private internalHeaders(token: string): Record<string, string> {
    return { 'X-Internal-Token': token };
  }

  private async fetchAuthProfile(userId: string): Promise<InternalAuthProfile | undefined> {
    const base = config.clientAuthServiceUrl.trim();
    const token = config.clientAuthInternalToken.trim() || config.jwtSecret.trim();
    if (!base || !token) {
      return undefined;
    }

    try {
      const response = await axios.get<{ success?: boolean; data?: InternalAuthProfile }>(
        `${base}/api/v1/user/internal/profile/${encodeURIComponent(userId)}`,
        {
          headers: this.internalHeaders(token),
          timeout: config.clientAuthUserTimeoutMs,
          validateStatus: () => true
        }
      );

      if (response.status >= 200 && response.status < 300 && response.data?.success && response.data.data) {
        return response.data.data;
      }
    } catch (error) {
      console.warn('Applicant profile auth lookup failed', {
        userId,
        message: error instanceof Error ? error.message : String(error)
      });
    }

    return undefined;
  }

  private async fetchKycProfile(userId: string): Promise<InternalKycProfile | undefined> {
    const base = config.complianceServiceUrl.trim();
    const token = config.complianceWalletInternalToken.trim();
    if (!base || !token) {
      return undefined;
    }

    try {
      const response = await axios.get<{ success?: boolean; data?: InternalKycProfile }>(
        `${base}/api/v1/kyc/internal/applicant-profile/${encodeURIComponent(userId)}`,
        {
          headers: this.internalHeaders(token),
          timeout: config.complianceBvnTimeoutMs,
          validateStatus: () => true
        }
      );

      if (response.status >= 200 && response.status < 300 && response.data?.success && response.data.data) {
        return response.data.data;
      }
    } catch (error) {
      console.warn('Applicant profile KYC lookup failed', {
        userId,
        message: error instanceof Error ? error.message : String(error)
      });
    }

    return undefined;
  }

  private applicationPayload(application: ProductApplication): Record<string, unknown> {
    const snapshot = application.contractSnapshot ?? {};
    const guarantors = Array.isArray(snapshot.guarantors) ? snapshot.guarantors : [];

    return {
      productId: application.productId,
      productName: application.productName,
      productType: application.productType,
      amount: application.amount,
      currency: application.currency,
      status: application.status,
      loanWorkflowStatus: application.loanWorkflowStatus,
      email: application.email,
      applicantName: application.applicantName,
      merchantId: application.merchantId,
      appId: application.appId,
      requirementSubmissions: application.requirementSubmissions,
      platformFields: application.platformFields,
      guarantors,
      contractSnapshot: snapshot,
      upstreamApplicationId: application.upstreamApplicationId,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt
    };
  }

  async buildApplicantProfile(input: {
    localApplicationId: string;
    plataApplicationId?: string;
    offeringMerchantId?: string;
  }): Promise<ApplicantProfileResponse> {
    const localApplicationId = input.localApplicationId.trim();
    if (!localApplicationId) {
      throw new ApiError(400, 'localApplicationId is required');
    }

    const applicationDoc = await ProductApplicationModel.findById(localApplicationId);
    if (!applicationDoc) {
      throw new ApiError(404, 'Application not found');
    }

    const productType = String(applicationDoc.productType || '').trim().toUpperCase();
    if (productType !== 'LOAN' && productType !== 'MORTGAGE') {
      throw new ApiError(400, 'Applicant profile is only available for loan and mortgage applications');
    }

    const plataApplicationId = input.plataApplicationId?.trim();
    if (plataApplicationId) {
      const upstreamId = applicationDoc.upstreamApplicationId?.trim();
      if (!upstreamId || upstreamId !== plataApplicationId) {
        throw new ApiError(403, 'plataApplicationId does not match this Spring application');
      }
    } else if (!applicationDoc.upstreamApplicationId?.trim()) {
      throw new ApiError(400, 'Application has not been synced to Plata upstream');
    }

    const offeringMerchantId = input.offeringMerchantId?.trim();
    if (offeringMerchantId && applicationDoc.merchantId?.trim() !== offeringMerchantId) {
      throw new ApiError(403, 'offeringMerchantId does not match this application');
    }

    const application = toProductApplication(applicationDoc);
    const partialErrors: string[] = [];

    const [auth, kyc] = await Promise.all([
      this.fetchAuthProfile(application.userId),
      this.fetchKycProfile(application.userId)
    ]);

    if (!auth) {
      partialErrors.push('auth_profile_unavailable');
    }
    if (!kyc) {
      partialErrors.push('kyc_profile_unavailable');
    }

    return {
      schemaVersion: APPLICANT_PROFILE_SCHEMA_VERSION,
      fetchedAt: new Date().toISOString(),
      localApplicationId,
      ...(plataApplicationId ? { plataApplicationId } : {}),
      userId: application.userId,
      ...(auth ? { auth: auth as unknown as Record<string, unknown> } : {}),
      ...(kyc ? { kyc: kyc as unknown as Record<string, unknown> } : {}),
      application: this.applicationPayload(application),
      ...(partialErrors.length > 0 ? { partialErrors } : {})
    };
  }

  /**
   * Build profile for Plata submit sync. Does not require an existing upstreamApplicationId.
   */
  async buildApplicantProfileForUpstreamSync(localApplicationId: string): Promise<ApplicantProfileResponse> {
    const applicationDoc = await ProductApplicationModel.findById(localApplicationId.trim());
    if (!applicationDoc) {
      throw new ApiError(404, 'Application not found');
    }

    const productType = String(applicationDoc.productType || '').trim().toUpperCase();
    if (productType !== 'LOAN' && productType !== 'MORTGAGE') {
      throw new ApiError(400, 'Applicant profile is only available for loan and mortgage applications');
    }

    const application = toProductApplication(applicationDoc);
    const partialErrors: string[] = [];

    const [auth, kyc] = await Promise.all([
      this.fetchAuthProfile(application.userId),
      this.fetchKycProfile(application.userId)
    ]);

    if (!auth) {
      partialErrors.push('auth_profile_unavailable');
    }
    if (!kyc) {
      partialErrors.push('kyc_profile_unavailable');
    }

    return {
      schemaVersion: APPLICANT_PROFILE_SCHEMA_VERSION,
      fetchedAt: new Date().toISOString(),
      localApplicationId: application.id,
      ...(application.upstreamApplicationId
        ? { plataApplicationId: application.upstreamApplicationId }
        : {}),
      userId: application.userId,
      ...(auth ? { auth: auth as unknown as Record<string, unknown> } : {}),
      ...(kyc ? { kyc: kyc as unknown as Record<string, unknown> } : {}),
      application: this.applicationPayload(application),
      ...(partialErrors.length > 0 ? { partialErrors } : {})
    };
  }
}

export default new ApplicantProfileService();
