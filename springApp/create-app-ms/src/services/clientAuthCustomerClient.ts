import axios from 'axios';
import { config } from '../config/environment';

export interface AppCustomerStats {
  registered: number;
  active: number;
  registeredDeltaThisMonth: number;
}

export interface AppCustomerContact {
  userId: string;
  userName: string;
  email: string;
  status: string;
}

function asTrimmedId(value: unknown): string {
  if (value == null) return '';
  return String(value).trim();
}

/**
 * Fail-soft: retail customer counts from client-auth-ms for an app.
 * `appId` may be a string or a Mongo ObjectId (create-app `toJSON` historically assigned `_id` raw).
 */
export async function fetchAppCustomerStats(appId: unknown): Promise<AppCustomerStats> {
  const id = asTrimmedId(appId);
  const empty: AppCustomerStats = { registered: 0, active: 0, registeredDeltaThisMonth: 0 };
  if (!id || !config.clientAuthServiceUrl || !config.internalServiceToken) {
    return empty;
  }

  try {
    const response = await axios.get<{
      success?: boolean;
      data?: {
        customerCount?: number;
        registered?: number;
        active?: number;
        registeredDeltaThisMonth?: number;
      };
      error?: string;
    }>(`${config.clientAuthServiceUrl}/api/v1/user/internal/apps/${encodeURIComponent(id)}/customer-count`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': config.internalServiceToken
      },
      timeout: 15_000,
      validateStatus: () => true
    });

    if (response.status < 200 || response.status >= 300 || !response.data?.success) {
      console.warn('client-auth customer stats non-success', {
        status: response.status,
        error: response.data?.error
      });
      return empty;
    }

    const d = response.data.data || {};
    const registered = Number(d.registered ?? d.customerCount ?? 0);
    const active = Number(d.active ?? 0);
    const registeredDeltaThisMonth = Number(d.registeredDeltaThisMonth ?? 0);
    return {
      registered: Number.isFinite(registered) && registered > 0 ? Math.floor(registered) : 0,
      active: Number.isFinite(active) && active > 0 ? Math.floor(active) : 0,
      registeredDeltaThisMonth:
        Number.isFinite(registeredDeltaThisMonth) && registeredDeltaThisMonth > 0
          ? Math.floor(registeredDeltaThisMonth)
          : 0
    };
  } catch (error) {
    console.warn('client-auth customer stats request failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    return empty;
  }
}

/**
 * Fail-soft: batch name/status for top-account rows.
 */
export async function fetchAppCustomerContacts(userIds: string[]): Promise<Map<string, AppCustomerContact>> {
  const map = new Map<string, AppCustomerContact>();
  const ids = [...new Set(userIds.map((id) => asTrimmedId(id)).filter(Boolean))].slice(0, 50);
  if (!ids.length || !config.clientAuthServiceUrl || !config.internalServiceToken) {
    return map;
  }

  try {
    const response = await axios.post<{
      success?: boolean;
      data?: { contacts?: AppCustomerContact[] };
      error?: string;
    }>(
      `${config.clientAuthServiceUrl}/internal/api/v1/users/contacts`,
      { userIds: ids },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Token': config.internalServiceToken
        },
        timeout: 15_000,
        validateStatus: () => true
      }
    );

    if (response.status < 200 || response.status >= 300 || !response.data?.success) {
      console.warn('client-auth contacts batch non-success', {
        status: response.status,
        error: response.data?.error
      });
      return map;
    }

    const contacts = response.data.data?.contacts || [];
    for (const c of contacts) {
      const returnedId = asTrimmedId(c?.userId);
      if (!returnedId) continue;
      map.set(returnedId, c);
    }
    for (const id of ids) {
      if (map.has(id)) continue;
      const match = contacts.find(
        (c) => asTrimmedId(c?.userId).toLowerCase() === id.toLowerCase()
      );
      if (match) map.set(id, match);
    }
    return map;
  } catch (error) {
    console.warn('client-auth contacts batch failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    return map;
  }
}
