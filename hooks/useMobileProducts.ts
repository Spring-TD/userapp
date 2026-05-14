'use client';

import { useState, useEffect, useCallback } from 'react';

// Product type matching the backend
export interface MobileProduct {
  id: string;
  referenceNumber: string;
  name: string;
  description: string;
  type: 'Loan' | 'Mortgage' | 'Savings' | 'Commodity';
  appId: string;
  status: string;
  isActive: boolean;
  image?: string;
  interestRate?: string;
  duration?: string;
  // Mortgage-specific
  equityContribution?: number;
  propertyValue?: number;
  // Commodity-specific
  price?: number;
  minimumQuantity?: number;
  unitOfMeasure?: string;
  createdAt: string;
  updatedAt: string;
}

interface UseMobileProductsOptions {
  type?: 'Loan' | 'Mortgage' | 'Savings' | 'Commodity';
  springAppId?: string; // Spring App ID to filter products
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

const PRODUCT_MS_URL = process.env.NEXT_PUBLIC_PRODUCT_MS_URL || 'https://product-ms.fly.dev';

export function useMobileProducts(options: UseMobileProductsOptions = {}): UseMobileProductsReturn {
  const { type, springAppId, autoFetch = true, tenantReady = true } = options;

  const [products, setProducts] = useState<MobileProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Use Next.js API proxy instead of hitting product-ms directly
      const url = new URL(`/api/products/active`, window.location.origin);
      if (type) {
        url.searchParams.set('type', type);
      }
      if (springAppId) {
        url.searchParams.set('springAppId', springAppId);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        let list = (data.data || []).map((p: Record<string, unknown>) => {
          const id = String(p.id ?? p._id ?? '').trim();
          return { ...p, id } as MobileProduct;
        }).filter((p: MobileProduct) => Boolean(p.id));
        if (springAppId) {
          list = list.filter((p: MobileProduct) => p.appId === springAppId);
        }
        setProducts(list);
      } else {
        throw new Error(data.error || 'Failed to fetch products');
      }
    } catch (err) {
      console.error('Error fetching mobile products:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch products');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [type, springAppId]);

  useEffect(() => {
    if (autoFetch && tenantReady) {
      fetchProducts();
    }
  }, [autoFetch, tenantReady, fetchProducts]);

  const getProductById = useCallback((id: string): MobileProduct | undefined => {
    return products.find(p => p.id === id);
  }, [products]);

  const getProductsByType = useCallback((productType: string): MobileProduct[] => {
    const want = productType.toLowerCase();
    return products.filter((p) => String(p.type ?? '').toLowerCase() === want);
  }, [products]);

  return {
    products,
    loading,
    error,
    refetch: fetchProducts,
    getProductById,
    getProductsByType,
  };
}

// Helper hook for specific product types
export function useLoanProducts() {
  return useMobileProducts({ type: 'Loan' });
}

export function useMortgageProducts() {
  return useMobileProducts({ type: 'Mortgage' });
}

export function useSavingsProducts() {
  return useMobileProducts({ type: 'Savings' });
}

export function useCommodityProducts() {
  return useMobileProducts({ type: 'Commodity' });
}
