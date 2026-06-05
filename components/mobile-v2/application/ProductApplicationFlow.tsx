'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import {
  Check,
  ChevronDown,
  ChevronLeft,
  Copy,
  Download,
  Filter,
  Loader2,
  Plus,
  Upload,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  addApplicationGuarantor,
  initializeProductApplication,
  readInitializedApplication,
  submitApplicationRequirements,
  submitInitializedApplication,
  uploadApplicationFile,
  type RequirementSubmission,
  type StorefrontApplication,
} from '@/lib/storefrontApplicationClient'
import { sanitizeProductId } from '@/lib/sanitizeProductId'

type ProductKind = 'loan' | 'mortgage'
type StepId = 'requirement' | 'file' | 'property' | 'product'

type Guarantor = {
  name: string
  phone: string
  email: string
  verificationUrl?: string
}

type EmploymentDraft = {
  occupation: string
  placeOfWork: string
  hrName: string
  hrEmail: string
}

const PRIMARY = 'bg-[var(--sf-button,#1E40AF)] hover:bg-[var(--sf-button-hover,#1e3a8a)] text-white'
const BRAND_INK = 'text-[var(--sf-ink,#1E293B)]'
const BRAND_SOFT = 'bg-[color-mix(in_srgb,var(--sf-button,#1E40AF)_10%,white)]'

const DEFAULT_GUARANTOR: Guarantor = {
  name: 'Charles Avis',
  phone: '+2347045271',
  email: 'talktowithcharles@gmail.com',
}

function prettyKind(kind: ProductKind) {
  return kind === 'loan' ? 'Loan' : 'Mortgage'
}

function formatCurrency(amount?: number | null, currency = 'NGN') {
  if (amount == null || Number.isNaN(amount)) return `${currency}—`
  return `${currency}${amount.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function getApplicationAccount(application?: StorefrontApplication | null) {
  return application?.productWallet?.upstreamAccount ?? application?.account ?? null
}

function applicationProvider(application?: StorefrontApplication | null) {
  return getApplicationAccount(application)?.bankName || 'your provider'
}

function InputPill({
  placeholder,
  right,
  value,
  onChange,
  type = 'text',
}: {
  placeholder: string
  right?: React.ReactNode
  value?: string
  onChange?: (value: string) => void
  type?: React.HTMLInputTypeAttribute
}) {
  return (
    <label className="flex h-12 items-center justify-between rounded-2xl bg-gray-100 px-4 ring-[var(--sf-button,#1E40AF)]/20 focus-within:ring-2">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className={`min-w-0 flex-1 bg-transparent text-[12px] placeholder:text-gray-400 focus:outline-none ${BRAND_INK}`}
      />
      {right}
    </label>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className={`pt-2 text-sm font-bold ${BRAND_INK}`}>{children}</h2>
}

function StatusDot({ done }: { done?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex h-4 w-4 items-center justify-center rounded-full text-white',
        done ? 'bg-[var(--sf-button,#1E40AF)]' : 'bg-gray-400',
      )}
    >
      {done ? <Check className="h-2.5 w-2.5" /> : null}
    </span>
  )
}

function FileActionRow({
  name,
  fileUrl,
  userId,
  onUploaded,
}: {
  name: string
  fileUrl?: string
  userId?: string
  onUploaded: (submission: RequirementSubmission) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUpload = async (file?: File) => {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const uploadedFile = await uploadApplicationFile(file, userId)
      onUploaded({
        requirementType: name,
        label: name,
        type: 'document',
        fileUrl: uploadedFile.fileUrl,
        fileName: uploadedFile.fileName,
        fileType: uploadedFile.fileType,
        fileSize: uploadedFile.fileSize,
        metadata: {
          source: 'documentsToDownload',
          ...(fileUrl ? { downloadedFileUrl: fileUrl } : {}),
        },
      })
      setUploaded(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">{name}</span>
        <StatusDot done={uploaded} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <a
          href={fileUrl || '#'}
          target={fileUrl ? '_blank' : undefined}
          rel="noreferrer"
          className={cn(
            `flex h-9 items-center justify-center gap-2 rounded-xl text-xs font-semibold ${BRAND_SOFT} ${BRAND_INK}`,
            !fileUrl && 'pointer-events-none opacity-50',
          )}
        >
          Download File
          <Download className="h-3 w-3" />
        </a>
        <label className={`flex h-9 cursor-pointer items-center justify-center gap-2 rounded-xl bg-gray-100 text-xs font-semibold ${BRAND_INK}`}>
          <input type="file" className="hidden" onChange={(event) => void handleUpload(event.target.files?.[0])} />
          {uploading ? 'Uploading...' : uploaded ? 'Uploaded' : 'Upload File'}
          {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
        </label>
      </div>
      {error ? <p className="text-[10px] text-red-600">{error}</p> : null}
    </div>
  )
}

function FileUploadButton({ label }: { label: string }) {
  return (
    <label className={`inline-flex cursor-pointer rounded-xl bg-gray-100 px-4 py-2 text-xs font-bold ${BRAND_INK}`}>
      <input type="file" className="hidden" />
      {label}
    </label>
  )
}

function CollateralRequirement({
  title,
  description,
  button,
  done,
  upload,
}: {
  title: string
  description: string
  button: string
  done?: boolean
  upload?: boolean
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium text-gray-500">{title}</p>
        <StatusDot done={done} />
      </div>
      <p className="text-[10px] leading-snug text-gray-500">{description}</p>
      {upload ? (
        <FileUploadButton label={button} />
      ) : (
        <button type="button" className={`rounded-xl bg-gray-100 px-4 py-2 text-xs font-bold ${BRAND_INK}`}>
          {button}
        </button>
      )}
    </div>
  )
}

function ProgressTabs({
  steps,
  active,
  onChange,
  productLabel,
}: {
  steps: StepId[]
  active: StepId
  onChange: (step: StepId) => void
  productLabel: string
}) {
  const labels: Record<StepId, string> = {
    requirement: 'Requirement',
    file: 'File Upload',
    property: 'Property',
    product: productLabel,
  }

  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar">
      {steps.map((step) => (
        <button
          key={step}
          type="button"
          onClick={() => onChange(step)}
          className={cn(
            'shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-medium',
            active === step
              ? 'border-[var(--sf-button,#1E40AF)] bg-white text-[var(--sf-button,#1E40AF)] shadow-sm'
              : 'border-transparent bg-gray-100 text-gray-400',
          )}
        >
          {labels[step]}
        </button>
      ))}
    </div>
  )
}

function BottomSheet({
  children,
  onClose,
}: {
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div className="absolute inset-0 z-[70] flex items-end">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="relative z-[71] max-h-[90vh] w-full overflow-y-auto rounded-t-[28px] bg-white px-5 pb-8 pt-2 shadow-2xl no-scrollbar">
        <div className="mx-auto mb-5 h-1.5 w-16 rounded-full bg-gray-300" />
        {children}
      </div>
    </div>
  )
}

function ProductSummary({
  kind,
  application,
  providerName,
  withTerms,
  accepted,
  onToggleAccepted,
}: {
  kind: ProductKind
  application?: StorefrontApplication | null
  providerName: string
  withTerms: boolean
  accepted: boolean
  onToggleAccepted: () => void
}) {
  const account = getApplicationAccount(application)
  const productName = application?.productName || `${prettyKind(kind)} application`
  const amount = formatCurrency(application?.amount, application?.currency || 'NGN')
  const summaryRows = [
    ['Application status', application?.status || 'Initialized'],
    ['Product type', application?.productType || prettyKind(kind).toUpperCase()],
    ['Application amount', amount],
    ...(account?.bankName ? [['Bank name', account.bankName]] : []),
    ...(account?.accountNumber ? [['Account number', account.accountNumber]] : []),
    ['Powered by:', providerName],
  ]

  return (
    <div className="space-y-5">
      <div
        className="h-[155px] rounded-2xl bg-cover bg-center"
        style={{
          backgroundImage:
            kind === 'mortgage'
              ? "url('/mortgage-feature.png')"
              : "url('https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1000&auto=format&fit=crop')",
        }}
      />
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className={`text-sm font-medium ${BRAND_INK}`}>
            {productName}
          </h2>
          <p className="mt-2 text-[11px] leading-relaxed text-gray-500">
            Review the initialized {prettyKind(kind).toLowerCase()} application details before submitting.
          </p>
        </div>
        <p className={`shrink-0 text-sm font-bold ${BRAND_INK}`}>
          {amount}
        </p>
      </div>
      <div className="space-y-5 pt-2 text-sm">
        {summaryRows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4">
            <span className="text-gray-500">{label}</span>
            <span className="text-right font-semibold text-gray-700">{value}</span>
          </div>
        ))}
      </div>
      {withTerms ? (
        <>
          <button
            type="button"
            onClick={onToggleAccepted}
            className="flex items-center gap-2 pt-3 text-xs text-gray-600"
          >
            <span
              className={cn(
                'flex h-4 w-4 items-center justify-center rounded-full border',
                accepted ? 'border-[var(--sf-button,#1E40AF)] bg-[var(--sf-button,#1E40AF)] text-white' : 'border-gray-300',
              )}
            >
              {accepted ? <Check className="h-2.5 w-2.5" /> : null}
            </span>
            Accept Terms & Condition.
          </button>
          <p className="rounded bg-orange-50 p-3 text-[10px] leading-relaxed text-gray-500">
            Submitting the above information increases your chances of getting your application
            approved.
          </p>
        </>
      ) : null}
    </div>
  )
}

export function ProductApplicationFlow({ kind, productId: productIdProp }: { kind: ProductKind; productId?: string }) {
  const searchParams = useSearchParams()
  const steps = useMemo<StepId[]>(
    () => (kind === 'loan' ? ['requirement', 'file', 'product'] : ['requirement', 'file', 'property', 'product']),
    [kind],
  )
  const [activeStep, setActiveStep] = useState<StepId>('requirement')
  const [accepted, setAccepted] = useState(false)
  const [sheet, setSheet] = useState<'create_account' | 'guarantor_form' | 'guarantor_added' | 'success' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [creatingAccount, setCreatingAccount] = useState(false)
  const [createAccountError, setCreateAccountError] = useState<string | null>(null)
  const [requirementSubmissions, setRequirementSubmissions] = useState<RequirementSubmission[]>([])
  const [guarantors, setGuarantors] = useState<Guarantor[]>([])
  const [employmentDraft, setEmploymentDraft] = useState<EmploymentDraft>({
    occupation: '',
    placeOfWork: '',
    hrName: '',
    hrEmail: '',
  })
  const [guarantorDraft, setGuarantorDraft] = useState<Guarantor>({
    name: '',
    phone: '',
    email: '',
  })
  const productName = prettyKind(kind)
  const initializedApplication = readInitializedApplication()
  const providerName = applicationProvider(initializedApplication)
  const productId = sanitizeProductId(productIdProp || searchParams.get('productId') || initializedApplication?.productId || '')
  const applicationId = searchParams.get('applicationId') || initializedApplication?.id || initializedApplication?._id || ''
  const userId = initializedApplication?.userId || ''
  const requirements = initializedApplication?.requirementsSnapshot
  const documentsToDownload = requirements?.documentsToDownload ?? []
  const otherRequirements = requirements?.otherRequirements ?? []
  const requiresGuarantor = requirements?.security?.guarantor === true

  const goBackHref = kind === 'loan' ? '/mobile-v2/products/loan' : '/mobile-v2/products/mortgage'
  const activeIndex = steps.indexOf(activeStep)

  const upsertSubmission = (submission: RequirementSubmission) => {
    const key = submission.requirementId || submission.requirementType || submission.label
    setRequirementSubmissions((current) => {
      const filtered = current.filter((item) => (item.requirementId || item.requirementType || item.label) !== key)
      return [...filtered, submission]
    })
  }

  const handleFinalSubmit = async () => {
    if (!applicationId || !userId) {
      setError('Application was not initialized. Please go back and create the account again.')
      return
    }

    if (requiresGuarantor && guarantors.length === 0) {
      setError('Please add at least one guarantor before submitting.')
      setActiveStep('requirement')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const submissions: RequirementSubmission[] = [
        ...requirementSubmissions,
        {
          requirementType: 'Employment',
          label: 'Employment',
          type: 'json',
          value: employmentDraft,
        },
      ]
      const requirementsResult = await submitApplicationRequirements(applicationId, userId, submissions)
      if (!requirementsResult.ok) {
        setError(requirementsResult.error)
        return
      }

      const submitResult = await submitInitializedApplication(applicationId, {
        userId,
        acceptedTerms: true,
        ...(kind === 'mortgage'
          ? {
              mortgageSelection: {
                propertyName: 'Mortgage property',
                propertyType: 'Mortgage',
                quantity: 1,
                total: 0,
              },
            }
          : {}),
      })

      if (!submitResult.ok) {
        setError(submitResult.error)
        return
      }

      setSheet('success')
    } finally {
      setSubmitting(false)
    }
  }

  const goNext = () => {
    if (activeStep === 'product') {
      void handleFinalSubmit()
      return
    }
    setActiveStep(steps[Math.min(activeIndex + 1, steps.length - 1)])
  }

  const handleCreateAccount = async () => {
    if (!productId) {
      setCreateAccountError(`No ${productName.toLowerCase()} product selected.`)
      return
    }

    setCreatingAccount(true)
    setCreateAccountError(null)
    try {
      const result = await initializeProductApplication(productId)
      if (!result.ok) {
        setCreateAccountError(result.error || `Could not create your ${productName.toLowerCase()} account.`)
        return
      }
      setSheet('success')
    } finally {
      setCreatingAccount(false)
    }
  }

  return (
    <div className="relative flex h-full flex-col bg-white">
      <div className="flex-1 overflow-y-auto px-5 pb-28 pt-12 no-scrollbar">
        <div className="mb-8 flex items-center justify-between">
          <Link href={goBackHref} className="flex h-9 w-9 items-center justify-center rounded-full">
            <ChevronLeft className="h-5 w-5 text-gray-700" />
          </Link>
          <h1 className={`text-base font-bold ${BRAND_INK}`}>Apply</h1>
          <Filter className="h-4 w-4 text-gray-700" />
        </div>

        <ProgressTabs
          steps={steps}
          active={activeStep}
          onChange={setActiveStep}
          productLabel={productName}
        />

        <div className="pt-8">
          {activeStep === 'requirement' && (
            <div className="space-y-6">
              <SectionTitle>Occupation</SectionTitle>
              <div className="space-y-3">
                <InputPill
                  placeholder="Occupation"
                  right={<ChevronDown className="h-4 w-4 text-gray-400" />}
                  value={employmentDraft.occupation}
                  onChange={(occupation) => setEmploymentDraft((draft) => ({ ...draft, occupation }))}
                />
                <InputPill
                  placeholder="Place of Work"
                  value={employmentDraft.placeOfWork}
                  onChange={(placeOfWork) => setEmploymentDraft((draft) => ({ ...draft, placeOfWork }))}
                />
                <InputPill
                  placeholder="Name of HR"
                  value={employmentDraft.hrName}
                  onChange={(hrName) => setEmploymentDraft((draft) => ({ ...draft, hrName }))}
                />
                <InputPill
                  placeholder="HR's Email"
                  type="email"
                  value={employmentDraft.hrEmail}
                  onChange={(hrEmail) => setEmploymentDraft((draft) => ({ ...draft, hrEmail }))}
                />
              </div>

              {requiresGuarantor ? (
              <div className="space-y-3">
                <SectionTitle>Guarantor</SectionTitle>
                {guarantors.length > 0 ? (
                  <div className="relative rounded-2xl bg-gray-100 p-4 pr-10">
                    <p className={`text-sm font-bold ${BRAND_INK}`}>{guarantors[0].name}</p>
                    <p className="mt-1 text-[10px] text-gray-500">
                      {guarantors[0].phone} | {guarantors[0].email}
                    </p>
                    {guarantors[0].verificationUrl ? (
                      <button
                        type="button"
                        onClick={() => void navigator.clipboard?.writeText(guarantors[0].verificationUrl || '')}
                        className={`mt-3 inline-flex items-center gap-1 text-xs font-bold ${BRAND_INK}`}
                      >
                        <Copy className="h-3 w-3" />
                        Copy KYC URL
                      </button>
                    ) : null}
                    <span className="absolute right-4 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--sf-button,#1E40AF)] text-white">
                      <Check className="h-3 w-3" />
                    </span>
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => setSheet(guarantors.length > 0 ? 'guarantor_added' : 'guarantor_form')}
                  className={`inline-flex items-center gap-1 rounded-xl bg-gray-100 px-3 py-2 text-sm font-bold ${BRAND_INK}`}
                >
                  <Plus className="h-3 w-3" /> Add a Guarantor
                </button>
              </div>
              ) : null}

              <div className="space-y-4">
                <SectionTitle>Collateral</SectionTitle>
                {otherRequirements.length > 0 ? (
                  otherRequirements.map((requirement, index) => (
                    <CollateralRequirement
                      key={requirement.requirementId || requirement.id || requirement.requirementType || index}
                      title={requirement.label || requirement.requirementType || `Requirement ${index + 1}`}
                      description={requirement.description || requirement.contentType || ''}
                      button={requirement.uploadRequired || requirement.required ? 'Upload Document' : 'Add Details'}
                      upload={requirement.uploadRequired || requirement.required}
                    />
                  ))
                ) : (
                  <p className="rounded-2xl bg-gray-50 p-4 text-xs text-gray-500">
                    No extra collateral requirements configured for this product.
                  </p>
                )}
              </div>
            </div>
          )}

          {activeStep === 'file' && (
            <div className="space-y-7">
              <SectionTitle>Bank Form to fill & Submit</SectionTitle>
              {documentsToDownload.length > 0 ? (
                documentsToDownload.map((document, index) => (
                  <FileActionRow
                    key={document.name || index}
                    name={document.name || `Document ${index + 1}`}
                    fileUrl={document.fileUrl}
                    userId={userId}
                    onUploaded={upsertSubmission}
                  />
                ))
              ) : (
                <p className="rounded-2xl bg-gray-50 p-4 text-xs text-gray-500">
                  No downloadable forms configured for this product.
                </p>
              )}
            </div>
          )}

          {activeStep === 'property' && (
            <ProductSummary
              kind={kind}
              application={initializedApplication}
              providerName={providerName}
              withTerms={false}
              accepted={accepted}
              onToggleAccepted={() => setAccepted((v) => !v)}
            />
          )}

          {activeStep === 'product' && (
            <ProductSummary
              kind={kind}
              application={initializedApplication}
              providerName={providerName}
              withTerms
              accepted={accepted}
              onToggleAccepted={() => setAccepted((v) => !v)}
            />
          )}
        </div>
      </div>

      <div className="absolute bottom-6 left-5 right-5">
        {error ? <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p> : null}
        <Button
          type="button"
          disabled={(activeStep === 'product' && !accepted) || submitting}
          className={cn('h-12 w-full rounded-full text-sm font-semibold disabled:opacity-50', PRIMARY)}
          onClick={goNext}
        >
          {submitting ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting...
            </span>
          ) : activeStep === 'product' ? 'Submit application' : 'Next'}
        </Button>
      </div>

      {sheet === 'create_account' && (
        <BottomSheet onClose={() => setSheet(null)}>
          <div className="text-center">
            <h2 className={`text-xl font-bold ${BRAND_INK}`}>Create a {productName} Account</h2>
            <p className="mx-auto mt-4 max-w-xs text-xs leading-relaxed text-gray-500">
              Before you can proceed with <strong>{initializedApplication?.productName || productName}</strong> offered by{' '}
              <strong>{providerName}</strong>, you are required to open a Bank Account with{' '}
              <strong>{providerName}</strong>.
            </p>
            <div className={`mt-5 flex items-center gap-3 rounded p-3 text-left text-xs ${BRAND_SOFT} ${BRAND_INK}`}>
              <Image
                src="/images/mobile/cbn.png"
                alt="Central Bank of Nigeria"
                width={28}
                height={28}
                className="h-7 w-7 shrink-0 object-contain"
              />
              <span>
                <strong>{providerName}</strong> is a licensed Financial Institution by the Central
                Bank of Nigeria
              </span>
            </div>
            <div className="mt-5 space-y-3 text-left text-xs text-gray-700">
              <label className="flex items-center gap-2">
                <Check className="h-4 w-4 rounded-full bg-[var(--sf-button,#1E40AF)] p-0.5 text-white" />
                Accept Terms & Condition, Data Sharing with (Provider)
              </label>
              <label className="flex items-center gap-2">
                <Check className="h-4 w-4 rounded-full bg-[var(--sf-button,#1E40AF)] p-0.5 text-white" />
                Accept Data Privacy & Use of Data
              </label>
            </div>
            {createAccountError ? (
              <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-center text-xs text-red-600">
                {createAccountError}
              </p>
            ) : null}
            <Button
              type="button"
              disabled={creatingAccount}
              className={cn('mt-8 h-12 w-full rounded-full font-semibold', PRIMARY)}
              onClick={() => void handleCreateAccount()}
            >
              {creatingAccount ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating account...
                </span>
              ) : (
                'Go ahead, Create Bank account'
              )}
            </Button>
            <button type="button" className={`mt-5 text-sm font-medium ${BRAND_INK}`} onClick={() => setSheet(null)}>
              No. Go back
            </button>
          </div>
        </BottomSheet>
      )}

      {sheet === 'guarantor_form' && (
        <BottomSheet onClose={() => setSheet(null)}>
          <h2 className={`mb-7 text-center text-xl font-bold ${BRAND_INK}`}>Add Guarantor 1</h2>
          <div className="space-y-3">
            <InputPill
              placeholder="Full Name"
              value={guarantorDraft.name}
              onChange={(name) => setGuarantorDraft((g) => ({ ...g, name }))}
            />
            <InputPill
              placeholder="Email"
              type="email"
              value={guarantorDraft.email}
              onChange={(email) => setGuarantorDraft((g) => ({ ...g, email }))}
            />
            <InputPill
              placeholder="Phone"
              type="tel"
              value={guarantorDraft.phone}
              onChange={(phone) => setGuarantorDraft((g) => ({ ...g, phone }))}
            />
            <InputPill placeholder="Occupation" right={<ChevronDown className="h-4 w-4 text-gray-400" />} />
            <InputPill placeholder="Relationship with Guarantor" right={<ChevronDown className="h-4 w-4 text-gray-400" />} />
          </div>
          <Button
            type="button"
            className={cn('mt-6 h-12 w-full rounded-full font-semibold', PRIMARY)}
            onClick={async () => {
              if (!applicationId || !userId) {
                setError('Application was not initialized. Please go back and create the account again.')
                setSheet(null)
                return
              }
              const fullName = guarantorDraft.name.trim() || DEFAULT_GUARANTOR.name
              const email = guarantorDraft.email.trim() || DEFAULT_GUARANTOR.email
              const phone = guarantorDraft.phone.trim() || DEFAULT_GUARANTOR.phone
              const result = await addApplicationGuarantor(applicationId, {
                userId,
                fullName,
                email,
                phone,
                occupation: 'Not specified',
                relationship: 'Not specified',
                country: 'NG',
              })
              if (!result.ok) {
                setError(result.error)
                setSheet(null)
                return
              }
              setGuarantors([
                {
                  name: result.data?.guarantor?.fullName || fullName,
                  phone: result.data?.guarantor?.phone || phone,
                  email: result.data?.guarantor?.email || email,
                  verificationUrl: result.data?.guarantor?.kyc?.verificationUrl,
                },
              ])
              setSheet('guarantor_added')
            }}
          >
            Generate KYC link for Guarantor 1
          </Button>
          <button type="button" className={`mt-5 w-full text-center text-sm font-medium ${BRAND_INK}`} onClick={() => setSheet(null)}>
            No. Go back
          </button>
        </BottomSheet>
      )}

      {sheet === 'guarantor_added' && (
        <BottomSheet onClose={() => setSheet(null)}>
          <h2 className={`mb-4 text-center text-xl font-bold ${BRAND_INK}`}>Add Guarantor 1</h2>
          <p className={`mb-5 rounded p-3 text-[11px] leading-relaxed ${BRAND_SOFT} ${BRAND_INK}`}>
            Share the KYC URL with each of your Guarantor(s) to complete their KYC before you can
            submit your application
          </p>
          <p className="mb-3 text-sm font-semibold text-gray-700">1 of 2 Guarantor Added</p>
          <div className="relative rounded-2xl bg-gray-100 p-4 pr-10">
            <p className={`text-sm font-bold ${BRAND_INK}`}>
              {(guarantors[0] ?? DEFAULT_GUARANTOR).name}
            </p>
            <p className="mt-1 text-[10px] text-gray-500">
              {(guarantors[0] ?? DEFAULT_GUARANTOR).phone} | {(guarantors[0] ?? DEFAULT_GUARANTOR).email}
            </p>
            {(guarantors[0] ?? DEFAULT_GUARANTOR).verificationUrl ? (
              <button
                type="button"
                onClick={() => void navigator.clipboard?.writeText((guarantors[0] ?? DEFAULT_GUARANTOR).verificationUrl || '')}
                className={`mt-4 inline-flex items-center gap-1 text-xs font-bold ${BRAND_INK}`}
              >
                <Copy className="h-3 w-3" />
                Copy KYC URL
              </button>
            ) : null}
            <span className="absolute right-4 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--sf-button,#1E40AF)] text-white">
              <Check className="h-3 w-3" />
            </span>
          </div>
          <button type="button" className={`mt-5 text-sm font-bold ${BRAND_INK}`} onClick={() => setSheet('guarantor_form')}>
            + Add Another Guarantor
          </button>
          <Button
            type="button"
            className={cn('mt-8 h-12 w-full rounded-full font-semibold', PRIMARY)}
            onClick={() => setSheet(null)}
          >
            Save & Continue
          </Button>
          <button type="button" className={`mt-5 w-full text-center text-sm font-medium ${BRAND_INK}`} onClick={() => setSheet(null)}>
            No. Go back
          </button>
        </BottomSheet>
      )}

      {sheet === 'success' && (
        <BottomSheet onClose={() => setSheet(null)}>
          <div className="flex flex-col items-center py-4 text-center">
            <div className={`mb-6 flex h-20 w-20 items-center justify-center rounded-full ${BRAND_SOFT}`}>
              <Check className="h-10 w-10 text-[var(--sf-button,#1E40AF)]" strokeWidth={3} />
            </div>
            <h2 className={`text-xl font-bold ${BRAND_INK}`}>Application Submitted</h2>
            <p className="mt-2 text-sm text-gray-500">Your {productName.toLowerCase()} application has been submitted.</p>
            <Link href={goBackHref} className="mt-8 w-full">
              <Button className={cn('h-12 w-full rounded-full font-semibold', PRIMARY)}>Continue</Button>
            </Link>
          </div>
        </BottomSheet>
      )}
    </div>
  )
}
