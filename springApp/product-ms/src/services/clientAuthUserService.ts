import axios from 'axios';
import { config } from '../config/environment';

type ClientAuthProfileResponse = {
  success?: boolean;
  data?: {
    user?: {
      id?: string;
      phone?: string;
      first_name?: string;
      last_name?: string;
      email?: string;
    };
  };
  error?: string;
};

type ClientAuthInternalApplicantNameResponse = {
  success?: boolean;
  applicantName?: string;
  error?: string;
};

type ClientAuthInternalPhoneResponse = {
  success?: boolean;
  phone?: string;
  error?: string;
};

type ClientAuthMerchantOwnerResponse = {
  success?: boolean;
  data?: {
    userId?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
  };
  error?: string;
};

export type MerchantOwnerProfile = {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
};

function applicantNameFromEmail(email?: string): string | undefined {
  const local = typeof email === 'string' ? email.split('@')[0]?.replace(/[._+-]+/g, ' ').trim() : '';
  return local || undefined;
}

function applicantNameFromParts(firstName?: string, lastName?: string): string | undefined {
  const fullName = `${firstName || ''} ${lastName || ''}`.trim();
  return fullName || undefined;
}

class ClientAuthUserService {
  async resolveApplicantName(
    userId: string,
    authorizationHeader?: string,
    email?: string
  ): Promise<string | undefined> {
    const uid = userId.trim();
    if (!uid) {
      return undefined;
    }

    const fromInternal = await this.resolveApplicantNameInternal(uid);
    if (fromInternal) {
      return fromInternal;
    }

    const fromBearer = await this.resolveApplicantNameFromBearer(uid, authorizationHeader);
    if (fromBearer) {
      return fromBearer;
    }

    return applicantNameFromEmail(email) || uid;
  }

  async resolveUserPhone(userId: string, authorizationHeader?: string): Promise<string | undefined> {
    const uid = userId.trim();
    if (!uid) {
      return undefined;
    }

    const fromInternal = await this.resolveUserPhoneInternal(uid);
    if (fromInternal) {
      return fromInternal;
    }

    return this.resolveUserPhoneFromBearer(uid, authorizationHeader);
  }

  async resolveMerchantOwner(merchantId: string): Promise<MerchantOwnerProfile | undefined> {
    const id = merchantId.trim();
    const base = config.clientAuthServiceUrl.trim();
    const token = config.clientAuthInternalToken;
    if (!id || !base || !token) {
      return undefined;
    }

    const url = `${base}/api/v1/user/internal/merchant-owner/${encodeURIComponent(id)}`;
    try {
      const response = await axios.get<ClientAuthMerchantOwnerResponse>(url, {
        headers: { 'X-Internal-Token': token },
        timeout: config.clientAuthUserTimeoutMs,
        validateStatus: () => true
      });

      if (response.status >= 200 && response.status < 300 && response.data?.success === true) {
        const owner = response.data.data;
        const userId = owner?.userId?.trim();
        const email = owner?.email?.trim();
        if (userId && email) {
          return {
            userId,
            email,
            ...(owner?.firstName ? { firstName: owner.firstName } : {}),
            ...(owner?.lastName ? { lastName: owner.lastName } : {})
          };
        }
      }

      if (response.status !== 401 && response.status !== 404) {
        console.warn('Client-auth merchant owner lookup returned an unexpected response', {
          merchantId: id,
          httpStatus: response.status,
          error: response.data?.error
        });
      }
    } catch (error) {
      console.warn('Client-auth merchant owner lookup failed', {
        merchantId: id,
        message: error instanceof Error ? error.message : String(error)
      });
    }

    return undefined;
  }

  private async resolveApplicantNameInternal(userId: string): Promise<string | undefined> {
    const base = config.clientAuthServiceUrl.trim();
    const token = config.clientAuthInternalToken;
    if (!base || !token) {
      return undefined;
    }

    const url = `${base}/api/v1/user/internal/applicant-name/${encodeURIComponent(userId)}`;
    try {
      const response = await axios.get<ClientAuthInternalApplicantNameResponse>(url, {
        headers: { 'X-Internal-Token': token },
        timeout: config.clientAuthUserTimeoutMs,
        validateStatus: () => true
      });

      if (response.status >= 200 && response.status < 300 && response.data?.success === true) {
        const applicantName =
          typeof response.data.applicantName === 'string' ? response.data.applicantName.trim() : '';
        return applicantName || undefined;
      }

      if (response.status !== 401 && response.status !== 404) {
        console.warn('Client-auth internal applicant name lookup returned an unexpected response', {
          userId,
          httpStatus: response.status,
          error: response.data?.error
        });
      }
    } catch (error) {
      console.warn('Client-auth internal applicant name lookup failed', {
        userId,
        message: error instanceof Error ? error.message : String(error)
      });
    }

    return undefined;
  }

  private async resolveApplicantNameFromBearer(
    userId: string,
    authorizationHeader?: string
  ): Promise<string | undefined> {
    const auth = authorizationHeader?.trim();
    const base = config.clientAuthServiceUrl.trim();
    if (!auth || !base) {
      return undefined;
    }

    try {
      const response = await axios.get<ClientAuthProfileResponse>(`${base}/api/v1/user/profile`, {
        headers: { Authorization: auth },
        timeout: config.clientAuthUserTimeoutMs,
        validateStatus: () => true
      });

      if (response.status >= 200 && response.status < 300 && response.data?.success === true) {
        const user = response.data.data?.user;
        const returnedUserId = user?.id || (user as { _id?: string } | undefined)?._id;
        if (returnedUserId !== userId) {
          return undefined;
        }

        const fromName = applicantNameFromParts(user?.first_name, user?.last_name);
        if (fromName) {
          return fromName;
        }

        return applicantNameFromEmail(user?.email);
      }
    } catch (error) {
      console.warn('Client-auth applicant name profile lookup failed', {
        userId,
        message: error instanceof Error ? error.message : String(error)
      });
    }

    return undefined;
  }

  private async resolveUserPhoneInternal(userId: string): Promise<string | undefined> {
    const base = config.clientAuthServiceUrl.trim();
    const token = config.clientAuthInternalToken;
    if (!base || !token) {
      return undefined;
    }

    const url = `${base}/api/v1/user/internal/phone/${encodeURIComponent(userId)}`;
    try {
      const response = await axios.get<ClientAuthInternalPhoneResponse>(url, {
        headers: { 'X-Internal-Token': token },
        timeout: config.clientAuthUserTimeoutMs,
        validateStatus: () => true
      });

      if (response.status >= 200 && response.status < 300 && response.data?.success === true) {
        const phone = typeof response.data.phone === 'string' ? response.data.phone.trim() : '';
        return phone || undefined;
      }

      if (response.status !== 401 && response.status !== 404) {
        console.warn('Client-auth internal phone lookup returned an unexpected response', {
          userId,
          httpStatus: response.status,
          error: response.data?.error
        });
      }
    } catch (error) {
      console.warn('Client-auth internal phone lookup failed', {
        userId,
        message: error instanceof Error ? error.message : String(error)
      });
    }

    return undefined;
  }

  private async resolveUserPhoneFromBearer(
    userId: string,
    authorizationHeader?: string
  ): Promise<string | undefined> {
    const auth = authorizationHeader?.trim();
    const base = config.clientAuthServiceUrl.trim();
    if (!auth || !base) {
      return undefined;
    }

    try {
      const response = await axios.get<ClientAuthProfileResponse>(`${base}/api/v1/user/profile`, {
        headers: { Authorization: auth },
        timeout: config.clientAuthUserTimeoutMs,
        validateStatus: () => true
      });

      if (response.status >= 200 && response.status < 300 && response.data?.success === true) {
        const user = response.data.data?.user;
        const returnedUserId = user?.id || (user as { _id?: string } | undefined)?._id;
        if (returnedUserId !== userId) {
          console.warn('Client-auth user profile lookup returned a different user', {
            requestedUserId: userId,
            returnedUserId
          });
          return undefined;
        }

        const phone = typeof user?.phone === 'string' ? user.phone.trim() : '';
        return phone || undefined;
      }

      if (response.status !== 401 && response.status !== 404) {
        console.warn('Client-auth user profile lookup returned an unexpected response', {
          userId,
          httpStatus: response.status,
          error: response.data?.error
        });
      }
    } catch (error) {
      console.warn('Client-auth user profile lookup failed', {
        userId,
        message: error instanceof Error ? error.message : String(error)
      });
    }

    return undefined;
  }
}

export default new ClientAuthUserService();
