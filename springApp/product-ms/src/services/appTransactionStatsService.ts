import axios from 'axios';
import { config } from '../config/environment';

interface CreateAppTransactionStatsResponse {
  data?: {
    totalCreditAmount?: number;
    totalDebitAmount?: number;
  };
}

export async function getCanonicalTransactionTotalForApp(
  appId: string,
  bearerToken?: string
): Promise<number> {
  if (!appId) {
    return 0;
  }

  const url = `${config.createAppServiceUrl.replace(/\/+$/, '')}/api/v1/apps/${encodeURIComponent(appId)}/transaction-stats`;
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
  return Number.isFinite(credit) && Number.isFinite(debit) ? Math.max(0, credit + debit) : 0;
}
