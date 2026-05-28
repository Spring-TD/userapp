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

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function extractDetailRow(payload: unknown, productId: string): Record<string, unknown> | null {
  const direct = asRecord(payload);
  if (!direct) return null;

  const data = direct.data;
  if (Array.isArray(data)) {
    return (
      data
        .map((item) => asRecord(item))
        .find((item) => {
          if (!item) return false;
          return [item.id, item._id, item.upstreamProductId, item.productId, item.product_id]
            .some((candidate) => String(candidate ?? '').trim() === productId);
        }) ?? null
    );
  }

  const dataRecord = asRecord(data);
  if (dataRecord) {
    if (Array.isArray(dataRecord.products)) {
      return (
        dataRecord.products
          .map((item) => asRecord(item))
          .find((item) => {
            if (!item) return false;
            return [item.id, item._id, item.upstreamProductId, item.productId, item.product_id]
              .some((candidate) => String(candidate ?? '').trim() === productId);
          }) ?? null
      );
    }

    const nestedProduct = asRecord(dataRecord.product);
    return nestedProduct ? { ...nestedProduct, ...dataRecord, product: undefined } : dataRecord;
  }

  const nestedProduct = asRecord(direct.product);
  return nestedProduct ? { ...nestedProduct, ...direct, product: undefined } : direct;
}

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

      const row = extractDetailRow(res.data, productId.trim());
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
