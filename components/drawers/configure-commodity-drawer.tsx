"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { X } from "lucide-react"
import { Drawer } from "@/components/drawer"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { fileToBase64 } from "@/lib/fileUtils"
import { fetchOptionLabels, fetchProductOptionLabels } from "@/lib/productOptions"
import type { CommodityConfigurePrefetched } from "@/lib/productConfigurePrefetch"
import { ProductConfigAboutStep } from "@/components/drawers/product-config-about-step"
import {
  ProductConfigInput,
  ProductConfigSelect,
  ProductConfigTabs,
  ProductConfigToggle,
} from "@/components/drawers/product-config-form-fields"

interface ConfigureCommodityDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => void
  commodityData: any
  variant?: "commodity" | "investment"
  prefetchedOptions?: CommodityConfigurePrefetched | null
}

const DEFAULT_TENURE: string[] = []
const DEFAULT_YIELD_METHOD_OPTIONS: string[] = []
const DEFAULT_WITHDRAWAL_FLEXIBILITY_OPTIONS: string[] = []
const DEFAULT_FEE_TYPE_OPTIONS: string[] = []
const DEFAULT_PENALTY_TYPE_OPTIONS: string[] = []
const TRIGGER_DURATION_OPTIONS: string[] = []

interface TypeRow {
  name: string
  description: string
}

interface FeeItem {
  name: string
  feeType: string
  value: string
}

interface PenaltyItem {
  name: string
  type: string
  value: string
  triggerDuration: string
}

interface PriceRow {
  id: string
  price: string
  date: string
  source: string
}

export default function ConfigureCommodityDrawer({
  isOpen,
  onClose,
  onSubmit,
  commodityData,
  variant = "commodity",
  prefetchedOptions = null,
}: ConfigureCommodityDrawerProps) {
  const isInvestment = variant === "investment"

  const steps = useMemo(
    () =>
      isInvestment
        ? (["About Product", "Structure", "Fees & Charges", "Unit Price"] as const)
        : (["About Product", "Structure", "Fees & Charges", "Commodity Price"] as const),
    [isInvestment],
  )

  const [step, setStep] = useState(1)
  const [tenureOptions, setTenureOptions] = useState<string[]>(DEFAULT_TENURE)
  const [yieldMethodOptions, setYieldMethodOptions] = useState<string[]>(DEFAULT_YIELD_METHOD_OPTIONS)
  const [withdrawalFlexibilityOptions, setWithdrawalFlexibilityOptions] = useState<string[]>(DEFAULT_WITHDRAWAL_FLEXIBILITY_OPTIONS)
  const [feeTypeOptions, setFeeTypeOptions] = useState<string[]>(DEFAULT_FEE_TYPE_OPTIONS)
  const [penaltyTypeOptions, setPenaltyTypeOptions] = useState<string[]>(DEFAULT_PENALTY_TYPE_OPTIONS)
  const [triggerDurationOptions, setTriggerDurationOptions] = useState<string[]>(TRIGGER_DURATION_OPTIONS)

  const [name, setName] = useState(commodityData?.name || "")
  const [duration, setDuration] = useState("")
  const [description, setDescription] = useState(commodityData?.description || "")
  const [typeNameDraft, setTypeNameDraft] = useState("")
  const [typeDescDraft, setTypeDescDraft] = useState("")
  const [typeRows, setTypeRows] = useState<TypeRow[]>([])
  const [previewImage, setPreviewImage] = useState<File | null>(null)

  const [yieldMethod, setYieldMethod] = useState("")
  const [offerYieldOn, setOfferYieldOn] = useState(true)
  const [offerYieldValue, setOfferYieldValue] = useState("")
  const [withdrawalFlexibility, setWithdrawalFlexibility] = useState("")
  const [unitAmount, setUnitAmount] = useState("")
  const [minQuantityPurchase, setMinQuantityPurchase] = useState("")
  const [maxAmount, setMaxAmount] = useState("")
  const [termsAndConditions, setTermsAndConditions] = useState("")
  const [moratoriumEnabled, setMoratoriumEnabled] = useState(true)
  const [moratoriumDays, setMoratoriumDays] = useState("")
  const [contractId, setContractId] = useState("")
  const [airSignSecretKey, setAirSignSecretKey] = useState("")
  const [airSignUid, setAirSignUid] = useState("")

  const [chargeName, setChargeName] = useState("")
  const [chargeFeeType, setChargeFeeType] = useState("")
  const [chargeValue, setChargeValue] = useState("")
  const [charges, setCharges] = useState<FeeItem[]>([])
  const [forcefulWithdrawal, setForcefulWithdrawal] = useState(true)
  const [penaltyName, setPenaltyName] = useState("")
  const [penaltyType, setPenaltyType] = useState("")
  const [penaltyValue, setPenaltyValue] = useState("")
  const [penaltyTriggerDuration, setPenaltyTriggerDuration] = useState("")
  const [penalties, setPenalties] = useState<PenaltyItem[]>([])

  const isPercentType = (value: string) => value.toLowerCase().includes("percent")
  const cleanNumeric = (value: string) => value.replace(/[^0-9.]/g, "")
  const normalizePercentInput = (raw: string) => {
    const numeric = cleanNumeric(raw)
    if (!numeric) return ""
    return `${numeric}%`
  }
  const normalizeTypedValue = (raw: string, type: string) => {
    const numeric = cleanNumeric(raw)
    if (!numeric) return ""
    return isPercentType(type) ? `${numeric}%` : numeric
  }
  const handleChargeFeeTypeChange = (nextType: string) => {
    setChargeFeeType(nextType)
    setChargeValue((prev) => normalizeTypedValue(prev, nextType))
  }
  const handlePenaltyTypeChange = (nextType: string) => {
    setPenaltyType(nextType)
    setPenaltyValue((prev) => normalizeTypedValue(prev, nextType))
  }
  const handleChargeValueChange = (value: string) => {
    setChargeValue(normalizeTypedValue(value, chargeFeeType))
  }
  const handlePenaltyValueChange = (value: string) => {
    setPenaltyValue(normalizeTypedValue(value, penaltyType))
  }
  const handleOfferYieldValueChange = (value: string) => {
    setOfferYieldValue(normalizePercentInput(value))
  }

  const [priceDraft, setPriceDraft] = useState("")
  const [priceDate, setPriceDate] = useState("")
  const [priceSource, setPriceSource] = useState("")
  const [priceRows, setPriceRows] = useState<PriceRow[]>([])

  const resetForm = useCallback(() => {
    setStep(1)
    setName(commodityData?.name || "")
    setDuration("")
    setDescription(commodityData?.description || "")
    setTypeRows([])
    setPreviewImage(null)
    setYieldMethod("")
    setOfferYieldOn(true)
    setOfferYieldValue("")
    setWithdrawalFlexibility("")
    setUnitAmount("")
    setMinQuantityPurchase("")
    setMaxAmount("")
    setTermsAndConditions("")
    setMoratoriumEnabled(true)
    setMoratoriumDays("")
    setContractId("")
    setAirSignSecretKey("")
    setAirSignUid("")
    setCharges([])
    setForcefulWithdrawal(true)
    setPenalties([])
    setPriceRows([])
  }, [commodityData?.name, commodityData?.description])

  useEffect(() => {
    if (isOpen) resetForm()
  }, [isOpen, resetForm])

  useEffect(() => {
    if (!isOpen) return
    if (prefetchedOptions) {
      setTenureOptions(prefetchedOptions.tenure.length ? prefetchedOptions.tenure : DEFAULT_TENURE)
      setYieldMethodOptions(prefetchedOptions.yieldMethod)
      setWithdrawalFlexibilityOptions(prefetchedOptions.withdrawalFlexibility)
      setFeeTypeOptions(prefetchedOptions.feeType)
      setPenaltyTypeOptions(prefetchedOptions.penaltyType)
      setTriggerDurationOptions(prefetchedOptions.triggerDuration)
      return
    }
    const url = isInvestment
      ? "/api/configurations/options/investment-tenure"
      : "/api/configurations/options/commodity-tenure"
    const fetchTenure = async () => {
      try {
        const res = await fetch(url, { credentials: "include", cache: "no-store" })
        const json = await res.json().catch(() => ({}))
        const list = (json?.data ?? []) as { value?: string; label?: string }[]
        const opts =
          Array.isArray(list) && list.length
            ? list.map((x) => x.label || x.value).filter((v): v is string => typeof v === "string" && v.length > 0)
            : []
        if (opts.length) setTenureOptions(opts)
      } catch {
        setTenureOptions(DEFAULT_TENURE)
      }
      const [withdrawalFlexibility, feeTypes, penaltyTypes, triggerDuration] = await Promise.all([
        fetchOptionLabels("withdrawal-flexibility", DEFAULT_WITHDRAWAL_FLEXIBILITY_OPTIONS),
        fetchOptionLabels("fee-type", DEFAULT_FEE_TYPE_OPTIONS),
        fetchOptionLabels("penalty-type", DEFAULT_PENALTY_TYPE_OPTIONS),
        fetchProductOptionLabels("trigger-duration", TRIGGER_DURATION_OPTIONS),
      ])
      setWithdrawalFlexibilityOptions(withdrawalFlexibility)
      setFeeTypeOptions(feeTypes)
      setPenaltyTypeOptions(penaltyTypes)
      setTriggerDurationOptions(triggerDuration)

      const yieldOptions = await fetchOptionLabels(
        isInvestment ? "investment-trading-cycle" : "commodity-trading-cycle",
        DEFAULT_YIELD_METHOD_OPTIONS,
      )
      setYieldMethodOptions(yieldOptions)
    }
    fetchTenure()
  }, [isOpen, isInvestment, prefetchedOptions])

  useEffect(() => {
    if (!moratoriumEnabled) setMoratoriumDays("")
  }, [moratoriumEnabled])

  const formatWithCommas = (value: string) => {
    const numericValue = value.replace(/[^0-9.]/g, "")
    const parts = numericValue.split(".")
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",")
    return parts.join(".")
  }

  const removeCommas = (value: string) => value.replace(/,/g, "")

  const handleCurrencyChange = (value: string, setter: (val: string) => void) => {
    const raw = removeCommas(value)
    if (raw === "" || /^\d*\.?\d{0,2}$/.test(raw)) {
      setter(formatWithCommas(raw))
    }
  }

  const addTypeRow = () => {
    if (!typeNameDraft.trim() || !typeDescDraft.trim()) return
    setTypeRows((prev) => [...prev, { name: typeNameDraft.trim(), description: typeDescDraft.trim() }])
    setTypeNameDraft("")
    setTypeDescDraft("")
  }

  const addCharge = () => {
    if (!chargeName.trim() || !chargeFeeType || !chargeValue.trim()) return
    setCharges((prev) => [...prev, { name: chargeName.trim(), feeType: chargeFeeType, value: chargeValue.trim() }])
    setChargeName("")
    setChargeFeeType("")
    setChargeValue("")
  }

  const addPenalty = () => {
    if (!penaltyName.trim() || !penaltyType || !penaltyValue.trim() || !penaltyTriggerDuration) return
    setPenalties((prev) => [
      ...prev,
      {
        name: penaltyName.trim(),
        type: penaltyType,
        value: penaltyValue.trim(),
        triggerDuration: penaltyTriggerDuration,
      },
    ])
    setPenaltyName("")
    setPenaltyType("")
    setPenaltyValue("")
    setPenaltyTriggerDuration("")
  }

  const addPriceRow = () => {
    if (!priceDraft.trim() || !priceDate || !priceSource.trim()) return
    setPriceRows((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        price: priceDraft.trim(),
        date: priceDate,
        source: priceSource.trim(),
      },
    ])
    setPriceDraft("")
    setPriceDate("")
    setPriceSource("")
  }

  const formatPriceTableDate = (iso: string) => {
    if (!iso) return "—"
    const d = new Date(iso + "T12:00:00")
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleBack = () => {
    if (step > 1) setStep((s) => s - 1)
  }

  const handleNext = async () => {
    if (step < steps.length) {
      setStep((s) => s + 1)
      return
    }

    const previewPayload = previewImage
      ? {
          fileName: previewImage.name,
          fileType: previewImage.type,
          fileSize: previewImage.size,
          fileBase64: await fileToBase64(previewImage),
        }
      : null

    const payload = {
      ...commodityData,
      name,
      description,
      duration,
      typeRows,
      commodityTypes: !isInvestment ? typeRows : undefined,
      investmentTypes: isInvestment ? typeRows : undefined,
      previewImage: previewPayload,
      yieldMethod,
      offerYieldOn,
      offerYieldValue,
      withdrawalFlexibility,
      unitAmount: removeCommas(unitAmount),
      minQuantityPurchase,
      maxAmount: removeCommas(maxAmount),
      termsAndConditions,
      moratoriumEnabled,
      moratoriumDays,
      contractId,
      airSignSecretKey,
      airSignUid,
      charges,
      forcefulWithdrawal,
      penalties,
      commodityPrices: !isInvestment ? priceRows : undefined,
      unitPrices: isInvestment ? priceRows : undefined,
      priceHistory: priceRows,
    }

    if (isInvestment) {
      onSubmit({
        ...payload,
        purpose: description,
        tradingCycle: yieldMethod,
        investmentTenure: duration,
        investmentType: commodityData?.investmentType ?? commodityData?.productType ?? commodityData?.productSubtype,
        securityRequirements: [],
        minimumOrderQuantity: minQuantityPurchase,
        price: removeCommas(maxAmount),
        managementFeePercent: "",
        minimumRedemptionAmount: "",
        expectedAnnualReturn: offerYieldOn ? offerYieldValue : "",
        additionalRequirements: [],
        minInvestmentAmount: removeCommas(unitAmount),
        maxInvestmentAmount: removeCommas(maxAmount),
        expectedReturn: offerYieldOn ? offerYieldValue : "",
      })
    } else {
      onSubmit({
        ...payload,
        purpose: description,
        tradingCycle: yieldMethod,
        commodityTenure: duration,
        securityRequirements: [],
        minInvestmentAmount: removeCommas(unitAmount),
        maxInvestmentAmount: removeCommas(maxAmount),
        managementFee: "",
        minWithdrawalAmount: minQuantityPurchase,
        expectedReturn: offerYieldOn ? offerYieldValue : "",
        additionalRequirements: [],
      })
    }
  }

  const title = isInvestment ? "Configure Investment Product" : "Configure Commodity Product"
  const subtitle = isInvestment
    ? "Configure the parameters of this investment product"
    : "Configure the parameters of this Commodity product"

  const nameLabel = isInvestment ? "Name of Investment" : "Name of Commodity"
  const durationLabel = isInvestment ? "Duration of Investment" : "Duration of Commodity"
  const typeSectionLabel = isInvestment ? "Investment Type" : "Commodity Type"
  const offerYieldLabel = isInvestment ? "Offer Yield on Investment" : "Offer Yield on Commodity"
  const termsLabel = isInvestment ? "Investment Terms & Condition" : "Commodity Terms & Condition"

  return (
    <Drawer
      open={isOpen}
      onOpenChange={onClose}
      title={title}
      subtitle={subtitle}
      className="w-full min-w-0 rounded-none sm:w-[92%] md:w-[78%] lg:w-[62%] xl:w-[52%] 2xl:w-[45%] sm:min-w-[400px] sm:rounded-bl-[40px] sm:rounded-tl-[40px]"
    >
      <div className="mx-auto w-full">
        <ProductConfigTabs steps={[...steps]} activeStep={step} onStepChange={setStep} />

        {step === 1 && (
          <ProductConfigAboutStep
            idPrefix={isInvestment ? "investment-commodity" : "commodity"}
            nameLabel={nameLabel}
            name={name}
            onNameChange={setName}
            durationLabel={durationLabel}
            durationPlaceholder="Select"
            durationValue={duration}
            durationOptions={tenureOptions}
            onDurationChange={setDuration}
            description={description}
            onDescriptionChange={setDescription}
            typeSectionLabel={typeSectionLabel}
            typeNameDraft={typeNameDraft}
            typeDescDraft={typeDescDraft}
            onTypeNameDraftChange={setTypeNameDraft}
            onTypeDescDraftChange={setTypeDescDraft}
            onAddType={addTypeRow}
            typeRows={typeRows}
            previewFile={previewImage}
            onPreviewFileChange={setPreviewImage}
          />
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ProductConfigSelect
                label="Yield Method"
                placeholder="Select Section"
                value={yieldMethod}
                options={yieldMethodOptions}
                onChange={setYieldMethod}
              />
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="offer-yield" className="text-sm font-medium text-gray-700">
                    {offerYieldLabel}
                  </label>
                  <Switch
                    id="offer-yield"
                    checked={offerYieldOn}
                    onCheckedChange={setOfferYieldOn}
                    className="h-5 w-9 shrink-0 data-[state=checked]:bg-[#9A813F] data-[state=unchecked]:bg-slate-200"
                  />
                </div>
                {offerYieldOn ? (
                  <ProductConfigInput
                    label=""
                    placeholder="e.g 10%"
                    value={offerYieldValue}
                    onChange={handleOfferYieldValueChange}
                    numericOnly
                  />
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ProductConfigSelect
                label="Withdrawal Flexibility"
                placeholder="Select"
                value={withdrawalFlexibility}
                options={withdrawalFlexibilityOptions}
                onChange={setWithdrawalFlexibility}
              />
              <ProductConfigInput
                label="Unit Amount"
                placeholder="e.g N10,000"
                value={unitAmount}
                onChange={(v) => handleCurrencyChange(v, setUnitAmount)}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ProductConfigInput label="Min Quantity Purchase" placeholder="Min Quantity" value={minQuantityPurchase} onChange={setMinQuantityPurchase} numericOnly />
              <ProductConfigInput
                label="Max Amount"
                placeholder="Max Amount"
                value={maxAmount}
                onChange={(v) => handleCurrencyChange(v, setMaxAmount)}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">{termsLabel}</label>
              <textarea
                value={termsAndConditions}
                onChange={(e) => setTermsAndConditions(e.target.value)}
                placeholder="Enter Terms"
                rows={5}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-[#9A813F] focus:ring-2 focus:ring-[#9A813F]/20"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <Switch
                  id="commodity-moratorium"
                  checked={moratoriumEnabled}
                  onCheckedChange={setMoratoriumEnabled}
                  className="h-5 w-9 shrink-0 data-[state=checked]:bg-[#9A813F] data-[state=unchecked]:bg-slate-200"
                />
                <label htmlFor="commodity-moratorium" className="text-sm font-medium text-gray-700">
                  Moratorium
                </label>
              </div>
              <div className="w-full sm:max-w-xs">
                <ProductConfigInput
                  label=""
                  placeholder="Enter days"
                  value={moratoriumDays}
                  onChange={setMoratoriumDays}
                  numericOnly
                  disabled={!moratoriumEnabled}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <ProductConfigInput label="Contract ID" placeholder="Enter Contract ID" value={contractId} onChange={setContractId} />
              <ProductConfigInput label="AirSign Secret Key" placeholder="Enter secret key" value={airSignSecretKey} onChange={setAirSignSecretKey} />
              <ProductConfigInput label="AirSign UID" placeholder="Enter UID" value={airSignUid} onChange={setAirSignUid} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
              <ProductConfigInput label="Name of Charge or Fee" placeholder="e.g Processing Fee" value={chargeName} onChange={setChargeName} />
              <ProductConfigSelect
                label="Fee Type"
                placeholder="Select Section"
                value={chargeFeeType}
                  options={feeTypeOptions}
                  onChange={handleChargeFeeTypeChange}
              />
              <ProductConfigInput label="Value" placeholder="Enter Value" value={chargeValue} onChange={handleChargeValueChange} numericOnly />
              <Button type="button" onClick={addCharge} className="h-10 self-end bg-[#9A813F] text-white hover:bg-[#8A7335]">
                Add
              </Button>
            </div>

            {charges.length > 0 && (
              <div className="rounded-md border border-dashed border-[#cdbf8b] p-3">
                <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 border-b border-gray-100 pb-2 text-xs font-semibold text-gray-500">
                  <span>Name</span>
                  <span>Type</span>
                  <span>Value</span>
                  <span className="text-right" />
                </div>
                {charges.map((c, i) => (
                  <div key={`${c.name}-${i}`} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 border-b border-gray-100 py-2 text-sm last:border-0">
                    <span className="pr-2">{c.name}</span>
                    <span>{c.feeType}</span>
                    <span>{c.value}</span>
                    <div className="flex justify-end">
                      <button type="button" onClick={() => setCharges((p) => p.filter((_, j) => j !== i))} className="text-red-600" aria-label="Remove">
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <ProductConfigToggle id="commodity-forceful" label="Charge for Forceful Withdrawal" checked={forcefulWithdrawal} onChange={setForcefulWithdrawal} />

            {forcefulWithdrawal && (
              <>
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_0.9fr_0.85fr_1.25fr_auto]">
                  <ProductConfigInput label="Name of Penalty" placeholder="e.g Processing Fee" value={penaltyName} onChange={setPenaltyName} />
                  <ProductConfigSelect
                    label="Type"
                    placeholder="Select Section"
                    value={penaltyType}
                    options={penaltyTypeOptions}
                    onChange={handlePenaltyTypeChange}
                  />
                  <ProductConfigInput label="Value" placeholder="Enter Value" value={penaltyValue} onChange={handlePenaltyValueChange} numericOnly />
                  <ProductConfigSelect
                    label="Duration Before Trigger"
                    placeholder="Select Section"
                    value={penaltyTriggerDuration}
                    options={triggerDurationOptions}
                    onChange={setPenaltyTriggerDuration}
                  />
                  <Button type="button" onClick={addPenalty} className="h-10 self-end bg-[#9A813F] text-white hover:bg-[#8A7335]">
                    Add
                  </Button>
                </div>

                {penalties.length > 0 && (
                  <div className="rounded-md border border-dashed border-[#cdbf8b] p-3">
                    <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 border-b border-gray-100 pb-2 text-xs font-semibold text-gray-500">
                      <span>Name</span>
                      <span>Value</span>
                      <span>Trigger Duration</span>
                      <span className="text-right" />
                    </div>
                    {penalties.map((p, i) => (
                      <div key={`${p.name}-${i}`} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 border-b border-gray-100 py-2 text-sm last:border-0">
                        <span className="pr-2">{p.name}</span>
                        <span>{p.value}</span>
                        <span>{p.triggerDuration}</span>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => setPenalties((prev) => prev.filter((_, j) => j !== i))}
                            className="text-red-600"
                            aria-label="Remove penalty"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
              <ProductConfigInput
                label={isInvestment ? "Enter Unit Price" : "Enter Commodity Price"}
                placeholder="e.g N12,000.44"
                value={priceDraft}
                onChange={setPriceDraft}
                numericOnly
              />
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Select Date</label>
                <input
                  type="date"
                  value={priceDate}
                  onChange={(e) => setPriceDate(e.target.value)}
                  className="h-10 w-full rounded-md border border-[#e5e7eb] bg-white px-3 text-sm outline-none focus:border-[#9A813F] focus:ring-2 focus:ring-[#9A813F]/20"
                />
              </div>
              <ProductConfigInput label="Source" placeholder="Enter Value" value={priceSource} onChange={setPriceSource} />
              <Button type="button" onClick={addPriceRow} className="h-10 self-end bg-[#9A813F] text-white hover:bg-[#8A7335]">
                Add
              </Button>
            </div>

            {priceRows.length > 0 && (
              <div className="overflow-x-auto rounded-md border border-dashed border-[#cdbf8b] p-3">
                <div className="grid min-w-[520px] grid-cols-[1fr_1fr_1fr_auto] gap-2 border-b border-gray-100 pb-2 text-xs font-semibold text-gray-500">
                  <span>Price</span>
                  <span>Date</span>
                  <span>Source</span>
                  <span className="text-right" />
                </div>
                {priceRows.map((row) => (
                  <div
                    key={row.id}
                    className="grid min-w-[520px] grid-cols-[1fr_1fr_1fr_auto] gap-2 border-b border-gray-100 py-2 text-sm last:border-0"
                  >
                    <span className="pr-2 font-medium">{row.price}</span>
                    <span>{formatPriceTableDate(row.date)}</span>
                    <span>{row.source}</span>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setPriceRows((p) => p.filter((r) => r.id !== row.id))}
                        className="text-red-600"
                        aria-label="Remove"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button onClick={handleBack} variant="outline" className="h-11 flex-1 border-[#c9b271] text-[#77642f] bg-transparent">
            Back
          </Button>
          <Button onClick={handleNext} className="h-11 flex-1 bg-[#9A813F] text-white hover:bg-[#8A7335]">
            {step === steps.length ? "Submit" : "Next"}
          </Button>
        </div>
      </div>
    </Drawer>
  )
}
