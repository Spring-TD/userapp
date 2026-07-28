'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import { ENDPOINTS } from '@/lib/endpoints';
import { getAccessToken } from '@/lib/cookieAuth';
import {
  filterActiveAppProducts,
  mapApiProductToMobileProduct,
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

function extractProductRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];

  const row = payload as Record<string, unknown>;
  if (Array.isArray(row.products)) return row.products;
  if (Array.isArray(row.items)) return row.items;
  if (Array.isArray(row.rows)) return row.rows;

  const nested = row.data;
  if (Array.isArray(nested)) return nested;
  if (nested && typeof nested === 'object') {
    const nestedRow = nested as Record<string, unknown>;
    if (Array.isArray(nestedRow.products)) return nestedRow.products;
    if (Array.isArray(nestedRow.items)) return nestedRow.items;
    if (Array.isArray(nestedRow.rows)) return nestedRow.rows;
  }

  return [];
}

function parseAppProductIsActive(row: Record<string, unknown>, nested?: Record<string, unknown>): boolean {
  const value = row.isActive ?? row.active ?? row.enabled ?? nested?.isActive ?? nested?.active ?? nested?.enabled;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'active', 'enabled', 'on'].includes(normalized)) return true;
    if (['false', '0', 'inactive', 'disabled', 'off'].includes(normalized)) return false;
  }

  // App-scoped rows may omit isActive because the endpoint already represents products turned on for the app.
  return true;
}

function parseOptionalBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'active', 'enabled', 'on', 'featured'].includes(normalized)) return true;
    if (['false', '0', 'inactive', 'disabled', 'off'].includes(normalized)) return false;
  }
  return undefined;
}

function normalizeAppProductRow(row: unknown): Record<string, unknown> | null {
  if (!row || typeof row !== 'object') return null;

  const record = row as Record<string, unknown>;
  const nested = record.product && typeof record.product === 'object'
    ? (record.product as Record<string, unknown>)
    : null;

  if (!nested) {
    return {
      ...record,
      isActive: parseAppProductIsActive(record),
      isFeatured: parseOptionalBoolean(record.isFeatured ?? record.featured) ?? false,
    };
  }

  return {
    ...nested,
    appId: record.appId ?? record.app_id ?? nested.appId ?? nested.app_id,
    isActive: parseAppProductIsActive(record, nested),
    isFeatured:
      parseOptionalBoolean(record.isFeatured ?? record.featured) ??
      parseOptionalBoolean(nested.isFeatured ?? nested.featured) ??
      false,
    upstreamProductId: record.productId ?? record.product_id ?? nested.id ?? nested._id,
  };
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
      const res = await apiClient.get<{ success?: boolean; data?: unknown; products?: unknown[]; error?: string; message?: string }>(
        ENDPOINTS.products.byAppId(springAppId.trim()),
        { includeAuth: hasToken, timeout: 60_000 },
      );

      if (!res.data?.success) {
        throw new Error(res.data?.error || res.data?.message || `Failed to fetch products (${res.status})`);
      }

      const raw = extractProductRows(res.data);
      const active = filterActiveAppProducts(
        raw
          .map(normalizeAppProductRow)
          .filter(Boolean)
          .map((row) => mapApiProductToMobileProduct(row as Record<string, unknown>))
          .filter(Boolean) as MobileProduct[],
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
    (productType: StorefrontProductType | string): MobileProduct[] => {
      const tab = productType as StorefrontProductType;
      return products.filter((p) => productMatchesTab(p, tab));
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
