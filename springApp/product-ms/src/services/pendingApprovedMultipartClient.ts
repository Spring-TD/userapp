import axios from 'axios';
import { config } from '../config/environment';

function productMsPlataBaseUrl(): string {
  return config.plataProductServicePublicUrl.replace(/\/+$/, '');
}

function internalToken(): string {
  return (config.plataProductInternalToken || config.jwtSecret || '').trim();
}

type PlataProxyResponse<T> = {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
};

function buildMultipartBody(
  file: { buffer: Buffer; fileName: string; mimeType: string }
): { body: Buffer; contentType: string } {
  const boundary = `----plataform${Date.now()}${Math.random().toString(16).slice(2)}`;
  const chunks: Buffer[] = [
    Buffer.from(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="${file.fileName}"\r\n` +
        `Content-Type: ${file.mimeType}\r\n\r\n`
    ),
    file.buffer,
    Buffer.from(`\r\n--${boundary}--\r\n`)
  ];
  return {
    body: Buffer.concat(chunks),
    contentType: `multipart/form-data; boundary=${boundary}`
  };
}

async function postMultipartProxy<T>(
  localApplicationId: string,
  productPath: 'pending-approved-mortgage' | 'pending-approved-loan',
  actionPath: string,
  file: { buffer: Buffer; fileName: string; mimeType: string }
): Promise<T> {
  const token = internalToken();
  if (!token) {
    throw new Error('Plata product-ms internal token is not configured (JWT_SECRET)');
  }

  const { body, contentType } = buildMultipartBody(file);
  const response = await axios.post<PlataProxyResponse<T>>(
    `${productMsPlataBaseUrl()}/internal/api/v1/products/applications/by-local/${encodeURIComponent(localApplicationId)}/${productPath}${actionPath}`,
    body,
    {
      headers: {
        'Content-Type': contentType,
        'X-Internal-Token': token
      },
      timeout: config.walletServiceHttpTimeoutMs,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      validateStatus: () => true
    }
  );

  if (response.status >= 200 && response.status < 300 && response.data?.success !== false) {
    return (response.data?.data ?? response.data) as T;
  }

  const message =
    response.data?.error ||
    response.data?.message ||
    `Plata ${productPath} multipart proxy failed (${response.status})`;
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = response.status;
  throw error;
}

export type UpstreamSignedContractUpload = Record<string, unknown>;

export async function proxyUploadSignedMortgageContract(
  localApplicationId: string,
  file: { buffer: Buffer; fileName: string; mimeType: string }
): Promise<UpstreamSignedContractUpload> {
  return postMultipartProxy(
    localApplicationId,
    'pending-approved-mortgage',
    '/contract/upload-signed',
    file
  );
}

export async function proxyUploadSignedLoanContract(
  localApplicationId: string,
  file: { buffer: Buffer; fileName: string; mimeType: string }
): Promise<UpstreamSignedContractUpload> {
  return postMultipartProxy(
    localApplicationId,
    'pending-approved-loan',
    '/contract/upload-signed',
    file
  );
}
