import axios from 'axios';
import { config } from '../config/environment';

interface CreateAppTransactionStatsResponse {
  success?: boolean;
  data?: {
    totalTransactions?: number;
    totalCreditAmount?: number;
    totalDebitAmount?: number;
  };
}

/**
 * Canonical transaction source for product overview: create-app-ms transaction stats.
 */
export async function getCanonicalTransactionTotalForApp(
  appId: string,
  bearerToken?: string
): Promise<number> {
  if (!appId) {
    return 0;
  }

  const url = `${config.createAppServiceUrl.replace(/\/$/, '')}/api/v1/apps/${encodeURIComponent(appId)}/transaction-stats`;

  const headers: Record<string, string> = {};
  if (bearerToken?.trim()) {
    headers.Authorization = bearerToken;
  }

  const { data } = await axios.get<CreateAppTransactionStatsResponse>(url, {
    headers,
    timeout: 8000
  });

  const credit = Number(data?.data?.totalCreditAmount ?? 0);
  const debit = Number(data?.data?.totalDebitAmount ?? 0);

  if (Number.isFinite(credit) && Number.isFinite(debit)) {
    return Math.max(0, credit + debit);
  }

  return 0;
}
