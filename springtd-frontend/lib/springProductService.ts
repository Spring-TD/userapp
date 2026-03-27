/**
 * Spring Product Service
 * Integrates with Spring App's Product MS for product management
 * Uses Next.js API proxy to avoid CORS issues
 *
 * All routes here go through:
 *   /api/spring-products → NEXT_PUBLIC_SPRING_PRODUCT_SERVICE_URL → product-ms.fly.dev
 *
 * NOT to be confused with the Plata Product Builder routes:
 *   /api/products → NEXT_PUBLIC_PLATA_PRODUCT_SERVICE_URL → product-ms-plata.fly.dev
 */

const getAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

/**
 * Extract merchant ID from JWT token
 * Checks: userMerchantId, user_merchant_id, merchantId, userId, id, sub
 */
const getMerchantIdFromToken = (): string | null => {
  if (typeof window === 'undefined') return null;

  const token = localStorage.getItem('accessToken');
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.userMerchantId ||
      payload.user_merchant_id ||
      payload.merchantId ||
      payload.userId ||
      payload.id ||
      payload.sub ||
      null;
  } catch {
    return null;
  }
};

export const springProductService = {
  /**
   * Get all products from Spring's Product MS
   * Optionally filtered by appId
   */
  async getAllProducts(appId?: string) {
    const url = appId
      ? `/api/spring-products?appId=${encodeURIComponent(appId)}`
      : '/api/spring-products';

    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch products' }));
      throw new Error(error.error || 'Failed to fetch products');
    }

    return response.json();
  },

  /**
   * Get a single product by ID from Spring's Product MS
   */
  async getProductById(productId: string) {
    const response = await fetch(`/api/spring-products/${productId}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch product' }));
      throw new Error(error.error || 'Failed to fetch product');
    }

    return response.json();
  },

  /**
   * Toggle product activation for merchant
   * Calls /api/spring-products/toggle/{merchantId}/{productId} → product-ms.fly.dev
   */
  async toggleProductActivation(merchantId: string, productId: string, activate: boolean) {
    const response = await fetch(`/api/spring-products/toggle/${merchantId}/${productId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ activate }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to toggle product' }));
      throw new Error(error.error || 'Failed to toggle product');
    }

    return response.json();
  },

  /**
   * Get merchant ID from current user's token
   */
  getMerchantId(): string | null {
    return getMerchantIdFromToken();
  },
};
