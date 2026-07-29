import axios from 'axios';
import { config } from '../config/environment';

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
    `${productMsPlataBaseUrl()}/internal/api/v1/products/applications/by-local/${encodeURIComponent(localApplicationId)}/pending-approved-loan${actionPath}`,
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
    `Plata pending-approved-loan proxy failed (${response.status})`;
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = response.status;
  throw error;
}

async function getProxy<T>(localApplicationId: string): Promise<T> {
  const token = internalToken();
  if (!token) {
    throw new Error('Plata product-ms internal token is not configured (JWT_SECRET)');
  }

  const response = await axios.get<PlataProxyResponse<T>>(
    `${productMsPlataBaseUrl()}/internal/api/v1/products/applications/by-local/${encodeURIComponent(localApplicationId)}/pending-approved-loan`,
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
    `Plata pending-approved-loan fetch failed (${response.status})`;
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = response.status;
  throw error;
}

export type UpstreamPendingApprovedLoan = Record<string, unknown>;

export async function fetchUpstreamPendingApprovedLoan(
  localApplicationId: string
): Promise<UpstreamPendingApprovedLoan> {
  return getProxy(localApplicationId);
}

export async function proxyRespondToLoanOffer(
  localApplicationId: string,
  input: { action: 'accept' | 'decline'; acceptedTerms?: boolean; springUserId?: string }
): Promise<UpstreamPendingApprovedLoan> {
  return postProxy(localApplicationId, '/offer', input);
}
