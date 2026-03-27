"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MoreVertical, X, Search, Loader2, PackageX, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { adminProductsApi, AdminProduct } from "@/lib/adminService"
import SuspendProductDrawer from "@/components/drawers/suspend-product-drawer"
import DeactivateConfirmationDrawer from "@/components/drawers/deactivate-confirmation-drawer"
import DeactivationSuccessDrawer from "@/components/drawers/deactivation-success-drawer"
import { toast } from "sonner"

const TABS = [
  { id: "all", label: "All products" },
  { id: "loan", label: "Loans" },
  { id: "savings", label: "Savings" },
  { id: "mortgage", label: "Mortgage" },
  { id: "commodity", label: "Commodity" },
]

export default function AdminProductPage() {
  const [activeTab, setActiveTab] = useState("all")
  const router = useRouter()
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)

  const [isSuspendDrawerOpen, setIsSuspendDrawerOpen] = useState(false)
  const [isConfirmationDrawerOpen, setIsConfirmationDrawerOpen] = useState(false)
  const [isSuccessDrawerOpen, setIsSuccessDrawerOpen] = useState(false)

  const fetchProducts = async () => {
    setLoading(true)
    const type = activeTab !== "all" ? activeTab.charAt(0).toUpperCase() + activeTab.slice(1) : undefined
    const res = await adminProductsApi.getAllProducts(type)
    if (res.success && res.data) {
      setProducts(res.data)
    } else {
      setProducts([])
      if (res.error) console.warn("[AdminProducts] API unavailable:", res.error)
    }
    setLoading(false)
  }

  useEffect(() => { fetchProducts() }, [activeTab])

  const filteredProducts = products.filter(p => {
    const q = searchQuery.toLowerCase()
    return (
      p.name?.toLowerCase().includes(q) ||
      p.id?.toLowerCase().includes(q) ||
      p.appId?.toLowerCase().includes(q) ||
      p.referenceNumber?.toLowerCase().includes(q)
    )
  })

  const handleDeactivate = () => {
    setIsSuspendDrawerOpen(false)
    setIsConfirmationDrawerOpen(true)
  }

  const handleConfirmDeactivation = async () => {
    if (selectedProductId) {
      const res = await adminProductsApi.updateProduct(selectedProductId, { isActive: false })
      if (res.success) {
        setProducts(prev => prev.map(p =>
          p.id === selectedProductId ? { ...p, isActive: false } : p
        ))
        toast.success("Product suspended")
      } else {
        toast.error("Failed to suspend product")
      }
    }
    setIsConfirmationDrawerOpen(false)
    setIsSuccessDrawerOpen(true)
  }

  const handleCloseAll = () => {
    setIsSuspendDrawerOpen(false)
    setIsConfirmationDrawerOpen(false)
    setIsSuccessDrawerOpen(false)
    setSelectedProductId(null)
  }

  const formatDate = (d?: string) => {
    if (!d) return "—"
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  return (
    <div className="flex-1 bg-white">
      <div className="border-b border-gray-200 px-8 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex space-x-8">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-4 text-sm font-medium transition-colors relative ${activeTab === tab.id ? "text-[#4169E1]" : "text-gray-600 hover:text-gray-900"
                  }`}
              >
                {tab.label}
                {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4169E1]" />}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchProducts}
              disabled={loading}
              className="text-gray-500"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button
              onClick={() => setIsSuspendDrawerOpen(true)}
              className="bg-[#4169E1] text-white hover:bg-[#3557c7] gap-2"
              disabled={!selectedProductId}
            >
              <X size={16} />
              Suspend Product
            </Button>
          </div>
        </div>
      </div>

      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Products
            {!loading && <span className="ml-2 text-sm font-normal text-gray-500">({filteredProducts.length})</span>}
          </h2>
          <div className="flex items-center gap-4 flex-1 max-w-2xl mx-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by name, ID, or app..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <PackageX className="w-10 h-10 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">
                {searchQuery ? "No products match your search." : "No products found."}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-[#F5F5F5]">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Product Name</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">App ID</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Type</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Date Created</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Reference</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProducts.map((product) => (
                  <tr
                    key={product.id}
                    className={`hover:bg-gray-50 cursor-pointer transition-colors ${selectedProductId === product.id ? "bg-blue-50" : ""}`}
                    onClick={() => setSelectedProductId(product.id === selectedProductId ? null : product.id)}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{product.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 font-mono">{product.appId || "—"}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 capitalize">{product.type || "—"}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatDate(product.createdAt || product.dateCreated)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 font-mono">{product.referenceNumber || product.productKey || product.id.slice(0, 12)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${product.isActive ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                          }`}>
                          {product.isActive ? "Active" : "Inactive"}
                        </span>
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            setSelectedProductId(product.id)
                            setIsSuspendDrawerOpen(true)
                          }}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <MoreVertical size={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <SuspendProductDrawer isOpen={isSuspendDrawerOpen} onClose={handleCloseAll} onDeactivate={handleDeactivate} />
      <DeactivateConfirmationDrawer
        isOpen={isConfirmationDrawerOpen}
        onClose={handleCloseAll}
        onConfirm={handleConfirmDeactivation}
      />
      <DeactivationSuccessDrawer isOpen={isSuccessDrawerOpen} onClose={handleCloseAll} />
    </div>
  )
}
