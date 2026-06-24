'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import {
  Check,
  CheckCircle,
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
  saveApplicationProgress,
  submitApplicationRequirements,
  submitInitializedApplication,
  uploadApplicationFile,
  type ApplicationProgress,
  type RequirementSubmission,
  type StorefrontApplication,
} from '@/lib/storefrontApplicationClient'
import { sanitizeProductId } from '@/lib/sanitizeProductId'
import { mortgagePendingDetailHref } from '@/lib/mortgageApplyRoutes'
import {
  initMortgageWorkflowSubmitted,
  type MortgageDownPaymentMethod,
} from '@/lib/mortgageWorkflow'
import { useMobileV2Tenant } from '@/contexts/MobileV2TenantContext'
import {
  defaultApplicationAmountValue,
  formatApplicationAmountHint,
  parseApplicationAmount,
  validateApplicationAmount,
} from '@/lib/applicationAmount'
import { useMobileProductDetail } from '@/hooks/useMobileProductDetail'

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

type ApplicationDraft = {
  version: 1
  activeStep: StepId
  accepted: boolean
  applicationAmount: string
  requirementSubmissions: RequirementSubmission[]
  guarantors: Guarantor[]
  employmentDraft: EmploymentDraft
  guarantorDraft: Guarantor
  updatedAt: string
}

type ProgressTab = 'requirement' | 'fileUpload' | 'loan'

const PRIMARY = 'bg-[var(--sf-button,#1E40AF)] hover:bg-[var(--sf-button-hover,#1e3a8a)] text-white'
const BRAND_INK = 'text-[var(--sf-ink,#1E293B)]'
const OUTLINE = 'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80'
const OUTLINE_HOVER = 'bg-secondary/80 text-secondary-foreground shadow-xs hover:bg-secondary/80'
const OUTLINE_ACTIVE = 'bg-secondary/80 text-secondary-foreground shadow-xs hover:bg-secondary/80'
const BRAND_SOFT = 'bg-[color-mix(in_srgb,var(--sf-button,#1E40AF)_10%,white)]'

const DEFAULT_GUARANTOR: Guarantor = {
  name: 'Charles Avis',
  phone: '+2347045271',
  email: 'talktowithcharles@gmail.com',
}

const APPLICATION_DRAFT_PREFIX = 'mobile-v2-product-application-draft'

function draftStorageKey(kind: ProductKind, productId: string, applicationId: string) {
  const id = productId || applicationId
  return id ? `${APPLICATION_DRAFT_PREFIX}:${kind}:${id}` : ''
}

function readApplicationDraft(key: string): ApplicationDraft | null {
  if (!key || typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const draft = JSON.parse(raw) as Partial<ApplicationDraft>
    return draft.version === 1 ? (draft as ApplicationDraft) : null
  } catch {
    return null
  }
}

function saveApplicationDraft(key: string, draft: Omit<ApplicationDraft, 'version' | 'updatedAt'>) {
  if (!key || typeof window === 'undefined') return
  window.localStorage.setItem(
    key,
    JSON.stringify({
      ...draft,
      version: 1,
      updatedAt: new Date().toISOString(),
    }),
  )
}

function clearApplicationDraft(key: string) {
  if (!key || typeof window === 'undefined') return
  window.localStorage.removeItem(key)
}

function progressTabForStep(step: StepId): ProgressTab {
  if (step === 'file') return 'fileUpload'
  if (step === 'property' || step === 'product') return 'loan'
  return 'requirement'
}

function stepForProgressTab(tab?: string): StepId {
  if (tab === 'fileUpload') return 'file'
  if (tab === 'loan') return 'product'
  return 'requirement'
}

function isEmploymentSubmission(submission: RequirementSubmission) {
  return (submission.requirementType || submission.label || '').toLowerCase() === 'employment'
}

function employmentSubmissionFromDraft(employmentDraft: EmploymentDraft): RequirementSubmission {
  return {
    requirementType: 'Employment',
    label: 'Employment',
    type: 'json',
    value: employmentDraft,
  }
}

function employmentDraftFromSubmission(submission?: RequirementSubmission): EmploymentDraft {
  const value = submission?.value && typeof submission.value === 'object' ? (submission.value as Partial<EmploymentDraft>) : {}
  return {
    occupation: typeof value.occupation === 'string' ? value.occupation : '',
    placeOfWork: typeof value.placeOfWork === 'string' ? value.placeOfWork : '',
    hrName: typeof value.hrName === 'string' ? value.hrName : '',
    hrEmail: typeof value.hrEmail === 'string' ? value.hrEmail : '',
  }
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

function applicationProvider(
  application: StorefrontApplication | null | undefined,
  tenantDisplayName?: string | null,
  tenantSubdomain?: string | null,
) {
  return (
    getApplicationAccount(application)?.bankName ||
    tenantDisplayName?.trim() ||
    tenantSubdomain?.trim() ||
    'Provider'
  )
}

function InputPill({
  placeholder,
  right,
  value,
  onChange,
  type = 'text',
  inputMode,
}: {
  placeholder: string
  right?: React.ReactNode
  value?: string
  onChange?: (value: string) => void
  type?: React.HTMLInputTypeAttribute
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
}) {
  return (
    <label className="flex h-12 items-center justify-between rounded-2xl bg-gray-100 px-4 ring-[var(--sf-button,#1E40AF)]/20 focus-within:ring-2">
      <input
        type={type}
        inputMode={inputMode}
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
  done,
  submission,
}: {
  name: string
  fileUrl?: string
  userId?: string
  onUploaded: (submission: RequirementSubmission) => void
  done?: boolean
  submission?: RequirementSubmission
}) {
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(Boolean(done))
  const [uploadedFile, setUploadedFile] = useState<{
    fileUrl: string
    fileName: string
    fileType?: string
    fileSize?: number
  } | null>(
    submission?.fileUrl
      ? {
          fileUrl: submission.fileUrl,
          fileName: submission.fileName || 'Uploaded file',
          fileType: submission.fileType,
          fileSize: submission.fileSize,
        }
      : null,
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const isDone = Boolean(done || submission?.fileUrl)
    setUploaded(isDone)
    if (submission?.fileUrl) {
      setUploadedFile({
        fileUrl: submission.fileUrl,
        fileName: submission.fileName || 'Uploaded file',
        fileType: submission.fileType,
        fileSize: submission.fileSize,
      })
      return
    }
    if (!isDone) {
      setUploadedFile(null)
    }
  }, [done, submission?.fileUrl, submission?.fileName, submission?.fileType, submission?.fileSize])

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
      setUploadedFile({
        fileUrl: uploadedFile.fileUrl,
        fileName: uploadedFile.fileName,
        fileType: uploadedFile.fileType,
        fileSize: uploadedFile.fileSize,
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
        <StatusDot done={uploaded || done} />
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
          {uploading ? 'Uploading...' : uploaded || done ? 'Uploaded' : 'Upload File'}
          {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
        </label>
      </div>
      {uploadedFile ? (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-green-50 px-3 py-2 text-[10px] text-green-800">
          <span className="min-w-0 truncate font-medium">{uploadedFile.fileName}</span>
          <a href={uploadedFile.fileUrl} target="_blank" rel="noreferrer" className="shrink-0 font-bold underline">
            Open
          </a>
        </div>
      ) : null}
      {error ? <p className="text-[10px] text-red-600">{error}</p> : null}
    </div>
  )
}

type CollateralRequirementItem = {
  requirementId?: string
  id?: string
  requirementType?: string
  label?: string
  contentType?: string
  description?: string
  templateFileUrl?: string
  fileUrl?: string
  uploadRequired?: boolean
  required?: boolean
}

function collateralRequirementKey(requirement: CollateralRequirementItem): string {
  return String(
    requirement.requirementId ||
      requirement.id ||
      requirement.requirementType ||
      requirement.label ||
      '',
  )
}

function collateralNeedsUpload(requirement: CollateralRequirementItem): boolean {
  const contentType = String(requirement.contentType || '').toLowerCase()
  return Boolean(
    requirement.uploadRequired ||
      requirement.required ||
      contentType.includes('document'),
  )
}

function CollateralRequirementRow({
  requirement,
  userId,
  onUploaded,
  done,
  submission,
}: {
  requirement: CollateralRequirementItem
  userId?: string
  onUploaded: (submission: RequirementSubmission) => void
  done?: boolean
  submission?: RequirementSubmission
}) {
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(Boolean(done))
  const [uploadedFile, setUploadedFile] = useState<{
    fileUrl: string
    fileName: string
    fileType?: string
    fileSize?: number
  } | null>(
    submission?.fileUrl
      ? {
          fileUrl: submission.fileUrl,
          fileName: submission.fileName || 'Uploaded file',
          fileType: submission.fileType,
          fileSize: submission.fileSize,
        }
      : null,
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const isDone = Boolean(done || submission)
    setUploaded(isDone)
    if (submission?.fileUrl) {
      setUploadedFile({
        fileUrl: submission.fileUrl,
        fileName: submission.fileName || 'Uploaded file',
        fileType: submission.fileType,
        fileSize: submission.fileSize,
      })
      return
    }
    if (!isDone) {
      setUploadedFile(null)
    }
  }, [done, submission, submission?.fileUrl, submission?.fileName, submission?.fileType, submission?.fileSize])

  const title = requirement.label || requirement.requirementType || 'Requirement'
  const description = requirement.description || requirement.contentType || ''
  const templateUrl =
    requirement.templateFileUrl ||
    requirement.fileUrl ||
    (String(requirement.description || '').startsWith('http') ? requirement.description : undefined)
  const needsUpload = collateralNeedsUpload(requirement)

  const handleUpload = async (file?: File) => {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const uploadedFile = await uploadApplicationFile(file, userId)
      onUploaded({
        requirementId: requirement.requirementId || requirement.id,
        requirementType: requirement.requirementType || title,
        label: title,
        type: 'document',
        fileUrl: uploadedFile.fileUrl,
        fileName: uploadedFile.fileName,
        fileType: uploadedFile.fileType,
        fileSize: uploadedFile.fileSize,
        metadata: {
          source: 'otherRequirements',
          contentType: requirement.contentType,
          ...(templateUrl ? { templateFileUrl: templateUrl } : {}),
        },
      })
      setUploadedFile({
        fileUrl: uploadedFile.fileUrl,
        fileName: uploadedFile.fileName,
        fileType: uploadedFile.fileType,
        fileSize: uploadedFile.fileSize,
      })
      setUploaded(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleAcknowledge = () => {
    onUploaded({
      requirementId: requirement.requirementId || requirement.id,
      requirementType: requirement.requirementType || title,
      label: title,
      type: 'json',
      value: { acknowledged: true },
      metadata: {
        source: 'otherRequirements',
        contentType: requirement.contentType,
      },
    })
    setUploaded(true)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium text-gray-500">{title}</p>
        <StatusDot done={uploaded || done} />
      </div>
      {description ? <p className="text-[10px] leading-snug text-gray-500">{description}</p> : null}
      {needsUpload ? (
        <>
          <div className={cn('grid gap-3', templateUrl ? 'grid-cols-2' : 'grid-cols-1')}>
            {templateUrl ? (
              <a
                href={templateUrl}
                target="_blank"
                rel="noreferrer"
                className={`flex h-9 items-center justify-center gap-2 rounded-xl text-xs font-semibold ${BRAND_SOFT} ${BRAND_INK}`}
              >
                Download
                <Download className="h-3 w-3" />
              </a>
            ) : null}
            <label
              className={`flex h-9 cursor-pointer items-center justify-center gap-2 rounded-xl bg-gray-100 text-xs font-semibold ${BRAND_INK}`}
            >
              <input
                type="file"
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                onChange={(event) => void handleUpload(event.target.files?.[0])}
              />
              {uploading ? 'Uploading...' : uploaded || done ? 'Uploaded' : 'Upload Document'}
              {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
            </label>
          </div>
          {uploadedFile ? (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-green-50 px-3 py-2 text-[10px] text-green-800">
              <span className="min-w-0 truncate font-medium">{uploadedFile.fileName}</span>
              <a
                href={uploadedFile.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 font-bold underline"
              >
                Open
              </a>
            </div>
          ) : null}
        </>
      ) : (
        <button
          type="button"
          onClick={handleAcknowledge}
          className={`rounded-xl bg-gray-100 px-4 py-2 text-xs font-bold ${BRAND_INK}`}
        >
          {uploaded || done ? 'Details added' : 'Add Details'}
        </button>
      )}
      {error ? <p className="text-[10px] text-red-600">{error}</p> : null}
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
  applicationAmount,
}: {
  kind: ProductKind
  application?: StorefrontApplication | null
  providerName: string
  withTerms: boolean
  accepted: boolean
  onToggleAccepted: () => void
  applicationAmount?: number | null
}) {
  const account = getApplicationAccount(application)
  const productName = application?.productName || `${prettyKind(kind)} application`
  const resolvedAmount = applicationAmount ?? application?.amount
  const amount = formatCurrency(resolvedAmount, application?.currency || 'NGN')
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
  const [sheet, setSheet] = useState<
    'create_account' | 'guarantor_form' | 'guarantor_generating' | 'guarantor_success' | 'guarantor_added' | 'success' | null
  >(null)
  const [guarantorSubmitError, setGuarantorSubmitError] = useState<string | null>(null)
  const [lastAddedGuarantor, setLastAddedGuarantor] = useState<Guarantor | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submittedApplicationId, setSubmittedApplicationId] = useState<string | null>(null)
  const [creatingAccount, setCreatingAccount] = useState(false)
  const [createAccountError, setCreateAccountError] = useState<string | null>(null)
  const [createAccountTermsAccepted, setCreateAccountTermsAccepted] = useState(false)
  const [createAccountPrivacyAccepted, setCreateAccountPrivacyAccepted] = useState(false)
  const [draftHydrated, setDraftHydrated] = useState(false)
  const [draftNotice, setDraftNotice] = useState<string | null>(null)
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
  const { displayName: tenantDisplayName, tenantSubdomain } = useMobileV2Tenant()
  const [applicationAmount, setApplicationAmount] = useState('')
  const [applicationRevision, setApplicationRevision] = useState(0)
  const productName = prettyKind(kind)
  const initializedApplication = useMemo(() => {
    void applicationRevision
    return readInitializedApplication()
  }, [applicationRevision])
  const providerName = applicationProvider(initializedApplication, tenantDisplayName, tenantSubdomain)
  const productId = sanitizeProductId(productIdProp || searchParams.get('productId') || initializedApplication?.productId || '')
  const applicationId = searchParams.get('applicationId') || initializedApplication?.id || initializedApplication?._id || ''
  const currentDraftKey = draftStorageKey(kind, productId, applicationId)
  const userId = initializedApplication?.userId || ''
  const requirements = initializedApplication?.requirementsSnapshot
  const documentsToDownload = requirements?.documentsToDownload ?? []
  const otherRequirements = requirements?.otherRequirements ?? []
  const requiresGuarantor = requirements?.security?.guarantor === true
  const applicationProgress = initializedApplication?.applicationProgress
  const applicationProgressKey = applicationProgress ? JSON.stringify(applicationProgress) : ''
  const { product: catalogProduct } = useMobileProductDetail({
    productId,
    enabled: Boolean(productId),
  })
  const parsedApplicationAmount = parseApplicationAmount(applicationAmount)
  const amountValidationError =
    parsedApplicationAmount != null
      ? validateApplicationAmount(
          parsedApplicationAmount,
          catalogProduct?.amountMin,
          catalogProduct?.amountMax,
        )
      : applicationAmount.trim()
        ? 'Enter a valid application amount.'
        : null

  const goBackHref = kind === 'loan' ? '/mobile-v2/products/loan' : '/mobile-v2/products/mortgage'
  const successContinueHref =
    kind === 'mortgage' && submittedApplicationId
      ? mortgagePendingDetailHref(submittedApplicationId)
      : kind === 'mortgage'
        ? '/mobile-v2/products/mortgage/pending'
        : goBackHref
  const activeIndex = steps.indexOf(activeStep)

  const buildRequirementDrafts = (employment: EmploymentDraft, submissions: RequirementSubmission[]) => {
    const drafts = submissions.filter((submission) => submission.type !== 'document' && !isEmploymentSubmission(submission))
    return [...drafts, employmentSubmissionFromDraft(employment)]
  }

  const buildUploadedDrafts = (submissions: RequirementSubmission[]) =>
    submissions.filter((submission) => submission.type === 'document')

  const hydrateProgress = (progress: ApplicationProgress) => {
    const requirementDrafts = Array.isArray(progress.requirementDrafts) ? progress.requirementDrafts : []
    const uploadedDrafts = Array.isArray(progress.uploadedDrafts) ? progress.uploadedDrafts : []
    const employmentSubmission = requirementDrafts.find(isEmploymentSubmission)

    setActiveStep(steps.includes(stepForProgressTab(progress.currentTab)) ? stepForProgressTab(progress.currentTab) : 'requirement')
    setRequirementSubmissions([
      ...requirementDrafts.filter((submission) => !isEmploymentSubmission(submission)),
      ...uploadedDrafts,
    ])
    if (employmentSubmission) {
      setEmploymentDraft(employmentDraftFromSubmission(employmentSubmission))
    }
  }

  useEffect(() => {
    if (draftHydrated) return
    if (applicationProgress) {
      hydrateProgress(applicationProgress)
      setDraftNotice(applicationProgress.lastSavedAt ? 'Saved progress restored.' : null)
    } else {
      const draft = readApplicationDraft(currentDraftKey)
      if (draft) {
        setActiveStep(steps.includes(draft.activeStep) ? draft.activeStep : 'requirement')
        setAccepted(Boolean(draft.accepted))
        setApplicationAmount(draft.applicationAmount || '')
        setRequirementSubmissions(Array.isArray(draft.requirementSubmissions) ? draft.requirementSubmissions : [])
        setGuarantors(Array.isArray(draft.guarantors) ? draft.guarantors : [])
        setEmploymentDraft({
          occupation: draft.employmentDraft?.occupation || '',
          placeOfWork: draft.employmentDraft?.placeOfWork || '',
          hrName: draft.employmentDraft?.hrName || '',
          hrEmail: draft.employmentDraft?.hrEmail || '',
        })
        setGuarantorDraft({
          name: draft.guarantorDraft?.name || '',
          phone: draft.guarantorDraft?.phone || '',
          email: draft.guarantorDraft?.email || '',
          verificationUrl: draft.guarantorDraft?.verificationUrl,
        })
        setDraftNotice('Saved progress restored.')
      }
    }
    setDraftHydrated(true)
  }, [draftHydrated, currentDraftKey, steps, applicationProgressKey])

  const persistDraft = async (notice: string | null = 'Progress saved.') => {
    saveApplicationDraft(currentDraftKey, {
      activeStep,
      accepted,
      applicationAmount,
      requirementSubmissions,
      guarantors,
      employmentDraft,
      guarantorDraft,
    })

    if (applicationId && userId) {
      const result = await saveApplicationProgress({
        applicationId,
        userId,
        currentTab: progressTabForStep(activeStep),
        requirementDrafts: buildRequirementDrafts(employmentDraft, requirementSubmissions),
        uploadedDrafts: buildUploadedDrafts(requirementSubmissions),
      })
      if (!result.ok) {
        if (notice) setDraftNotice('Progress saved locally. We could not sync it yet.')
        return
      }
    }

    if (notice) setDraftNotice(notice)
  }

  useEffect(() => {
    if (!draftHydrated || !currentDraftKey) return
    const timer = window.setTimeout(() => {
      void persistDraft(null)
    }, 800)
    return () => window.clearTimeout(timer)
  }, [draftHydrated, currentDraftKey, activeStep, accepted, applicationAmount, requirementSubmissions, guarantors, employmentDraft, guarantorDraft])

  const handleStepChange = (step: StepId) => {
    void persistDraft(null)
    setActiveStep(step)
  }

  const upsertSubmission = (submission: RequirementSubmission) => {
    const key = submission.requirementId || submission.requirementType || submission.label
    setRequirementSubmissions((current) => {
      const filtered = current.filter((item) => (item.requirementId || item.requirementType || item.label) !== key)
      return [...filtered, submission]
    })
  }

  const syncApplicationAmount = async (): Promise<boolean> => {
    if (!productId) {
      setError('No product selected.')
      return false
    }

    const parsed = parseApplicationAmount(applicationAmount)
    if (!parsed) {
      setError('Enter the amount you want to apply for.')
      return false
    }

    const validationError = validateApplicationAmount(
      parsed,
      catalogProduct?.amountMin,
      catalogProduct?.amountMax,
    )
    if (validationError) {
      setError(validationError)
      return false
    }

    if (initializedApplication?.amount === parsed && applicationId) {
      return true
    }

    const result = await initializeProductApplication(productId, {
      productType: kind === 'loan' ? 'LOAN' : 'MORTGAGE',
      amount: parsed,
    })
    if (!result.ok) {
      setError(result.error || 'Could not save your application amount.')
      return false
    }

    setApplicationRevision((value) => value + 1)
    return true
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

    const parsed = parseApplicationAmount(applicationAmount)
    if (!parsed) {
      setError('Enter the amount you want to apply for.')
      setActiveStep('requirement')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const submissions: RequirementSubmission[] = [
        ...buildRequirementDrafts(employmentDraft, requirementSubmissions),
        ...buildUploadedDrafts(requirementSubmissions),
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
                total: parsed,
              },
            }
          : {}),
      })

      if (!submitResult.ok) {
        setError(submitResult.error)
        return
      }

      const resolvedApplicationId = String(
        submitResult.application?.id ?? submitResult.application?._id ?? applicationId,
      )

      if (kind === 'mortgage' && resolvedApplicationId) {
        const methodKey = `mortgage_down_payment_method_${productId}`
        const storedMethod = typeof window !== 'undefined' ? sessionStorage.getItem(methodKey) : null
        const downPaymentMethod: MortgageDownPaymentMethod | undefined =
          storedMethod === 'savings_plan' || storedMethod === 'equity_contribution'
            ? storedMethod
            : 'equity_contribution'
        initMortgageWorkflowSubmitted(resolvedApplicationId, productId, downPaymentMethod)
        setSubmittedApplicationId(resolvedApplicationId)
      }

      clearApplicationDraft(currentDraftKey)
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
    if (activeStep === 'requirement') {
      void (async () => {
        setError(null)
        const synced = await syncApplicationAmount()
        if (!synced) return
        void persistDraft(null)
        setActiveStep(steps[Math.min(activeIndex + 1, steps.length - 1)])
      })()
      return
    }
    void persistDraft(null)
    setActiveStep(steps[Math.min(activeIndex + 1, steps.length - 1)])
  }

  const closeCreateAccountSheet = () => {
    setCreateAccountTermsAccepted(false)
    setCreateAccountPrivacyAccepted(false)
    setCreateAccountError(null)
    setSheet(null)
  }

  const handleGenerateGuarantorKyc = async () => {
    if (!applicationId || !userId) {
      setError('Application was not initialized. Please go back and create the account again.')
      setSheet(null)
      return
    }

    const fullName = guarantorDraft.name.trim()
    const email = guarantorDraft.email.trim()
    const phone = guarantorDraft.phone.trim()

    if (!fullName || !email || !phone) {
      setGuarantorSubmitError('Please enter the guarantor full name, email, and phone.')
      return
    }

    setGuarantorSubmitError(null)
    setSheet('guarantor_generating')
    const generatingStartedAt = Date.now()

    try {
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
        setGuarantorSubmitError(result.error)
        setSheet('guarantor_form')
        return
      }

      const addedGuarantor: Guarantor = {
        name: result.data?.guarantor?.fullName || fullName,
        phone: result.data?.guarantor?.phone || phone,
        email: result.data?.guarantor?.email || email,
        verificationUrl: result.data?.guarantor?.kyc?.verificationUrl,
      }

      setGuarantors([addedGuarantor])
      setLastAddedGuarantor(addedGuarantor)

      const minimumGeneratingMs = 1200
      const elapsed = Date.now() - generatingStartedAt
      if (elapsed < minimumGeneratingMs) {
        await new Promise((resolve) => window.setTimeout(resolve, minimumGeneratingMs - elapsed))
      }

      setSheet('guarantor_success')
    } catch {
      setGuarantorSubmitError('Could not generate the KYC link. Please try again.')
      setSheet('guarantor_form')
    }
  }

  const closeGuarantorSuccess = () => {
    setSheet(null)
    setGuarantorSubmitError(null)
    setGuarantorDraft({ name: '', phone: '', email: '' })
  }

  const handleCreateAccount = async () => {
    if (!productId) {
      setCreateAccountError(`No ${productName.toLowerCase()} product selected.`)
      return
    }

    if (!createAccountTermsAccepted || !createAccountPrivacyAccepted) {
      setCreateAccountError('Please accept the terms and privacy policy to continue.')
      return
    }

    const parsed = parseApplicationAmount(applicationAmount)
    if (!parsed) {
      setCreateAccountError('Enter the amount you want to apply for.')
      return
    }

    const validationError = validateApplicationAmount(
      parsed,
      catalogProduct?.amountMin,
      catalogProduct?.amountMax,
    )
    if (validationError) {
      setCreateAccountError(validationError)
      return
    }

    setCreatingAccount(true)
    setCreateAccountError(null)
    try {
      const result = await initializeProductApplication(productId, {
        productType: kind === 'loan' ? 'LOAN' : 'MORTGAGE',
        amount: parsed,
      })
      if (!result.ok) {
        setCreateAccountError(result.error || `Could not create your ${productName.toLowerCase()} account.`)
        return
      }
      setApplicationRevision((value) => value + 1)
      setActiveStep('requirement')
      setSheet(null)
    } finally {
      setCreatingAccount(false)
    }
  }

  return (
    <div className="relative flex h-full flex-col bg-white">
      <div className="flex-1 overflow-y-auto px-5 pb-28 pt-12 no-scrollbar">
        <div className="mb-8 flex items-center justify-between">
          <Link
            href={goBackHref}
            onClick={() => void persistDraft(null)}
            className="flex h-9 w-9 items-center justify-center rounded-full"
          >
            <ChevronLeft className="h-5 w-5 text-gray-700" />
          </Link>
          <h1 className={`text-base font-bold ${BRAND_INK}`}>Apply</h1>
          <Filter className="h-4 w-4 text-gray-700" />
        </div>

        <ProgressTabs
          steps={steps}
          active={activeStep}
          onChange={handleStepChange}
          productLabel={productName}
        />

        <div className="pt-8">
          {activeStep === 'requirement' && (
            <div className="space-y-6">
              <SectionTitle>{kind === 'loan' ? 'Loan amount' : 'Mortgage amount'}</SectionTitle>
              <div className="space-y-2">
                <InputPill
                  placeholder={kind === 'loan' ? 'Amount to borrow' : 'Amount to apply for'}
                  value={applicationAmount}
                  onChange={(value) => setApplicationAmount(value)}
                  type="number"
                  inputMode="numeric"
                />
                <p className="text-[11px] text-gray-500">
                  {formatApplicationAmountHint(catalogProduct?.amountMin, catalogProduct?.amountMax)}
                </p>
                {amountValidationError ? (
                  <p className="text-xs text-red-600">{amountValidationError}</p>
                ) : null}
              </div>

              <SectionTitle>Occupation</SectionTitle>
              <div className="space-y-3">
                <InputPill
                  placeholder="Occupation"
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
                  onClick={() => {
                    setGuarantorSubmitError(null)
                    setSheet(guarantors.length > 0 ? 'guarantor_added' : 'guarantor_form')
                  }}
                  className={`inline-flex items-center gap-1 rounded-xl bg-gray-100 px-3 py-2 text-sm font-bold ${BRAND_INK}`}
                >
                  <Plus className="h-3 w-3" /> Add a Guarantor
                </button>
              </div>
              ) : null}

              <div className="space-y-4">
                <SectionTitle>Collateral</SectionTitle>
                {otherRequirements.length > 0 ? (
                  otherRequirements.map((requirement, index) => {
                    const requirementKey = collateralRequirementKey(requirement)
                    const submission = requirementSubmissions.find(
                      (item) =>
                        (item.requirementId || item.requirementType || item.label) === requirementKey,
                    )
                    const isDone = Boolean(submission)
                    return (
                      <CollateralRequirementRow
                        key={requirementKey || index}
                        requirement={requirement}
                        userId={userId}
                        onUploaded={upsertSubmission}
                        done={isDone}
                        submission={submission}
                      />
                    )
                  })
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
                documentsToDownload.map((document, index) => {
                  const documentName = document.name || `Document ${index + 1}`
                  const submission = requirementSubmissions.find(
                    (item) => (item.requirementType || item.label) === documentName,
                  )
                  return (
                    <FileActionRow
                      key={document.name || index}
                      name={documentName}
                      fileUrl={document.fileUrl}
                      userId={userId}
                      onUploaded={upsertSubmission}
                      done={Boolean(submission)}
                      submission={submission}
                    />
                  )
                })
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
              applicationAmount={parsedApplicationAmount}
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
              applicationAmount={parsedApplicationAmount}
            />
          )}
        </div>
      </div>

      <div className="absolute bottom-6 left-5 right-5 bg-white mt-5 items-center">
        {error ? <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p> : null}
        {/* {draftNotice ? <p className="mb-3 rounded-xl bg-green-50 px-3 py-2 text-xs text-green-700">{draftNotice}</p> : null} */}
        <div className="flex flex-row justify-between gap-3 w-full items-center align-middle">
        <Button
          type="button"
          className={cn(` h-10 w-1/2 rounded-full border border-[var(--sf-button,#1E40AF)] text-xs font-bold `, OUTLINE)}
          onClick={() => void persistDraft()}
        >
          Save progress
        </Button>
        <Button
          type="button"
          disabled={
            (activeStep === 'requirement' && (!parsedApplicationAmount || Boolean(amountValidationError))) ||
            (activeStep === 'product' && !accepted) ||
            submitting
          }
          className={cn('h-10 rounded-full w-1/2 text-sm font-semibold disabled:opacity-50', PRIMARY)}
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
      </div>

      {sheet === 'create_account' && (
        <BottomSheet onClose={closeCreateAccountSheet}>
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
              {[
                {
                  checked: createAccountTermsAccepted,
                  onClick: () => setCreateAccountTermsAccepted((value) => !value),
                  label: `Accept Terms & Condition, Data Sharing with ${providerName}`,
                },
                {
                  checked: createAccountPrivacyAccepted,
                  onClick: () => setCreateAccountPrivacyAccepted((value) => !value),
                  label: 'Accept Data Privacy & Use of Data',
                },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.onClick}
                  className="flex items-center gap-2"
                >
                  <span
                    className={cn(
                      'flex h-4 w-4 items-center justify-center rounded-full border',
                      item.checked
                        ? 'border-[var(--sf-button,#1E40AF)] bg-[var(--sf-button,#1E40AF)] text-white'
                        : 'border-gray-400 bg-white',
                    )}
                  >
                    {item.checked ? <Check className="h-3 w-3" /> : null}
                  </span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
            {createAccountError ? (
              <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-center text-xs text-red-600">
                {createAccountError}
              </p>
            ) : null}
            <Button
              type="button"
              disabled={
                creatingAccount ||
                !createAccountTermsAccepted ||
                !createAccountPrivacyAccepted ||
                !parsedApplicationAmount ||
                Boolean(amountValidationError)
              }
              className={cn('mt-8 h-12 w-full rounded-full font-semibold disabled:opacity-50', PRIMARY)}
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
            <button type="button" className={`mt-5 text-sm font-medium ${BRAND_INK}`} onClick={closeCreateAccountSheet}>
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
            <InputPill placeholder="Occupation" />
            <InputPill placeholder="Relationship with Guarantor" right={<ChevronDown className="h-4 w-4 text-gray-400" />} />
          </div>
          {guarantorSubmitError ? (
            <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-center text-xs text-red-600">{guarantorSubmitError}</p>
          ) : null}
          <Button
            type="button"
            className={cn('mt-6 h-12 w-full rounded-full font-semibold', PRIMARY)}
            onClick={() => void handleGenerateGuarantorKyc()}
          >
            Generate KYC link for Guarantor 1
          </Button>
          <button type="button" className={`mt-5 w-full text-center text-sm font-medium ${BRAND_INK}`} onClick={() => setSheet(null)}>
            No. Go back
          </button>
        </BottomSheet>
      )}

      {sheet === 'guarantor_generating' && (
        <BottomSheet onClose={() => undefined}>
          <div className="flex flex-col items-center py-6 text-center">
            <div className={`mb-6 flex h-20 w-20 items-center justify-center rounded-full ${BRAND_SOFT}`}>
              <Loader2 className="h-10 w-10 animate-spin text-[var(--sf-button,#1E40AF)]" />
            </div>
            <h2 className={`text-xl font-bold ${BRAND_INK}`}>Generating KYC link</h2>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-gray-500">
              Please wait while we generate a secure KYC verification link for your guarantor.
            </p>
          </div>
        </BottomSheet>
      )}

      {sheet === 'guarantor_success' && (
        <BottomSheet onClose={closeGuarantorSuccess}>
          <div className="flex flex-col items-center py-4 text-center">
            <div className={`mb-6 flex h-20 w-20 items-center justify-center rounded-full ${BRAND_SOFT}`}>
              <CheckCircle className="h-10 w-10 text-[var(--sf-button,#1E40AF)]" />
            </div>
            <h2 className={`text-xl font-bold ${BRAND_INK}`}>KYC link generated</h2>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-gray-500">
              The KYC verification link for{' '}
              <strong>{lastAddedGuarantor?.name || 'your guarantor'}</strong> has been generated successfully.
            </p>
            <p className={`mx-auto mt-4 max-w-xs rounded-xl p-4 text-xs leading-relaxed ${BRAND_SOFT} ${BRAND_INK}`}>
              An email has been sent to <strong>{lastAddedGuarantor?.email || 'the guarantor'}</strong> with
              instructions to complete their KYC verification.
            </p>
            {lastAddedGuarantor?.verificationUrl ? (
              <button
                type="button"
                onClick={() => void navigator.clipboard?.writeText(lastAddedGuarantor.verificationUrl || '')}
                className={`mt-5 inline-flex items-center gap-1 text-xs font-bold ${BRAND_INK}`}
              >
                <Copy className="h-3 w-3" />
                Copy KYC URL
              </button>
            ) : null}
            <Button
              type="button"
              className={cn('mt-8 h-12 w-full rounded-full font-semibold', PRIMARY)}
              onClick={closeGuarantorSuccess}
            >
              Back to application
            </Button>
          </div>
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
          <button
            type="button"
            className={`mt-5 text-sm font-bold ${BRAND_INK}`}
            onClick={() => {
              setGuarantorSubmitError(null)
              setGuarantorDraft({ name: '', phone: '', email: '' })
              setSheet('guarantor_form')
            }}
          >
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
            {kind === 'mortgage' ? (
              <p className="mt-2 text-xs text-gray-400">
                Track progress and next steps in Pending Mortgage.
              </p>
            ) : null}
            <Link href={successContinueHref} className="mt-8 w-full">
              <Button className={cn('h-12 w-full rounded-full font-semibold', PRIMARY)}>Continue</Button>
            </Link>
          </div>
        </BottomSheet>
      )}
    </div>
  )
}
