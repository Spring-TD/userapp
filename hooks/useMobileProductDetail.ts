'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchMobileProductById } from '@/lib/fetchMobileProductById';
import type { MobileProduct } from '@/lib/storefrontProducts';

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
      const mapped = await fetchMobileProductById(productId.trim());
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
