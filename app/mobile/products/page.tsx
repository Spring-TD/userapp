'use client';

import MobileBottomNav from '../components/MobileBottomNav';
import { Loader2, PackageOpen } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useMobileProducts, type MobileProduct } from '@/hooks/useMobileProducts';
import {
  getDisplayProductType,
  storefrontProductDetailHref,
  type StorefrontProductType,
} from '@/lib/storefrontProducts';
import { amountRange, rateLabel } from '@/lib/mobileProductDetailDisplay';

const CATEGORIES: StorefrontProductType[] = ['Commodity', 'Mortgage', 'Loan', 'Savings', 'Invest'];

function formatAmount(product: MobileProduct): string {
  return amountRange(product);
}

function ProductCard({ product }: { product: MobileProduct }) {
  const displayType = getDisplayProductType(product);
  const fallbackImage =
    displayType === 'Mortgage'
      ? 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200&auto=format&fit=crop'
      : displayType === 'Commodity'
        ? 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?q=80&w=1200&auto=format&fit=crop'
        : 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=1200&auto=format&fit=crop';

  return (
    <Link href={storefrontProductDetailHref(product)} className="group block">
      <div className="aspect-square overflow-hidden rounded-2xl bg-gray-100">
        <img
          src={product.image || fallbackImage}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="mt-3 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 text-sm font-semibold text-gray-900">{product.name}</h3>
          {product.isFeatured ? (
            <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-bold uppercase text-blue-600">
              Featured
            </span>
          ) : null}
        </div>
        <p className="line-clamp-2 text-xs leading-relaxed text-gray-500">
          {product.description || product.subType || `${displayType} product`}
        </p>
        <p className="text-sm font-bold text-gray-900">{formatAmount(product)}</p>
        <p className="text-xs font-medium text-blue-600">
          {rateLabel(product)}
          {product.duration ? ` · ${product.duration}` : ''}
        </p>
        {displayType === 'Commodity' && product.minimumQuantity ? (
          <p className="text-[11px] text-gray-500">Min quantity: {product.minimumQuantity.toLocaleString()}</p>
        ) : null}
      </div>
    </Link>
  );
}

function EmptyState({ type, error }: { type: StorefrontProductType; error?: string | null }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
        <PackageOpen className="h-8 w-8 text-blue-400" />
      </div>
      <h2 className="text-base font-bold text-gray-900">No {type.toLowerCase()} products yet</h2>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-gray-500">
        Only products turned on for this app are shown here.
      </p>
      {error ? <p className="mt-3 max-w-xs rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">{error}</p> : null}
    </div>
  );
}

export default function ProductsPage() {
  const [activeTab, setActiveTab] = useState<StorefrontProductType>('Commodity');
  const springAppId = process.env.NEXT_PUBLIC_SPRING_APP_ID;
  const { loading, error, getProductsByType } = useMobileProducts({ springAppId });
  const products = getProductsByType(activeTab).sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));

  return (
    <div className="flex min-h-screen flex-col bg-white pb-24">
      <div className="sticky top-0 z-10 bg-white px-6 pb-2 pt-6">
        <div className="flex items-center gap-6 overflow-x-auto pb-2 no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveTab(cat)}
              className={`whitespace-nowrap border-b-2 pb-2 text-sm font-medium transition-colors ${
                activeTab === cat
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <main className="mt-4 px-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : products.length > 0 ? (
          <section>
            <h1 className="mb-4 text-lg font-bold text-gray-900">Available {activeTab} Products</h1>
            <div className="grid grid-cols-2 gap-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        ) : (
          <EmptyState type={activeTab} error={error} />
        )}
      </main>

      <MobileBottomNav active="products" />
    </div>
  );
}
