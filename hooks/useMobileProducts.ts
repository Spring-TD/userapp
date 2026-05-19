'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import { ENDPOINTS } from '@/lib/endpoints';
import { getAccessToken } from '@/lib/cookieAuth';
import {
  filterActiveAppProducts,
  mapApiProductToMobileProduct,
  type MobileProduct,
  type StorefrontProductType,
} from '@/lib/storefrontProducts';

export type { MobileProduct } from '@/lib/storefrontProducts';

interface UseMobileProductsOptions {
  type?: StorefrontProductType;
  /** Tenant app id from `GET /api/v1/apps/resolve/{subdomain}` → `data.id` */
  springAppId?: string;
  autoFetch?: boolean;
  /** When false, skips fetch until mobile v2 tenant is resolved (default: true). */
  tenantReady?: boolean;
}

interface UseMobileProductsReturn {
  products: MobileProduct[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  getProductById: (id: string) => MobileProduct | undefined;
  getProductsByType: (type: string) => MobileProduct[];
}

/**
 * App-scoped catalog — `GET /api/v1/products/app/{appId}` (products the merchant turned on).
 * Do not use `GET /api/v1/products` (full upstream catalog).
 */
export function useMobileProducts(options: UseMobileProductsOptions = {}): UseMobileProductsReturn {
  const { type, springAppId, autoFetch = true, tenantReady = true } = options;

  const [products, setProducts] = useState<MobileProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    if (!springAppId?.trim()) {
      setProducts([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const hasToken = typeof window !== 'undefined' && Boolean(getAccessToken());
      const res = await apiClient.get<{ success?: boolean; data?: unknown[]; error?: string }>(
        ENDPOINTS.products.byAppId(springAppId.trim()),
        { includeAuth: hasToken, timeout: 30_000 },
      );

      if (!res.data?.success) {
        throw new Error(res.data?.error || `Failed to fetch products (${res.status})`);
      }

      const raw = Array.isArray(res.data.data) ? res.data.data : [];
      const active = filterActiveAppProducts(
        raw.map((row) => mapApiProductToMobileProduct(row as Record<string, unknown>)).filter(Boolean) as MobileProduct[],
      );

      let list = active;
      if (type) {
        const want = type.toLowerCase();
        list = list.filter((p) => String(p.type ?? '').toLowerCase() === want);
      }

      setProducts(list);
    } catch (err) {
      console.error('Error fetching app products:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch products');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [type, springAppId]);

  useEffect(() => {
    if (autoFetch && tenantReady) {
      void fetchProducts();
    }
  }, [autoFetch, tenantReady, fetchProducts]);

  const getProductById = useCallback(
    (id: string): MobileProduct | undefined => products.find((p) => p.id === id),
    [products],
  );

  const getProductsByType = useCallback(
    (productType: string): MobileProduct[] => {
      const want = productType.toLowerCase();
      return products.filter((p) => String(p.type ?? '').toLowerCase() === want);
    },
    [products],
  );

  return {
    products,
    loading,
    error,
    refetch: fetchProducts,
    getProductById,
    getProductsByType,
  };
}

export function useLoanProducts(springAppId?: string) {
  return useMobileProducts({ type: 'Loan', springAppId });
}

export function useMortgageProducts(springAppId?: string) {
  return useMobileProducts({ type: 'Mortgage', springAppId });
}

export function useSavingsProducts(springAppId?: string) {
  return useMobileProducts({ type: 'Savings', springAppId });
}

export function useCommodityProducts(springAppId?: string) {
  return useMobileProducts({ type: 'Commodity', springAppId });
}
