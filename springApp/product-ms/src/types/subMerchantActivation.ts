import { ApiError } from '../middleware/errorHandler';

/** Sub-merchant (merchant turning the product on) for Plata sub-merchant-activations. */
export interface SubMerchantIdentity {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export interface SubMerchantActivationContext {
  merchantId: string;
  merchantName: string;
  productName?: string;
  subMerchant: SubMerchantIdentity;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function assertLen(label: string, value: string, min: number, max: number): void {
  if (value.length < min || value.length > max) {
    throw new ApiError(400, `${label} must be between ${min} and ${max} characters`);
  }
}

/**
 * Validates body fields required when `activate` is true.
 * Matches Plata POST /api/v1/products/sub-merchant-activations constraints.
 */
export function parseSubMerchantActivationContext(body: Record<string, unknown>): SubMerchantActivationContext {
  const merchantId = String(body.merchantId ?? '').trim();
  const merchantName = String(body.merchantName ?? '').trim();

  assertLen('merchantId', merchantId, 1, 200);
  assertLen('merchantName', merchantName, 1, 200);

  const subRaw = body.subMerchant;
  if (!subRaw || typeof subRaw !== 'object' || Array.isArray(subRaw)) {
    throw new ApiError(400, 'subMerchant object is required when activate is true');
  }
  const s = subRaw as Record<string, unknown>;
  const id = String(s.id ?? '').trim();
  const name = String(s.name ?? '').trim();
  const email = String(s.email ?? '').trim();
  const phone = String(s.phone ?? '').trim();

  assertLen('subMerchant.id', id, 1, 200);
  assertLen('subMerchant.name', name, 1, 200);
  assertLen('subMerchant.email', email, 1, 320);
  assertLen('subMerchant.phone', phone, 3, 40);

  if (!EMAIL_RE.test(email)) {
    throw new ApiError(400, 'subMerchant.email must be a valid email address');
  }

  let productName: string | undefined;
  if (body.productName !== undefined && body.productName !== null) {
    const pn = String(body.productName).trim();
    if (pn.length > 0) {
      assertLen('productName', pn, 1, 300);
      productName = pn;
    }
  }

  return {
    merchantId,
    merchantName,
    ...(productName !== undefined ? { productName } : {}),
    subMerchant: { id, name, email, phone }
  };
}
