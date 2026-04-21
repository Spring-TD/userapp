"use client"

import { Suspense } from "react"
import { ActiveProductsTable, ActiveProductsTableSkeleton } from "@/components/active-products-table"

function ActiveProductsFallback() {
  return (
    <div className="bg-gray-50/50 rounded-lg overflow-hidden">
      <ActiveProductsTableSkeleton />
    </div>
  )
}

export default function ProductOverviewPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Activated Products</h1>
      <p className="text-sm text-gray-500 mb-8">
        Products you have turned on for the selected app
      </p>
      <Suspense fallback={<ActiveProductsFallback />}>
        <ActiveProductsTable />
      </Suspense>
    </div>
  )
}
