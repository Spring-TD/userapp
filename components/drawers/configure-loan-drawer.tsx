"use client"

import { useEffect, useMemo, useState, type ChangeEvent, useRef } from "react"
import { toast } from "sonner"
import { Upload, X } from "lucide-react"
import { Drawer } from "@/components/drawer"
import { Button } from "@/components/ui/button"
import { fileToBase64 } from "@/lib/fileUtils"
import { fetchOptionLabels, fetchProductOptionLabels } from "@/lib/productOptions"
import type { LoanConfigurePrefetched } from "@/lib/productConfigurePrefetch"
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

interface ConfigureLoanDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => void
  loanData: any
  /** When set, dropdown options are applied immediately (no in-drawer fetch). */
  prefetchedOptions?: LoanConfigurePrefetched | null
}

const STEPS = ["About Product", "Structure", "Requirements", "Fees & Charges"]

interface LoanTypeItem {
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

type DocumentRequirementUpload = { file: File; name: string }

export default function ConfigureLoanDrawer({
  isOpen,
  onClose,
  onSubmit,
  loanData,
  prefetchedOptions = null,
}: ConfigureLoanDrawerProps) {
  const [step, setStep] = useState(1)
  const [tenureOptions, setTenureOptions] = useState<string[]>([])
  const [interestMethodOptions, setInterestMethodOptions] = useState<string[]>([])
  const [moratoriumTypeOptions, setMoratoriumTypeOptions] = useState<string[]>([])
  const [repaymentScheduleOptions, setRepaymentScheduleOptions] = useState<string[]>([])
  const [amortizationScheduleOptions, setAmortizationScheduleOptions] = useState<string[]>([])
  const [repaymentFrequencyOptions, setRepaymentFrequencyOptions] = useState<string[]>([])
  const [acceptableNpaOptions, setAcceptableNpaOptions] = useState<string[]>([])
  const [equityRequirementOptions, setEquityRequirementOptions] = useState<string[]>([])
  const [otherRequirementOptions, setOtherRequirementOptions] = useState<string[]>([])
  const [contentTypeOptions, setContentTypeOptions] = useState<string[]>([])
  const [securityOptions, setSecurityOptions] = useState<string[]>([])
  const mergedSecurityOptions = useMemo(
    () => mergeSecurityRequirementDisplayOptions(securityOptions),
    [securityOptions],
  )
  const [feeTypeOptions, setFeeTypeOptions] = useState<string[]>([])
  const [penaltyTypeOptions, setPenaltyTypeOptions] = useState<string[]>([])
  const [repaymentWorkflowOptions, setRepaymentWorkflowOptions] = useState<string[]>([...DEFAULT_REPAYMENT_WORKFLOWS])

  const [name, setName] = useState(loanData?.name || "")
  const [tenure, setTenure] = useState("")
  const [description, setDescription] = useState(loanData?.description || "")
  const [loanTypeName, setLoanTypeName] = useState("")
  const [loanTypeDescription, setLoanTypeDescription] = useState("")
  const [loanTypes, setLoanTypes] = useState<LoanTypeItem[]>([])
  const [previewImage, setPreviewImage] = useState<File | null>(null)

  const [interestRate, setInterestRate] = useState("")
  const [interestMethod, setInterestMethod] = useState("")
  const [allowMoratorium, setAllowMoratorium] = useState(false)
  const [moratoriumDuration, setMoratoriumDuration] = useState("")
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

  const [chargeName, setChargeName] = useState("")
  const [chargeFeeType, setChargeFeeType] = useState("")
  const [chargeValue, setChargeValue] = useState("")
  const [charges, setCharges] = useState<FeeItem[]>([])
  const [chargePaymentMode, setChargePaymentMode] = useState<"deduct" | "customer-pay">("deduct")
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

  useEffect(() => {
    if (!isOpen) return
    if (prefetchedOptions) {
      setTenureOptions(prefetchedOptions.tenure)
      setInterestMethodOptions(prefetchedOptions.interestMethods)
      setMoratoriumTypeOptions(prefetchedOptions.moratoriumType)
      setRepaymentScheduleOptions(prefetchedOptions.repaymentSchedule)
      setAmortizationScheduleOptions(prefetchedOptions.amortizationSchedule)
      setRepaymentFrequencyOptions(prefetchedOptions.repaymentFrequency)
      setAcceptableNpaOptions(prefetchedOptions.acceptableNpa)
      setEquityRequirementOptions(prefetchedOptions.equityRequirement)
      setOtherRequirementOptions(prefetchedOptions.otherRequirementType)
      setContentTypeOptions(prefetchedOptions.requirementContentType)
      setSecurityOptions(prefetchedOptions.securities)
      setFeeTypeOptions(prefetchedOptions.feeType)
      setPenaltyTypeOptions(prefetchedOptions.penaltyType)
      setRepaymentWorkflowOptions(prefetchedOptions.repaymentWorkflow)
      return
    }
    const loadOptions = async () => {
      const [
        tenure,
        interestMethods,
        moratoriumType,
        repaymentSchedule,
        amortizationSchedule,
        repaymentFrequency,
        acceptableNpa,
        equityRequirement,
        otherRequirementType,
        requirementContentType,
        securities,
        feeType,
        penaltyType,
        repaymentWorkflow,
      ] = await Promise.all([
        fetchOptionLabels("loan-tenure", []),
        fetchProductOptionLabels("interest-method", []),
        fetchOptionLabels("moratorium-type", []),
        fetchOptionLabels("repayment-schedule", []),
        fetchOptionLabels("amortization", []),
        fetchOptionLabels("repayment-cycle", []),
        fetchOptionLabels("acceptable-npa", []),
        fetchOptionLabels("equity-requirement", []),
        fetchProductOptionLabels("loan-other-requirement-type", []),
        fetchProductOptionLabels("loan-other-requirement-content-type", []),
        fetchProductOptionLabels("security-requirements", [], { productType: "LOAN" }),
        fetchOptionLabels("fee-type", []),
        fetchOptionLabels("penalty-type", []),
        fetchOptionLabels("repayment-workflow", [...DEFAULT_REPAYMENT_WORKFLOWS]),
      ])

      setTenureOptions(tenure)
      setInterestMethodOptions(interestMethods)
      setMoratoriumTypeOptions(moratoriumType)
      setRepaymentScheduleOptions(repaymentSchedule)
      setAmortizationScheduleOptions(amortizationSchedule)
      setRepaymentFrequencyOptions(repaymentFrequency)
      setAcceptableNpaOptions(acceptableNpa)
      setEquityRequirementOptions(equityRequirement)
      setOtherRequirementOptions(otherRequirementType)
      setContentTypeOptions(requirementContentType)
      setSecurityOptions(securities)
      setFeeTypeOptions(feeType)
      setPenaltyTypeOptions(penaltyType)
      setRepaymentWorkflowOptions(repaymentWorkflow)
    }
    loadOptions()
  }, [isOpen, prefetchedOptions])

  useEffect(() => {
    if (!isOpen || !loanData) return
    const raw = Array.isArray(loanData.securityRequirements)
      ? (loanData.securityRequirements as unknown[]).map((x) => String(x))
      : []
    const { toggles, otherSpecification } = splitStoredSecurityRequirements(raw)
    setSelectedSecurities(toggles)
    setSecurityOtherSpecification(otherSpecification)
  }, [isOpen, loanData?.id, loanData?.productId, loanData?.securityRequirements])

  const addLoanType = () => {
    if (!loanTypeName.trim() || !loanTypeDescription.trim()) return
    setLoanTypes((prev) => [...prev, { name: loanTypeName.trim(), description: loanTypeDescription.trim() }])
    setLoanTypeName("")
    setLoanTypeDescription("")
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

  const addCharge = () => {
    if (!chargeName.trim() || !chargeFeeType || !chargeValue.trim()) return
    setCharges((prev) => [...prev, { name: chargeName.trim(), feeType: chargeFeeType, value: chargeValue.trim() }])
    setChargeName("")
    setChargeFeeType("")
    setChargeValue("")
  }

  const addPenalty = () => {
    if (!penaltyName.trim() || !penaltyType || !penaltyValue.trim() || !penaltyTriggerDuration.trim()) return
    setPenalties((prev) => [
      ...prev,
      {
        name: penaltyName.trim(),
        type: penaltyType,
        value: penaltyValue.trim(),
        triggerDuration: penaltyTriggerDuration.trim(),
      },
    ])
    setPenaltyName("")
    setPenaltyType("")
    setPenaltyValue("")
    setPenaltyTriggerDuration("")
  }

  const handleDocumentUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const name = documentName.trim().length ? documentName.trim() : file.name
    setDocuments((prev) => [...prev, { file, name }])
    event.target.value = ""
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

    onSubmit({
      ...loanData,
      name,
      tenure,
      description,
      loanTypes,
      previewImage: previewImagePayload,
      interestRate,
      interestMethod,
      allowMoratorium,
      moratoriumDuration,
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
      charges,
      chargePaymentMode,
      enableLateRepaymentCharges,
      penalties,
    })
  }

  return (
    <Drawer
      open={isOpen}
      onOpenChange={onClose}
      title="Configure Loan Product"
      subtitle="Select the loan option you want to create with us"
      className="w-full min-w-0 rounded-none sm:w-[92%] md:w-[78%] lg:w-[62%] xl:w-[52%] 2xl:w-[45%] sm:min-w-[400px] sm:rounded-bl-[40px] sm:rounded-tl-[40px]"
    >
      <div className="mx-auto w-full">
        <ProductConfigTabs steps={STEPS} activeStep={step} onStepChange={setStep} />

      {step === 1 && (
        <ProductConfigAboutStep
          idPrefix="loan"
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
          typeNameDraft={loanTypeName}
          typeDescDraft={loanTypeDescription}
          onTypeNameDraftChange={setLoanTypeName}
          onTypeDescDraftChange={setLoanTypeDescription}
          onAddType={addLoanType}
          typeRows={loanTypes}
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
              id="allow-moratorium"
              label="Allow Moratorium for this instrument"
              checked={allowMoratorium}
              onChange={setAllowMoratorium}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <ProductConfigInput
                label="Select Duration"
                placeholder="Duration"
                value={moratoriumDuration}
                onChange={setMoratoriumDuration}
                numericOnly
              />
              <ProductConfigInput
                label="Duration of Moratorium"
                placeholder="e.g 3 Months"
                value={moratoriumDuration}
                onChange={setMoratoriumDuration}
                numericOnly
              />
              <ProductConfigSelect
                label="Type of Moratorium"
                placeholder="Select type"
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
                  id={`security-${option}`}
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
              Document Requirements <span className="font-normal text-gray-500"> Requires customer to fill the form</span>
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] items-end">
              <ProductConfigInput label="Name Document" placeholder="Name document" value={documentName} onChange={setDocumentName} />
              <Button
                type="button"
                onClick={() => documentsInputRef.current?.click()}
                className="h-10 bg-[#9A813F] text-white hover:bg-[#8A7335]"
              >
                Upload
              </Button>
              <input ref={documentsInputRef} type="file" onChange={handleDocumentUpload} className="hidden" />
            </div>
            {documents.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {documents.map((doc, index) => (
                  <span key={`${doc.file.name}-${index}`} className="inline-flex items-center gap-2 rounded-md bg-[#9A813F] px-3 py-2 text-xs text-white">
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
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
              <Button type="button" onClick={addOtherRequirement} className="h-10 self-end bg-[#9A813F] text-white hover:bg-[#8A7335]">
                Add
              </Button>
            </div>

            {otherRequirements.length > 0 && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {otherRequirements.map((item, index) => (
                  <div key={`${item.type}-${index}`} className="rounded-md bg-[#9A813F] px-3 py-2 text-sm text-white">
                    {item.type} - {item.contentType} - {item.description}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
            <ProductConfigInput label="Name of Charges or Fee" placeholder="e.g Processing Fee" value={chargeName} onChange={setChargeName} />
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
              <div className="grid grid-cols-3 border-b border-gray-100 pb-2 text-xs font-semibold text-gray-500">
                <span>Name</span>
                <span>Type</span>
                <span>Value</span>
              </div>
              {charges.map((charge, index) => (
                <div key={`${charge.name}-${index}`} className="grid grid-cols-3 border-b border-gray-100 py-2 text-sm last:border-0">
                  <span className="pr-2">{charge.name}</span>
                  <span>{charge.feeType}</span>
                  <span>{charge.value}</span>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ProductConfigToggle
              id="deduct-on-loan"
              label="Deduct all Charges on the loan"
              checked={chargePaymentMode === "deduct"}
              onChange={(checked) => checked && setChargePaymentMode("deduct")}
            />
            <ProductConfigToggle
              id="customer-pay"
              label="Customer Pay for all Charges before disbursement"
              checked={chargePaymentMode === "customer-pay"}
              onChange={(checked) => checked && setChargePaymentMode("customer-pay")}
            />
          </div>

          <ProductConfigToggle
            id="late-repayment"
            label="Charges for Late Repayment"
            checked={enableLateRepaymentCharges}
            onChange={setEnableLateRepaymentCharges}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]">
            <ProductConfigInput label="Name of Penalty" placeholder="e.g Processing Fee" value={penaltyName} onChange={setPenaltyName} />
            <ProductConfigSelect
              label="Type"
              placeholder="Select Section"
              value={penaltyType}
              options={penaltyTypeOptions}
              onChange={handlePenaltyTypeChange}
            />
            <ProductConfigInput label="Value" placeholder="Enter Value" value={penaltyValue} onChange={handlePenaltyValueChange} numericOnly />
            <ProductConfigInput
              label="Duration Before Trigger"
              placeholder="Select Section"
              value={penaltyTriggerDuration}
              onChange={setPenaltyTriggerDuration}
              numericOnly
            />
            <Button type="button" onClick={addPenalty} className="h-10 self-end bg-[#9A813F] text-white hover:bg-[#8A7335]">
              Add
            </Button>
          </div>

          {penalties.length > 0 && (
            <div className="rounded-md border border-dashed border-[#cdbf8b] p-3">
              <div className="grid grid-cols-4 border-b border-gray-100 pb-2 text-xs font-semibold text-gray-500">
                <span>Name</span>
                <span>Type</span>
                <span>Value</span>
                <span>Trigger Duration</span>
              </div>
              {penalties.map((penalty, index) => (
                <div key={`${penalty.name}-${index}`} className="grid grid-cols-4 border-b border-gray-100 py-2 text-sm last:border-0">
                  <span className="pr-2">{penalty.name}</span>
                  <span>{penalty.type}</span>
                  <span>{penalty.value}</span>
                  <span>{penalty.triggerDuration}</span>
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
