import { apiClient } from "@/lib/api";
import { getAccessToken } from "@/lib/cookieAuth";
import { ENDPOINTS } from "@/lib/endpoints";

const isDev = process.env.NODE_ENV !== "production";
const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

function isLikelyObjectId(value: unknown): value is string {
  return typeof value === "string" && OBJECT_ID_REGEX.test(value);
}

// Decode likely user IDs from JWT; some tokens carry multiple ID fields.
function decodeCandidateUserIdsFromToken(t: string | null): string[] {
  try {
    if (!t) return [];
    const [, payload] = t.split(".");
    if (!payload) return [];
    const decoded = JSON.parse(
      typeof atob === "function" ? atob(payload) : Buffer.from(payload, "base64").toString("utf8"),
    );
    const candidates = [
      decoded?.userId,
      decoded?.user_merchant_id,
      decoded?.userMerchantId,
      decoded?.merchantId,
      decoded?.sub,
      decoded?.id,
      decoded?._id,
    ].filter((x): x is string => typeof x === "string" && x.length > 0);
    return Array.from(new Set(candidates));
  } catch {
    return [];
  }
}

function pickObjectIdCandidates(values: Array<unknown>): string[] {
  const filtered = values.filter(isLikelyObjectId);
  return Array.from(new Set(filtered));
}

export class ComplianceService {
  // --- Individual KYC ---
  static async submitIndividualKyc(payload: unknown) {
    const res = await apiClient.post(ENDPOINTS.compliance.individual.submit, payload);
    return res.data;
  }

  // --- Business KYC ---
  static async submitBusinessKyc(payload: unknown) {
    const res = await apiClient.post(ENDPOINTS.compliance.business.submit, payload);
    return res.data;
  }

  static async getKycStatusForCurrentUser(userIdOverride?: string) {
    const token = getAccessToken();
    let profileIdCandidates: string[] = [];
    try {
      const profileRes = await apiClient.get(ENDPOINTS.user.profile);
      const profileData = (profileRes?.data as { data?: Record<string, unknown> })?.data ?? {};
      profileIdCandidates = pickObjectIdCandidates([
        profileData?.id,
        profileData?._id,
        profileData?.userId,
        profileData?.user_id,
      ]);
      if (isDev) {
        console.log("[ComplianceService] Profile-derived ID candidates:", profileIdCandidates, "raw:", profileData);
      }
    } catch (err) {
      if (isDev) {
        console.log("[ComplianceService] Failed to fetch profile for ID resolution:", err);
      }
    }

    const tokenIdCandidates = pickObjectIdCandidates(decodeCandidateUserIdsFromToken(token));
    const overrideCandidates = pickObjectIdCandidates([userIdOverride]);
    const uniqueCandidateUserIds = Array.from(
      new Set([...overrideCandidates, ...profileIdCandidates, ...tokenIdCandidates]),
    );
    if (uniqueCandidateUserIds.length === 0) throw new Error("Unable to resolve userId from token");
    if (isDev) {
      console.log("[ComplianceService] KYC status candidate IDs:", uniqueCandidateUserIds);
    }

    let lastError: unknown = null;
    for (const userId of uniqueCandidateUserIds) {
      try {
        if (isDev) {
          console.log("[ComplianceService] Checking KYC status for userId:", userId);
        }
        const res = await apiClient.get(ENDPOINTS.compliance.status(userId));
        if (isDev) {
          console.log("[ComplianceService] KYC status success for userId:", userId, "response:", res.data);
        }
        return res.data;
      } catch (err) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        const responseData = (err as { response?: { data?: unknown } })?.response?.data;
        lastError = err;
        if (isDev) {
          console.log("[ComplianceService] KYC status failed for userId:", userId, "status:", status, "response:", responseData);
        }
        // Try the next candidate for not-found IDs.
        if (status === 404) continue;
        throw err;
      }
    }

    throw lastError ?? new Error("Unable to fetch KYC status");
  }

  // --- Shareholders (per compliance-ms docs: GET with merchantId, PUT full array) ---
  static async getShareholdersForCurrentMerchant() {
    const token = getAccessToken();
    const userId = decodeCandidateUserIdsFromToken(token)[0] ?? null;
    if (!userId) return [];
    try {
      const res = await apiClient.get(ENDPOINTS.compliance.business.beneficialOwners(userId));
      const data: unknown = res.data ?? {};
      const arr =
        (data as { data?: unknown[] })?.data ??
        (data as { shareholders?: unknown[] })?.shareholders ??
        [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  static async upsertShareholdersForCurrentMerchant(payload: unknown) {
    const token = getAccessToken();
    if (!token) throw new Error("Missing access token. Please log in before submitting shareholders.");
    const res = await apiClient.put(ENDPOINTS.compliance.business.beneficialOwnersPut, payload);
    return res.data;
  }

  // --- Business dropdown options (from compliance-ms) ---
  static async getBusinessTypeOptions(): Promise<{ value: string; label: string }[]> {
    try {
      const res = await apiClient.get(ENDPOINTS.compliance.business.businessTypeOptions);
      const data = (res.data as { success?: boolean; data?: { value: string; label: string }[] })?.data;
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  static async getIndustryTypeOptions(): Promise<{ value: string; label: string }[]> {
    try {
      const res = await apiClient.get(ENDPOINTS.compliance.business.industryTypeOptions);
      const data = (res.data as { success?: boolean; data?: { value: string; label: string }[] })?.data;
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  static async getBusinessModelOptions(): Promise<{ value: string; label: string }[]> {
    try {
      const res = await apiClient.get(ENDPOINTS.compliance.business.businessModelOptions);
      const data = (res.data as { success?: boolean; data?: { value: string; label: string }[] })?.data;
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  // --- Business KYC status & documents ---
  static async getBusinessKycStatus() {
    const res = await apiClient.get(ENDPOINTS.compliance.business.status);
    return res.data;
  }

  static async getBusinessDocuments() {
    const res = await apiClient.get(ENDPOINTS.compliance.business.documents);
    return res.data;
  }

  static async getBusinessDocument(documentId: string) {
    const res = await apiClient.get(ENDPOINTS.compliance.business.document(documentId));
    return res.data;
  }

  /** Upload a file for KYC (multipart/form-data, field: file). Returns { success, url?, key?, error? }. Retries on 5xx or network/timeout. */
  static async uploadDocument(file: File, maxRetries = 3): Promise<{ success: boolean; url?: string; key?: string; error?: string }> {
    let lastError: string | undefined;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const form = new FormData();
      form.append("file", file);
      try {
        const res = await apiClient.post(ENDPOINTS.compliance.upload, form);
        const data = res.data as { success?: boolean; url?: string; key?: string; error?: string };
        if (res.status >= 500 && attempt < maxRetries) {
          lastError = data?.error || `Server error (${res.status})`;
          await new Promise((r) => setTimeout(r, 2000 * attempt));
          continue;
        }
        return { success: !!data?.success, url: data?.url, key: data?.key, error: data?.error };
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        const isRetryable =
          (status != null && status >= 500) ||
          (err as { code?: string }).code === "ECONNABORTED" ||
          (err as { message?: string }).message?.toLowerCase().includes("timeout") ||
          (err as { message?: string }).message?.toLowerCase().includes("network");
        lastError = (err as { response?: { data?: { error?: string } }; message?: string }).response?.data?.error ?? (err as { message?: string }).message ?? "Upload failed";
        if (isRetryable && attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 2000 * attempt));
          continue;
        }
        return { success: false, error: lastError };
      }
    }
    return { success: false, error: lastError ?? "Upload failed after retries" };
  }
}

