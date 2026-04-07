"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Search, Filter } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ConfigurePricingSheet } from "@/components/configure-pricing-sheet"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { springProductService } from "@/lib/services/springProductService"
import { useAppSelector } from "@/store/hooks"
import { Skeleton } from "@/components/ui/skeleton"

export function ActiveProductsTableSkeleton() {
  return (
    <Table>
      <TableHeader className="bg-gray-100/50 hover:bg-gray-100/50">
        <TableRow className="border-b-0 hover:bg-transparent">
          <TableHead className="font-medium text-gray-500">Name of Product</TableHead>
          <TableHead className="font-medium text-gray-500">Product ID</TableHead>
          <TableHead className="font-medium text-gray-500">Product type</TableHead>
          <TableHead className="font-medium text-gray-500">Timestamp</TableHead>
          <TableHead className="font-medium text-gray-500">Meta_Ref</TableHead>
          <TableHead className="font-medium text-gray-500">Configuration</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 6 }).map((_, i) => (
          <TableRow key={i} className="border-b border-gray-100">
            <TableCell className="py-6 bg-white">
              <Skeleton className="h-4 w-[min(100%,180px)]" />
            </TableCell>
            <TableCell className="bg-white">
              <Skeleton className="h-4 w-24" />
            </TableCell>
            <TableCell className="bg-white">
              <Skeleton className="h-4 w-16" />
            </TableCell>
            <TableCell className="bg-white">
              <Skeleton className="h-4 w-36" />
            </TableCell>
            <TableCell className="bg-white">
              <Skeleton className="h-4 w-20" />
            </TableCell>
            <TableCell className="bg-white">
              <Skeleton className="h-8 w-[100px] rounded-full" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

const tabs = [
  { label: "Mortgage", value: "mortgage" },
  { label: "Loan", value: "loan" },
  { label: "Savings", value: "savings" },
  { label: "Investment", value: "investment" },
  { label: "Commodity", value: "commodity" },
]

function normalizeProductType(type: string | undefined): string {
  return String(type || "")
    .trim()
    .toLowerCase()
}

/** Align with GET /products/app/:appId list — use each row's `isActive` when present. */
function rowIsActiveForAppList(p: Record<string, unknown>): boolean {
  const v = p.isActive
  if (typeof v === "boolean") return v
  if (typeof v === "string") {
    const s = v.trim().toLowerCase()
    if (s === "true" || s === "1" || s === "active") return true
    if (s === "false" || s === "0" || s === "inactive") return false
  }
  return true
}

function formatTimestamp(iso: string | undefined): string {
  if (!iso) return "—"
  try {
    const d = new Date(iso)
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  } catch {
    return iso
  }
}

export type ActiveProductRow = {
  id: string
  name: string
  type: string
  referenceNumber?: string
  createdAt?: string
}

export function ActiveProductsTable() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { selectedAppId } = useAppSelector((s) => s.merchantApps)

  const urlAppId = searchParams.get("appId")
  const effectiveAppId = urlAppId || selectedAppId || null

  const [isConfigureOpen, setIsConfigureOpen] = useState(false)
  const [configureProduct, setConfigureProduct] = useState<ActiveProductRow | null>(null)
  const [activeTab, setActiveTab] = useState("mortgage")
  const [searchQuery, setSearchQuery] = useState("")
  const [products, setProducts] = useState<ActiveProductRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchActive = useCallback(async () => {
    if (!effectiveAppId) {
      setProducts([])
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await springProductService.getProductsForApp(effectiveAppId)
      const raw = (res as { success?: boolean; data?: unknown }).data
      const rows = Array.isArray(raw) ? raw : []
      if ((res as { success?: boolean }).success === false) {
        setProducts([])
        setError((res as { error?: string }).error || "Failed to load active products")
        return
      }
      const mapped: ActiveProductRow[] = rows
        .filter((p) => rowIsActiveForAppList(p as Record<string, unknown>))
        .map((p: Record<string, unknown>) => ({
        id: String(p.id ?? ""),
        name: String(p.name ?? "—"),
        type: String(p.type ?? ""),
        referenceNumber: p.referenceNumber != null ? String(p.referenceNumber) : undefined,
        createdAt: p.createdAt != null ? String(p.createdAt) : undefined,
      }))
      setProducts(mapped.filter((r) => r.id))
    } catch (e) {
      console.error("[ActiveProductsTable]", e)
      setProducts([])
      setError(e instanceof Error ? e.message : "Failed to load active products")
    } finally {
      setLoading(false)
    }
  }, [effectiveAppId])

  useEffect(() => {
    fetchActive()
  }, [fetchActive])

  const filteredProducts = useMemo(() => {
    const tab = activeTab.toLowerCase()
    let list = products.filter((p) => normalizeProductType(p.type) === tab)
    const q = searchQuery.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          (p.referenceNumber && p.referenceNumber.toLowerCase().includes(q)),
      )
    }
    return list
  }, [products, activeTab, searchQuery])

  if (!effectiveAppId) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/50 px-6 py-12 text-center text-gray-600">
        <p className="font-medium text-gray-900">Select an app</p>
        <p className="mt-2 text-sm">
          Choose a merchant app from the header (or open this page with <code className="rounded bg-gray-100 px-1">?appId=...</code>) to
          list products you have turned on for that app.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full overflow-x-auto">
          <TabsList className="bg-transparent h-auto p-0 space-x-8 border-b border-gray-200 w-full justify-start rounded-none">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="bg-transparent shadow-none border-b-2 border-transparent data-[state=active]:border-b-[#7C3AED] !border-t-0 !border-x-0 rounded-none px-1 pb-4 text-sm font-medium text-gray-500 data-[state=active]:text-[#7C3AED] hover:text-gray-700 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-4 min-w-[300px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search"
              className="pl-9 h-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" className="gap-2 h-10 font-normal" type="button">
            <Filter className="w-4 h-4" />
            Sort
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      <div className="bg-gray-50/50 rounded-lg overflow-hidden">
        {loading ? (
          <ActiveProductsTableSkeleton />
        ) : (
          <Table>
            <TableHeader className="bg-gray-100/50 hover:bg-gray-100/50">
              <TableRow className="border-b-0 hover:bg-transparent">
                <TableHead className="font-medium text-gray-500">Name of Product</TableHead>
                <TableHead className="font-medium text-gray-500">Product ID</TableHead>
                <TableHead className="font-medium text-gray-500">Product type</TableHead>
                <TableHead className="font-medium text-gray-500">Timestamp</TableHead>
                <TableHead className="font-medium text-gray-500">Meta_Ref</TableHead>
                <TableHead className="font-medium text-gray-500">Configuration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-gray-500">
                    No active {activeTab} products for this app. Turn products on under{" "}
                    <span className="font-medium">All Product</span> for this app.
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => (
                  <TableRow
                    key={product.id}
                    className="hover:bg-gray-50 border-b border-gray-100 cursor-pointer"
                    onClick={() =>
                      router.push(
                        `/dashboard/merchant/products/active/active-loan?productId=${encodeURIComponent(product.id)}&appId=${encodeURIComponent(effectiveAppId)}`,
                      )
                    }
                  >
                    <TableCell className="font-medium py-6 bg-white">{product.name}</TableCell>
                    <TableCell className="bg-white">
                      <div className="flex items-center gap-2">
                        {product.id}
                        <button type="button" className="text-gray-400 hover:text-gray-600" aria-label="Copy">
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                          </svg>
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className="bg-white">{product.type}</TableCell>
                    <TableCell className="text-gray-500 bg-white">{formatTimestamp(product.createdAt)}</TableCell>
                    <TableCell className="bg-white">
                      <div className="flex items-center gap-2">
                        {product.referenceNumber ?? "—"}
                      </div>
                    </TableCell>
                    <TableCell className="bg-white">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          setConfigureProduct(product)
                          setIsConfigureOpen(true)
                        }}
                        className="bg-[#dcdcdc] hover:bg-[#d1d1d1] text-gray-700 rounded-full h-8 px-6 text-xs font-semibold shadow-none w-[100px]"
                      >
                        Configure
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <ConfigurePricingSheet
        open={isConfigureOpen}
        onOpenChange={(open) => {
          setIsConfigureOpen(open)
          if (!open) setConfigureProduct(null)
        }}
        product={configureProduct}
      />
    </div>
  )
}
