import axios from 'axios';
import { config } from '../config/environment';
import { ApiError } from '../middleware/errorHandler';

function productMsPlataBaseUrl(): string {
  return config.plataProductServicePublicUrl.replace(/\/+$/, '');
}

function internalToken(): string {
  return (config.plataProductInternalToken || config.jwtSecret || '').trim();
}

function internalHeaders(): Record<string, string> {
  const token = internalToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'X-Internal-Token': token } : {})
  };
}

type PlataProxyResponse<T> = {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
};

async function postProxy<T>(
  localApplicationId: string,
  actionPath: string,
  body?: Record<string, unknown>
): Promise<T> {
  const token = internalToken();
  if (!token) {
    throw new Error('Plata product-ms internal token is not configured (JWT_SECRET)');
  }

  const response = await axios.post<PlataProxyResponse<T>>(
    `${productMsPlataBaseUrl()}/internal/api/v1/products/applications/by-local/${encodeURIComponent(localApplicationId)}/pending-approved-mortgage${actionPath}`,
    body ?? {},
    {
      headers: internalHeaders(),
      timeout: config.walletServiceHttpTimeoutMs,
      validateStatus: () => true
    }
  );

  if (response.status >= 200 && response.status < 300 && response.data?.success !== false) {
    return (response.data?.data ?? response.data) as T;
  }

  const message =
    response.data?.error ||
    response.data?.message ||
    `Plata pending-approved-mortgage proxy failed (${response.status})`;
  throw new ApiError(response.status, message);
}

async function getProxy<T>(localApplicationId: string): Promise<T> {
  const token = internalToken();
  if (!token) {
    throw new Error('Plata product-ms internal token is not configured (JWT_SECRET)');
  }

  const response = await axios.get<PlataProxyResponse<T>>(
    `${productMsPlataBaseUrl()}/internal/api/v1/products/applications/by-local/${encodeURIComponent(localApplicationId)}/pending-approved-mortgage`,
    {
      headers: internalHeaders(),
      timeout: config.walletServiceHttpTimeoutMs,
      validateStatus: () => true
    }
  );

  if (response.status >= 200 && response.status < 300 && response.data?.success !== false) {
    return (response.data?.data ?? response.data) as T;
  }

  const message =
    response.data?.error ||
    response.data?.message ||
    `Plata pending-approved-mortgage fetch failed (${response.status})`;
  throw new ApiError(response.status, message);
}

export type UpstreamPendingApprovedMortgage = Record<string, unknown>;

export async function fetchUpstreamPendingApprovedMortgage(
  localApplicationId: string
): Promise<UpstreamPendingApprovedMortgage> {
  return getProxy(localApplicationId);
}

export async function proxyRespondToMortgageOffer(
  localApplicationId: string,
  input: { action: 'accept' | 'decline'; acceptedTerms?: boolean; springUserId?: string }
): Promise<UpstreamPendingApprovedMortgage> {
  return postProxy(localApplicationId, '/offer', input);
}

export async function proxyScheduleMortgageInspection(
  localApplicationId: string,
  input: { scheduledFor: string; notes?: string; location?: string; springUserId?: string }
): Promise<UpstreamPendingApprovedMortgage> {
  return postProxy(localApplicationId, '/appointment', input);
}

export async function proxyStartMortgageInspection(
  localApplicationId: string,
  springUserId?: string
): Promise<UpstreamPendingApprovedMortgage> {
  return postProxy(localApplicationId, '/inspection/start', springUserId ? { springUserId } : {});
}

export async function proxyCompleteMortgageVirtualInspection(
  localApplicationId: string,
  input?: { notes?: string; springUserId?: string }
): Promise<UpstreamPendingApprovedMortgage> {
  return postProxy(localApplicationId, '/virtual-inspection/complete', input ?? {});
}

export async function proxyCompleteMortgageInspection(
  localApplicationId: string,
  input: { outcome: 'completed' | 'declined_offer'; springUserId?: string }
): Promise<UpstreamPendingApprovedMortgage> {
  return postProxy(localApplicationId, '/inspection/complete', input);
}

export async function proxyMortgageDownPayment(
  localApplicationId: string,
  input?: { amount?: number; springUserId?: string; providerReference?: string }
): Promise<UpstreamPendingApprovedMortgage> {
  return postProxy(localApplicationId, '/down-payment', input ?? {});
}

export async function proxySignMortgageContract(
  localApplicationId: string,
  input: { acceptedTerms: boolean; springUserId?: string }
): Promise<UpstreamPendingApprovedMortgage> {
  return postProxy(localApplicationId, '/contract/sign', input);
}
