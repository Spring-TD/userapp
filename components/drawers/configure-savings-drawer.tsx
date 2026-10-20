"use client"

import { useEffect, useState, type ChangeEvent } from "react"
import { X } from "lucide-react"
import { Drawer } from "@/components/drawer"
import { Button } from "@/components/ui/button"
import { fileToBase64 } from "@/lib/fileUtils"
import { fetchOptionLabels, fetchProductOptionLabels } from "@/lib/productOptions"
import type { SavingsConfigurePrefetched } from "@/lib/productConfigurePrefetch"
import { ProductConfigAboutStep } from "@/components/drawers/product-config-about-step"
import {
  ProductConfigInput,
  ProductConfigSelect,
  ProductConfigTabs,
  ProductConfigToggle,
} from "@/components/drawers/product-config-form-fields"

interface ConfigureSavingsDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => void
  savingsData: any
  prefetchedOptions?: SavingsConfigurePrefetched | null
}

const STEPS = ["About Product", "Structure", "Fees & Charges"]

const DEFAULT_INTEREST_METHOD_OPTIONS: string[] = []
const DEFAULT_SAVINGS_TYPE_OPTIONS: string[] = []
const DEFAULT_WITHDRAWAL_FLEXIBILITY_OPTIONS: string[] = []
const DEFAULT_FEE_TYPE_OPTIONS: string[] = []
const DEFAULT_PENALTY_TYPE_OPTIONS: string[] = []
const TRIGGER_DURATION_OPTIONS: string[] = []

const DEFAULT_DURATION_OPTIONS: string[] = []

interface SavingsTypeItem {
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

export default function ConfigureSavingsDrawer({
  isOpen,
  onClose,
  onSubmit,
  savingsData,
  prefetchedOptions = null,
}: ConfigureSavingsDrawerProps) {
  const [step, setStep] = useState(1)

  const [durationOptions, setDurationOptions] = useState<string[]>(DEFAULT_DURATION_OPTIONS)
  const [interestMethodOptions, setInterestMethodOptions] = useState<string[]>(DEFAULT_INTEREST_METHOD_OPTIONS)
  const [savingsTypeOptions, setSavingsTypeOptions] = useState<string[]>(DEFAULT_SAVINGS_TYPE_OPTIONS)
  const [withdrawalFlexibilityOptions, setWithdrawalFlexibilityOptions] = useState<string[]>(DEFAULT_WITHDRAWAL_FLEXIBILITY_OPTIONS)
  const [feeTypeOptions, setFeeTypeOptions] = useState<string[]>(DEFAULT_FEE_TYPE_OPTIONS)
  const [penaltyTypeOptions, setPenaltyTypeOptions] = useState<string[]>(DEFAULT_PENALTY_TYPE_OPTIONS)
  const [triggerDurationOptions, setTriggerDurationOptions] = useState<string[]>(TRIGGER_DURATION_OPTIONS)

  const [name, setName] = useState(savingsData?.name || "")
  const [durationOfSavings, setDurationOfSavings] = useState("")
  const [description, setDescription] = useState(savingsData?.description || "")
  const [typeNameDraft, setTypeNameDraft] = useState("")
  const [typeDescDraft, setTypeDescDraft] = useState("")
  const [savingsTypes, setSavingsTypes] = useState<SavingsTypeItem[]>([])
  const [previewImage, setPreviewImage] = useState<File | null>(null)

  const [interestRate, setInterestRate] = useState("")
  const [interestMethod, setInterestMethod] = useState("")
  const [savingsType, setSavingsType] = useState("")
  const [withdrawalFlexibility, setWithdrawalFlexibility] = useState("")
  const [minSavingsAmount, setMinSavingsAmount] = useState("")
  const [maxSavingsAmount, setMaxSavingsAmount] = useState("")
  const [termsAndConditions, setTermsAndConditions] = useState("")
  const [contractId, setContractId] = useState("")
  const [airSignSecretKey, setAirSignSecretKey] = useState("")
  const [airSignUid, setAirSignUid] = useState("")

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
  const handleInterestRateChange = (value: string) => {
    setInterestRate(normalizePercentInput(value))
  }

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!isOpen) return
    if (prefetchedOptions) {
      setDurationOptions(prefetchedOptions.duration)
      setInterestMethodOptions(prefetchedOptions.interestMethods)
      setSavingsTypeOptions(prefetchedOptions.savingsTypes)
      setWithdrawalFlexibilityOptions(prefetchedOptions.withdrawalFlexibility)
      setFeeTypeOptions(prefetchedOptions.feeType)
      setPenaltyTypeOptions(prefetchedOptions.penaltyType)
      setTriggerDurationOptions(prefetchedOptions.triggerDuration)
      return
    }
    const fetchOptions = async () => {
      try {
        const tenureRes = await fetch("/api/configurations/options/savings-tenure", { credentials: "include", cache: "no-store" })
        const tenureJson = await tenureRes.json().catch(() => ({}))
        const tenureList = (tenureJson?.data ?? []) as { value?: string | number; label?: string }[]
        const tenure =
          Array.isArray(tenureList) && tenureList.length
            ? tenureList
                .map((x) => x.label || String(x.value ?? ""))
                .filter((v): v is string => typeof v === "string" && v.length > 0)
            : []
        if (tenure.length) setDurationOptions(tenure)
      } catch {
        // keep defaults
      }
      const [interestMethods, savingsTypes, withdrawalFlexibility, feeTypes, penaltyTypes, triggerDuration] =
        await Promise.all([
        fetchOptionLabels("savings-interest-method", DEFAULT_INTEREST_METHOD_OPTIONS),
        fetchOptionLabels("savings-type", DEFAULT_SAVINGS_TYPE_OPTIONS),
        fetchOptionLabels("withdrawal-flexibility", DEFAULT_WITHDRAWAL_FLEXIBILITY_OPTIONS),
        fetchOptionLabels("fee-type", DEFAULT_FEE_TYPE_OPTIONS),
        fetchOptionLabels("penalty-type", DEFAULT_PENALTY_TYPE_OPTIONS),
        fetchProductOptionLabels("trigger-duration", TRIGGER_DURATION_OPTIONS),
      ])
      setInterestMethodOptions(interestMethods)
      setSavingsTypeOptions(savingsTypes)
      setWithdrawalFlexibilityOptions(withdrawalFlexibility)
      setFeeTypeOptions(feeTypes)
      setPenaltyTypeOptions(penaltyTypes)
      setTriggerDurationOptions(triggerDuration)
    }
    fetchOptions()
  }, [isOpen, prefetchedOptions])

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

  const addSavingsType = () => {
    if (!typeNameDraft.trim() || !typeDescDraft.trim()) return
    setSavingsTypes((prev) => [...prev, { name: typeNameDraft.trim(), description: typeDescDraft.trim() }])
    setTypeNameDraft("")
    setTypeDescDraft("")
  }

  const removeCharge = (index: number) => {
    setCharges((prev) => prev.filter((_, i) => i !== index))
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

  const removePenalty = (index: number) => {
    setWithdrawalPenalties((prev) => prev.filter((_, i) => i !== index))
  }

  const handleBack = () => {
    if (step > 1) setStep((s) => s - 1)
  }

  const handleNext = async () => {
    if (step < STEPS.length) {
      if (step === 2) {
        const minAmount = parseFloat(removeCommas(minSavingsAmount))
        const maxAmount = parseFloat(removeCommas(maxSavingsAmount))
        if (removeCommas(minSavingsAmount) && removeCommas(maxSavingsAmount) && maxAmount < minAmount) {
          setErrors((prev) => ({ ...prev, maxAmount: "Maximum must be greater than minimum" }))
          return
        }
        setErrors((prev) => ({ ...prev, maxAmount: "" }))
      }
      setStep((s) => s + 1)
      return
    }

    const minAmount = parseFloat(removeCommas(minSavingsAmount))
    const maxAmount = parseFloat(removeCommas(maxSavingsAmount))
    if (removeCommas(minSavingsAmount) && removeCommas(maxSavingsAmount) && maxAmount < minAmount) {
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
      ...savingsData,
      name,
      durationOfSavings,
      description,
      savingsTypes,
      previewImage: previewImagePayload,
      interestRate,
      interestMethod,
      savingsType,
      withdrawalFlexibility,
      minSavingsAmount: removeCommas(minSavingsAmount),
      maxSavingsAmount: removeCommas(maxSavingsAmount),
      termsAndConditions,
      contractId,
      airSignSecretKey,
      airSignUid,
      charges,
      chargeForcefulWithdrawal,
      withdrawalPenalties,
      /** Legacy field names for existing APIs */
      purpose: description,
      savingsTenure: durationOfSavings,
      depositCycle: withdrawalFlexibility,
      minDepositAmount: removeCommas(minSavingsAmount),
      maxDepositAmount: removeCommas(maxSavingsAmount),
      managementFee: "",
      minWithdrawalAmount: "",
      additionalRequirements: [],
    })
  }

  return (
    <Drawer
      open={isOpen}
      onOpenChange={onClose}
      title="Configure Savings Product"
      subtitle="Configure the parameters of this savings product"
      className="w-full min-w-0 rounded-none sm:w-[92%] md:w-[78%] lg:w-[62%] xl:w-[52%] 2xl:w-[45%] sm:min-w-[400px] sm:rounded-bl-[40px] sm:rounded-tl-[40px]"
    >
      <div className="mx-auto w-full">
        <ProductConfigTabs steps={STEPS} activeStep={step} onStepChange={setStep} />

        {step === 1 && (
          <ProductConfigAboutStep
            idPrefix="savings"
            nameLabel="Name of Savings"
            name={name}
            onNameChange={setName}
            durationLabel="Duration of Savings"
            durationPlaceholder="Select"
            durationValue={durationOfSavings}
            durationOptions={durationOptions}
            onDurationChange={setDurationOfSavings}
            description={description}
            onDescriptionChange={setDescription}
            typeSectionLabel="Savings Type"
            typeNameDraft={typeNameDraft}
            typeDescDraft={typeDescDraft}
            onTypeNameDraftChange={setTypeNameDraft}
            onTypeDescDraftChange={setTypeDescDraft}
            onAddType={addSavingsType}
            typeRows={savingsTypes}
            previewFile={previewImage}
            onPreviewFileChange={setPreviewImage}
          />
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ProductConfigInput
                label="Interest Rate"
                placeholder="e.g 10%"
                value={interestRate}
                onChange={handleInterestRateChange}
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
                label="Savings Type"
                placeholder="Select"
                value={savingsType}
                options={savingsTypeOptions}
                onChange={setSavingsType}
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
              <label className="block text-sm font-medium text-gray-700">Savings Amount</label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ProductConfigInput label="" placeholder="Min Amount" value={minSavingsAmount} onChange={(v) => handleCurrencyChange(v, setMinSavingsAmount)} />
                <ProductConfigInput label="" placeholder="Max Amount" value={maxSavingsAmount} onChange={(v) => handleCurrencyChange(v, setMaxSavingsAmount)} />
              </div>
              {errors.maxAmount ? <p className="text-xs text-red-600">{errors.maxAmount}</p> : null}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Savings Terms & Condition</label>
              <textarea
                value={termsAndConditions}
                onChange={(e) => setTermsAndConditions(e.target.value)}
                placeholder="Enter Terms"
                rows={5}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-[#9A813F] focus:ring-2 focus:ring-[#9A813F]/20"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
              id="savings-forceful-withdrawal"
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
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button onClick={handleBack} variant="outline" className="h-11 flex-1 border-[#c9b271] text-[#77642f] bg-transparent">
            Back
          </Button>
          <Button onClick={handleNext} className="h-11 flex-1 bg-[#9A813F] text-white hover:bg-[#8A7335]">
            {step === STEPS.length ? "Submit" : "Next"}
          </Button>
        </div>
      </div>
    </Drawer>
  )
}
