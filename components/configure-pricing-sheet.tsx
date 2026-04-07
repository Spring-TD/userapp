"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Drawer } from "@/components/drawer"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Pencil } from "lucide-react"
import { productApi } from "@/lib/services/product-api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

/** Same shape as rows from Active Products (avoids circular import with active-products-table). */
export type ConfigurePricingProduct = {
  id: string
  name: string
  type: string
  referenceNumber?: string
  createdAt?: string
}

const ACCENT = "#7C3AED"

type ConfigTab = "about" | "structure" | "fees"

const TABS: { id: ConfigTab; label: string }[] = [
  { id: "about", label: "About Product" },
  { id: "structure", label: "Structure" },
  { id: "fees", label: "Fees & Charges" },
]

interface DisplayFee {
  id: string
  name: string
  feeType: string
  baseValue: string
  yourValue: string
}

const toText = (value: unknown): string =>
  typeof value === "string" ? value : value == null ? "" : String(value)

/** Demo rows so the layout matches design when the API has no fee list yet */
const DEMO_FEES: DisplayFee[] = [
  { id: "demo-1", name: "Processing Fee", feeType: "Flat", baseValue: "N10,000", yourValue: "N1,000" },
  { id: "demo-2", name: "Search Fee", feeType: "Percent", baseValue: "5%", yourValue: "0.5%" },
  { id: "demo-3", name: "Admin Fee", feeType: "Percent", baseValue: "5%", yourValue: "1%" },
]

function parseDisplayFees(payload: unknown): DisplayFee[] {
  const root = (payload as { data?: unknown })?.data ?? payload ?? {}
  const cfg = (root as { configuration?: Record<string, unknown> }).configuration ?? root
  const feeRoot =
    (cfg as { feesAndCharges?: { charges?: unknown[] } }).feesAndCharges ??
    (root as { feesAndCharges?: { charges?: unknown[] } }).feesAndCharges ??
    {}
  const rawCharges = Array.isArray(feeRoot.charges)
    ? feeRoot.charges
    : Array.isArray((cfg as { charges?: unknown[] }).charges)
      ? (cfg as { charges: unknown[] }).charges
      : []

  if (!rawCharges.length) return DEMO_FEES.map((r) => ({ ...r }))

  return rawCharges.map((item: unknown, i: number) => {
    const row = item as Record<string, unknown>
    const base = toText(row.baseValue ?? row.defaultValue ?? row.value)
    const yours = toText(row.yourValue ?? row.merchantValue ?? row.value)
    return {
      id: toText(row.id) || `${i}-${toText(row.name)}`,
      name: toText(row.name),
      feeType: toText(row.feeType ?? row.type),
      baseValue: base,
      yourValue: yours,
    }
  })
}

function toChargesForSave(rows: DisplayFee[]) {
  return rows.map((f) => ({
    name: f.name,
    feeType: f.feeType,
    value: f.yourValue.trim() || f.baseValue,
    baseValue: f.baseValue,
    yourValue: f.yourValue,
  }))
}

function flattenConfigForSave(configResponse: unknown): Record<string, unknown> {
  const res = configResponse as { data?: Record<string, unknown> } | null
  const d = res?.data ?? (configResponse as Record<string, unknown>) ?? {}
  const cfg = (d.configuration as Record<string, unknown> | undefined) ?? d
  const fees = (cfg.feesAndCharges as Record<string, unknown> | undefined) ?? {}
  const about = (cfg.about as Record<string, unknown> | undefined) ?? {}
  const structure = (cfg.structure as Record<string, unknown> | undefined) ?? {}
  const charges = Array.isArray(fees.charges) ? fees.charges : Array.isArray(cfg.charges) ? cfg.charges : []
  const penalties = Array.isArray(fees.penalties) ? fees.penalties : []

  return {
    name: d.name ?? cfg.name,
    description: d.description ?? cfg.description,
    previewImage: d.previewImage ?? cfg.previewImage,
    ...about,
    ...structure,
    charges,
    penalties,
    withdrawalPenalties: penalties,
    requirements: cfg.requirements,
    properties: cfg.properties,
  }
}

function productTypeToSaveKey(type: string): string {
  const t = type.trim().toLowerCase()
  const map: Record<string, string> = {
    mortgage: "Mortgage",
    loan: "Loan",
    savings: "Savings",
    investment: "Investment",
    commodity: "Commodity",
  }
  return map[t] ?? (type ? type.charAt(0).toUpperCase() + type.slice(1).toLowerCase() : "Loan")
}

interface ConfigurePricingSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When set (e.g. from Active Products “Configure”), fees load/save against this product */
  product?: ConfigurePricingProduct | null
}

export function ConfigurePricingSheet({ open, onOpenChange, product }: ConfigurePricingSheetProps) {
  const [tab, setTab] = useState<ConfigTab>("fees")
  const [view, setView] = useState<"tables" | "pricing">("tables")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [rawConfig, setRawConfig] = useState<unknown>(null)
  const [fees, setFees] = useState<DisplayFee[]>(() => DEMO_FEES.map((r) => ({ ...r })))
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  const [pricingType, setPricingType] = useState("")
  const [pricingCondition, setPricingCondition] = useState("")
  const [upperCap, setUpperCap] = useState("")
  const [floorCap, setFloorCap] = useState("")
  const [springFee, setSpringFee] = useState("")
  const [markupFee, setMarkupFee] = useState("")
  const [serviceFee, setServiceFee] = useState("")

  const title = "Configure Product"

  const subtitle = product?.name ? product.name : "Manage product configuration and fees"

  const loadConfig = useCallback(async () => {
    if (!product?.id) {
      setFees(DEMO_FEES.map((r) => ({ ...r })))
      setRawConfig(null)
      return
    }
    setLoading(true)
    try {
      const res = await productApi.getProductConfiguration(product.id)
      setRawConfig(res)
      setFees(parseDisplayFees(res))
    } catch (e) {
      console.error(e)
      toast.error("Could not load product configuration")
      setFees(DEMO_FEES.map((r) => ({ ...r })))
    } finally {
      setLoading(false)
    }
  }, [product?.id])

  useEffect(() => {
    if (!open) return
    setTab("fees")
    setView("tables")
    setEditingIndex(null)
    void loadConfig()
  }, [open, loadConfig])

  const openPricingDetail = (index: number, mode: "add" | "edit") => {
    setEditingIndex(index)
    const row = fees[index]
    if (mode === "edit" && row) {
      setMarkupFee(row.yourValue)
      setSpringFee("")
    } else {
      setMarkupFee("")
      setSpringFee("")
    }
    setPricingType("")
    setPricingCondition("")
    setUpperCap("")
    setFloorCap("")
    setServiceFee("")
    setView("pricing")
  }

  const applyPricingDetail = () => {
    if (editingIndex == null) return
    const value = markupFee.trim() || springFee.trim() || ""
    setFees((prev) =>
      prev.map((f, i) => (i === editingIndex ? { ...f, yourValue: value || f.yourValue } : f)),
    )
    setView("tables")
    setEditingIndex(null)
    toast.success("Pricing updated for this fee")
  }

  const handleSubmit = async () => {
    if (!product?.id) {
      toast.message("Open this screen from Active Products and pick a product to save changes to the server.")
      onOpenChange(false)
      return
    }
    setSaving(true)
    try {
      const base = rawConfig ? flattenConfigForSave(rawConfig) : {}
      const next = { ...base, charges: toChargesForSave(fees) }
      await productApi.saveProductConfiguration(product.id, productTypeToSaveKey(product.type), next)
      toast.success("Configuration saved")
      onOpenChange(false)
    } catch (e) {
      console.error(e)
      toast.error("Failed to save configuration")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      subtitle={subtitle}
      className="w-full min-w-0 sm:w-[92%] md:w-[78%] lg:w-[62%] xl:w-[52%] 2xl:w-[45%] sm:min-w-[400px]"
    >
      <div className="space-y-6">
        {/* Tabs — design: Fees & Charges emphasized */}
        <div className="flex gap-8 border-b border-gray-200 -mx-1 px-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "pb-3 text-sm font-medium border-b-2 -mb-px transition-colors",
                tab === t.id
                  ? "border-[#7C3AED] text-[#7C3AED]"
                  : "border-transparent text-gray-500 hover:text-gray-700",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "about" && (
          <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 text-sm text-gray-700 space-y-2">
            <p>
              <span className="text-gray-500">Product name:</span>{" "}
              <span className="font-medium text-gray-900">{product?.name ?? "—"}</span>
            </p>
            <p>
              <span className="text-gray-500">Type:</span>{" "}
              <span className="font-medium text-gray-900">{product?.type ?? "—"}</span>
            </p>
            <p>
              <span className="text-gray-500">ID:</span>{" "}
              <span className="font-mono text-xs text-gray-800 break-all">{product?.id ?? "—"}</span>
            </p>
            {!product?.id && (
              <p className="text-amber-800 text-xs pt-2">
                Product details appear when you open Configure from the Active Products list.
              </p>
            )}
          </div>
        )}

        {tab === "structure" && (
          <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 text-sm text-gray-600">
            Structure fields (tenure, rates, limits, etc.) are available in the full create-app product
            configuration flow. Use this drawer for fees and pricing overrides on activated products.
          </div>
        )}

        {tab === "fees" && (
          <>
            {view === "tables" && (
              <div className="space-y-6">
                {loading && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading fees…
                  </div>
                )}

                {/* Section 1 — Available / Base */}
                <div
                  className="rounded-xl border-2 border-dashed p-5 space-y-4"
                  style={{ borderColor: ACCENT }}
                >
                  <h3 className="font-semibold text-gray-900">Available/Base Fees</h3>
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-100/80 text-left text-gray-500">
                          <th className="px-4 py-3 font-medium">Name</th>
                          <th className="px-4 py-3 font-medium">Type</th>
                          <th className="px-4 py-3 font-medium">Value</th>
                          <th className="px-4 py-3 font-medium text-right w-[140px]"> </th>
                        </tr>
                      </thead>
                      <tbody>
                        {fees.map((row, i) => (
                          <tr key={row.id} className="border-t border-gray-100">
                            <td className="px-4 py-3 font-medium text-gray-900">{row.name}</td>
                            <td className="px-4 py-3 text-gray-700">{row.feeType}</td>
                            <td className="px-4 py-3 text-gray-800">{row.baseValue}</td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => openPricingDetail(i, "add")}
                                className="text-xs font-semibold text-[#7C3AED] border border-[#7C3AED] rounded-full px-3 py-1.5 hover:bg-violet-50"
                              >
                                Add Pricing
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Section 2 — Your charges */}
                <div
                  className="rounded-xl border-2 border-dashed p-5 space-y-4"
                  style={{ borderColor: ACCENT }}
                >
                  <h3 className="font-semibold text-gray-900">Your Charges</h3>
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-100/80 text-left text-gray-500">
                          <th className="px-4 py-3 font-medium">Name</th>
                          <th className="px-4 py-3 font-medium">Type</th>
                          <th className="px-4 py-3 font-medium">Value</th>
                          <th className="px-4 py-3 font-medium bg-gray-200/60">Your Charges</th>
                          <th className="px-4 py-3 font-medium w-[100px]"> </th>
                        </tr>
                      </thead>
                      <tbody>
                        {fees.map((row, i) => (
                          <tr key={`y-${row.id}`} className="border-t border-gray-100">
                            <td className="px-4 py-3 font-medium text-gray-900">{row.name}</td>
                            <td className="px-4 py-3 text-gray-700">{row.feeType}</td>
                            <td className="px-4 py-3 text-gray-600">{row.baseValue}</td>
                            <td className="px-4 py-3 bg-gray-100/90 font-medium text-gray-900">
                              {row.yourValue || "—"}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => openPricingDetail(i, "edit")}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-[#7C3AED] hover:underline"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {view === "pricing" && (
              <div className="space-y-5">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-[#7C3AED] -ml-2"
                  onClick={() => {
                    setView("tables")
                    setEditingIndex(null)
                  }}
                >
                  ← Back to fees
                </Button>

                <div className="space-y-2">
                  <Label htmlFor="pricing-type" className="font-normal text-gray-700">
                    Select Pricing Type
                  </Label>
                  <Select value={pricingType || undefined} onValueChange={setPricingType}>
                    <SelectTrigger id="pricing-type" className="!h-12 border-[#E2E8F0] bg-white rounded-xl w-full">
                      <SelectValue placeholder="" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flat">Flat Rate</SelectItem>
                      <SelectItem value="percentage">Percentage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pricing-condition" className="font-normal text-gray-700">
                    Select Pricing Condition
                  </Label>
                  <Select value={pricingCondition || undefined} onValueChange={setPricingCondition}>
                    <SelectTrigger id="pricing-condition" className="!h-12 border-[#E2E8F0] bg-white rounded-xl w-full">
                      <SelectValue placeholder="" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="upper-cap">Upper Cap</Label>
                  <Input id="upper-cap" value={upperCap} onChange={(e) => setUpperCap(e.target.value)} className="h-12 border-[#E2E8F0] rounded-xl" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="floor-cap">Floor Cap</Label>
                  <Input id="floor-cap" value={floorCap} onChange={(e) => setFloorCap(e.target.value)} className="h-12 border-[#E2E8F0] rounded-xl" />
                </div>

                <p className="text-sm font-medium text-gray-900">
                  Where markup is more than &ldquo;Upper cap&rdquo;, Upper cap fee will be charged as flat rate
                </p>

                <div className="space-y-2">
                  <Label htmlFor="spring-fee">SpringTD Fee</Label>
                  <Input id="spring-fee" value={springFee} onChange={(e) => setSpringFee(e.target.value)} className="h-12 border-[#E2E8F0] rounded-xl" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="markup-fee">Your Mark-up Fee</Label>
                  <Input
                    id="markup-fee"
                    value={markupFee}
                    onChange={(e) => setMarkupFee(e.target.value)}
                    className="h-12 border-[#E2E8F0] rounded-xl"
                    placeholder="Shown under Your Charges"
                  />
                </div>

                <div className="space-y-2 pt-2">
                  <div className="text-sm font-medium text-gray-900">What you will be charged by Spring</div>
                  <Label htmlFor="service-fee">Service Fee</Label>
                  <Input id="service-fee" value={serviceFee} onChange={(e) => setServiceFee(e.target.value)} className="h-12 border-[#E2E8F0] rounded-xl" />
                </div>

                <p className="text-xs text-gray-600">This will be charged additional to &ldquo;Mark-up Fee&rdquo;</p>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 border-[#7C3AED] text-[#7C3AED] hover:bg-violet-50"
                    onClick={() => {
                      setView("tables")
                      setEditingIndex(null)
                    }}
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
                    onClick={applyPricingDetail}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {tab === "fees" && view === "tables" && (
          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-[#7C3AED] text-[#7C3AED] h-12"
              onClick={() => onOpenChange(false)}
            >
              Back
            </Button>
            <Button
              type="button"
              className="flex-1 bg-[#7C3AED] hover:bg-[#6D28D9] text-white h-12"
              disabled={saving}
              onClick={handleSubmit}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit"}
            </Button>
          </div>
        )}
      </div>
    </Drawer>
  )
}
