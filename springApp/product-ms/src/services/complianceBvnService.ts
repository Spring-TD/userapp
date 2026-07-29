import axios from 'axios';
import { config } from '../config/environment';

type ComplianceBvnResponse = {
  success?: boolean;
  bvn?: string;
  error?: string;
};

class ComplianceBvnService {
  async resolveUserBvn(userId: string): Promise<string | undefined> {
    const uid = userId.trim();
    const base = config.complianceServiceUrl.trim();
    const token = config.complianceWalletInternalToken;
    if (!uid || !base || !token) {
      return undefined;
    }

    const url = `${base}/api/v1/kyc/internal/payonus/user-bvn/${encodeURIComponent(uid)}`;
    try {
      const response = await axios.get<ComplianceBvnResponse>(url, {
        headers: { 'X-Internal-Token': token },
        timeout: config.complianceBvnTimeoutMs,
        validateStatus: () => true
      });

      if (response.status >= 200 && response.status < 300 && response.data?.success === true) {
        const digits = typeof response.data.bvn === 'string' ? response.data.bvn.replace(/\D/g, '') : '';
        return digits.length === 11 ? digits : undefined;
      }

      if (response.status !== 404) {
        console.warn('Compliance BVN lookup returned an unexpected response', {
          userId: uid,
          httpStatus: response.status,
          error: response.data?.error
        });
      }
    } catch (error) {
      console.warn('Compliance BVN lookup failed', {
        userId: uid,
        message: error instanceof Error ? error.message : String(error)
      });
    }

    return undefined;
  }
}

export default new ComplianceBvnService();
