'use client';

import MobileBottomNav from '../components/MobileBottomNav';
import { Heart, Film, Target, Lock, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useMobileProducts, MobileProduct } from '@/hooks/useMobileProducts';

const CATEGORIES = ['Commodity', 'Mortgage', 'Loan', 'Savings'];

const COMMODITY_POPULAR = [
  {
    id: '1',
    name: 'A plot of Corn',
    price: '1780',
    image: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?q=80&w=2070&auto=format&fit=crop',
    tag: 'New'
  },
  {
    id: '2',
    name: 'Rice Farm',
    price: '1780',
    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?q=80&w=2070&auto=format&fit=crop',
    tag: 'Sale'
  },
  {
    id: '3',
    name: 'Toyota Hilux',
    price: '1780',
    image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=2070&auto=format&fit=crop',
    tag: 'Hot'
  },
  {
    id: '4',
    name: 'Modern House',
    price: '1780',
    image: 'https://images.unsplash.com/photo-1600596542815-e328701102b9?q=80&w=2069&auto=format&fit=crop',
    tag: ''
  }
];

const COMMODITY_GRID = [
  {
    id: '5',
    name: 'Luxury Home',
    description: 'Lorem ipsum dolor sit amet consectetur',
    price: 'N16M',
    image: 'https://images.unsplash.com/photo-1600596542815-e328701102b9?q=80&w=2069&auto=format&fit=crop'
  },
  {
    id: '6',
    name: 'Corn Field',
    description: 'Lorem ipsum dolor sit amet consectetur',
    price: 'N16M',
    image: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?q=80&w=2070&auto=format&fit=crop'
  },
  {
    id: '7',
    name: 'Off-road Vehicle',
    description: 'Lorem ipsum dolor sit amet consectetur',
    price: 'N16M',
    image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=2070&auto=format&fit=crop'
  },
  {
    id: '8',
    name: 'Rice Plantation',
    description: 'Lorem ipsum dolor sit amet consectetur',
    price: 'N16M',
    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?q=80&w=2070&auto=format&fit=crop'
  }
];

const MORTGAGE_FEATURES = [
  { id: 'm1', image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop' },
  { id: 'm2', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop' },
  { id: 'm3', image: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?q=80&w=2070&auto=format&fit=crop' },
];

const MORTGAGE_HOT = [
  {
    id: 'h1',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop',
    description: 'Lorem ipsum dolor sit amet consectetur.',
    price: '18M',
    seller: 'Sellers details'
  },
  {
    id: 'h2',
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop',
    description: 'Lorem ipsum dolor sit amet consectetur.',
    price: '50M',
    seller: 'Sellers details'
  },
  {
    id: 'h3',
    image: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?q=80&w=2070&auto=format&fit=crop',
    description: 'Lorem ipsum dolor sit amet consectetur.',
    price: '18M',
    seller: 'Sellers details'
  },
  {
    id: 'h4',
    image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=2053&auto=format&fit=crop',
    description: 'Lorem ipsum dolor sit amet consectetur.',
    price: '18M',
    seller: 'Sellers details'
  }
];

const SAVINGS_OPTIONS = [
  {
    id: 'flex-naira',
    title: 'Flex Naira',
    description: 'Flexible savings for emergencies. Free transfers, withdrawals etc. 8% p.a',
    rate: '2.00',
    icon: <Film className="w-6 h-6 text-purple-600" />,
    bg: 'bg-purple-50',
    titleColor: 'text-purple-600',
    link: '/mobile/savings/flex-naira'
  },
  {
    id: 'flex-dollar',
    title: 'Flex Dollar',
    description: 'Flexible savings for emergencies. Free transfers, withdrawals etc. 8% p.a',
    rate: '2.00',
    icon: <Film className="w-6 h-6 text-orange-600" />,
    bg: 'bg-orange-50',
    titleColor: 'text-orange-600',
    link: '/mobile/savings/flex-dollar'
  },
  {
    id: 'targets',
    title: 'Targets Savings',
    description: 'Reach your unique individual saving goals. 9% p.a',
    rate: '2.00',
    icon: <Target className="w-6 h-6 text-green-600" />,
    bg: 'bg-green-50',
    titleColor: 'text-green-600',
    link: '/mobile/savings/target-savings'
  },
  {
    id: 'safe-lock',
    title: 'Safe Lock',
    description: 'Reach your unique individual saving goals. 9% p.a',
    rate: '2.00',
    icon: <Lock className="w-6 h-6 text-yellow-600" />,
    bg: 'bg-yellow-50',
    titleColor: 'text-yellow-600',
    link: '/mobile/savings/safe-lock'
  }
];

export default function ProductsPage() {
  const [activeTab, setActiveTab] = useState('Commodity');

  // Fetch real products from the API filtered by Spring App ID
  const springAppId = process.env.NEXT_PUBLIC_SPRING_APP_ID;
  const { products, loading, error } = useMobileProducts({ springAppId });

  // Filter products by current tab/type
  const getProductsByType = (type: string): MobileProduct[] => {
    return products.filter(p => p.type === type);
  };

  // Helper to format price
  const formatPrice = (price?: number): string => {
    if (!price) return 'N/A';
    if (price >= 1000000) return `N${(price / 1000000).toFixed(0)}M`;
    if (price >= 1000) return `N${(price / 1000).toFixed(0)}K`;
    return `N${price}`;
  };

  // Check if we have real products for this type
  const hasRealProducts = (type: string): boolean => {
    return getProductsByType(type).length > 0;
  };

  return (
    <div className="flex flex-col min-h-screen bg-white pb-24">
      {/* Header Tabs */}
      <div className="sticky top-0 bg-white z-10 px-6 pt-6 pb-2">
        <div className="flex items-center gap-6 overflow-x-auto no-scrollbar pb-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={`whitespace-nowrap pb-2 text-sm font-medium transition-colors border-b-2 ${activeTab === cat
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 space-y-8 mt-4">
        {activeTab === 'Commodity' && (
          <>
            {/* Loading state */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            )}

            {/* Real Products from API */}
            {!loading && hasRealProducts('Commodity') && (
              <section>
                <h2 className="text-lg font-bold text-gray-900 mb-4">Available Products</h2>
                <div className="grid grid-cols-2 gap-4">
                  {getProductsByType('Commodity').map((product) => (
                    <Link href={`/mobile/products/${product.id}`} key={product.id} className="group">
                      <div className="aspect-square rounded-2xl overflow-hidden mb-3 bg-gray-100">
                        <img
                          src={product.image || 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?q=80&w=2070&auto=format&fit=crop'}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-medium text-gray-900 text-sm line-clamp-1">{product.name}</h3>
                        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                          {product.description}
                        </p>
                        <p className="font-bold text-gray-900 text-lg">{formatPrice(product.price)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Fallback: Demo products when no real products */}
            {!loading && !hasRealProducts('Commodity') && (
              <>
                {/* Most Popular */}
                <section>
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Most Popular</h2>
                  <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 -mx-6 px-6">
                    {COMMODITY_POPULAR.map((product) => (
                      <Link href={`/mobile/products/${product.id}`} key={product.id} className="flex-shrink-0 w-36 group">
                        <div className="relative w-36 h-36 rounded-2xl overflow-hidden mb-2">
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                          <button className="absolute top-2 right-2 w-6 h-6 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors">
                            <Heart size={14} />
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-900">{product.price}</span>
                          <Heart size={14} className="text-blue-600 fill-blue-600" />
                          {product.tag && (
                            <span className="text-xs text-gray-500">{product.tag}</span>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>

                {/* Commodity Grid */}
                <section>
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Commodity</h2>
                  <div className="grid grid-cols-2 gap-4">
                    {COMMODITY_GRID.map((item) => (
                      <Link href={`/mobile/products/${item.id}`} key={item.id} className="group">
                        <div className="aspect-square rounded-2xl overflow-hidden mb-3 bg-gray-100">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                          <p className="font-bold text-gray-900 text-lg">{item.price}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              </>
            )}
          </>
        )}

        {activeTab === 'Mortgage' && (
          <>
            {/* Loading state */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            )}

            {/* Real Products from API */}
            {!loading && hasRealProducts('Mortgage') && (
              <section>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-gray-900">Available Mortgages</h2>
                  <button className="bg-black text-white text-xs px-3 py-1.5 rounded-full">Check Eligibility</button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {getProductsByType('Mortgage').map((product) => (
                    <Link href={`/mobile/mortgage/${product.id}`} key={product.id} className="group">
                      <div className="aspect-[4/5] rounded-2xl overflow-hidden mb-3 bg-gray-100">
                        <img
                          src={product.image || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop'}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-medium text-gray-900 text-sm line-clamp-1">{product.name}</h3>
                        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                          {product.description}
                        </p>
                        <p className="font-bold text-gray-900 text-sm">
                          Property Value: {formatPrice(product.propertyValue)}
                        </p>
                        {product.equityContribution && product.equityContribution > 0 && (
                          <p className="text-xs text-blue-600">
                            Equity: {product.equityContribution}%
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Fallback: Demo products when no real products */}
            {!loading && !hasRealProducts('Mortgage') && (
              <>
                {/* Feature */}
                <section>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-gray-900">Feature</h2>
                    <button className="bg-black text-white text-xs px-3 py-1.5 rounded-full">Check Eligibility</button>
                  </div>
                  <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 -mx-6 px-6">
                    {MORTGAGE_FEATURES.map((item) => (
                      <div key={item.id} className="flex-shrink-0 w-64 h-40 rounded-2xl overflow-hidden">
                        <img src={item.image} alt="Feature" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </section>

                {/* Hot Mortgage */}
                <section>
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Hot Mortgage</h2>
                  <div className="grid grid-cols-2 gap-4">
                    {MORTGAGE_HOT.map((item) => (
                      <Link href={`/mobile/mortgage/${item.id}`} key={item.id} className="group">
                        <div className="aspect-[4/5] rounded-2xl overflow-hidden mb-3 bg-gray-100">
                          <img
                            src={item.image}
                            alt="Mortgage"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                          <p className="font-bold text-gray-900 text-sm">Price {item.price}</p>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-yellow-100 flex items-center justify-center">
                              <div className="w-2 h-2 bg-yellow-600 rounded-full" />
                            </div>
                            <span className="text-xs text-gray-900 font-medium">{item.seller}</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              </>
            )}
          </>
        )}

        {activeTab === 'Savings' && (
          <>
            {/* Total Savings Card */}
            <div className="bg-blue-600 rounded-2xl p-6 text-white mb-8">
              <p className="text-blue-100 text-sm mb-2">Total Savings</p>
              <div className="flex justify-between items-end">
                <h1 className="text-3xl font-bold">₦500,039.12</h1>
                <button className="bg-orange-400 text-white text-xs font-medium px-3 py-1.5 rounded-lg">Quick Save</button>
              </div>
            </div>

            {/* Loading state */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            )}

            {/* Real Products from API */}
            {!loading && hasRealProducts('Savings') && (
              <section>
                <h2 className="text-lg font-bold text-gray-900 mb-4">Available Savings Plans</h2>
                <div className="grid grid-cols-2 gap-4">
                  {getProductsByType('Savings').map((product, index) => {
                    const colors = [
                      { bg: 'bg-purple-50', title: 'text-purple-600' },
                      { bg: 'bg-orange-50', title: 'text-orange-600' },
                      { bg: 'bg-green-50', title: 'text-green-600' },
                      { bg: 'bg-yellow-50', title: 'text-yellow-600' },
                    ];
                    const color = colors[index % colors.length];

                    return (
                      <Link href={`/mobile/savings/${product.id}`} key={product.id} className={`${color.bg} p-4 rounded-2xl flex flex-col h-full`}>
                        <div className="mb-4">
                          <Target className={`w-6 h-6 ${color.title}`} />
                        </div>
                        <h3 className={`font-bold text-sm mb-2 ${color.title}`}>{product.name}</h3>
                        <p className="text-xs text-gray-500 mb-4 flex-1 leading-relaxed">
                          {product.description}
                        </p>
                        {product.interestRate && (
                          <p className="font-bold text-gray-900 text-sm">{product.interestRate}</p>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Fallback: Demo products when no real products */}
            {!loading && !hasRealProducts('Savings') && (
              <div className="grid grid-cols-2 gap-4">
                {SAVINGS_OPTIONS.map((option) => (
                  <Link href={option.link} key={option.id} className={`${option.bg} p-4 rounded-2xl flex flex-col h-full`}>
                    <div className="mb-4">
                      {option.icon}
                    </div>
                    <h3 className={`font-bold text-sm mb-2 ${option.titleColor}`}>{option.title}</h3>
                    <p className="text-xs text-gray-500 mb-4 flex-1 leading-relaxed">
                      {option.description}
                    </p>
                    <p className="font-bold text-gray-900 text-sm">{option.rate}</p>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'Loan' && (
          <>
            {/* Loading state */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            )}

            {/* Real Products from API */}
            {!loading && hasRealProducts('Loan') && (
              <section>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-gray-900">Available Loans</h2>
                  <button className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-full">Check Eligibility</button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {getProductsByType('Loan').map((product) => (
                    <Link href={`/mobile/loan/${product.id}`} key={product.id} className="group">
                      <div className="bg-gradient-to-br from-blue-500 to-blue-700 aspect-square rounded-2xl flex flex-col items-center justify-center mb-3 p-4">
                        <span className="text-white text-3xl font-bold mb-2 text-center line-clamp-2">
                          {product.name}
                        </span>
                        {product.interestRate && (
                          <span className="text-white text-xl font-bold">{product.interestRate}</span>
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500 line-clamp-2">{product.description}</p>
                        {product.duration && (
                          <p className="text-xs text-blue-600">Duration: {product.duration}</p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Fallback: Demo products when no real products */}
            {!loading && !hasRealProducts('Loan') && (
              <>
                {/* Feature Loan */}
                <section>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-gray-900">Feature loan</h2>
                    <button className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-full">Check Eligibility</button>
                  </div>
                  <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 -mx-6 px-6">
                    {[
                      { id: 1, rate: '15%', bg: 'bg-black' },
                      { id: 2, rate: '4%', bg: 'bg-black' },
                      { id: 3, rate: '18%', bg: 'bg-black' },
                      { id: 4, rate: '5%', bg: 'bg-black' },
                    ].map((item) => (
                      <div key={item.id} className={`${item.bg} flex-shrink-0 w-32 h-20 rounded-xl flex items-center justify-center`}>
                        <span className="text-white text-3xl font-bold">{item.rate}</span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Hot Loan */}
                <section>
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Hot Loan</h2>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { id: 1, type: 'FA', rate: '15%', color: 'bg-orange-400' },
                      { id: 2, type: 'CA', rate: '20%', color: 'bg-green-300' },
                      { id: 3, type: 'VC', rate: '15%', color: 'bg-[#8CD4CC]' },
                      { id: 4, type: 'FA', rate: '50%', color: 'bg-yellow-400' },
                      { id: 5, type: 'FA', rate: '15%', color: 'bg-orange-400' },
                      { id: 6, type: 'FA', rate: '15%', color: 'bg-red-500' },
                    ].map((item) => (
                      <Link href={`/mobile/loan/${item.id}`} key={item.id} className="group">
                        <div className={`${item.color} aspect-square rounded-2xl flex flex-col items-center justify-center mb-3`}>
                          <span className="text-white text-5xl font-bold mb-2">{item.type}</span>
                          <span className="text-white text-2xl font-bold">{item.rate}</span>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500 line-clamp-1">Lorem ipsum dolor sit amet consectetur.</p>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-yellow-100 flex items-center justify-center">
                              <div className="w-2 h-2 bg-yellow-600 rounded-full" />
                            </div>
                            <span className="text-xs text-gray-900 font-medium">Sellers details</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              </>
            )}
          </>
        )}
      </div>

      <MobileBottomNav />
    </div>
  );
}
