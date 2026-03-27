"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Switch } from "@/components/ui/switch"
import { Clock, Globe, Loader2 } from "lucide-react"
import { ProductDetailModal } from "@/components/product-detail-modal"
import { springProductService } from "@/lib/springProductService"
import { toast } from "sonner"

interface Product {
  id: string
  name: string
  title?: string
  description: string
  image?: string
  status: "Active" | "Inactive" | "complete" | "incomplete"
  interestRate?: string
  duration?: string
  category?: string
  type?: string
  isActive: boolean
  appId?: string
}

// Default placeholder image
const DEFAULT_PRODUCT_IMAGE = "https://images.unsplash.com/photo-1541535650810-10d26f5c2ab3?w=800&q=80"

interface ProductCardsProps {
  category?: string
  appId?: string
}

export default function ProductCards({ category = "Mortgage", appId }: ProductCardsProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  // Fetch products from Spring's product-ms via /api/spring-products
  useEffect(() => {
    fetchProducts()
  }, [appId, category])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      // Fetch ALL products from Plata's product-ms via /api/spring-products
      // Products are created in Product Builder with Plata appIds — different from Spring appIds.
      // We show the full catalog for merchants to activate/deactivate.
      const data = await springProductService.getAllProducts()

      if (data.success && data.data) {
        // Filter only by product type/category — do NOT filter by appId
        // (Spring appIds ≠ Plata appIds, so filtering by Spring appId returns nothing)
        const transformedProducts: Product[] = data.data
          .filter((p: any) => p.type?.toLowerCase() === category.toLowerCase())
          .map((p: any) => ({
            id: p.id,
            name: p.name,
            title: p.name,
            description: p.description || 'No description available',
            image: p.image || DEFAULT_PRODUCT_IMAGE,
            status: p.isActive ? "Active" : "Inactive",
            interestRate: p.interestRate || p.configuration?.interestRate || "N/A",
            duration: p.duration || p.configuration?.loanTenure || "N/A",
            category: p.type,
            type: p.type,
            isActive: p.isActive ?? true,
            appId: p.appId,
          }))

        setProducts(transformedProducts)
      } else {
        setProducts([])
      }
    } catch (error) {
      console.error("Failed to fetch Spring products:", error)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const toggleProduct = async (id: string) => {
    const product = products.find(p => p.id === id)
    if (!product) return

    setTogglingId(id)
    const newIsActive = !product.isActive

    try {
      // Get merchantId from Spring token, then toggle via springProductService
      const merchantId = springProductService.getMerchantId()
      if (!merchantId) {
        toast.error("Could not determine merchant ID. Please log in again.")
        return
      }

      // Calls /api/spring-products/toggle/{merchantId}/{productId} → product-ms.fly.dev
      await springProductService.toggleProductActivation(merchantId, id, newIsActive)

      // Update local state on success
      setProducts(products.map(p => {
        if (p.id === id) {
          return {
            ...p,
            isActive: newIsActive,
            status: newIsActive ? "Active" : "Inactive"
          }
        }
        return p
      }))

      toast.success(`Product ${newIsActive ? 'enabled' : 'disabled'} successfully`)
    } catch (error) {
      console.error("Failed to toggle product:", error)
      toast.error("Failed to update product status")
    } finally {
      setTogglingId(null)
    }
  }

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product)
    setModalOpen(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#7C3AED]" />
          <p className="text-sm text-gray-500">Loading products...</p>
        </div>
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Globe className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No {category} Products</h3>
        <p className="text-sm text-gray-500 max-w-sm mb-4">
          No {category.toLowerCase()} products have been activated for this app yet.<br />
          Products are created in the Product Builder dashboard.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <div
            key={product.id}
            className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleProductClick(product)}
          >
            <div className="h-40 relative">
              <Image
                src={product.image || DEFAULT_PRODUCT_IMAGE}
                alt={product.name || product.title || 'Product'}
                fill
                className="object-cover"
              />
            </div>

            <div className="p-5 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg text-gray-900">{product.name || product.title}</h3>
                <span className={`px-2 py-1 rounded text-xs font-medium ${product.isActive ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                  }`}>
                  {product.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <p className="text-sm text-gray-500 mb-4 line-clamp-3">
                {product.description}
              </p>

              <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <span>{product.interestRate} Interest rate</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={14} />
                  <span>Duration {product.duration}</span>
                </div>
                <div className="ml-auto" onClick={(e) => e.stopPropagation()}>
                  {togglingId === product.id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  ) : (
                    <Switch
                      checked={product.isActive}
                      onCheckedChange={() => toggleProduct(product.id)}
                    />
                  )}
                </div>
              </div>

              <div className="mt-auto flex justify-between items-center pt-4 border-t border-gray-100">
                <span className="bg-[#7C3AED] text-white text-xs px-4 py-1.5 rounded-full font-medium">
                  {product.category}
                </span>
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <Globe className="w-5 h-5 opacity-70 text-gray-600" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <ProductDetailModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        product={selectedProduct ? {
          ...selectedProduct,
          title: selectedProduct.name || selectedProduct.title || '',
        } : null}
      />
    </>
  )
}
