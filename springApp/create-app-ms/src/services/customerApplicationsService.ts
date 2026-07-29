import axios from 'axios';
import { config } from '../config/environment';
import { ApiError } from '../middleware/errorHandler';
import type { ApplicationSummary } from '../types/customerApplications';

type LooseApplication = {
  id: string;
  userId: string;
  productId: string;
  productName: string;
  productType: string;
  amount: number;
  currency: string;
  status: string;
  appId: string;
  createdAt?: string;
  updatedAt?: string;
  rejectionReason?: string;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

function applicationsBaseUrl(): string {
  return `${config.accountServiceUrl.replace(/\/+$/, '')}/api/v1/applications`;
}

function authHeaders(authorization: string, adminId?: string): Record<string, string> {
  const headers: Record<string, string> = { Authorization: authorization };
  if (adminId?.trim()) {
    headers['x-admin-id'] = adminId.trim();
  }
  return headers;
}

export async function listCustomerApplicationsForApp(opts: {
  appId: string;
  userId: string;
  authorization: string;
  adminId?: string;
  productType?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{ applications: LooseApplication[]; pagination?: PaginationMeta }> {
  const params: Record<string, string> = {
    userId: opts.userId.trim(),
    appId: opts.appId.trim()
  };
  if (opts.productType?.trim()) {
    params.productType = opts.productType.trim();
  }
  if (opts.status?.trim()) {
    params.status = opts.status.trim();
  }
  if (opts.page && opts.page > 0) {
    params.page = String(Math.floor(opts.page));
  }
  if (opts.limit && opts.limit > 0) {
    params.limit = String(Math.floor(opts.limit));
  }

  try {
    const res = await axios.get(applicationsBaseUrl(), {
      headers: authHeaders(opts.authorization, opts.adminId),
      params,
      timeout: 20000,
      validateStatus: (s) => s < 500
    });

    if (res.status === 401 || res.status === 403) {
      throw new ApiError(res.status, 'Not authorized to list applications');
    }
    if (res.status >= 400) {
      const msg =
        (res.data as { error?: string })?.error ||
        (res.data as { message?: string })?.message ||
        'Failed to list applications';
      throw new ApiError(res.status, msg);
    }

    const data = (res.data as { data?: LooseApplication[] })?.data;
    const pagination = (res.data as { pagination?: PaginationMeta })?.pagination;
    return {
      applications: Array.isArray(data) ? data : [],
      ...(pagination ? { pagination } : {})
    };
  } catch (e) {
    if (e instanceof ApiError) {
      throw e;
    }
    console.error('[customer-applications] list failed:', e);
    throw new ApiError(502, 'Applications service unavailable');
  }
}

export async function summarizeCustomerApplicationsForApp(opts: {
  appId: string;
  userId: string;
  authorization: string;
  adminId?: string;
  productType?: string;
}): Promise<ApplicationSummary> {
  const params: Record<string, string> = {
    userId: opts.userId.trim(),
    appId: opts.appId.trim()
  };
  if (opts.productType?.trim()) {
    params.productType = opts.productType.trim();
  }

  try {
    const res = await axios.get(`${applicationsBaseUrl()}/summary`, {
      headers: authHeaders(opts.authorization, opts.adminId),
      params,
      timeout: 20000,
      validateStatus: (s) => s < 500
    });

    if (res.status === 401 || res.status === 403) {
      throw new ApiError(res.status, 'Not authorized to summarize applications');
    }
    if (res.status >= 400) {
      const msg =
        (res.data as { error?: string })?.error ||
        (res.data as { message?: string })?.message ||
        'Failed to summarize applications';
      throw new ApiError(res.status, msg);
    }

    const data = (res.data as { data?: ApplicationSummary })?.data;
    if (!data || typeof data.total !== 'number') {
      throw new ApiError(502, 'Invalid applications summary response');
    }
    return data;
  } catch (e) {
    if (e instanceof ApiError) {
      throw e;
    }
    console.error('[customer-applications] summary failed:', e);
    throw new ApiError(502, 'Applications service unavailable');
  }
}
