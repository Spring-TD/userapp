"use client"

import { useState } from "react"
import ProductOverviewStats from "@/components/product-overview-stats"
import ProductDetailTabs from "@/components/product-detail-tabs"
import { ConfigurePricingSheet } from "@/components/configure-pricing-sheet"
import { Button } from "@/components/ui/button"
import { Settings2 } from "lucide-react"

export default function ConfigurationPage() {
  const [open, setOpen] = useState(false)

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Product Overview</h1>

      <ProductOverviewStats />

      <h2 className="text-xl font-bold text-gray-900 mb-8">XYZ Mortgage Product</h2>

      <ProductDetailTabs />

      <div className="bg-white rounded-xl border border-gray-200 p-8 w-full">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Pricing Configuration</h3>
            <p className="text-sm text-gray-500 mt-1">Manage fee structure and limits for this product</p>
          </div>
          <Button 
            onClick={() => setOpen(true)} 
            className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
          >
            <Settings2 className="w-4 h-4 mr-2" />
            Configure Pricing
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-x-12 gap-y-8">
            <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Pricing Type</label>
                <p className="mt-1 text-base font-semibold text-gray-900">Percentage</p>
            </div>
            <div>
                 <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Pricing Condition</label>
                <p className="mt-1 text-base font-semibold text-gray-900">Standard</p>
            </div>
            
            <div className="col-span-2 h-px bg-gray-100" />

            <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Upper Cap</label>
                <p className="mt-1 text-base font-semibold text-gray-900">₦5,000.00</p>
            </div>
            <div>
                 <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Floor Cap</label>
                <p className="mt-1 text-base font-semibold text-gray-900">₦1,000.00</p>
            </div>

            <div className="col-span-2 h-px bg-gray-100" />

            <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">SpringTD Fee</label>
                <p className="mt-1 text-base font-semibold text-gray-900">₦200.00</p>
            </div>
            <div>
                 <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Your Mark-up Fee</label>
                <p className="mt-1 text-base font-semibold text-gray-900">₦500.00</p>
            </div>

            <div className="col-span-2 h-px bg-gray-100" />

            <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Service Fee</label>
                <p className="mt-1 text-base font-semibold text-gray-900">₦100.00</p>
                <p className="text-xs text-gray-400 mt-1">Charged in addition to Mark-up Fee</p>
            </div>
        </div>
      </div>
      
      <ConfigurePricingSheet open={open} onOpenChange={setOpen} />
    </div>
  )
}
