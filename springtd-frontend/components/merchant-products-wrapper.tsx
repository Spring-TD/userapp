"use client"

import { useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import ProductTabs from "@/components/product-tabs"
import ProductCards from "@/components/product-cards"
import { Loader2 } from "lucide-react"

interface MerchantProductsWrapperProps {
  category: "Loan" | "Mortgage" | "Savings" | "Commodity" | "Investment"
  theme?: "spring" | "platter"
}

function MerchantProductsContent({ category }: MerchantProductsWrapperProps) {
  const searchParams = useSearchParams()
  const appId = searchParams.get('appId') || undefined

  // Get app name from sessionStorage if available
  const appName = typeof window !== 'undefined' ? sessionStorage.getItem('selectedAppName') : null

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          {appName ? `${appName} — Products` : 'All Products'}
        </h1>
        {appId && (
          <p className="text-sm text-gray-500 mt-1">Manage product visibility for your customers</p>
        )}
      </div>
      <div className="border-b border-gray-200 mb-6">
        <ProductTabs showBorder={false} appId={appId} />
      </div>
      <ProductCards category={category} appId={appId} />
    </div>
  )
}

export default function MerchantProductsWrapper(props: MerchantProductsWrapperProps) {
  return (
    <Suspense fallback={
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#7C3AED]" />
      </div>
    }>
      <MerchantProductsContent {...props} />
    </Suspense>
  )
}
