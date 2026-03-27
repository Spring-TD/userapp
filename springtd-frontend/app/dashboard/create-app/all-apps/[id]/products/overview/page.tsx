"use client"

import { useState, useEffect } from "react"
import { Package } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { productApi } from "@/lib/product-api"
import { ProductDebugPanel } from "@/components/product-debug-panel"

export default function ProductsPage() {
  const [activeTab, setActiveTab] = useState("general")
  const params = useParams()
  const router = useRouter()
  const appId = params.id as string
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Load ALL products from Product Builder (global pool)
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true)
        // Fetch all products from Product Builder
        const data = await productApi.getAllProductsFromBuilder()

        if (data.success && data.data) {
          setProducts(data.data)
        }
      } catch (error) {
        console.error('Error fetching products from Product Builder:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  // Calculate product counts by type
  const getProductCount = (type: string) => {
    return products.filter(product => product.type === type).length
  }

  // Handle product card click - navigate to product type page
  const handleProductClick = (type: string) => {
    router.push(`/dashboard/create-app/all-apps/${appId}/products/${type}`)
  }

  const productCards = [
    {
      title: "Mortgage Products",
      count: getProductCount("Mortgage"),
      customers: 203,
      capital: "NGN12,233,000",
      issued: "NGN120,233,300",
      repayment: "NGN10,233,300",
      type: "mortgage",
    },
    {
      title: "Loan Products",
      count: getProductCount("Loan"),
      customers: 203,
      capital: "NGN12,233,000",
      issued: "NGN120,233,300",
      repayment: "NGN10,233,300",
      type: "loan",
    },
    {
      title: "Saving Products",
      count: getProductCount("Savings"),
      customers: 203,
      capital: "NGN12,233,000",
      issued: "NGN120,233,300",
      repayment: "NGN10,233,300",
      type: "savings",
    },
    {
      title: "Commodity Products",
      count: getProductCount("Commodity"),
      customers: 203,
      inventory: "NGN12,233,000",
      sales: "NGN120,233,300",
      repayment: "NGN10,233,300",
      type: "commodity",
    },
  ]

  return (
    <div className="flex-1 bg-white p-8">
      {/* Product Overview Heading */}
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Product Overview</h1>

      {/* Stats Card */}
      <div className="bg-[#2C2C3E] rounded-lg p-8 mb-8 grid grid-cols-5 gap-8">
        <div>
          <p className="text-gray-400 text-sm mb-2">Requested</p>
          <p className="text-white text-2xl font-semibold mb-1">N5,000,000</p>
          <p className="text-gray-400 text-sm">6 months</p>
        </div>
        <div>
          <p className="text-gray-400 text-sm mb-2">Approved</p>
          <p className="text-white text-2xl font-semibold mb-1">N4,000,000</p>
          <p className="text-gray-400 text-sm">5 months</p>
        </div>
        <div>
          <p className="text-gray-400 text-sm mb-2">Total Transactions</p>
          <p className="text-white text-2xl font-semibold mb-1">N4,000,000</p>
          <p className="text-gray-400 text-sm">5 months</p>
        </div>
        <div>
          <p className="text-gray-400 text-sm mb-2">Total Savings</p>
          <p className="text-white text-2xl font-semibold mb-1">N4,000,000</p>
          <p className="text-gray-400 text-sm">5 months</p>
        </div>
        <div>
          <p className="text-gray-400 text-sm mb-2">Total interest</p>
          <p className="text-white text-2xl font-semibold mb-1">N1,200,000</p>
          <p className="text-gray-400 text-sm">7% monthly</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab("general")}
            className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === "general" ? "text-[#8B7355]" : "text-gray-500 hover:text-gray-700"
              }`}
          >
            General Info
            {activeTab === "general" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#8B7355]"></div>}
          </button>
          <button
            onClick={() => setActiveTab("customers")}
            className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === "customers" ? "text-[#8B7355]" : "text-gray-500 hover:text-gray-700"
              }`}
          >
            Customers
            {activeTab === "customers" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#8B7355]"></div>}
          </button>
          <button
            onClick={() => setActiveTab("transactions")}
            className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === "transactions" ? "text-[#8B7355]" : "text-gray-500 hover:text-gray-700"
              }`}
          >
            Transactions
            {activeTab === "transactions" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#8B7355]"></div>
            )}
          </button>
        </div>
      </div>

      {/* Product Cards Grid */}
      <div className="grid grid-cols-4 gap-6">
        {productCards.map((card, index) => (
          <div key={index} className="flex flex-col gap-4">
            <button
              onClick={() => handleProductClick(card.type)}
              className="bg-[#8B7355] rounded-lg p-6 flex items-center justify-between hover:bg-[#7A6449] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <Package className="text-white" size={24} />
                <div>
                  <p className="text-white text-sm font-medium">{card.title}</p>
                </div>
              </div>
              <div className="text-white text-4xl font-bold">{card.count}</div>
            </button>

            {/* Details */}
            <div className="space-y-3">
              <div className="bg-gray-100 rounded-lg px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-gray-600">Customers</span>
                <span className="text-sm font-medium text-gray-900">{card.customers}</span>
              </div>
              <div className="bg-gray-100 rounded-lg px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-gray-600">{index === 3 ? "Inventory" : "Capital"}</span>
                <span className="text-sm font-medium text-gray-900">{index === 3 ? card.inventory : card.capital}</span>
              </div>
              <div className="bg-gray-100 rounded-lg px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-gray-600">{index === 3 ? "Sales" : "Issued"}</span>
                <span className="text-sm font-medium text-gray-900">{index === 3 ? card.sales : card.issued}</span>
              </div>
              <div className="bg-gray-100 rounded-lg px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-gray-600">Repayment</span>
                <span className="text-sm font-medium text-gray-900">{card.repayment}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Debug Panel - Remove after fixing the issue */}
      <ProductDebugPanel appId={appId} location="platter" />
    </div>
  )
}
