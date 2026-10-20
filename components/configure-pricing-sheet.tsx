"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Drawer } from "@/components/drawer"
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
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [rawConfig, setRawConfig] = useState<unknown>(null)
  const [fees, setFees] = useState<DisplayFee[]>(() => DEMO_FEES.map((r) => ({ ...r })))
  /** Row id where the merchant "Your pricing" field is an input */
  const [editingRowId, setEditingRowId] = useState<string | null>(null)

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
    setEditingRowId(null)
    void loadConfig()
  }, [open, loadConfig])

  const updateFeeRow = useCallback((id: string, patch: Partial<DisplayFee>) => {
    setFees((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)))
  }, [])

  const hasMerchantPricing = (row: DisplayFee) => row.yourValue.trim() !== ""

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
            <div className="space-y-6">
              {loading && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading fees…
                </div>
              )}

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
                        <th className="px-4 py-3 font-medium bg-gray-200/60">Your pricing</th>
                        <th className="px-4 py-3 font-medium text-right min-w-[120px]"> </th>
                      </tr>
                    </thead>
                    <tbody>
                      {fees.map((row) => {
                        const isEditing = editingRowId === row.id
                        const added = hasMerchantPricing(row)
                        return (
                          <tr key={row.id} className="border-t border-gray-100">
                            <td className="px-4 py-3 font-medium text-gray-900">{row.name}</td>
                            <td className="px-4 py-3 text-gray-700">{row.feeType}</td>
                            <td className="px-4 py-3 text-gray-800 min-w-[100px]">{row.baseValue}</td>
                            <td className="px-4 py-3 bg-gray-100/90 text-gray-900 min-w-[120px]">
                              {isEditing ? (
                                <Input
                                  value={row.yourValue}
                                  onChange={(e) => updateFeeRow(row.id, { yourValue: e.target.value })}
                                  className="h-9 border-[#E2E8F0] bg-white"
                                  placeholder="Enter your pricing"
                                  aria-label={`${row.name} your pricing`}
                                />
                              ) : (
                                <span className="font-medium">{row.yourValue.trim() ? row.yourValue : "—"}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {isEditing ? (
                                <button
                                  type="button"
                                  onClick={() => setEditingRowId(null)}
                                  className="text-xs font-semibold text-[#7C3AED] border border-[#7C3AED] rounded-full px-3 py-1.5 hover:bg-violet-50"
                                >
                                  Done
                                </button>
                              ) : added ? (
                                <button
                                  type="button"
                                  onClick={() => setEditingRowId(row.id)}
                                  className="inline-flex items-center justify-end gap-1 text-xs font-semibold text-[#7C3AED] border border-[#7C3AED] rounded-full px-3 py-1.5 hover:bg-violet-50"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  Edit
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setEditingRowId(row.id)}
                                  className="text-xs font-semibold text-[#7C3AED] border border-[#7C3AED] rounded-full px-3 py-1.5 hover:bg-violet-50"
                                >
                                  Add Pricing
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

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
          </>
        )}
      </div>
    </Drawer>
  )
}
