'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Calendar, ChevronLeft, Filter, Percent, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  fetchUserApplications,
  readInitializedApplication,
  type StorefrontApplication,
} from '@/lib/storefrontApplicationClient'
import { loanPendingDetailHref } from '@/lib/loanApplyRoutes'

type DetailKind = 'loan' | 'mortgage'
type DetailTab = 'history' | 'schedule' | 'property' | 'product'
type MortgageProductTab = 'mortgage' | 'property'

const ACCOUNT_LOGO_SRC = '/images/mobile/WhatsApp%20Image%202026-05-20%20at%201.34.41%20PM.jpeg'
const BRAND_INK = 'text-[var(--sf-ink,#1E293B)]'
const BRAND_SOFT = 'bg-[color-mix(in_srgb,var(--sf-button,#1E40AF)_10%,white)]'
const MORTGAGE_FACILITIES: Array<[string, boolean]> = [
  ['Solar energy system', true],
  ['Reliable water supply', true],
  ['Gated estate', true],
  ['24/7 security', true],
  ['CCTV surveillance', true],
  ['Estate park / playground', true],
  ['Estate gym', true],
  ['Outdoor pool', true],
  ['Car garage 5 Cars', true],
  ['Estate Waste management', true],
  ['Boys quarter', true],
  ['Gateman quarter', true],
  ['Indoor Cinema', true],
]

type ApplicationHistoryRow = {
  id: string
  name: string
  amount: string
  status: string
  date: string
  color: string
}

type ProductDetailsScreenProps = {
  kind: DetailKind
  productId: string
  initialTab?: DetailTab
  detailsOnly?: boolean
  title: string
  amount: string
  description: string
  duration: string
  rate: string
  provider: string
  imageUrl: string
  applyHref: string
  backHref: string
  primaryActionLabel?: string
  primaryActionHref?: string
  detailRows?: Array<{ label: string; value: React.ReactNode }>
  propertyRows?: Array<{ label: string; value: React.ReactNode }>
}

function NairaAmount({ children }: { children: React.ReactNode }) {
  return <span className={`font-bold ${BRAND_INK}`}>{children}</span>
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={`max-w-[55%] text-right font-semibold ${BRAND_INK}`}>{value}</span>
    </div>
  )
}

function formatCurrency(amount?: number | null, currency = 'NGN') {
  if (amount == null || Number.isNaN(amount)) return `${currency}—`
  return `${currency}${amount.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatDate(value?: string) {
  if (!value) return 'Date unavailable'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return 'Date unavailable'
  return d.toLocaleDateString('en-NG', { month: 'short', day: '2-digit', year: 'numeric' })
}

function statusColor(status: string) {
  const s = status.toLowerCase()
  if (['approved', 'active', 'successful', 'disbursed'].some((x) => s.includes(x))) return 'text-green-500'
  if (['rejected', 'failed', 'unsuccessful'].some((x) => s.includes(x))) return 'text-red-400'
  return 'text-amber-500'
}

function getApplicationId(application: StorefrontApplication) {
  return String(application.id ?? application._id ?? '').trim()
}

function getApplicationAccount(application?: StorefrontApplication | null) {
  return application?.productWallet?.upstreamAccount ?? application?.account ?? null
}

function AccountSummaryCard({
  kind,
  provider,
  title,
  imageUrl,
  application,
}: {
  kind: DetailKind
  provider: string
  title: string
  imageUrl: string
  application?: StorefrontApplication | null
}) {
  const account = getApplicationAccount(application)
  const accountLabel = account?.accountNumber
    ? `${account.bankName || provider} · ${account.accountNumber}`
    : `${title} account`
  const balance = account?.balance ?? application?.amount
  const currency = account?.currency || application?.currency || 'NGN'
  const status = account?.status || application?.status || 'Not initialized'

  return (
    <div className={`rounded-2xl p-4 shadow-sm ${BRAND_SOFT}`}>
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 h-5 w-[86px] overflow-hidden rounded bg-white/80">
            <Image
              src={ACCOUNT_LOGO_SRC}
              alt={provider}
              width={86}
              height={28}
              className="h-full w-full object-contain"
            />
          </div>
          <p className={`text-xs font-medium ${BRAND_INK}`}>{accountLabel}</p>
          <p className={`mt-1 text-xl font-bold ${BRAND_INK}`}>{formatCurrency(balance, currency)}</p>
          <p className="text-[10px] text-gray-500">{status} · {currency}</p>
        </div>

        <div
          className="h-16 w-20 rounded-xl bg-cover bg-center"
          style={{
            backgroundImage: `url(${imageUrl})`,
          }}
        />
      </div>
      <div className="flex items-end gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-300">
          <div className={cn('h-full rounded-full bg-[var(--sf-button,#1E40AF)]', application ? 'w-2/3' : 'w-0')} />
        </div>
        <span className="text-[8px] font-semibold text-gray-400">
          {application ? 'Application in progress' : `No ${kind} application yet`}
        </span>
      </div>
    </div>
  )
}

function SearchBox({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="mb-4 flex h-11 items-center gap-2 rounded-2xl bg-gray-50 px-4">
      <Search className="h-4 w-4 text-gray-300" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search transactions"
        className={`h-full min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-gray-400 ${BRAND_INK}`}
      />
    </div>
  )
}

function HistoryList({
  rows,
  loading,
  error,
  searchTerm,
  onSearchTermChange,
  onRowClick,
}: {
  rows: ApplicationHistoryRow[]
  loading: boolean
  error: string | null
  searchTerm: string
  onSearchTermChange: (value: string) => void
  onRowClick?: (row: ApplicationHistoryRow) => void
}) {
  const normalizedSearch = searchTerm.trim().toLowerCase()
  const filteredRows = normalizedSearch
    ? rows.filter(({ name, amount, status }) =>
        [name, amount, status].some((value) => value.toLowerCase().includes(normalizedSearch)),
      )
    : rows

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <SearchBox value={searchTerm} onChange={onSearchTermChange} />
      <div className="divide-y divide-gray-100">
        {loading ? (
          <p className="py-6 text-center text-xs text-gray-500">Loading applications...</p>
        ) : error ? (
          <p className="rounded-xl bg-amber-50 px-3 py-3 text-xs text-amber-800">{error}</p>
        ) : filteredRows.length === 0 ? (
          <p className="py-6 text-center text-xs text-gray-500">
            No application history yet. Submitted applications will appear here.
          </p>
        ) : filteredRows.map(({ id, name, amount, status, color, date }) => (
          <button
            key={id}
            type="button"
            onClick={() => onRowClick?.({ id, name, amount, status, color, date })}
            className={cn(
              'flex w-full items-start justify-between py-3 text-left',
              onRowClick && 'cursor-pointer rounded-xl px-1 transition hover:bg-gray-50',
            )}
          >
            <div>
              <p className={`text-sm font-semibold ${BRAND_INK}`}>{name}</p>
              <p className={cn('mt-1 text-[10px]', color)}>{status}</p>
            </div>
            <div className="text-right">
              <p className={`text-xs font-bold ${BRAND_INK}`}>{amount}</p>
              <p className="mt-1 text-[9px] text-gray-400">{date}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function ScheduleList({
  searchTerm,
  onSearchTermChange,
}: {
  searchTerm: string
  onSearchTermChange: (value: string) => void
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <SearchBox value={searchTerm} onChange={onSearchTermChange} />
      <p className="py-6 text-center text-xs text-gray-500">
        No repayment schedule is available yet. It will appear after the provider creates a schedule for this application.
      </p>
    </div>
  )
}

function ProductPanel({
  kind,
  title,
  amount,
  description,
  duration,
  rate,
  provider,
  imageUrl,
  applyHref,
  primaryActionLabel,
  primaryActionHref,
  detailRows,
  propertyRows,
}: ProductDetailsScreenProps) {
  const actionHref = primaryActionHref ?? applyHref
  const actionLabel = primaryActionLabel ?? 'Apply'
  const [mortgageProductTab, setMortgageProductTab] = useState<MortgageProductTab>('mortgage')
  const showMortgageTabs = kind === 'mortgage'

  return (
    <div className="space-y-5">
      {showMortgageTabs ? (
        <div className="grid grid-cols-2 rounded-full bg-white p-1 text-xs font-semibold shadow-sm">
          {[
            ['mortgage', 'Mortgage Details'],
            ['property', 'Property Details'],
          ].map(([tab, label]) => (
            <button
              key={tab}
              type="button"
              onClick={() => setMortgageProductTab(tab as MortgageProductTab)}
              className={cn(
                'rounded-full px-3 py-2 transition',
                mortgageProductTab === tab
                  ? 'bg-[var(--sf-button,#1E40AF)] text-white'
                  : 'text-gray-500',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {mortgageProductTab === 'property' && kind === 'mortgage' ? (
        <div className="space-y-5">
          <div
            className="h-[170px] rounded-2xl bg-gray-200 bg-cover bg-center"
            style={{ backgroundImage: `url(${imageUrl})` }}
          />
          <div>
            <h2 className={`mb-4 text-sm font-bold uppercase tracking-wide ${BRAND_INK}`}>
              Facility Details
            </h2>
            <div className="grid grid-cols-1 gap-3">
              {(propertyRows?.length
                ? propertyRows.map((row) => [row.label, row.value] as const)
                : MORTGAGE_FACILITIES.map(([facility, available]) => [
                    facility,
                    available ? 'Yes' : 'No',
                  ] as const)
              ).map(([facility, value]) => (
                <div
                  key={facility}
                  className={`flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-medium shadow-sm ${BRAND_INK}`}
                >
                  <span>{facility}</span>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase',
                      String(value).toLowerCase() === 'yes'
                        ? 'bg-green-50 text-green-600'
                        : String(value).toLowerCase() === 'no'
                          ? 'bg-red-50 text-red-500'
                          : 'bg-gray-50 text-gray-600',
                    )}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {kind === 'loan' ? (
            <>
              <div
                className="h-[170px] rounded-2xl bg-gray-200 bg-cover bg-center"
                style={{ backgroundImage: `url(${imageUrl})` }}
              />
              <div className="flex justify-center gap-1.5">
                <span className="h-1.5 w-5 rounded-full bg-gray-600" />
                <span className="h-1.5 w-2 rounded-full bg-gray-400" />
                <span className="h-1.5 w-2 rounded-full bg-gray-400" />
              </div>
            </>
          ) : null}

          <div className="flex items-start justify-between gap-3">
            <h2 className={`text-sm font-medium ${BRAND_INK}`}>{title}</h2>
            <NairaAmount>{amount}</NairaAmount>
          </div>
          <p className="text-[11px] leading-relaxed text-gray-500">{description}</p>
          <div className="flex gap-6 text-xs font-semibold text-gray-600">
            <span className="inline-flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-gray-400" />
              {duration}
            </span>
            <span className="inline-flex items-center gap-2">
              <Percent className="h-3.5 w-3.5 text-gray-400" />
              {rate}
            </span>
          </div>

          <div className="space-y-5 pt-3">
            {detailRows?.length ? (
              detailRows.map((row) => (
                <InfoRow key={row.label} label={row.label} value={row.value} />
              ))
            ) : kind === 'mortgage' ? (
              <>
                <InfoRow label="Property type" value="Residential" />
                <InfoRow label="Mortgage type" value="Fixed Rate" />
                <InfoRow label="Loan Tenure" value="7years" />
                <InfoRow label="Down payment" value="10%" />
                <InfoRow label="Fees & charges" value="Nil" />
                <InfoRow label="Interest Rate" value={rate} />
                <InfoRow label="Powered by:" value={provider} />
              </>
            ) : (
              <>
                <InfoRow label="Loan type" value={title} />
                <InfoRow label="Maximum amount" value={amount} />
                <InfoRow label="Loan Tenure" value={duration} />
                <InfoRow label="Collateral" value="Required where applicable" />
                <InfoRow label="Fees & charges" value="Nil" />
                <InfoRow label="Interest Rate" value={rate} />
                <InfoRow label="Powered by:" value={provider} />
              </>
            )}
          </div>
        </>
      )}

      <Link href={actionHref} className="block pt-2">
        <Button className="h-12 w-full rounded-full bg-[var(--sf-button,#1E40AF)] text-sm font-semibold text-white hover:bg-[var(--sf-button-hover,#1e3a8a)]">
          {actionLabel}
        </Button>
      </Link>
    </div>
  )
}

export function ProductDetailsScreen(props: ProductDetailsScreenProps) {
  const { kind, backHref, productId, provider, imageUrl, title, initialTab = 'history', detailsOnly = false } = props
  const router = useRouter()
  const tabs = kind === 'mortgage'
    ? (['history', 'schedule', 'property', 'product'] as DetailTab[])
    : (['history', 'schedule', 'product'] as DetailTab[])
  const resolvedInitialTab = tabs.includes(initialTab) ? initialTab : 'history'
  const [activeTab, setActiveTab] = useState<DetailTab>(resolvedInitialTab)
  const [searchTerm, setSearchTerm] = useState('')
  const [applications, setApplications] = useState<StorefrontApplication[]>([])
  const [applicationsLoading, setApplicationsLoading] = useState(false)
  const [applicationsError, setApplicationsError] = useState<string | null>(null)

  useEffect(() => {
    setActiveTab(resolvedInitialTab)
    setSearchTerm('')
  }, [kind, productId, resolvedInitialTab])

  useEffect(() => {
    if (detailsOnly) return
    let cancelled = false
    setApplicationsLoading(true)
    setApplicationsError(null)

    fetchUserApplications()
      .then((result) => {
        if (cancelled) return
        if (result.ok) {
          setApplications(result.applications)
        } else {
          setApplications([])
          setApplicationsError(result.error)
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setApplications([])
        setApplicationsError(error instanceof Error ? error.message : 'Failed to load applications')
      })
      .finally(() => {
        if (!cancelled) setApplicationsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [detailsOnly, productId])

  const labels: Record<DetailTab, string> = {
    history: 'History',
    schedule: 'Schedule',
    property: 'Property',
    product:  'Details'
  }

  const initializedApplication = readInitializedApplication()
  const matchingApplications = applications.filter((application) => {
    const applicationProductId = String(application.productId ?? '').trim()
    if (applicationProductId === productId) return true
    const productType = String(application.productType ?? '').toLowerCase()
    return !applicationProductId && productType.includes(kind)
  })
  const latestApplication =
    matchingApplications[0] ||
    (initializedApplication?.productId === productId ? initializedApplication : null)
  const historyRows: ApplicationHistoryRow[] = matchingApplications.map((application, index) => {
    const status = String(application.status ?? 'Pending')
    return {
      id: getApplicationId(application) || `${application.productId || productId}-${index}`,
      name: application.productName || `${kind === 'mortgage' ? 'Mortgage' : 'Loan'} application`,
      amount: formatCurrency(application.amount, application.currency || 'NGN'),
      status,
      color: statusColor(status),
      date: formatDate(application.createdAt || application.updatedAt),
    }
  })

  return (
    <div className="relative flex h-full flex-col bg-[color-mix(in_srgb,var(--sf-button,#1E40AF)_6%,white)]">
      <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-10 pt-10">
        <div className="mb-6 flex items-center justify-between">
          <Link href={backHref} className="flex h-9 w-9 items-center justify-center rounded-full">
            <ChevronLeft className="h-5 w-5 text-gray-700" />
          </Link>
          <h1 className={`text-base font-bold ${BRAND_INK}`}>
            {kind === 'mortgage' ? 'Mortgage Details' : 'Loan Details'}
          </h1>
          <Filter className="h-4 w-4 text-gray-700" />
        </div>

        {detailsOnly ? (
          <ProductPanel {...props} />
        ) : (
          <>
            <AccountSummaryCard
              kind={kind}
              provider={provider}
              title={title}
              imageUrl={imageUrl}
              application={latestApplication}
            />

            <div className="my-6 flex gap-2 overflow-x-auto no-scrollbar">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'shrink-0 rounded-full border px-5 py-2 text-xs font-medium',
                    activeTab === tab
                      ? 'border-[var(--sf-button,#1E40AF)] bg-white text-[var(--sf-button,#1E40AF)] shadow-sm'
                      : 'border-transparent bg-white/70 text-gray-400',
                  )}
                >
                  {labels[tab]}
                </button>
              ))}
            </div>

            {activeTab === 'history' ? (
              <HistoryList
                rows={historyRows}
                loading={applicationsLoading}
                error={applicationsError}
                searchTerm={searchTerm}
                onSearchTermChange={setSearchTerm}
                onRowClick={
                  kind === 'loan'
                    ? (row) => {
                        if (row.id) router.push(loanPendingDetailHref(row.id))
                      }
                    : undefined
                }
              />
            ) : null}
            {activeTab === 'schedule' ? (
              <ScheduleList searchTerm={searchTerm} onSearchTermChange={setSearchTerm} />
            ) : null}
            {activeTab === 'property' ? (
              <div className="space-y-4">
                <div
                  className="h-[112px] rounded-xl bg-gray-300 bg-cover bg-center"
                  style={{ backgroundImage: `url(${imageUrl})` }}
                />
                <div className="flex justify-center gap-1.5">
                  <span className="h-1.5 w-5 rounded-full bg-gray-600" />
                  <span className="h-1.5 w-2 rounded-full bg-gray-400" />
                  <span className="h-1.5 w-2 rounded-full bg-gray-400" />
                </div>
              </div>
            ) : null}
            {activeTab === 'product' ? <ProductPanel {...props} /> : null}
          </>
        )}
      </div>

    </div>
  )
}
