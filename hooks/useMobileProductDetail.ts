'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { ENDPOINTS } from '@/lib/endpoints';
import { getAccessToken } from '@/lib/cookieAuth';
import { mapApiProductToMobileProduct, type MobileProduct } from '@/lib/storefrontProducts';

type ProductDetailResponse = {
  success?: boolean;
  data?: unknown;
  error?: string;
  message?: string;
};

type UseMobileProductDetailOptions = {
  productId?: string;
  enabled?: boolean;
};

export function useMobileProductDetail({
  productId,
  enabled = true,
}: UseMobileProductDetailOptions) {
  const [product, setProduct] = useState<MobileProduct | null>(null);
  const [loading, setLoading] = useState(Boolean(enabled && productId));
  const [error, setError] = useState<string | null>(null);

  const fetchProduct = useCallback(async () => {
    if (!enabled || !productId?.trim()) {
      setProduct(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const hasToken = typeof window !== 'undefined' && Boolean(getAccessToken());
      const res = await apiClient.get<ProductDetailResponse>(
        ENDPOINTS.products.byId(productId.trim()),
        { includeAuth: hasToken, timeout: 30_000 },
      );

      if (!res.data?.success) {
        throw new Error(res.data?.error || res.data?.message || `Failed to fetch product (${res.status})`);
      }

      const row = res.data.data && typeof res.data.data === 'object' ? res.data.data as Record<string, unknown> : null;
      const mapped = row ? mapApiProductToMobileProduct(row) : null;
      if (!mapped) {
        throw new Error('Invalid product detail response');
      }

      setProduct(mapped);
    } catch (err) {
      console.error('Error fetching product detail:', err);
      setProduct(null);
      setError(err instanceof Error ? err.message : 'Failed to fetch product detail');
    } finally {
      setLoading(false);
    }
  }, [enabled, productId]);

  useEffect(() => {
    void fetchProduct();
  }, [fetchProduct]);

  return {
    product,
    loading,
    error,
    refetch: fetchProduct,
  };
}
