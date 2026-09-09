'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  peekQuery,
  subscribeQuery,
} from '@/lib/sessionQueryCache';
import {
  loadStorefrontProducts,
  storefrontProductsKey,
} from '@/lib/storefrontSessionData';
import {
  productMatchesTab,
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

function filterByType(products: MobileProduct[], type?: StorefrontProductType) {
  if (!type) return products;
  const want = type.toLowerCase();
  return products.filter((p) => String(p.type ?? '').toLowerCase() === want);
}

/**
 * App-scoped catalog — `GET /api/v1/products/app/{appId}` (products the merchant turned on).
 * Shared in-memory cache so home, nav, tabs, and detail reuse one fetch.
 */
export function useMobileProducts(options: UseMobileProductsOptions = {}): UseMobileProductsReturn {
  const { type, springAppId, autoFetch = true, tenantReady = true } = options;
  const appId = springAppId?.trim() || '';
  const cacheKey = appId ? storefrontProductsKey(appId) : '';

  const [allProducts, setAllProducts] = useState<MobileProduct[]>(() =>
    cacheKey ? peekQuery<MobileProduct[]>(cacheKey) ?? [] : [],
  );
  const [loading, setLoading] = useState(() => Boolean(appId && peekQuery(cacheKey) === undefined));
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async (force = false) => {
    if (!appId) {
      setAllProducts([]);
      setLoading(false);
      setError(null);
      return;
    }

    const cached = peekQuery<MobileProduct[]>(storefrontProductsKey(appId));
    if (!force && cached) {
      setAllProducts(cached);
      setLoading(false);
      setError(null);
    } else if (!cached) {
      setLoading(true);
    }

    try {
      const list = await loadStorefrontProducts(appId, { force });
      setAllProducts(list);
      setError(null);
    } catch (err) {
      console.error('Error fetching app products:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch products');
      if (!peekQuery(storefrontProductsKey(appId))) setAllProducts([]);
    } finally {
      setLoading(false);
    }
  }, [appId]);

  useEffect(() => {
    if (!cacheKey) return;
    return subscribeQuery(cacheKey, () => {
      const hit = peekQuery<MobileProduct[]>(cacheKey);
      if (hit) {
        setAllProducts(hit);
        setLoading(false);
        setError(null);
      }
    });
  }, [cacheKey]);

  useEffect(() => {
    if (autoFetch && tenantReady) {
      void fetchProducts();
    }
  }, [autoFetch, tenantReady, fetchProducts]);

  const products = filterByType(allProducts, type);

  const getProductById = useCallback(
    (id: string): MobileProduct | undefined => products.find((p) => p.id === id),
    [products],
  );

  const getProductsByType = useCallback(
    (productType: StorefrontProductType | string): MobileProduct[] => {
      const tab = productType as StorefrontProductType;
      return allProducts.filter((p) => productMatchesTab(p, tab));
    },
    [allProducts],
  );

  return {
    products,
    loading,
    error,
    refetch: () => fetchProducts(true),
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
