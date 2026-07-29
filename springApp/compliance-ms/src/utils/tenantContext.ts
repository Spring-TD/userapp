import { Request } from 'express';

export type TenantContext = {
  merchantId: string;
  appId: string;
  subdomain?: string;
};

function headerValue(raw: string | string[] | undefined): string | undefined {
  if (Array.isArray(raw)) {
    return raw[0]?.trim() || undefined;
  }
  if (typeof raw === 'string' && raw.trim()) {
    return raw.trim();
  }
  return undefined;
}

/**
 * Resolve merchant app context from gateway tenant headers and optional JWT merchant id.
 */
export function resolveTenantContext(req: Request): TenantContext | null {
  const appId = headerValue(req.headers['x-tenant-app-id']);
  const merchantId =
    headerValue(req.headers['x-tenant-merchant-id']) ||
    (req.user as { userMerchantId?: string } | undefined)?.userMerchantId;

  if (!appId || !merchantId) {
    return null;
  }

  return {
    merchantId,
    appId,
    subdomain: headerValue(req.headers['x-tenant-subdomain'])
  };
}

export function buildKycLinkFeeReference(appId: string, userId: string): string {
  return `KYC_LINK:${appId}:${userId}`;
}

export function buildKycLinkFeeRefundReference(appId: string, userId: string): string {
  return `KYC_LINK_REFUND:${appId}:${userId}`;
}
