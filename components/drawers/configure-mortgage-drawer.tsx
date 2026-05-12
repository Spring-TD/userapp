"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"
import { toast } from "sonner"
import { Upload, X } from "lucide-react"
import { Drawer } from "@/components/drawer"
import { Button } from "@/components/ui/button"
import { fileToBase64 } from "@/lib/fileUtils"
import { fetchOptionLabels, fetchProductOptionLabels } from "@/lib/productOptions"
import type { MortgageConfigurePrefetched } from "@/lib/productConfigurePrefetch"
import {
  isOtherSecuritySelected,
  mergeSecurityRequirementDisplayOptions,
  OTHER_SECURITY_CANONICAL_LABEL,
  serializeSecurityRequirements,
  splitStoredSecurityRequirements,
} from "@/lib/securityRequirementOptions"
import { ProductConfigAboutStep } from "@/components/drawers/product-config-about-step"
import {
  DEFAULT_REPAYMENT_WORKFLOWS,
  ProductConfigInput,
  ProductConfigRepaymentWorkflowPanel,
  ProductConfigSelect,
  ProductConfigTabs,
  ProductConfigToggle,
} from "@/components/drawers/product-config-form-fields"

interface ConfigureMortgageDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => void
  mortgageData: any
  prefetchedOptions?: MortgageConfigurePrefetched | null
}

const STEPS = ["About Product", "Structure", "Requirements", "Fees & Charges", "Properties"]

const DEFAULT_TENURE_OPTIONS: string[] = []
const DEFAULT_INTEREST_METHOD_OPTIONS: string[] = []
const DEFAULT_MORATORIUM_TYPE_OPTIONS: string[] = []
const DEFAULT_MORATORIUM_DURATION_OPTIONS: string[] = []
const DEFAULT_AMORTIZATION_SCHEDULE_OPTIONS: string[] = []
const DEFAULT_OTHER_REQUIREMENT_OPTIONS: string[] = []
const DEFAULT_CONTENT_TYPE_OPTIONS: string[] = []
const DEFAULT_FEE_TYPE_OPTIONS: string[] = []
const DEFAULT_PENALTY_TYPE_OPTIONS: string[] = []
const DEFAULT_REPAYMENT_FREQUENCY_OPTIONS: string[] = []
const DEFAULT_ACCEPTABLE_NPA_OPTIONS: string[] = []
const DEFAULT_EQUITY_REQUIREMENT_OPTIONS: string[] = []
const TRIGGER_DURATION_OPTIONS: string[] = []
interface MortgageTypeItem {
  name: string
  description: string
}

interface OtherRequirementItem {
  type: string
  contentType: string
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

interface PropertyItem {
  id: string
  name: string
  type: string
  value: string
  location: string
  previewFiles: File[]
  previewObjectUrls: string[]
}

type DocumentRequirementUpload = { file: File; name: string }

export default function ConfigureMortgageDrawer({
  isOpen,
  onClose,
  onSubmit,
  mortgageData,
  prefetchedOptions = null,
}: ConfigureMortgageDrawerProps) {
  const [step, setStep] = useState(1)
  const [tenureOptions, setTenureOptions] = useState<string[]>(DEFAULT_TENURE_OPTIONS)
  const [interestMethodOptions, setInterestMethodOptions] = useState<string[]>(DEFAULT_INTEREST_METHOD_OPTIONS)
  const [moratoriumTypeOptions, setMoratoriumTypeOptions] = useState<string[]>(DEFAULT_MORATORIUM_TYPE_OPTIONS)
  const [moratoriumDurationOptions, setMoratoriumDurationOptions] = useState<string[]>(DEFAULT_MORATORIUM_DURATION_OPTIONS)
  const [repaymentScheduleOptions, setRepaymentScheduleOptions] = useState<string[]>(DEFAULT_TENURE_OPTIONS)
  const [amortizationScheduleOptions, setAmortizationScheduleOptions] = useState<string[]>(DEFAULT_AMORTIZATION_SCHEDULE_OPTIONS)
  const [repaymentFrequencyOptions, setRepaymentFrequencyOptions] = useState<string[]>(DEFAULT_REPAYMENT_FREQUENCY_OPTIONS)
  const [acceptableNpaOptions, setAcceptableNpaOptions] = useState<string[]>(DEFAULT_ACCEPTABLE_NPA_OPTIONS)
  const [equityRequirementOptions, setEquityRequirementOptions] = useState<string[]>(DEFAULT_EQUITY_REQUIREMENT_OPTIONS)
  const [otherRequirementOptions, setOtherRequirementOptions] = useState<string[]>(DEFAULT_OTHER_REQUIREMENT_OPTIONS)
  const [contentTypeOptions, setContentTypeOptions] = useState<string[]>(DEFAULT_CONTENT_TYPE_OPTIONS)
  const [securityOptions, setSecurityOptions] = useState<string[]>([])
  const [propertyTypeOptions, setPropertyTypeOptions] = useState<string[]>([])
  const [feeTypeOptions, setFeeTypeOptions] = useState<string[]>(DEFAULT_FEE_TYPE_OPTIONS)
  const [penaltyTypeOptions, setPenaltyTypeOptions] = useState<string[]>(DEFAULT_PENALTY_TYPE_OPTIONS)
  const [triggerDurationOptions, setTriggerDurationOptions] = useState<string[]>(TRIGGER_DURATION_OPTIONS)
  const [repaymentWorkflowOptions, setRepaymentWorkflowOptions] = useState<string[]>([...DEFAULT_REPAYMENT_WORKFLOWS])

  const mergedSecurityOptions = useMemo(
    () => mergeSecurityRequirementDisplayOptions(securityOptions),
    [securityOptions],
  )

  const [name, setName] = useState(mortgageData?.name || "")
  const [tenure, setTenure] = useState("")
  const [description, setDescription] = useState(mortgageData?.description || "")
  const [mortgageTypeName, setMortgageTypeName] = useState("")
  const [mortgageTypeDescription, setMortgageTypeDescription] = useState("")
  const [mortgageTypes, setMortgageTypes] = useState<MortgageTypeItem[]>([])
  const [previewImage, setPreviewImage] = useState<File | null>(null)

  const [interestRate, setInterestRate] = useState("")
  const [interestMethod, setInterestMethod] = useState("")
  const [allowMoratorium, setAllowMoratorium] = useState(true)
  const [moratoriumSelectDuration, setMoratoriumSelectDuration] = useState("")
  const [moratoriumDurationOf, setMoratoriumDurationOf] = useState("")
  const [moratoriumType, setMoratoriumType] = useState("")
  const [repaymentWorkflow, setRepaymentWorkflow] = useState<string>(DEFAULT_REPAYMENT_WORKFLOWS[0])
  const [minLoanAmount, setMinLoanAmount] = useState("")
  const [maxLoanAmount, setMaxLoanAmount] = useState("")
  const [repaymentSchedule, setRepaymentSchedule] = useState("")
  const [amortizationSchedule, setAmortizationSchedule] = useState("")
  const [repaymentFrequency, setRepaymentFrequency] = useState("")
  const [acceptableNpa, setAcceptableNpa] = useState("")
  const [equityRequirement, setEquityRequirement] = useState("")

  const [selectedSecurities, setSelectedSecurities] = useState<string[]>([])
  const [securityOtherSpecification, setSecurityOtherSpecification] = useState("")
  const [documentName, setDocumentName] = useState("")
  const [documents, setDocuments] = useState<DocumentRequirementUpload[]>([])
  const [otherRequirementType, setOtherRequirementType] = useState("")
  const [otherRequirementContentType, setOtherRequirementContentType] = useState("")
  const [otherRequirementDescription, setOtherRequirementDescription] = useState("")
  const [otherRequirements, setOtherRequirements] = useState<OtherRequirementItem[]>([])
  const documentsInputRef = useRef<HTMLInputElement>(null)

  const [contractId, setContractId] = useState("")
  const [airSignSecretKey, setAirSignSecretKey] = useState("")
  const [airSignUid, setAirSignUid] = useState("")

  const [chargeName, setChargeName] = useState("")
  const [chargeFeeType, setChargeFeeType] = useState("")
  const [chargeValue, setChargeValue] = useState("")
  const [charges, setCharges] = useState<FeeItem[]>([])
  const [deductChargesOnLoan, setDeductChargesOnLoan] = useState(true)
  const [customerPayChargesBeforeDisbursement, setCustomerPayChargesBeforeDisbursement] = useState(false)
  const [enableLateRepaymentCharges, setEnableLateRepaymentCharges] = useState(true)
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
  const handleInterestRateChange = (value: string) => {
    setInterestRate(normalizePercentInput(value))
  }

  const [propertyName, setPropertyName] = useState("")
  const [propertyType, setPropertyType] = useState("")
  const [propertyValue, setPropertyValue] = useState("")
  const [propertyLocation, setPropertyLocation] = useState("")
  const [propertyPreviewFiles, setPropertyPreviewFiles] = useState<File[]>([])
  const [propertyPreviewUrls, setPropertyPreviewUrls] = useState<string[]>([])
  const [propertyFormError, setPropertyFormError] = useState("")
  const propertyPreviewInputRef = useRef<HTMLInputElement>(null)
  const [properties, setProperties] = useState<PropertyItem[]>([])

  useEffect(() => {
    if (!isOpen) return
    if (prefetchedOptions) {
      setTenureOptions(prefetchedOptions.tenure)
      setInterestMethodOptions(prefetchedOptions.interestMethods)
      setMoratoriumTypeOptions(prefetchedOptions.moratoriumType)
      setMoratoriumDurationOptions(prefetchedOptions.moratoriumDuration)
      setRepaymentScheduleOptions(prefetchedOptions.repaymentSchedule)
      setAmortizationScheduleOptions(prefetchedOptions.amortizationSchedule)
      setRepaymentFrequencyOptions(prefetchedOptions.repaymentFrequency)
      setAcceptableNpaOptions(prefetchedOptions.acceptableNpa)
      setEquityRequirementOptions(prefetchedOptions.equityRequirement)
      setOtherRequirementOptions(prefetchedOptions.otherRequirementType)
      setContentTypeOptions(prefetchedOptions.requirementContentType)
      setSecurityOptions(prefetchedOptions.securities)
      setPropertyTypeOptions(prefetchedOptions.propertyTypes)
      setFeeTypeOptions(prefetchedOptions.feeType)
      setPenaltyTypeOptions(prefetchedOptions.penaltyType)
      setTriggerDurationOptions(prefetchedOptions.triggerDuration)
      setRepaymentWorkflowOptions(prefetchedOptions.repaymentWorkflow)
      return
    }
    const loadOptions = async () => {
      const [
        tenure,
        interestMethods,
        moratoriumType,
        moratoriumDuration,
        repaymentSchedule,
        amortizationSchedule,
        repaymentFrequency,
        acceptableNpa,
        equityRequirement,
        otherRequirementType,
        requirementContentType,
        securities,
        propertyTypes,
        feeType,
        penaltyType,
        triggerDuration,
        repaymentWorkflow,
      ] = await Promise.all([
        fetchOptionLabels("loan-tenure", DEFAULT_TENURE_OPTIONS),
        fetchProductOptionLabels("interest-method", DEFAULT_INTEREST_METHOD_OPTIONS),
        fetchProductOptionLabels("moratorium", DEFAULT_MORATORIUM_TYPE_OPTIONS),
        fetchProductOptionLabels("moratorium-duration", DEFAULT_MORATORIUM_DURATION_OPTIONS),
        fetchOptionLabels("repayment-schedule", DEFAULT_TENURE_OPTIONS),
        fetchOptionLabels("amortization", DEFAULT_AMORTIZATION_SCHEDULE_OPTIONS),
        fetchOptionLabels("repayment-cycle", DEFAULT_REPAYMENT_FREQUENCY_OPTIONS),
        fetchOptionLabels("acceptable-npa", DEFAULT_ACCEPTABLE_NPA_OPTIONS),
        fetchOptionLabels("equity-requirement", DEFAULT_EQUITY_REQUIREMENT_OPTIONS),
        fetchProductOptionLabels("loan-other-requirement-type", DEFAULT_OTHER_REQUIREMENT_OPTIONS),
        fetchProductOptionLabels("loan-other-requirement-content-type", DEFAULT_CONTENT_TYPE_OPTIONS),
        fetchProductOptionLabels("security-requirements", [], { productType: "MORTGAGE" }),
        fetchProductOptionLabels("property-type", []),
        fetchOptionLabels("fee-type", DEFAULT_FEE_TYPE_OPTIONS),
        fetchOptionLabels("penalty-type", DEFAULT_PENALTY_TYPE_OPTIONS),
        fetchProductOptionLabels("trigger-duration", TRIGGER_DURATION_OPTIONS),
        fetchOptionLabels("repayment-workflow", [...DEFAULT_REPAYMENT_WORKFLOWS]),
      ])

      setTenureOptions(tenure)
      setInterestMethodOptions(interestMethods)
      setMoratoriumTypeOptions(moratoriumType)
      setMoratoriumDurationOptions(moratoriumDuration)
      setRepaymentScheduleOptions(repaymentSchedule)
      setAmortizationScheduleOptions(amortizationSchedule)
      setRepaymentFrequencyOptions(repaymentFrequency)
      setAcceptableNpaOptions(acceptableNpa)
      setEquityRequirementOptions(equityRequirement)
      setOtherRequirementOptions(otherRequirementType)
      setContentTypeOptions(requirementContentType)
      setSecurityOptions(securities)
      setPropertyTypeOptions(propertyTypes)
      setFeeTypeOptions(feeType)
      setPenaltyTypeOptions(penaltyType)
      setTriggerDurationOptions(triggerDuration)
      setRepaymentWorkflowOptions(repaymentWorkflow)
    }
    loadOptions()
  }, [isOpen, prefetchedOptions])

  useEffect(() => {
    if (!isOpen) return

    const controller = new AbortController()

    const run = async () => {
      try {
        const res = await fetch("/api/v1/keys", {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        })
        const json = await res.json().catch(() => null)

        const payload = (json && typeof json === "object" ? (json as any).data ?? json : {}) as any
        const secretKey = payload?.airSignSecretKey ?? payload?.secretKey ?? payload?.secret ?? ""
        const uid = payload?.airSignUid ?? payload?.uid ?? ""

        if (typeof secretKey === "string" && secretKey.length > 0) setAirSignSecretKey(secretKey)
        if (typeof uid === "string" && uid.length > 0) setAirSignUid(uid)
      } catch (err) {
        console.error("[keys] /api/v1/keys fetch error:", err)
      }
    }

    void run()
    return () => controller.abort()
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !mortgageData) return
    const raw = Array.isArray(mortgageData.securityRequirements)
      ? (mortgageData.securityRequirements as unknown[]).map((x) => String(x))
      : []
    const { toggles, otherSpecification } = splitStoredSecurityRequirements(raw)
    setSelectedSecurities(toggles)
    setSecurityOtherSpecification(otherSpecification)
  }, [isOpen, mortgageData?.id, mortgageData?.productId, mortgageData?.securityRequirements])

  const revokePreviewUrl = useCallback((url: string | null) => {
    if (url) URL.revokeObjectURL(url)
  }, [])

  useEffect(() => {
    return () => {
      propertyPreviewUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [propertyPreviewUrls])

  const addMortgageType = () => {
    if (!mortgageTypeName.trim() || !mortgageTypeDescription.trim()) return
    setMortgageTypes((prev) => [...prev, { name: mortgageTypeName.trim(), description: mortgageTypeDescription.trim() }])
    setMortgageTypeName("")
    setMortgageTypeDescription("")
  }

  const toggleSecurity = (option: string, checked: boolean) => {
    if (!checked && option.trim().toLowerCase() === OTHER_SECURITY_CANONICAL_LABEL.toLowerCase()) {
      setSecurityOtherSpecification("")
    }
    setSelectedSecurities((prev) => {
      if (checked) return prev.includes(option) ? prev : [...prev, option]
      return prev.filter((item) => item !== option)
    })
  }

  const addOtherRequirement = () => {
    if (!otherRequirementType || !otherRequirementContentType || !otherRequirementDescription.trim()) return
    setOtherRequirements((prev) => [
      ...prev,
      {
        type: otherRequirementType,
        contentType: otherRequirementContentType,
        description: otherRequirementDescription.trim(),
      },
    ])
    setOtherRequirementType("")
    setOtherRequirementContentType("")
    setOtherRequirementDescription("")
  }

  const removeOtherRequirement = (index: number) => {
    setOtherRequirements((prev) => prev.filter((_, i) => i !== index))
  }

  const addCharge = () => {
    if (!chargeName.trim() || !chargeFeeType || !chargeValue.trim()) return
    setCharges((prev) => [...prev, { name: chargeName.trim(), feeType: chargeFeeType, value: chargeValue.trim() }])
    setChargeName("")
    setChargeFeeType("")
    setChargeValue("")
  }

  const removeCharge = (index: number) => {
    setCharges((prev) => prev.filter((_, i) => i !== index))
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

  const removePenalty = (index: number) => {
    setPenalties((prev) => prev.filter((_, i) => i !== index))
  }

  const handleDocumentUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const name = documentName.trim().length ? documentName.trim() : file.name
    setDocuments((prev) => [...prev, { file, name }])
    event.target.value = ""
  }

  const handlePropertyPreviewUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (!files.length) return
    setPropertyPreviewFiles((prev) => [...prev, ...files])
    setPropertyPreviewUrls((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))])
    setPropertyFormError("")
    event.target.value = ""
  }

  const removeSelectedPropertyPreview = (index: number) => {
    setPropertyPreviewFiles((prev) => prev.filter((_, i) => i !== index))
    setPropertyPreviewUrls((prev) => {
      const target = prev[index]
      if (target) URL.revokeObjectURL(target)
      return prev.filter((_, i) => i !== index)
    })
  }

  const addProperty = () => {
    if (!propertyName.trim() || !propertyType || !propertyValue.trim() || !propertyLocation.trim()) {
      setPropertyFormError("Fill name, type, value and location before adding.")
      return
    }
    setPropertyFormError("")
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const previewFiles = [...propertyPreviewFiles]
    const previewObjectUrls = [...propertyPreviewUrls]
    setProperties((prev) => [
      ...prev,
      {
        id,
        name: propertyName.trim(),
        type: propertyType,
        value: propertyValue.trim(),
        location: propertyLocation.trim(),
        previewFiles,
        previewObjectUrls,
      },
    ])
    setPropertyName("")
    setPropertyType("")
    setPropertyValue("")
    setPropertyLocation("")
    setPropertyPreviewFiles([])
    setPropertyPreviewUrls([])
  }

  const removeProperty = (id: string) => {
    setProperties((prev) => {
      const item = prev.find((p) => p.id === id)
      item?.previewObjectUrls.forEach((url) => URL.revokeObjectURL(url))
      return prev.filter((p) => p.id !== id)
    })
  }

  const handleBack = () => {
    if (step > 1) setStep((prev) => prev - 1)
  }

  const handleNext = async () => {
    if (step < STEPS.length) {
      if (step === 3) {
        if (!selectedSecurities.length) {
          toast.error("Select at least one security requirement.")
          return
        }
        if (isOtherSecuritySelected(selectedSecurities) && !securityOtherSpecification.trim()) {
          toast.error('Describe the "Other" security requirement.')
          return
        }
      }
      setStep((prev) => prev + 1)
        return
      }
      
    const documentsPayload = await Promise.all(
      documents.map(async (doc) => ({
        name: doc.name,
        fileName: doc.file.name,
        fileType: doc.file.type,
        fileSize: doc.file.size,
        fileBase64: await fileToBase64(doc.file),
      })),
    )

    const previewImagePayload = previewImage
      ? {
          fileName: previewImage.name,
          fileType: previewImage.type,
          fileSize: previewImage.size,
          fileBase64: await fileToBase64(previewImage),
        }
      : null

    const propertiesPayload = await Promise.all(
      properties.map(async (p) => ({
        name: p.name,
        type: p.type,
        value: p.value,
        location: p.location,
        previewImages: await Promise.all(
          p.previewFiles.map(async (file) => ({
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            fileBase64: await fileToBase64(file),
          })),
        ),
      })),
    )
    const propertiesPayloadWithLegacy = propertiesPayload.map((item) => ({
      ...item,
      previewImage: item.previewImages[0] ?? null,
    }))

      onSubmit({
        ...mortgageData,
      name,
      tenure,
      description,
      /** Backward-compatible aliases for APIs expecting legacy mortgage drawer fields */
      purpose: description,
      mortgageTenure: tenure,
      minFacilityAmount: minLoanAmount,
      maxFacilityAmount: maxLoanAmount,
      mortgageTypes,
      previewImage: previewImagePayload,
        interestRate,
        interestMethod,
      allowMoratorium,
      moratoriumDuration: moratoriumSelectDuration || moratoriumDurationOf,
      moratoriumDays: moratoriumSelectDuration || moratoriumDurationOf,
      moratoriumSelectDuration,
      moratoriumDurationOf,
      moratoriumType,
      repaymentWorkflow,
      minLoanAmount,
      maxLoanAmount,
      repaymentSchedule,
      amortizationSchedule,
      repaymentFrequency,
      acceptableNpa,
      equityRequirement,
      securityRequirements: serializeSecurityRequirements(selectedSecurities, securityOtherSpecification),
      documentRequirements: documentsPayload,
      otherRequirements,
      contractId,
      airSignSecretKey,
      airSignUid,
        charges,
      deductChargesOnLoan,
      customerPayChargesBeforeDisbursement,
      enableLateRepaymentCharges,
      penalties,
      properties: propertiesPayloadWithLegacy,
    })
  }

  const otherRequirementSummary = (item: OtherRequirementItem) => {
    const suffix = item.contentType === "Document upload" ? "Upload Required" : item.contentType
    return `${item.type} → ${item.description} → ${suffix}`
  }

  return (
    <Drawer
      open={isOpen}
      onOpenChange={onClose}
      title="Configure Mortgage Product"
      subtitle="Select the loan option you want to create with us"
      className="w-full min-w-0 rounded-none sm:w-[92%] md:w-[78%] lg:w-[62%] xl:w-[52%] 2xl:w-[45%] sm:min-w-[400px] sm:rounded-bl-[40px] sm:rounded-tl-[40px]"
    >
      <div className="mx-auto w-full">
        <ProductConfigTabs steps={STEPS} activeStep={step} onStepChange={setStep} />

      {step === 1 && (
          <ProductConfigAboutStep
            idPrefix="mortgage"
            nameLabel="Name of Product"
            name={name}
            onNameChange={setName}
            durationLabel="Tenure"
            durationPlaceholder="Select Tenure"
            durationValue={tenure}
            durationOptions={tenureOptions}
            onDurationChange={setTenure}
            description={description}
            onDescriptionChange={setDescription}
            typeSectionLabel="Loan Type"
            typeNameDraft={mortgageTypeName}
            typeDescDraft={mortgageTypeDescription}
            onTypeNameDraftChange={setMortgageTypeName}
            onTypeDescDraftChange={setMortgageTypeDescription}
            onAddType={addMortgageType}
            typeRows={mortgageTypes}
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

            <div className="space-y-3">
              <ProductConfigToggle
                id="mortgage-allow-moratorium"
                label="Allow Moratorium for this instrument"
                checked={allowMoratorium}
                onChange={setAllowMoratorium}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <ProductConfigSelect
                  label="Select Duration"
                  placeholder="Select Section"
                  value={moratoriumSelectDuration}
                  options={moratoriumDurationOptions}
                  onChange={setMoratoriumSelectDuration}
                />
                <ProductConfigSelect
                  label="Duration of Moratorium"
                  placeholder="Select Section"
                  value={moratoriumDurationOf}
                  options={moratoriumDurationOptions}
                  onChange={setMoratoriumDurationOf}
                />
                <ProductConfigSelect
                  label="Type of Moratorium"
                  placeholder="Select Section"
                  value={moratoriumType}
                  options={moratoriumTypeOptions}
                  onChange={setMoratoriumType}
                />
          </div>
          </div>

            <ProductConfigRepaymentWorkflowPanel
              workflows={repaymentWorkflowOptions}
              selectedWorkflow={repaymentWorkflow}
              onSelectWorkflow={setRepaymentWorkflow}
              minAmount={minLoanAmount}
              maxAmount={maxLoanAmount}
              onMinAmountChange={setMinLoanAmount}
              onMaxAmountChange={setMaxLoanAmount}
              amountLabel="Loan Amount"
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ProductConfigSelect
                label="Repayment Schedule"
                placeholder="Select Section"
                value={repaymentSchedule}
                options={repaymentScheduleOptions}
                onChange={setRepaymentSchedule}
              />
              <ProductConfigSelect
                label="Amortization Schedule"
                placeholder="Select Section"
                value={amortizationSchedule}
                options={amortizationScheduleOptions}
                onChange={setAmortizationSchedule}
              />
              <ProductConfigSelect
                label="Repayment Frequency"
                placeholder="Select Section"
                value={repaymentFrequency}
                options={repaymentFrequencyOptions}
                onChange={setRepaymentFrequency}
              />
              <ProductConfigSelect
                label="Acceptable NPA"
                placeholder="Select Section"
                value={acceptableNpa}
                options={acceptableNpaOptions}
                onChange={setAcceptableNpa}
              />
              <ProductConfigSelect
                label="Equity Requirement"
                placeholder="Select Section"
                value={equityRequirement}
                options={equityRequirementOptions}
                onChange={setEquityRequirement}
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Security Requirements</label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {mergedSecurityOptions.map((option) => (
                  <ProductConfigToggle
                    key={option}
                    id={`mortgage-security-${option}`}
                    label={option}
                    checked={selectedSecurities.includes(option)}
                    onChange={(checked) => toggleSecurity(option, checked)}
                  />
              ))}
            </div>
            {isOtherSecuritySelected(selectedSecurities) ? (
              <ProductConfigInput
                label="Specify other security"
                placeholder='Describe what "Other" means for this product'
                value={securityOtherSpecification}
                onChange={setSecurityOtherSpecification}
              />
            ) : null}
          </div>

            <div className="space-y-2 rounded-md border border-dashed border-[#cdbf8b] p-4">
              <p className="text-sm font-medium text-gray-700">
                Document Requirements{" "}
                <span className="font-normal text-gray-500">→ Requires customer to download fill the form</span>
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
                <ProductConfigInput label="Name Document" placeholder="Name document" value={documentName} onChange={setDocumentName} />
                <div className="flex flex-col gap-2 rounded-md border border-gray-200 p-3 sm:flex-row sm:items-center">
                  <Upload className="shrink-0 text-gray-500" size={18} />
                  <div className="min-w-0 flex-1 text-xs text-gray-600">
                    Add image <span className="text-gray-400">PDF format • Max. 5MB</span>
                  </div>
              <Button 
                type="button"
                    onClick={() => documentsInputRef.current?.click()}
                    className="h-10 shrink-0 bg-[#9A813F] text-white hover:bg-[#8A7335]"
              >
                    Upload
              </Button>
                  <input ref={documentsInputRef} type="file" onChange={handleDocumentUpload} accept=".pdf,image/*" className="hidden" />
                </div>
              </div>
              {documents.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {documents.map((doc, index) => (
                    <span
                      key={`${doc.file.name}-${index}`}
                      className="inline-flex items-center gap-2 rounded-md bg-[#9A813F] px-3 py-2 text-xs text-white"
                    >
                      {doc.name}
                      <button
                        type="button"
                        onClick={() => setDocuments((prev) => prev.filter((_, current) => current !== index))}
                        className="text-white/90 hover:text-white"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">Other Requirements</p>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr_1fr]">
                <ProductConfigSelect
                  label="Select requirement type"
                  placeholder="Select requirement type"
                  value={otherRequirementType}
                  options={otherRequirementOptions}
                  onChange={setOtherRequirementType}
                />
                <ProductConfigSelect
                  label="Content Type"
                  placeholder="Content type"
                  value={otherRequirementContentType}
                  options={contentTypeOptions}
                  onChange={setOtherRequirementContentType}
                />
                <ProductConfigInput
                  label="Description"
                  placeholder="Description"
                  value={otherRequirementDescription}
                  onChange={setOtherRequirementDescription}
                        />
                      </div>
              <button type="button" onClick={addOtherRequirement} className="text-sm font-medium text-[#9A813F] hover:underline">
                Add +
              </button>

              {otherRequirements.length > 0 && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {otherRequirements.map((item, index) => (
                    <div
                      key={`${item.type}-${index}`}
                      className="flex items-start justify-between gap-2 rounded-md bg-[#9A813F] px-3 py-3 text-sm text-white"
                    >
                      <span className="min-w-0 flex-1 leading-snug">{otherRequirementSummary(item)}</span>
                      <button
                        type="button"
                        onClick={() => removeOtherRequirement(index)}
                        className="shrink-0 text-white/90 hover:text-white"
                        aria-label="Remove requirement"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
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

        {step === 4 && (
          <div className="space-y-4">
            <div className="flex lg:flex-row flex-col gap-3 justify-between items-end">
              <ProductConfigInput
                label="Name of Charges or Fee"
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

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ProductConfigToggle
                id="mortgage-deduct-charges"
                label="Deduct all Charges on the loan"
                checked={deductChargesOnLoan}
                onChange={setDeductChargesOnLoan}
              />
              <ProductConfigToggle
                id="mortgage-customer-pay"
                label="Customer Pay for all Charges before disbursement"
                checked={customerPayChargesBeforeDisbursement}
                onChange={setCustomerPayChargesBeforeDisbursement}
              />
            </div>

            <ProductConfigToggle
              id="mortgage-late-repayment"
              label="Charges for Late Repayment"
              checked={enableLateRepaymentCharges}
              onChange={setEnableLateRepaymentCharges}
            />

            {enableLateRepaymentCharges && (
              <>
                <div>
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
          </div>

                {penalties.length > 0 && (
                  <div className="rounded-md border border-dashed border-[#cdbf8b] p-3">
                    <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 border-b border-gray-100 pb-2 text-xs font-semibold text-gray-500">
                      <span>Name</span>
                      <span>Type</span>
                      <span>Value</span>
                      <span>Trigger Duration</span>
                      <span className="text-right" />
                    </div>
                    {penalties.map((penalty, index) => (
                      <div
                        key={`${penalty.name}-${index}`}
                        className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 border-b border-gray-100 py-2 text-sm last:border-0"
                      >
                        <span className="pr-2">{penalty.name}</span>
                        <span>{penalty.type}</span>
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

        {step === 5 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <ProductConfigInput
                label="Name of Properties"
                placeholder="e.g 3 bedroom flat"
                value={propertyName}
                onChange={setPropertyName}
              />
              <ProductConfigSelect
                label="Property Type"
                placeholder="Select Section"
                value={propertyType}
                options={propertyTypeOptions}
                onChange={setPropertyType}
              />
              <ProductConfigInput label="Value of Property" placeholder="Enter Value" value={propertyValue} onChange={setPropertyValue} numericOnly />
            </div>
            <ProductConfigInput
              label="Location of Property"
              placeholder="e.g Lagos, Nigeria"
              value={propertyLocation}
              onChange={setPropertyLocation}
            />

            <div className="rounded-md border border-dashed border-[#cdbf8b] p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Upload className="shrink-0 text-gray-500" size={18} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-700">Add image</p>
                  <p className="text-xs text-gray-500">PDF format • Max. 5MB</p>
                </div>
                <input
                  ref={propertyPreviewInputRef}
                  type="file"
                  onChange={handlePropertyPreviewUpload}
                  accept=".pdf,image/*"
                  multiple
                  className="hidden"
                />
                <Button
                  type="button"
                  onClick={() => propertyPreviewInputRef.current?.click()}
                  className="h-10 shrink-0 bg-[#9A813F] text-white hover:bg-[#8A7335]"
                >
                  Upload
                </Button>
              </div>
              {propertyPreviewFiles.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {propertyPreviewFiles.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="flex items-center gap-3 rounded-md border border-gray-200 bg-white p-2">
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded border border-gray-200 bg-gray-50">
                        {propertyPreviewUrls[index] && file.type.startsWith("image/") ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={propertyPreviewUrls[index]} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-[10px] text-gray-500">File</span>
                        )}
                      </div>
                      <p className="min-w-0 flex-1 truncate text-xs text-gray-600">{file.name}</p>
                      <button
                        type="button"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => removeSelectedPropertyPreview(index)}
                        aria-label="Remove selected file"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
          </div>

            <Button type="button" onClick={addProperty} className="h-10 self-end bg-[#9A813F] text-white hover:bg-[#8A7335]">
              Add
            </Button>
            {propertyFormError ? <p className="text-xs text-red-600">{propertyFormError}</p> : null}

            {properties.length > 0 && (
              <div className="rounded-md border border-dashed border-[#cdbf8b] p-3">
                <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 border-b border-gray-100 pb-2 text-xs font-semibold text-gray-500">
                  <span>Name</span>
                  <span>Type</span>
                  <span>Value</span>
                  <span>Preview</span>
                  <span className="text-right" />
                </div>
                {properties.map((p) => (
                  <div
                    key={p.id}
                    className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 border-b border-gray-100 py-2 text-sm last:border-0"
                  >
                    <span className="pr-2">{p.name}</span>
                    <span>{p.type}</span>
                    <span>{p.value}</span>
                    <span>
                      {p.previewObjectUrls.length > 0 ? (
                        <a
                          href={p.previewObjectUrls[0]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#9A813F] underline hover:text-[#8A7335]"
                        >
                          View Files ({p.previewObjectUrls.length})
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </span>
                    <div className="flex justify-end">
                      <button type="button" onClick={() => removeProperty(p.id)} className="text-red-600 hover:text-red-700" aria-label="Remove">
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
            {step === STEPS.length ? "Submit" : "Next"}
          </Button>
        </div>
      </div>
    </Drawer>
  )
}
