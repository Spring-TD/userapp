"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Search, MoreVertical, Copy, Package } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { productApi } from "@/lib/product-api"

export default function ProductDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const productType = params.productType as string
  const productId = params.productId as string
  const appId = params.id as string

  const [activeTab, setActiveTab] = useState("active")
  const [product, setProduct] = useState<any>(null)
  const [configuration, setConfiguration] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [configLoading, setConfigLoading] = useState(false)

  // Fetch product details and configuration from API
  useEffect(() => {
    const fetchProductData = async () => {
      try {
        setLoading(true)
        
        // Fetch product details
        const productData = await productApi.getProductById(productId)
        if (productData.success && productData.data) {
          setProduct(productData.data)
        }

        // Fetch product configuration
        try {
          const configData = await productApi.getProductConfiguration(productId)
          if (configData.success && configData.data) {
            setConfiguration(configData.data)
          }
        } catch (configError) {
          console.log('No configuration found for product')
        }
      } catch (error) {
        console.error('Error fetching product:', error)
      } finally {
        setLoading(false)
      }
    }

    if (productId) {
      fetchProductData()
    }
  }, [productId])



  const getTabsForProduct = () => {
    if (productType === "savings") {
      return [
        { id: "active", label: "Active Savings" },
        { id: "inactive", label: "Inactive Savings" },
        { id: "configuration", label: "Configuration" },
      ]
    } else if (productType === "loan") {
      return [
        { id: "active", label: "Active Loan" },
        { id: "inactive", label: "Inactive Loan" },
        { id: "drive", label: "Drive" },
        { id: "configuration", label: "Configuration" },
      ]
    } else if (productType === "commodity") {
      return [
        { id: "active", label: "Active Commodity" },
        { id: "inactive", label: "Inactive Commodity" },
        { id: "configuration", label: "Configuration" },
      ]
    }
    return [
      { id: "active", label: "Active Loan" },
      { id: "inactive", label: "Inactive Loan" },
      { id: "drive", label: "Drive" },
      { id: "configuration", label: "Configuration" },
    ]
  }

  const tabs = getTabsForProduct()



  const renderContent = () => {
    // Active/Inactive tabs - show empty state (backend doesn't support this yet)
    if (activeTab === "active" || activeTab === "inactive") {
      const tabLabel = activeTab === "active" ? "Active" : "Inactive"
      const productLabel = productType === "loan" ? "Loans" : 
                          productType === "savings" ? "Savings" : 
                          productType === "commodity" ? "Commodities" : "Items"

      return (
        <div className="border border-gray-200 rounded-lg p-12 text-center">
          <div className="text-gray-400 mb-4">
            <Package className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No {tabLabel} {productLabel}</h3>
          <p className="text-gray-600 mb-4">
            {activeTab === "active" 
              ? `There are no active ${productLabel.toLowerCase()} for this product yet.`
              : `There are no inactive ${productLabel.toLowerCase()} for this product.`
            }
          </p>
          <p className="text-sm text-gray-500">
            When customers subscribe to this product, their {productLabel.toLowerCase()} will appear here.
          </p>
        </div>
      )
    }

    // Drive tab - show empty state (backend doesn't support this yet)
    if (activeTab === "drive") {
      return (
        <div>
          {/* Search Bar */}
          <div className="mb-6 flex justify-end">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <Input placeholder="Search documents" className="pl-10" />
            </div>
          </div>

          {/* Empty State */}
          <div className="border border-gray-200 rounded-lg p-12 text-center">
            <div className="text-gray-400 mb-4">
              <Package className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Documents</h3>
            <p className="text-gray-600 mb-4">
              No documents have been submitted for this product yet.
            </p>
            <p className="text-sm text-gray-500">
              When customers submit documents for verification, they will appear here.
            </p>
          </div>
        </div>
      )
    }

    // Configuration tab - show real data or empty state
    if (activeTab === "configuration") {
      if (!configuration) {
        return (
          <div className="border border-gray-200 rounded-lg p-12 text-center">
            <div className="text-gray-400 mb-4">
              <Plus className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Configuration</h3>
            <p className="text-gray-600 mb-4">
              This product hasn't been configured yet.
            </p>
            <Button className="bg-[#9A813F] text-white hover:bg-[#8a7435]">
              <Plus className="w-4 h-4 mr-2" />
              Configure Product
            </Button>
          </div>
        )
      }

      // Show actual configuration data
      return (
        <div className="space-y-6">
          {/* Product Information Section */}
          <div className="bg-[#2C2416] rounded-lg p-6">
            <h3 className="text-white text-lg font-semibold mb-6">Product Information</h3>
            <div className="grid grid-cols-3 gap-8">
              <div>
                <p className="text-[#A89968] text-xs mb-2">Name</p>
                <p className="text-white text-sm">{product?.name || 'N/A'}</p>
                <p className="text-[#A89968] text-xs mt-4 mb-2">Type</p>
                <p className="text-white text-sm">{product?.type || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[#A89968] text-xs mb-2">Reference</p>
                <p className="text-white text-sm">{product?.referenceNumber || 'N/A'}</p>
                <p className="text-[#A89968] text-xs mt-4 mb-2">Status</p>
                <p className="text-white text-sm capitalize">{product?.status || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[#A89968] text-xs mb-2">Purpose</p>
                <p className="text-white text-sm">{configuration?.purpose || 'N/A'}</p>
                <p className="text-[#A89968] text-xs mt-4 mb-2">Currency</p>
                <p className="text-white text-sm">{configuration?.currency || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Facility Amount Section */}
          <div className="bg-[#2C2416] rounded-lg p-6">
            <h3 className="text-white text-lg font-semibold mb-6">Facility Amount</h3>
            <div className="grid grid-cols-3 gap-8">
              <div>
                <p className="text-[#A89968] text-xs mb-2">Minimum Amount</p>
                <p className="text-white text-sm">
                  {configuration?.minimumFacilityAmount 
                    ? `${configuration.currency || ''}${configuration.minimumFacilityAmount.toLocaleString()}`
                    : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-[#A89968] text-xs mb-2">Maximum Amount</p>
                <p className="text-white text-sm">
                  {configuration?.maximumFacilityAmount 
                    ? `${configuration.currency || ''}${configuration.maximumFacilityAmount.toLocaleString()}`
                    : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-[#A89968] text-xs mb-2">Interest Rate</p>
                <p className="text-white text-sm">
                  {configuration?.interestRate 
                    ? `${configuration.interestRate.value}${configuration.interestRate.type === 'percentage' ? '%' : ''}`
                    : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Tenure & Repayment Section */}
          <div className="bg-[#2C2416] rounded-lg p-6">
            <h3 className="text-white text-lg font-semibold mb-6">Tenure & Repayment</h3>
            <div className="grid grid-cols-3 gap-8">
              <div>
                <p className="text-[#A89968] text-xs mb-2">Loan Tenure</p>
                <p className="text-white text-sm">
                  {configuration?.loanTenure 
                    ? `${configuration.loanTenure.value} ${configuration.loanTenure.unit}(s)`
                    : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-[#A89968] text-xs mb-2">Repayment Cycle</p>
                <p className="text-white text-sm capitalize">{configuration?.repaymentCycle || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[#A89968] text-xs mb-2">Minimum Repayment</p>
                <p className="text-white text-sm">
                  {configuration?.minimumRepaymentAmount 
                    ? `${configuration.currency || ''}${configuration.minimumRepaymentAmount.toLocaleString()}`
                    : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Fees & Penalties Section */}
          <div className="bg-[#2C2416] rounded-lg p-6">
            <h3 className="text-white text-lg font-semibold mb-6">Fees & Penalties</h3>
            <div className="grid grid-cols-3 gap-8">
              <div>
                <p className="text-[#A89968] text-xs mb-2">Management Fee</p>
                <p className="text-white text-sm">
                  {configuration?.managementFee !== undefined 
                    ? `${configuration.currency || ''}${configuration.managementFee.toLocaleString()}`
                    : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-[#A89968] text-xs mb-2">Penalty</p>
                <p className="text-white text-sm">
                  {configuration?.penalty 
                    ? `${configuration.penalty.value}${configuration.penalty.type === 'percentage' ? '%' : ''}`
                    : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-[#A89968] text-xs mb-2">Withdrawal Penalty</p>
                <p className="text-white text-sm">
                  {configuration?.withdrawalPenalty 
                    ? `${configuration.withdrawalPenalty.value}${configuration.withdrawalPenalty.type === 'percentage' ? '%' : ''}`
                    : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    }

    // Default: empty state
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <p>No data available for this tab.</p>
      </div>
    )
  }

  if (!productType || !productId) {
    return null
  }

  if (loading) {
    return (
      <div className="flex-1 bg-white p-8 flex items-center justify-center">
        <div className="text-gray-500">Loading product details...</div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="flex-1 bg-white p-8 flex items-center justify-center">
        <div className="text-gray-500">Product not found</div>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-white p-8">
      {/* Product Title */}
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">{product.name}</h1>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6 flex items-center justify-between">
        <div className="flex gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === tab.id ? "text-[#8B7355]" : "text-gray-500 hover:text-gray-700"
                }`}
            >
              {tab.label}
              {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#8B7355]"></div>}
            </button>
          ))}
        </div>
        {activeTab === "configuration" && (
          <Button className="bg-black text-white hover:bg-gray-800 gap-2">
            <Plus size={16} />
            Configure
          </Button>
        )}
      </div>

      {/* Content */}
      {renderContent()}
    </div>
  )
}
