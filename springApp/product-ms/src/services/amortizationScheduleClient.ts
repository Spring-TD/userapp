import axios from 'axios';
import { config } from '../config/environment';
import type { AmortizationScheduleView } from '../types/amortizationSchedule';
import { parseAmortizationSchedule } from '../types/amortizationSchedule';

function productMsPlataBaseUrl(): string {
  return config.plataProductServicePublicUrl.replace(/\/+$/, '');
}

function internalToken(): string {
  return (config.plataProductInternalToken || config.jwtSecret || '').trim();
}

/**
 * Live amortization schedule from Plata (indicative pre-disburse, confirmed after).
 * Fail-soft: returns null when Plata is unavailable so storefront can use the webhook snapshot.
 */
export async function fetchUpstreamAmortizationSchedule(
  localApplicationId: string
): Promise<AmortizationScheduleView | null> {
  const id = localApplicationId.trim();
  const token = internalToken();
  if (!id || !token) {
    return null;
  }

  try {
    const response = await axios.get<{
      success?: boolean;
      data?: unknown;
      message?: string;
    }>(
      `${productMsPlataBaseUrl()}/internal/api/v1/products/applications/by-local/${encodeURIComponent(id)}/amortization-schedule`,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Token': token
        },
        timeout: config.walletServiceHttpTimeoutMs,
        validateStatus: () => true
      }
    );

    if (response.status < 200 || response.status >= 300 || response.data?.success === false) {
      return null;
    }
    return parseAmortizationSchedule(response.data?.data) ?? null;
  } catch {
    return null;
  }
}
