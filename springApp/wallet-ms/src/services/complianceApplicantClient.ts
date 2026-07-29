import axios from 'axios';
import { payonusNubanConfig } from '../config/payonusNuban';
import { logger } from '../utils/logger';

function pickString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function buildLegalNameFromPersonalInfo(personalInfo: Record<string, unknown>): string | undefined {
  const firstName = pickString(personalInfo.firstName, personalInfo.first_name);
  const lastName = pickString(personalInfo.lastName, personalInfo.last_name);
  if (firstName && lastName) {
    return `${firstName} ${lastName}`.replace(/\s+/g, ' ').trim();
  }
  return pickString(personalInfo.fullName, personalInfo.full_name, personalInfo.name);
}

export type RetailUserKycIdentity = {
  legalName: string;
  firstName?: string;
  lastName?: string;
  kycCompleted: boolean;
  kycStatus: string;
};

/**
 * Load the retail user's verified identity from compliance-ms (Fuspay modular KYC profile).
 */
export async function fetchRetailUserKycIdentity(userId: string): Promise<{
  success: boolean;
  identity?: RetailUserKycIdentity;
  error?: string;
}> {
  const uid = userId.trim();
  if (!uid) {
    return { success: false, error: 'userId is required' };
  }

  const base = payonusNubanConfig.complianceServiceUrl.trim();
  const token = payonusNubanConfig.complianceWalletInternalToken;
  if (!base || !token) {
    return {
      success: false,
      error: 'KYC identity lookup is not configured (COMPLIANCE_SERVICE_URL / COMPLIANCE_WALLET_INTERNAL_TOKEN)'
    };
  }

  const url = `${base}/api/v1/kyc/internal/applicant-profile/${encodeURIComponent(uid)}`;
  try {
    const res = await axios.get<unknown>(url, {
      headers: { 'X-Internal-Token': token },
      timeout: payonusNubanConfig.complianceBvnTimeoutMs,
      validateStatus: () => true
    });

    if (res.status === 404) {
      return {
        success: false,
        error: 'Complete KYC verification before adding a payout bank account'
      };
    }

    if (res.status < 200 || res.status >= 300 || !res.data || typeof res.data !== 'object') {
      logger.warn('Compliance applicant profile unexpected response', { userId: uid, httpStatus: res.status });
      return { success: false, error: 'Unable to verify KYC identity for bank account ownership' };
    }

    const envelope = res.data as { success?: boolean; data?: Record<string, unknown> };
    if (!envelope.success || !envelope.data) {
      return {
        success: false,
        error: 'Complete KYC verification before adding a payout bank account'
      };
    }

    const data = envelope.data;
    const personalInfo =
      data.personalInfo && typeof data.personalInfo === 'object'
        ? (data.personalInfo as Record<string, unknown>)
        : undefined;

    const legalName = personalInfo ? buildLegalNameFromPersonalInfo(personalInfo) : undefined;
    if (!legalName) {
      return {
        success: false,
        error: 'KYC profile does not include a verified legal name. Complete identity verification first.'
      };
    }

    const kycCompleted = data.completed === true;
    const kycStatus = typeof data.status === 'string' ? data.status : 'unknown';

    if (!kycCompleted) {
      return {
        success: false,
        error: 'KYC verification must be completed before adding a payout bank account'
      };
    }

    return {
      success: true,
      identity: {
        legalName,
        firstName: pickString(personalInfo?.firstName, personalInfo?.first_name),
        lastName: pickString(personalInfo?.lastName, personalInfo?.last_name),
        kycCompleted,
        kycStatus
      }
    };
  } catch (error) {
    logger.warn('Compliance applicant profile request failed', {
      userId: uid,
      message: error instanceof Error ? error.message : String(error)
    });
    return { success: false, error: 'Unable to verify KYC identity for bank account ownership' };
  }
}
