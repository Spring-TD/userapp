"use client"

import { ActiveProductsTable } from "@/components/active-products-table"

export default function ProductOverviewPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Activated Products</h1>
      <ActiveProductsTable />
    </div>
  )
}
