import ProductOverviewStats from "@/components/product-overview-stats"
import ProductDetailTabs from "@/components/product-detail-tabs"
import DriveUsersTable from "@/components/drive-users-table"

export default function DrivePage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Product Overview</h1>
      {/* </CHANGE> */}

      <ProductOverviewStats />

      <h2 className="text-xl font-bold text-gray-900 mb-6">XYZ Mortgage Product</h2>

      <ProductDetailTabs />
      <DriveUsersTable />
    </div>
  )
}
