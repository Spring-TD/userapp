"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { Switch } from "@/components/ui/switch"
import { Clock, Globe, Loader2 } from "lucide-react"
import { ProductDetailModal } from "@/components/product-detail-modal"
import { productApi } from "@/lib/services/product-api"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"

function ProductCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col"
        >
          <Skeleton className="h-40 w-full rounded-none" />
          <div className="p-5 flex-1 flex flex-col gap-3">
            <div className="flex justify-between items-start gap-2">
              <Skeleton className="h-6 flex-1 max-w-[200px]" />
              <Skeleton className="h-6 w-14 shrink-0 rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-[85%]" />
            </div>
            <div className="flex items-center gap-4 pt-1">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-20" />
              <div className="ml-auto">
                <Skeleton className="h-6 w-10 rounded-full" />
              </div>
            </div>
            <div className="mt-auto flex justify-between items-center pt-4 border-t border-gray-100">
              <Skeleton className="h-7 w-24 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

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

function parseRowIsActive(row: Record<string, unknown>): boolean {
  const nested =
    row.product && typeof row.product === "object" ? (row.product as Record<string, unknown>) : null
  const v = row.isActive ?? nested?.isActive
  if (typeof v === "boolean") return v
  if (typeof v === "string") {
    const s = v.trim().toLowerCase()
    if (s === "true" || s === "1" || s === "active") return true
    if (s === "false" || s === "0" || s === "inactive") return false
  }
  // Row is in GET /products/app/:appId list but field omitted — treat as on for this app (legacy)
  return true
}

/** Map catalog product id → isActive for this app from GET /api/v1/products/app/:appId (uses each row's isActive). */
function extractProductRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== "object") return []
  const row = payload as Record<string, unknown>
  if (Array.isArray(row.items)) return row.items
  if (Array.isArray(row.products)) return row.products
  const nested = row.data
  if (Array.isArray(nested)) return nested
  if (nested && typeof nested === "object") {
    const inner = nested as Record<string, unknown>
    if (Array.isArray(inner.items)) return inner.items
    if (Array.isArray(inner.products)) return inner.products
  }
  return []
}

function buildAppProductActivationMap(activePayload: unknown): Map<string, boolean> {
  const out = new Map<string, boolean>()
  const rows = extractProductRows(activePayload)
  for (const row of rows) {
    if (row == null || typeof row !== "object") continue
    const r = row as Record<string, unknown>
    const nested = r.product && typeof r.product === "object" ? (r.product as Record<string, unknown>) : null
    const on = parseRowIsActive(r)
    const candidates = [
      r.id,
      r._id,
      r.productId,
      r.product_id,
      nested?.id,
      nested?._id,
      nested?.productId,
    ]
    for (const c of candidates) {
      if (c != null && String(c).trim()) out.set(String(c).trim(), on)
    }
  }
  return out
}

function catalogProductKey(p: { id?: unknown; _id?: unknown }): string {
  const v = p?.id ?? p?._id
  return v != null ? String(v).trim() : ""
}

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

  /**
   * Storefront grid: GET /api/v1/products/app/:appId (`data.items`).
   * Do not list the mixed merchant catalog.
   */
  const mapRows = (rows: any[], appActivation?: Map<string, boolean>): Product[] =>
    rows
      .filter((p: any) => p.type?.toLowerCase() === category.toLowerCase())
      .filter((p: any) => catalogProductKey(p))
      .map((p: any) => {
        const id = catalogProductKey(p)
        const onForApp =
          appActivation != null
            ? appActivation.get(id) === true
            : p.isActive !== false && p.isActive !== "inactive"
        return {
          id,
          name: p.name,
          title: p.name,
          description: p.description || "No description available",
          image: p.image || DEFAULT_PRODUCT_IMAGE,
          status: onForApp ? "Active" : "Inactive",
          interestRate: p.interestRate || p.configuration?.interestRate || "N/A",
          duration: p.duration || p.configuration?.loanTenure || "N/A",
          category: p.type,
          type: p.type,
          isActive: onForApp,
          appId: p.appId,
        }
      })

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      if (!appId) {
        setProducts([])
        return
      }

      const catalogRes = await productApi.getProductsByAppId(appId, { page: 1, limit: 100 })
      const catalogRows = extractProductRows(catalogRes)
      const appActivation = buildAppProductActivationMap(catalogRes)
      setProducts(mapRows(catalogRows, appActivation))
    } catch (error) {
      console.error("Failed to fetch storefront products:", error)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [category, appId])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const toggleProduct = async (id: string) => {
    if (!appId) {
      toast.error("Select an app to manage products")
      return
    }
    const product = products.find((p) => p.id === id)
    if (!product) return

    setTogglingId(id)
    const newIsActive = !product.isActive

    try {
      const json = (await productApi.toggleProductStatus(appId, id, newIsActive)) as {
        data?: { isActive?: boolean }
      }
      const serverOn =
        typeof json?.data?.isActive === "boolean" ? json.data.isActive : newIsActive
      setProducts((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                isActive: serverOn,
                status: serverOn ? "Active" : "Inactive",
              }
            : p,
        ),
      )
      toast.success(`Product ${serverOn ? "enabled" : "disabled"} successfully`)
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
    return <ProductCardsSkeleton />
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Globe className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No {category} products</h3>
        <p className="text-sm text-gray-500 max-w-sm mb-4">
          No {category.toLowerCase()} products in the catalog yet. Create them in Product Builder.
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
