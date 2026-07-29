import axios from 'axios';
import { config } from '../config/environment';
import { ApiError } from '../middleware/errorHandler';

export type AppCustomerRow = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  status: string;
  user_ref?: string;
  app_id?: string;
  created_at?: string;
  applicationCount: number;
};

type ClientAuthUser = {
  id?: string;
  userId?: string;
  _id?: string;
  email?: string;
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
  phone?: string;
  status?: string;
  user_ref?: string;
  userRef?: string;
  app_id?: string;
  created_at?: string;
  createdAt?: string;
};

type LooseApplication = {
  userId?: string;
};

type PaginationMeta = {
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
};

function authHeaders(authorization: string, adminId?: string): Record<string, string> {
  const headers: Record<string, string> = { Authorization: authorization };
  if (adminId?.trim()) {
    headers['x-admin-id'] = adminId.trim();
  }
  return headers;
}

function normalizeUserId(user: ClientAuthUser): string | undefined {
  const id = user.id ?? user.userId ?? user._id;
  return typeof id === 'string' && id.trim() ? id.trim() : undefined;
}

function mapUserRow(user: ClientAuthUser, applicationCount: number): AppCustomerRow | null {
  const id = normalizeUserId(user);
  if (!id) {
    return null;
  }

  const firstName = String(user.first_name ?? user.firstName ?? '').trim();
  const lastName = String(user.last_name ?? user.lastName ?? '').trim();
  const email = String(user.email ?? '').trim();
  const refRaw = user.user_ref ?? user.userRef;
  const createdAt = user.created_at ?? user.createdAt;

  return {
    id,
    email,
    first_name: firstName,
    last_name: lastName,
    phone: typeof user.phone === 'string' ? user.phone : undefined,
    status: String(user.status ?? 'active'),
    ...(typeof refRaw === 'string' && refRaw.trim() ? { user_ref: refRaw.trim() } : {}),
    ...(typeof user.app_id === 'string' && user.app_id.trim() ? { app_id: user.app_id.trim() } : {}),
    ...(typeof createdAt === 'string' && createdAt.trim() ? { created_at: createdAt } : {}),
    applicationCount
  };
}

function matchesSearch(row: AppCustomerRow, search?: string): boolean {
  const term = search?.trim().toLowerCase();
  if (!term) {
    return true;
  }

  const haystack = [
    row.first_name,
    row.last_name,
    `${row.first_name} ${row.last_name}`.trim(),
    row.email,
    row.phone ?? '',
    row.user_ref ?? '',
    row.id
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(term);
}

async function fetchAppScopedUsers(appId: string, authorization: string): Promise<ClientAuthUser[]> {
  const url = `${config.accountServiceUrl.replace(/\/+$/, '')}/api/v1/user/list`;
  const res = await axios.get(url, {
    headers: { Authorization: authorization },
    params: { appId: appId.trim() },
    timeout: 20000,
    validateStatus: () => true
  });

  if (res.status === 401 || res.status === 403) {
    throw new ApiError(res.status, 'Not authorized to list customers');
  }
  if (res.status >= 400) {
    const msg =
      (res.data as { error?: string })?.error ||
      (res.data as { message?: string })?.message ||
      'Failed to list customers';
    throw new ApiError(res.status, msg);
  }

  const users = (res.data as { data?: { users?: ClientAuthUser[] } })?.data?.users;
  return Array.isArray(users) ? users : [];
}

async function fetchApplicationCountsByUser(
  appId: string,
  authorization: string,
  adminId?: string
): Promise<Map<string, number>> {
  const url = `${config.accountServiceUrl.replace(/\/+$/, '')}/api/v1/applications`;
  const counts = new Map<string, number>();
  let page = 1;
  const limit = 20;

  try {
    while (true) {
      const res = await axios.get(url, {
        headers: authHeaders(authorization, adminId),
        params: { appId: appId.trim(), page, limit },
        timeout: 20000,
        validateStatus: () => true
      });

      if (res.status < 200 || res.status >= 300) {
        return counts;
      }

      const applications = (res.data as { data?: LooseApplication[] })?.data;
      if (!Array.isArray(applications)) {
        return counts;
      }

      for (const application of applications) {
        const userId = typeof application.userId === 'string' ? application.userId.trim() : '';
        if (!userId) {
          continue;
        }
        counts.set(userId, (counts.get(userId) ?? 0) + 1);
      }

      const pagination = (res.data as { pagination?: PaginationMeta })?.pagination;
      if (!pagination?.hasNextPage || page >= pagination.totalPages) {
        return counts;
      }
      page += 1;
    }
  } catch (error) {
    console.error('[customer-list] application counts unavailable:', error);
  }

  return counts;
}

export async function listAppCustomers(opts: {
  appId: string;
  authorization: string;
  adminId?: string;
  search?: string;
}): Promise<AppCustomerRow[]> {
  const appId = opts.appId.trim();
  if (!appId) {
    throw new ApiError(400, 'App ID is required');
  }

  const [users, applicationCounts] = await Promise.all([
    fetchAppScopedUsers(appId, opts.authorization),
    fetchApplicationCountsByUser(appId, opts.authorization, opts.adminId)
  ]);

  return users
    .map((user) => mapUserRow(user, applicationCounts.get(normalizeUserId(user) ?? '') ?? 0))
    .filter((row): row is AppCustomerRow => row !== null)
    .filter((row) => matchesSearch(row, opts.search));
}
