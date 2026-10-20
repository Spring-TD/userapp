"use client"
import { useEffect, useLayoutEffect, useState } from "react"
import { Drawer } from "@/components/drawer"
import { Skeleton } from "@/components/ui/skeleton"

type ProductTypeOption = {
  value: string
  label: string
}

interface CreateProductDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSelectProduct: (productType: string) => void
  accentColor?: string
  cardBgColor?: string
  cardHoverColor?: string
}

export default function CreateProductDrawer({ 
  isOpen, 
  onClose, 
  onSelectProduct,
  accentColor = "#9A813F",
  cardBgColor = "#F5F1E8",
  cardHoverColor = "#EBE5D6"
}: CreateProductDrawerProps) {
  const [productTypes, setProductTypes] = useState<ProductTypeOption[]>([])
  const [isLoadingTypes, setIsLoadingTypes] = useState(false)

  useLayoutEffect(() => {
    if (isOpen) {
      setIsLoadingTypes(true)
      setProductTypes([])
    } else {
      setIsLoadingTypes(false)
    }
  }, [isOpen])

  // Static descriptions keyed by backend type value
  const descriptions: Record<string, string> = {
    Loan:
      "Set up loan products, define repayment terms, interest rates, and eligibility criteria, then manage them from your dashboard.",
    Mortgage:
      "Create mortgage products to finance property purchases, configure repayment schedules and interest structures for long-term offerings.",
    Savings:
      "Offer tailored savings plans with interest rates, deposit requirements, and lock-in periods to help users grow funds securely.",
    Commodity:
      "Offer commodity products and manage trading cycles, tenure, and security requirements directly from your dashboard.",
    Investment:
      "Create investment products and portfolios that enable customers to grow wealth with structured returns.",
  }

  useEffect(() => {
    if (!isOpen) return
    const ac = new AbortController()

    const fetchTypes = async () => {
      try {
        const res = await fetch("/api/v1/products/types", {
          credentials: "include",
          signal: ac.signal,
        })
        const json = await res.json()
        if (ac.signal.aborted) return
        const list = (json?.data ?? []) as ProductTypeOption[]
        if (Array.isArray(list) && list.length) {
          setProductTypes(list)
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          console.error("Failed to fetch product types", e)
        }
      } finally {
        if (!ac.signal.aborted) setIsLoadingTypes(false)
      }
    }

    fetchTypes()
    return () => ac.abort()
  }, [isOpen])

  return (
    <Drawer
      open={isOpen}
      onOpenChange={onClose}
      title="Create Product"
      subtitle="Select the product option you want to create with us"
    >
      <div className="grid grid-cols-2 gap-4">
        {isLoadingTypes
          ? Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg p-6 min-h-[140px]"
                style={{ backgroundColor: cardBgColor }}
              >
                <Skeleton className="h-6 w-28 mb-3 bg-black/10" />
                <Skeleton className="h-3 w-full mb-2 bg-black/10" />
                <Skeleton className="h-3 w-full mb-2 bg-black/10" />
                <Skeleton className="h-3 w-[85%] bg-black/10" />
              </div>
            ))
          : productTypes.map((product) => (
              <button
                key={product.value}
                onClick={() => onSelectProduct(product.value.toLowerCase())}
                className="rounded-lg p-6 text-left transition-colors"
                style={{
                  backgroundColor: cardBgColor,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = cardHoverColor)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = cardBgColor)}
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{product.label}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {descriptions[product.value] || descriptions[product.label] || ""}
                </p>
              </button>
            ))}
      </div>
    </Drawer>
  )
}
