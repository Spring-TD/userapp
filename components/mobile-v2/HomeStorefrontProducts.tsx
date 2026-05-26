'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { MobileV2ProductListSkeleton } from '@/components/mobile-v2/data-skeletons';
import type { MobileProduct } from '@/lib/storefrontProducts';
import {
  productMatchesTab,
  storefrontProductDetailHref,
  storefrontProductTypeRoute,
  type StorefrontProductType,
} from '@/lib/storefrontProducts';

const TYPE_ORDER: StorefrontProductType[] = ['Loan', 'Mortgage', 'Savings', 'Invest', 'Commodity'];

type Props = {
  products: MobileProduct[];
  loading: boolean;
  error: string | null;
  tenantReady: boolean;
  appId: string | null;
  tenantError?: string | null;
};

export function HomeStorefrontProducts({
  products,
  loading,
  error,
  tenantReady,
  appId,
  tenantError,
}: Props) {
  if (!tenantReady || loading) {
    return (
      <div className="px-6 mb-8">
        <h3 className="font-bold text-[#1E293B] mb-4">Products</h3>
        <MobileV2ProductListSkeleton />
      </div>
    );
  }

  if (!appId) {
    return (
      <div className="px-6 mb-8">
        <h3 className="font-bold text-[#1E293B] mb-2">Products</h3>
        <p className="text-sm text-amber-800 rounded-xl bg-amber-50 px-3 py-2">
          Open this app from your store link (e.g. crbc.tryspring.io) to load products for this storefront.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 mb-8">
        <h3 className="font-bold text-[#1E293B] mb-2">Products</h3>
        <p className="text-sm text-red-700 rounded-xl bg-red-50 px-3 py-2">{error}</p>
        {tenantError ? <p className="mt-2 text-xs text-gray-500">{tenantError}</p> : null}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="px-6 mb-8">
        <h3 className="font-bold text-[#1E293B] mb-2">Products</h3>
        <p className="text-sm text-gray-500">
          No active products for this app yet. Ask your merchant to enable products in the builder.
        </p>
      </div>
    );
  }

  const byType = TYPE_ORDER.map((t) => ({
    type: t,
    items: products
      .filter((p) => productMatchesTab(p, t))
      .sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured)),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="px-6 mb-8 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-[#1E293B]">Products for you</h3>
        <span className="text-[11px] text-gray-400">{products.length} active</span>
      </div>

      {byType.map(({ type, items }) => (
        <div key={type}>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-[#1E293B]">{type}</h4>
            <Link
              href={storefrontProductTypeRoute(type)}
              className="text-[11px] font-semibold text-[var(--sf-primary,#2563EB)] flex items-center gap-0.5"
            >
              See all
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="-mx-1 flex gap-3 overflow-x-auto pb-1 pl-1 pr-4 no-scrollbar">
            {items.map((product) => (
              <Link
                key={product.id}
                href={storefrontProductDetailHref(product)}
                className="w-[200px] shrink-0 rounded-[20px] border border-gray-100 bg-white p-4 shadow-sm hover:border-[var(--sf-primary,#2563EB)]/30 transition-colors"
              >
                <span className="inline-block rounded-md bg-[var(--sf-tint,#E0E7FF)] px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--sf-primary,#2563EB)]">
                  {product.isFeatured ? 'Featured' : product.subType || product.type}
                </span>
                <h5 className="mt-2 text-sm font-bold text-[#1E293B] line-clamp-2">{product.name}</h5>
                <p className="mt-1 text-[11px] text-gray-500 line-clamp-2">{product.description}</p>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
