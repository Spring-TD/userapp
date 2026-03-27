import ProductOverviewStats from "@/components/product-overview-stats"
import ProductDetailTabs from "@/components/product-detail-tabs"
// import ProductOverviewTable from "@/components/product-overview-table"
import { LoanInformation } from "@/components/loan-information"

export default function ActiveLoanPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Product Overview → SPI-234-BY45K</h1>

      <ProductOverviewStats />

      <h2 className="text-xl font-bold text-gray-900 mb-6">XYZ Mortgage Product</h2>

      <ProductDetailTabs />
      {/* <ProductOverviewTable /> */}
      <LoanInformation />
    </div>
  )
}
