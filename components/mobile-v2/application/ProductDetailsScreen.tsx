'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Calendar, ChevronLeft, Filter, Percent, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type DetailKind = 'loan' | 'mortgage'
type DetailTab = 'history' | 'schedule' | 'property' | 'product'
type MortgageProductTab = 'mortgage' | 'property'

const ACCOUNT_LOGO_SRC = '/images/mobile/WhatsApp%20Image%202026-05-20%20at%201.34.41%20PM.jpeg'
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
  detailRows?: Array<{ label: string; value: React.ReactNode }>
  propertyRows?: Array<{ label: string; value: React.ReactNode }>
}

function NairaAmount({ children }: { children: React.ReactNode }) {
  return <span className="font-bold text-[#1E293B]">{children}</span>
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="max-w-[55%] text-right font-semibold text-[#1E293B]">{value}</span>
    </div>
  )
}

function AccountSummaryCard({ kind, provider }: { kind: DetailKind; provider: string }) {
  return (
    <div className="rounded-2xl bg-[#F2F7FF] p-4 shadow-sm">
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
          <p className="text-xs font-medium text-[#1E293B]">Stanley Samuel Wallet</p>
          <p className="mt-1 text-xl font-bold text-[#1E293B]">₦0.00</p>
          <p className="text-[10px] text-gray-500">Active · NGN</p>
        </div>

        <div
          className="h-16 w-20 rounded-xl bg-cover bg-center"
          style={{
            backgroundImage:
              kind === 'mortgage'
                ? "url('/mortgage-feature.png')"
                : "url('https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=800&auto=format&fit=crop')",
          }}
        />
      </div>
      <div className="flex items-end gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-300">
          <div className="h-full w-1/3 rounded-full bg-green-500" />
        </div>
        <span className="text-[8px] font-semibold text-gray-400">33% NGN2,000,000</span>
        <span className="text-[8px] font-semibold text-gray-400">30,000,000</span>
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
        className="h-full min-w-0 flex-1 bg-transparent text-xs text-[#1E293B] outline-none placeholder:text-gray-400"
      />
    </div>
  )
}

function HistoryList({
  kind,
  searchTerm,
  onSearchTermChange,
}: {
  kind: DetailKind
  searchTerm: string
  onSearchTermChange: (value: string) => void
}) {
  const requestLabel = kind === 'mortgage' ? 'Mortgage request' : 'Loan request'
  const rows = [
    [requestLabel, '₦3,000,000.00', 'Successful', 'text-green-500'],
    [requestLabel, '₦500,000.00', 'Unsuccessful', 'text-red-400'],
    [requestLabel, '₦500,000.00', 'Pending', 'text-amber-500'],
    [requestLabel, '₦500,000.00', 'Pending', 'text-amber-500'],
  ]
  const normalizedSearch = searchTerm.trim().toLowerCase()
  const filteredRows = normalizedSearch
    ? rows.filter(([name, amount, status]) =>
        [name, amount, status].some((value) => value.toLowerCase().includes(normalizedSearch)),
      )
    : rows

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <SearchBox value={searchTerm} onChange={onSearchTermChange} />
      <div className="divide-y divide-gray-100">
        {filteredRows.map(([name, amount, status, color], index) => (
          <div key={`${name}-${index}`} className="flex items-start justify-between py-3">
            <div>
              <p className="text-sm font-semibold text-[#1E293B]">{name}</p>
              <p className={cn('mt-1 text-[10px]', color)}>{status}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-[#1E293B]">{amount}</p>
              <p className="mt-1 text-[9px] text-gray-400">Mar 05, 2026</p>
            </div>
          </div>
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
  const rows = [
    ['10th May 2026', '₦3,000,000.00', 'Paid', 'text-green-500'],
    ['11th June 2026', '₦500,000.00', 'Unsuccessful', 'text-red-400'],
    ['10th July 2026', '₦500,000.00', 'Upcoming', 'text-amber-500'],
  ]
  const normalizedSearch = searchTerm.trim().toLowerCase()
  const filteredRows = normalizedSearch
    ? rows.filter(([date, amount, status]) =>
        [date, amount, status].some((value) => value.toLowerCase().includes(normalizedSearch)),
      )
    : rows

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <SearchBox value={searchTerm} onChange={onSearchTermChange} />
      <div className="divide-y divide-gray-100">
        {filteredRows.map(([date, amount, status, color]) => (
          <div key={date} className="flex items-start justify-between py-3">
            <div>
              <p className="text-sm font-semibold text-[#1E293B]">{date}</p>
              <p className={cn('mt-1 text-[10px]', color)}>{status}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-[#1E293B]">{amount}</p>
              <p className="mt-1 text-[9px] text-gray-400">Capital: ₦450,000 | Interest: ₦50,000</p>
            </div>
          </div>
        ))}
      </div>
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
  detailRows,
  propertyRows,
}: ProductDetailsScreenProps) {
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
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-[#1E293B]">
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
                  className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-[#1E293B] shadow-sm"
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
            <h2 className="text-sm font-medium text-[#1E293B]">{title}</h2>
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
              </>
            ) : (
              <>
                <InfoRow label="Loan type" value={title} />
                <InfoRow label="Maximum amount" value={amount} />
                <InfoRow label="Loan Tenure" value={duration} />
                <InfoRow label="Collateral" value="Required where applicable" />
              </>
            )}
            <InfoRow label="Fees & charges" value="Nil" />
            <InfoRow label="Interest Rate" value={rate} />
            <InfoRow label="Automation" value="Monthly" />
            <InfoRow label="Powered by:" value={provider} />
          </div>
        </>
      )}

      <Link href={applyHref} className="block pt-2">
        <Button className="h-12 w-full rounded-full bg-[var(--sf-button,#1E40AF)] text-sm font-semibold text-white hover:bg-[var(--sf-button-hover,#1e3a8a)]">
          Apply
        </Button>
      </Link>
    </div>
  )
}

export function ProductDetailsScreen(props: ProductDetailsScreenProps) {
  const { kind, backHref, productId, provider, initialTab = 'history', detailsOnly = false } = props
  const tabs = kind === 'mortgage'
    ? (['history', 'schedule', 'property', 'product'] as DetailTab[])
    : (['history', 'schedule', 'product'] as DetailTab[])
  const resolvedInitialTab = tabs.includes(initialTab) ? initialTab : 'history'
  const [activeTab, setActiveTab] = useState<DetailTab>(resolvedInitialTab)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    setActiveTab(resolvedInitialTab)
    setSearchTerm('')
  }, [kind, productId, resolvedInitialTab])

  const labels: Record<DetailTab, string> = {
    history: 'History',
    schedule: 'Schedule',
    property: 'Property',
    product:  'Details'
  }

  return (
    <div className="relative flex h-full flex-col bg-[#F7F9FF]">
      <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-10 pt-10">
        <div className="mb-6 flex items-center justify-between">
          <Link href={backHref} className="flex h-9 w-9 items-center justify-center rounded-full">
            <ChevronLeft className="h-5 w-5 text-gray-700" />
          </Link>
          <h1 className="text-base font-bold text-[#111827]">
            {kind === 'mortgage' ? 'Mortgage Details' : 'Loan Details'}
          </h1>
          <Filter className="h-4 w-4 text-gray-700" />
        </div>

        {detailsOnly ? (
          <ProductPanel {...props} />
        ) : (
          <>
            <AccountSummaryCard kind={kind} provider={provider} />

            <div className="my-6 flex gap-2 overflow-x-auto no-scrollbar">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'shrink-0 rounded-full border px-5 py-2 text-xs font-medium',
                    activeTab === tab
                      ? 'border-gray-700 bg-white text-[#1E293B] shadow-sm'
                      : 'border-transparent bg-white/70 text-gray-400',
                  )}
                >
                  {labels[tab]}
                </button>
              ))}
            </div>

            {activeTab === 'history' ? (
              <HistoryList
                kind={kind}
                searchTerm={searchTerm}
                onSearchTermChange={setSearchTerm}
              />
            ) : null}
            {activeTab === 'schedule' ? (
              <ScheduleList searchTerm={searchTerm} onSearchTermChange={setSearchTerm} />
            ) : null}
            {activeTab === 'property' ? (
              <div className="space-y-4">
                <div
                  className="h-[112px] rounded-xl bg-gray-300 bg-cover bg-center"
                  style={{ backgroundImage: "url('/mortgage-feature.png')" }}
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
