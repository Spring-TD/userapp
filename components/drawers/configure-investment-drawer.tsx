"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { Drawer } from "@/components/drawer"
import { Button } from "@/components/ui/button"
import { fileToBase64 } from "@/lib/fileUtils"
import { fetchOptionLabels, fetchProductOptionLabels } from "@/lib/productOptions"
import { ProductConfigAboutStep } from "@/components/drawers/product-config-about-step"
import {
  ProductConfigInput,
  ProductConfigSelect,
  ProductConfigTabs,
  ProductConfigToggle,
} from "@/components/drawers/product-config-form-fields"

interface ConfigureInvestmentDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => void
  investmentData: any
  /** Optional accent; defaults to gold used across product drawers */
  accentColor?: string
}

const STEPS = ["About Product", "Structure", "Fees & Charges"]

const DEFAULT_DURATION_OPTIONS: string[] = []
const DEFAULT_INTEREST_METHOD_OPTIONS: string[] = []
const INVESTMENT_TYPE_OPTIONS: string[] = []
const DEFAULT_WITHDRAWAL_FLEXIBILITY_OPTIONS: string[] = []
const DEFAULT_FEE_TYPE_OPTIONS: string[] = []
const DEFAULT_PENALTY_TYPE_OPTIONS: string[] = []
const TRIGGER_DURATION_OPTIONS: string[] = []

interface InvestmentTypeItem {
  name: string
  description: string
}

interface FeeItem {
  name: string
  feeType: string
  value: string
}

interface WithdrawalPenaltyItem {
  name: string
  type: string
  value: string
  triggerDuration: string
}

export default function ConfigureInvestmentDrawer({
  isOpen,
  onClose,
  onSubmit,
  investmentData,
  accentColor = "#9A813F",
}: ConfigureInvestmentDrawerProps) {
  const [step, setStep] = useState(1)
  const [durationOptions, setDurationOptions] = useState<string[]>(DEFAULT_DURATION_OPTIONS)
  const [interestMethodOptions, setInterestMethodOptions] = useState<string[]>(DEFAULT_INTEREST_METHOD_OPTIONS)
  const [withdrawalFlexibilityOptions, setWithdrawalFlexibilityOptions] = useState<string[]>(DEFAULT_WITHDRAWAL_FLEXIBILITY_OPTIONS)
  const [feeTypeOptions, setFeeTypeOptions] = useState<string[]>(DEFAULT_FEE_TYPE_OPTIONS)
  const [penaltyTypeOptions, setPenaltyTypeOptions] = useState<string[]>(DEFAULT_PENALTY_TYPE_OPTIONS)
  const [investmentTypeOptions, setInvestmentTypeOptions] = useState<string[]>(INVESTMENT_TYPE_OPTIONS)
  const [triggerDurationOptions, setTriggerDurationOptions] = useState<string[]>(TRIGGER_DURATION_OPTIONS)

  const [name, setName] = useState(investmentData?.name || "")
  const [duration, setDuration] = useState("")
  const [description, setDescription] = useState(investmentData?.description || "")
  const [typeNameDraft, setTypeNameDraft] = useState("")
  const [typeDescDraft, setTypeDescDraft] = useState("")
  const [investmentTypes, setInvestmentTypes] = useState<InvestmentTypeItem[]>([])
  const [previewImage, setPreviewImage] = useState<File | null>(null)

  const [roi, setRoi] = useState("")
  const [interestMethod, setInterestMethod] = useState("")
  const [investmentType, setInvestmentType] = useState("")
  const [withdrawalFlexibility, setWithdrawalFlexibility] = useState("")
  const [minAmount, setMinAmount] = useState("")
  const [maxAmount, setMaxAmount] = useState("")
  const [termsAndConditions, setTermsAndConditions] = useState("")

  const [enableUnitInvestment, setEnableUnitInvestment] = useState(true)
  const [moratoriumEnabled, setMoratoriumEnabled] = useState(true)
  const [moratoriumDays, setMoratoriumDays] = useState("")
  const [unitAmount, setUnitAmount] = useState("")
  const [minQuantity, setMinQuantity] = useState("")

  const [chargeName, setChargeName] = useState("")
  const [chargeFeeType, setChargeFeeType] = useState("")
  const [chargeValue, setChargeValue] = useState("")
  const [charges, setCharges] = useState<FeeItem[]>([])
  const [chargeForcefulWithdrawal, setChargeForcefulWithdrawal] = useState(true)
  const [penaltyName, setPenaltyName] = useState("")
  const [penaltyType, setPenaltyType] = useState("")
  const [penaltyValue, setPenaltyValue] = useState("")
  const [penaltyTriggerDuration, setPenaltyTriggerDuration] = useState("")
  const [withdrawalPenalties, setWithdrawalPenalties] = useState<WithdrawalPenaltyItem[]>([])

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
  const handleRoiChange = (value: string) => {
    setRoi(normalizePercentInput(value))
  }

  const [contractId, setContractId] = useState("")
  const [airSignSecretKey, setAirSignSecretKey] = useState("")
  const [airSignUid, setAirSignUid] = useState("")

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!isOpen) return
    const fetchOptions = async () => {
      try {
        const tenureRes = await fetch("/api/configurations/options/investment-tenure", {
          credentials: "include",
          cache: "no-store",
        })
        const tenureJson = await tenureRes.json().catch(() => ({}))
        const tenureList = (tenureJson?.data ?? []) as { value?: string; label?: string }[]
        const tenure =
          Array.isArray(tenureList) && tenureList.length
            ? tenureList.map((x) => x.label || x.value).filter((v): v is string => typeof v === "string" && v.length > 0)
            : []
        if (tenure.length) setDurationOptions(tenure)
      } catch {
        // keep defaults
      }
      const [interestMethods, withdrawalFlexibility, feeTypes, penaltyTypes, triggerDuration] = await Promise.all([
        fetchProductOptionLabels("interest-method", DEFAULT_INTEREST_METHOD_OPTIONS),
        fetchOptionLabels("withdrawal-flexibility", DEFAULT_WITHDRAWAL_FLEXIBILITY_OPTIONS),
        fetchOptionLabels("fee-type", DEFAULT_FEE_TYPE_OPTIONS),
        fetchOptionLabels("penalty-type", DEFAULT_PENALTY_TYPE_OPTIONS),
        fetchProductOptionLabels("trigger-duration", TRIGGER_DURATION_OPTIONS),
      ])
      setInterestMethodOptions(interestMethods)
      setWithdrawalFlexibilityOptions(withdrawalFlexibility)
      setFeeTypeOptions(feeTypes)
      setPenaltyTypeOptions(penaltyTypes)
      setTriggerDurationOptions(triggerDuration)

      try {
        const subtypesRes = await fetch("/api/v1/products/types/INVESTMENT/subtypes", {
          credentials: "include",
          cache: "no-store",
        })
        const subtypesJson = (await subtypesRes.json().catch(() => ({}))) as {
          data?: Array<{ label?: string; value?: string | number }>
        }
        const subtypeOptions = (subtypesJson?.data ?? [])
          .map((x) => x.label || (x.value !== undefined && x.value !== null ? String(x.value) : ""))
          .filter((v): v is string => typeof v === "string" && v.length > 0)
        setInvestmentTypeOptions(subtypeOptions)
      } catch {
        setInvestmentTypeOptions(INVESTMENT_TYPE_OPTIONS)
      }
    }
    fetchOptions()
  }, [isOpen, step])

  const formatWithCommas = (value: string) => {
    const numericValue = value.replace(/[^0-9.]/g, "")
    const parts = numericValue.split(".")
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",")
    return parts.join(".")
  }

  const removeCommas = (value: string) => value.replace(/,/g, "")

  const handleCurrencyChange = (value: string, setter: (val: string) => void) => {
    const rawValue = removeCommas(value)
    if (rawValue === "" || /^\d*\.?\d{0,2}$/.test(rawValue)) {
      setter(formatWithCommas(rawValue))
    }
  }

  const addInvestmentTypeRow = () => {
    if (!typeNameDraft.trim() || !typeDescDraft.trim()) return
    setInvestmentTypes((prev) => [...prev, { name: typeNameDraft.trim(), description: typeDescDraft.trim() }])
    setTypeNameDraft("")
    setTypeDescDraft("")
  }

  const removeCharge = (index: number) => setCharges((prev) => prev.filter((_, i) => i !== index))
  const addCharge = () => {
    if (!chargeName.trim() || !chargeFeeType || !chargeValue.trim()) return
    setCharges((prev) => [...prev, { name: chargeName.trim(), feeType: chargeFeeType, value: chargeValue.trim() }])
    setChargeName("")
    setChargeFeeType("")
    setChargeValue("")
  }

  const addPenalty = () => {
    if (!penaltyName.trim() || !penaltyType || !penaltyValue.trim() || !penaltyTriggerDuration) return
    setWithdrawalPenalties((prev) => [
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

  const removePenalty = (index: number) => setWithdrawalPenalties((prev) => prev.filter((_, i) => i !== index))

  const handleBack = () => {
    if (step > 1) setStep((s) => s - 1)
  }

  const handleNext = async () => {
    if (step < STEPS.length) {
      if (step === 2) {
        const min = parseFloat(removeCommas(minAmount))
        const max = parseFloat(removeCommas(maxAmount))
        if (removeCommas(minAmount) && removeCommas(maxAmount) && max < min) {
          setErrors((prev) => ({ ...prev, maxAmount: "Maximum must be greater than minimum" }))
          return
        }
        setErrors((prev) => ({ ...prev, maxAmount: "" }))
      }
      setStep((s) => s + 1)
      return
    }

    const min = parseFloat(removeCommas(minAmount))
    const max = parseFloat(removeCommas(maxAmount))
    if (removeCommas(minAmount) && removeCommas(maxAmount) && max < min) {
      setErrors((prev) => ({ ...prev, maxAmount: "Maximum must be greater than minimum" }))
      return
    }

    const previewImagePayload = previewImage
      ? {
          fileName: previewImage.name,
          fileType: previewImage.type,
          fileSize: previewImage.size,
          fileBase64: await fileToBase64(previewImage),
        }
      : null

    onSubmit({
      ...investmentData,
      name,
      durationOfInvestment: duration,
      description,
      investmentTypes,
      previewImage: previewImagePayload,
      returnsOnInvestment: roi,
      interestMethod,
      investmentType,
      withdrawalFlexibility,
      minInvestmentAmount: removeCommas(minAmount),
      maxInvestmentAmount: removeCommas(maxAmount),
      termsAndConditions,
      enableUnitInvestment,
      moratoriumEnabled,
      moratoriumDays,
      unitAmount: removeCommas(unitAmount),
      minQuantity,
      charges,
      chargeForcefulWithdrawal,
      withdrawalPenalties,
      contractId,
      airSignSecretKey,
      airSignUid,
      /** Fields older flows / APIs may still read */
      purpose: description,
      investmentTenure: duration,
      expectedReturn: roi,
      payoutCycle: withdrawalFlexibility,
      riskLevel: investmentType,
      currency: "",
      managementFee: "",
      prospectusDocuments: [],
    })
  }

  return (
    <Drawer
      open={isOpen}
      onOpenChange={onClose}
      title="Configure Investment Product"
      subtitle="Configure the parameters of this investment product"
      className="w-full min-w-0 rounded-none sm:w-[92%] md:w-[78%] lg:w-[62%] xl:w-[52%] 2xl:w-[45%] sm:min-w-[400px] sm:rounded-bl-[40px] sm:rounded-tl-[40px]"
    >
      <div className="mx-auto w-full">
        <ProductConfigTabs steps={STEPS} activeStep={step} onStepChange={setStep} />

        {step === 1 && (
          <ProductConfigAboutStep
            idPrefix="investment"
            nameLabel="Name of Investment"
            name={name}
            onNameChange={setName}
            durationLabel="Duration of Investment"
            durationPlaceholder="Select"
            durationValue={duration}
            durationOptions={durationOptions}
            onDurationChange={setDuration}
            description={description}
            onDescriptionChange={setDescription}
            typeSectionLabel="Investment Type"
            typeNameDraft={typeNameDraft}
            typeDescDraft={typeDescDraft}
            onTypeNameDraftChange={setTypeNameDraft}
            onTypeDescDraftChange={setTypeDescDraft}
            onAddType={addInvestmentTypeRow}
            typeRows={investmentTypes}
            previewFile={previewImage}
            onPreviewFileChange={setPreviewImage}
            accentColor={accentColor}
          />
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ProductConfigInput
                label="Returns on Investment (ROI)"
                placeholder="e.g 10%"
                value={roi}
                onChange={handleRoiChange}
                numericOnly
              />
              <ProductConfigSelect
                label="Interest Method"
                placeholder="Select Section"
                value={interestMethod}
                options={interestMethodOptions}
                onChange={setInterestMethod}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ProductConfigSelect
                label="Investment Type"
                placeholder="Select"
                value={investmentType}
                options={investmentTypeOptions}
                onChange={setInvestmentType}
              />
              <ProductConfigSelect
                label="Withdrawal Flexibility"
                placeholder="Select"
                value={withdrawalFlexibility}
                options={withdrawalFlexibilityOptions}
                onChange={setWithdrawalFlexibility}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Investment Amount</label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ProductConfigInput label="" placeholder="Min Amount" value={minAmount} onChange={(v) => handleCurrencyChange(v, setMinAmount)} />
                <ProductConfigInput label="" placeholder="Max Amount" value={maxAmount} onChange={(v) => handleCurrencyChange(v, setMaxAmount)} />
              </div>
              {errors.maxAmount ? <p className="text-xs text-red-600">{errors.maxAmount}</p> : null}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Investment Terms &amp; Condition</label>
              <textarea
                value={termsAndConditions}
                onChange={(e) => setTermsAndConditions(e.target.value)}
                placeholder="Enter Terms"
                rows={5}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-[#9A813F] focus:ring-2 focus:ring-[#9A813F]/20"
              />
            </div>

            <ProductConfigToggle
              id="investment-unit-purchase"
              label="Enable Unit Investment Purchase"
              checked={enableUnitInvestment}
              onChange={setEnableUnitInvestment}
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <ProductConfigToggle id="investment-moratorium" label="Moratorium" checked={moratoriumEnabled} onChange={setMoratoriumEnabled} />
              {moratoriumEnabled ? (
                <div className="min-w-[140px] flex-1 sm:max-w-xs">
                  <ProductConfigInput label="" placeholder="Enter days" value={moratoriumDays} onChange={setMoratoriumDays} numericOnly />
                </div>
              ) : null}
            </div>

            {enableUnitInvestment && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ProductConfigInput label="Unit Amount" placeholder="Amount" value={unitAmount} onChange={(v) => handleCurrencyChange(v, setUnitAmount)} />
                <ProductConfigInput label="Min Quantity" placeholder="Min Quantity" value={minQuantity} onChange={setMinQuantity} />
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
              <ProductConfigInput
                label="Name of Charge or Fee"
                placeholder="e.g Processing Fee"
                value={chargeName}
                onChange={setChargeName}
              />
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
                {charges.map((charge, index) => (
                  <div
                    key={`${charge.name}-${index}`}
                    className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 border-b border-gray-100 py-2 text-sm last:border-0"
                  >
                    <span className="pr-2">{charge.name}</span>
                    <span>{charge.feeType}</span>
                    <span>{charge.value}</span>
                    <div className="flex justify-end">
                      <button type="button" onClick={() => removeCharge(index)} className="text-red-600 hover:text-red-700" aria-label="Remove">
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <ProductConfigToggle
              id="investment-forceful-withdrawal"
              label="Charge for Forceful Withdrawal"
              checked={chargeForcefulWithdrawal}
              onChange={setChargeForcefulWithdrawal}
            />

            {chargeForcefulWithdrawal && (
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

                {withdrawalPenalties.length > 0 && (
                  <div className="rounded-md border border-dashed border-[#cdbf8b] p-3">
                    <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 border-b border-gray-100 pb-2 text-xs font-semibold text-gray-500">
                      <span>Name</span>
                      <span>Value</span>
                      <span>Trigger Duration</span>
                      <span className="text-right" />
                    </div>
                    {withdrawalPenalties.map((penalty, index) => (
                      <div
                        key={`${penalty.name}-${index}`}
                        className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 border-b border-gray-100 py-2 text-sm last:border-0"
                      >
                        <span className="pr-2">{penalty.name}</span>
                        <span>{penalty.value}</span>
                        <span>{penalty.triggerDuration}</span>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => removePenalty(index)}
                            className="text-red-600 hover:text-red-700"
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

            <div className="grid grid-cols-1 gap-4 border-t border-gray-100 pt-4 sm:grid-cols-3">
              <ProductConfigInput label="Contract ID" placeholder="Enter Contract ID" value={contractId} onChange={setContractId} />
              <ProductConfigInput
                label="AirSign Secret Key"
                placeholder="Enter secret key"
                value={airSignSecretKey}
                onChange={setAirSignSecretKey}
              />
              <ProductConfigInput label="AirSign UID" placeholder="Enter UID" value={airSignUid} onChange={setAirSignUid} />
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button onClick={handleBack} variant="outline" className="h-11 flex-1 border-[#c9b271] text-[#77642f] bg-transparent">
            Back
          </Button>
          <Button
            onClick={handleNext}
            className="h-11 flex-1 text-white hover:opacity-95"
            style={{ backgroundColor: accentColor }}
          >
            {step === STEPS.length ? "Submit" : "Next"}
          </Button>
        </div>
      </div>
    </Drawer>
  )
}
