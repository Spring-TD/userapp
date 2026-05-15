'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft,
  Check,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useMobileProducts } from '@/hooks/useMobileProducts'
import { useMobileV2Tenant } from '@/contexts/MobileV2TenantContext'
import { fetchAuthUserProfile } from '@/lib/userProfileClient'
import { MortgageSheet, MORTGAGE_PRIMARY } from './MortgageSheet'
import { MortgageApplyFlowSkeleton } from '@/components/mobile-v2/data-skeletons'

function formatNgn(amount?: number | null): string {
  if (amount == null || Number.isNaN(amount)) return '—'
  return `NGN${amount.toLocaleString('en-NG')}`
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-[11px] font-medium text-gray-500">{children}</label>
}

function RoundedInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        'h-12 w-full rounded-2xl border-0 bg-gray-100 px-4 text-sm text-[#1E293B] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--sf-primary,#2563EB)_30%,transparent)]',
        props.className,
      )}
    />
  )
}

function RoundedSelect({
  value,
  onChange,
  children,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  children: React.ReactNode
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-12 w-full appearance-none rounded-2xl border-0 bg-gray-100 px-4 text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--sf-primary,#2563EB)_30%,transparent)]"
    >
      <option value="">{placeholder}</option>
      {children}
    </select>
  )
}

type FlowPhase =
  | 'survey'
  | 'bvn'
  | 'outright_payment'
  | 'physical'
  | 'contract'
  | 'offer'

type SheetMode =
  | null
  | 'checking'
  | 'eligible'
  | 'payment_plan'
  | 'doc1'
  | 'doc2'
  | 'doc3'
  | 'doc_poa_missing'
  | 'doc_poa_pending'
  | 'doc_poa_rejected'
  | 'doc_submit_success'
  | 'pay_success'
  | 'pay_pending'
  | 'insp_progress'
  | 'insp_status'

const SELECT_OPTIONS = {
  sex: ['Male', 'Female', 'Prefer not to say'],
  occupation: ['Employed', 'Self-employed', 'Business owner', 'Student', 'Retired'],
  state: ['Lagos', 'Abuja', 'Rivers', 'Delta', 'Oyo', 'Kano'],
  location: ['Urban', 'Suburban', 'Rural'],
  property: ['2 Bedroom Flat', '3 Bedroom Duplex', 'Bungalow', 'Commercial'],
  payment: ['₦50k – ₦100k', '₦100k – ₦250k', '₦250k – ₦500k', '₦500k+'],
  duration: ['5 years', '10 years', '15 years', '20 years', '25 years'],
  finance: ['Salary', 'Business income', 'Investments', 'Mixed'],
  soon: ['Immediately', '1–3 months', '3–6 months', '6+ months'],
}

export function MortgageApplyFlow({ productId }: { productId: string }) {
  const router = useRouter()
  const { appId: tenantAppId, ready: tenantReady } = useMobileV2Tenant()
  const springAppId = tenantAppId ?? undefined

  const { products, loading, getProductById } = useMobileProducts({
    type: 'Mortgage',
    springAppId: springAppId || undefined,
    autoFetch: true,
    tenantReady,
  })

  const product = useMemo(() => getProductById(productId), [getProductById, productId])

  const [phase, setPhase] = useState<FlowPhase>('survey')
  const [sheet, setSheet] = useState<SheetMode>(null)
  const [paymentPlan, setPaymentPlan] = useState<'outright' | 'savings' | ''>('')
  const [docAgreed, setDocAgreed] = useState(false)
  const [carousel, setCarousel] = useState(0)
  const [doc1Purpose, setDoc1Purpose] = useState('')
  const [doc1FirstProp, setDoc1FirstProp] = useState('')
  const [doc2Insurance, setDoc2Insurance] = useState('')
  const [doc2Repay, setDoc2Repay] = useState('')
  const [doc2Auto, setDoc2Auto] = useState('')
  const [doc2Tenure, setDoc2Tenure] = useState('')
  const [doc3Relation, setDoc3Relation] = useState('')

  const [survey, setSurvey] = useState({
    fullName: '',
    email: '',
    sex: '',
    age: '',
    gender: '',
    occupation: '',
    salaryBand: '',
    state: '',
    location: '',
    property: '',
    estPayment: '',
    repaymentDuration: '',
    financeSource: '',
    soon: '',
  })

  useEffect(() => {
    void (async () => {
      const { user } = await fetchAuthUserProfile()
      if (!user) return
      const fn = [user.first_name, user.last_name].filter(Boolean).join(' ').trim()
      const em = user.email?.trim() ?? ''
      setSurvey((s) => ({
        ...s,
        fullName: s.fullName || fn,
        email: s.email || em,
      }))
    })()
  }, [])

  const goMortgageHome = useCallback(() => {
    router.push('/mobile-v2/products/mortgage')
  }, [router])

  const openAfterSurvey = () => {
    setSheet('checking')
    window.setTimeout(() => setSheet('eligible'), 1800)
  }

  const handleSurveySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    openAfterSurvey()
  }

  const handleBvnSubmit = () => {
    setSheet('checking')
    window.setTimeout(() => setSheet('payment_plan'), 1600)
  }

  const primaryAmount = product?.propertyValue ?? 122_000_000

  if (!tenantReady || loading) {
    return <MortgageApplyFlowSkeleton />
  }

  if (!product) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-[#FAFAFA] px-6 text-center">
        <p className="text-sm text-gray-600">This mortgage product could not be found.</p>
        <Button className={cn('rounded-full', MORTGAGE_PRIMARY)} onClick={goMortgageHome}>
          Back to mortgages
        </Button>
      </div>
    )
  }

  const lender = 'AG Mortgage Bank'

  return (
    <div className="relative flex min-h-full flex-col bg-[#FAFAFA]">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#FAFAFA]/95 px-4 pb-2 pt-10 backdrop-blur-sm">
        <div className="mb-2 flex items-center gap-2 text-[10px] text-gray-400">
          <Link href="/mobile-v2/home" className="hover:text-gray-600">
            Home
          </Link>
          <span>/</span>
          <Link href="/mobile-v2/products/mortgage" className="hover:text-gray-600">
            mortgage
          </Link>
          <span>/</span>
          <span className="text-gray-600">
            {phase === 'survey' && 'survey'}
            {phase === 'bvn' && 'check eligibility'}
            {phase === 'outright_payment' && 'outright payment'}
            {phase === 'physical' && 'inspection'}
            {phase === 'contract' && 'contract'}
            {phase === 'offer' && 'outright offer'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (phase === 'survey') router.push(`/mobile-v2/products/mortgage/${encodeURIComponent(productId)}`)
              else if (phase === 'offer') setPhase('outright_payment')
              else if (phase === 'contract') setPhase('outright_payment')
              else if (phase === 'physical') setPhase('outright_payment')
              else if (phase === 'outright_payment') setPhase('bvn')
              else if (phase === 'bvn') setPhase('survey')
              else goMortgageHome()
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5 text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-[#1E293B]">
            {phase === 'survey' && 'Mortgage survey'}
            {phase === 'bvn' && 'Check eligibility'}
            {phase === 'outright_payment' && 'Outright payment'}
            {phase === 'physical' && 'Physical inspection'}
            {phase === 'contract' && 'Contract signing'}
            {phase === 'offer' && 'Your offer'}
          </h1>
        </div>
      </div>

      {/* ——— Survey ——— */}
      {phase === 'survey' && (
        <form onSubmit={handleSurveySubmit} className="flex-1 space-y-4 px-4 pb-28 pt-2">
          <FieldLabel>Full name</FieldLabel>
          <RoundedInput
            required
            value={survey.fullName}
            onChange={(e) => setSurvey((s) => ({ ...s, fullName: e.target.value }))}
            placeholder="Full name"
          />
          <FieldLabel>Email</FieldLabel>
          <RoundedInput
            required
            type="email"
            value={survey.email}
            onChange={(e) => setSurvey((s) => ({ ...s, email: e.target.value }))}
            placeholder="Email"
          />
          <FieldLabel>Sex</FieldLabel>
          <RoundedSelect
            value={survey.sex}
            onChange={(v) => setSurvey((s) => ({ ...s, sex: v }))}
            placeholder="Select Sex"
          >
            {SELECT_OPTIONS.sex.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </RoundedSelect>
          <FieldLabel>Age</FieldLabel>
          <RoundedInput
            required
            inputMode="numeric"
            value={survey.age}
            onChange={(e) => setSurvey((s) => ({ ...s, age: e.target.value }))}
            placeholder="Age"
          />
          <FieldLabel>Gender</FieldLabel>
          <RoundedInput
            value={survey.gender}
            onChange={(e) => setSurvey((s) => ({ ...s, gender: e.target.value }))}
            placeholder="Gender"
          />
          <FieldLabel>Occupation</FieldLabel>
          <RoundedSelect
            value={survey.occupation}
            onChange={(v) => setSurvey((s) => ({ ...s, occupation: v }))}
            placeholder="Select Occupation"
          >
            {SELECT_OPTIONS.occupation.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </RoundedSelect>
          <FieldLabel>Salary / Income band</FieldLabel>
          <RoundedInput
            value={survey.salaryBand}
            onChange={(e) => setSurvey((s) => ({ ...s, salaryBand: e.target.value }))}
            placeholder="e.g. ₦500k – ₦1m"
          />
          <FieldLabel>State of residence</FieldLabel>
          <RoundedSelect
            value={survey.state}
            onChange={(v) => setSurvey((s) => ({ ...s, state: v }))}
            placeholder="Select State"
          >
            {SELECT_OPTIONS.state.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </RoundedSelect>
          <FieldLabel>Choice of location</FieldLabel>
          <RoundedSelect
            value={survey.location}
            onChange={(v) => setSurvey((s) => ({ ...s, location: v }))}
            placeholder="Select Location"
          >
            {SELECT_OPTIONS.location.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </RoundedSelect>
          <FieldLabel>Choice of property</FieldLabel>
          <RoundedSelect
            value={survey.property}
            onChange={(v) => setSurvey((s) => ({ ...s, property: v }))}
            placeholder="Select Property"
          >
            {SELECT_OPTIONS.property.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </RoundedSelect>
          <FieldLabel>Estimated mortgage payment</FieldLabel>
          <RoundedSelect
            value={survey.estPayment}
            onChange={(v) => setSurvey((s) => ({ ...s, estPayment: v }))}
            placeholder="Select payment"
          >
            {SELECT_OPTIONS.payment.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </RoundedSelect>
          <FieldLabel>Desired repayment duration</FieldLabel>
          <RoundedSelect
            value={survey.repaymentDuration}
            onChange={(v) => setSurvey((s) => ({ ...s, repaymentDuration: v }))}
            placeholder="Select repayment duration"
          >
            {SELECT_OPTIONS.duration.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </RoundedSelect>
          <FieldLabel>Source of repayment finance</FieldLabel>
          <RoundedSelect
            value={survey.financeSource}
            onChange={(v) => setSurvey((s) => ({ ...s, financeSource: v }))}
            placeholder="Select Finance"
          >
            {SELECT_OPTIONS.finance.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </RoundedSelect>
          <FieldLabel>How soon do you want your mortgage</FieldLabel>
          <RoundedSelect
            value={survey.soon}
            onChange={(v) => setSurvey((s) => ({ ...s, soon: v }))}
            placeholder="Select Mortgage Option"
          >
            {SELECT_OPTIONS.soon.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </RoundedSelect>

          <div className="pt-4">
            <Button type="submit" className={cn('h-14 w-full rounded-full text-base font-semibold', MORTGAGE_PRIMARY)}>
              Submit file
            </Button>
          </div>
        </form>
      )}

      {/* ——— BVN gate ——— */}
      {phase === 'bvn' && (
        <div className="flex-1 space-y-4 px-4 pb-28 pt-4">
          <FieldLabel>BVN</FieldLabel>
          <RoundedInput placeholder="Enter BVN" maxLength={11} />
          <FieldLabel>NIN</FieldLabel>
          <RoundedInput placeholder="Enter NIN" maxLength={11} />
          <div className="pt-8">
            <Button
              type="button"
              className={cn('h-14 w-full rounded-full text-base font-semibold', MORTGAGE_PRIMARY)}
              onClick={handleBvnSubmit}
            >
              Check eligibility
            </Button>
          </div>
        </div>
      )}

      {/* ——— Outright payment ——— */}
      {phase === 'outright_payment' && (
        <div className="flex-1 space-y-6 px-4 pb-28 pt-4">
          <div className="flex justify-center gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white',
                  i < 2 ? 'bg-[var(--sf-button,#1E40AF)]' : 'bg-gray-300 text-gray-600',
                )}
              >
                {i < 2 ? <Check className="h-4 w-4" /> : '3'}
              </div>
            ))}
          </div>
          <div className="rounded-[24px] bg-[#E8EEF8] p-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--sf-button,#1E40AF)] text-xl font-bold text-white">
              2
            </div>
            <h2 className="mb-6 text-lg font-bold text-[var(--sf-button,#1E40AF)]">Down Payment</h2>
            <div className="mb-4 text-left">
              <p className="text-[10px] uppercase tracking-wide text-gray-500">Amount</p>
              <p className="text-lg font-bold text-[#1E293B]">{formatNgn(primaryAmount)}</p>
            </div>
            <div className="mb-4 text-left">
              <p className="text-[10px] uppercase tracking-wide text-gray-500">Bank name</p>
              <p className="font-semibold text-[#1E293B]">{lender}</p>
            </div>
            <div className="mb-6 text-left">
              <p className="text-[10px] uppercase tracking-wide text-gray-500">Account number</p>
              <p className="font-semibold text-[#1E293B]">7012345678</p>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-white/80 px-4 py-3">
              <span className="text-sm font-medium text-gray-700">Central Wallet</span>
              <span className="h-5 w-5 rounded-full border-2 border-[#2E5AAC] bg-[var(--sf-button,#1E40AF)] shadow-[inset_0_0_0_3px_white]" />
            </div>
          </div>
          <Button
            type="button"
            className={cn('h-14 w-full rounded-full text-base font-semibold', MORTGAGE_PRIMARY)}
            onClick={() => setSheet('pay_success')}
          >
            Pay now
          </Button>
          <Button type="button" variant="outline" className="w-full rounded-full" onClick={() => setPhase('physical')}>
            Skip to inspection (demo)
          </Button>
        </div>
      )}

      {/* ——— Physical inspection ——— */}
      {phase === 'physical' && (
        <div className="flex-1 space-y-6 px-4 pb-28 pt-4">
          <div className="flex justify-center gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border-2',
                  i === 0 ? 'border-[#2E5AAC] bg-[var(--sf-button,#1E40AF)] text-white' : 'border-gray-300 bg-white text-gray-400',
                )}
              >
                {i === 0 ? <Check className="h-4 w-4" /> : i + 1}
              </div>
            ))}
          </div>
          <div className="rounded-[24px] bg-[#E8EEF8] p-6 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--sf-button,#1E40AF)] text-2xl font-bold text-white">
              1
            </div>
            <h2 className="mb-3 text-lg font-bold text-[var(--sf-button,#1E40AF)]">Physical inspection</h2>
            <p className="text-left text-sm leading-relaxed text-gray-600">
              A qualified inspector will visit the property. You will receive updates here. Please be available within two
              to three working days after you start the inspection process.
            </p>
          </div>
          <Button
            type="button"
            className={cn('h-14 w-full rounded-full text-base font-semibold', MORTGAGE_PRIMARY)}
            onClick={() => setSheet('insp_progress')}
          >
            Start inspection
          </Button>
          <Button type="button" variant="outline" className="w-full rounded-full" onClick={() => setPhase('contract')}>
            Continue to contract
          </Button>
        </div>
      )}

      {/* ——— Contract ——— */}
      {phase === 'contract' && (
        <div className="flex-1 space-y-6 px-4 pb-28 pt-4">
          <div className="flex justify-center gap-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--sf-button,#1E40AF)] text-white"
              >
                <Check className="h-4 w-4" />
              </div>
            ))}
          </div>
          <div className="rounded-[24px] bg-[#E8EEF8] p-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--sf-button,#1E40AF)] text-xl font-bold text-white">
              3
            </div>
            <h2 className="mb-3 text-lg font-bold text-[var(--sf-button,#1E40AF)]">Contract signing</h2>
            <p className="text-left text-sm leading-relaxed text-gray-600">
              Review the mortgage agreement prepared for you. When you are ready, confirm below to proceed to your
              formal offer summary.
            </p>
          </div>
          <Button
            type="button"
            className={cn('h-14 w-full rounded-full text-base font-semibold', MORTGAGE_PRIMARY)}
            onClick={() => setPhase('offer')}
          >
            Sign contract
          </Button>
        </div>
      )}

      {/* ——— Offer recap ——— */}
      {phase === 'offer' && (
        <div className="flex-1 space-y-4 px-4 pb-28 pt-2">
          <div className="relative aspect-[16/10] overflow-hidden rounded-[24px] bg-gray-200">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url(${product.image || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200'})`,
              }}
            />
            <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[10px] font-semibold text-[var(--sf-button,#1E40AF)]">
              By {lender}
            </span>
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCarousel(i)}
                  className={cn('h-1.5 rounded-full transition-all', i === carousel ? 'w-6 bg-white' : 'w-1.5 bg-white/50')}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          </div>
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-base font-bold text-[#1E293B]">{product.name}</h2>
            <p className="shrink-0 text-base font-bold text-[#1E293B]">{formatNgn(primaryAmount)}</p>
          </div>
          <p className="text-sm leading-relaxed text-gray-600">{product.description}</p>
          <div className="flex gap-6 text-sm text-gray-700">
            <span>{product.duration || '12 months'}</span>
            <span>{product.interestRate || '3% p.a.'}</span>
          </div>
          <dl className="space-y-3 border-t border-gray-200 pt-4 text-sm">
            {[
              ['Property location', 'Asaba'],
              ['Property type', 'Residential'],
              ['Mortgage type', 'Fixed rate'],
              ['Loan tenure', '7 years'],
              ['Down payment', '10%'],
              ['Fees & charges', 'Nil'],
              ['Interest rate', '3% P.A'],
              ['Mortgage insurance', 'AICCO Insurance'],
              ['Automation', 'Monthly'],
              ['Powered by', lender],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <dt className="text-gray-500">{k}</dt>
                <dd className="text-right font-medium text-[#1E293B]">{v}</dd>
              </div>
            ))}
          </dl>
          <Button
            type="button"
            className={cn('mt-4 h-14 w-full rounded-full text-base font-semibold', MORTGAGE_PRIMARY)}
            onClick={goMortgageHome}
          >
            Accept offer
          </Button>
        </div>
      )}

      {/* ——— Sheets ——— */}
      <MortgageSheet open={sheet === 'checking'} onClose={() => setSheet(null)}>
        <div className="flex flex-col items-center py-6 text-center">
          <Skeleton className="mx-auto mb-6 h-14 w-14 shrink-0 rounded-full bg-gray-200/90" />
          <h3 className="text-lg font-bold text-[#1E293B]">Checking eligibility</h3>
          <p className="mt-2 max-w-xs text-sm text-gray-500">Please wait while we verify your details…</p>
        </div>
      </MortgageSheet>

      <MortgageSheet open={sheet === 'eligible'} onClose={() => setSheet(null)}>
        <div className="flex flex-col items-center py-6 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500">
            <Check className="h-10 w-10 text-white" strokeWidth={3} />
          </div>
          <h3 className="text-lg font-bold text-[#1E293B]">Eligibility confirmed</h3>
          <p className="mt-2 max-w-xs text-sm text-gray-500">You can continue with payment plan and documentation.</p>
          <Button
            type="button"
            className={cn('mt-8 h-12 w-full rounded-full font-semibold', MORTGAGE_PRIMARY)}
            onClick={() => {
              setSheet(null)
              setPhase('bvn')
            }}
          >
            Continue
          </Button>
        </div>
      </MortgageSheet>

      <MortgageSheet open={sheet === 'payment_plan'} onClose={() => setSheet(null)} maxHeightClassName="max-h-[70vh]">
        <h3 className="mb-6 text-center text-lg font-bold text-[#1E293B]">Payment plan</h3>
        <div className="space-y-4">
          {(['outright', 'savings'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setPaymentPlan(key)}
              className="flex w-full items-center justify-between rounded-2xl border border-gray-200 px-4 py-4 text-left"
            >
              <span className="font-medium text-[#1E293B]">
                {key === 'outright' ? 'Outright payment' : 'Savings plan payment'}
              </span>
              <span
                className={cn(
                  'h-5 w-5 rounded-full border-2',
                  paymentPlan === key ? 'border-[#2E5AAC] bg-[var(--sf-button,#1E40AF)] shadow-[inset_0_0_0_3px_white]' : 'border-gray-300',
                )}
              />
            </button>
          ))}
        </div>
        <Button
          type="button"
          disabled={!paymentPlan}
          className={cn('mt-8 h-12 w-full rounded-full font-semibold', MORTGAGE_PRIMARY, !paymentPlan && 'opacity-50')}
          onClick={() => {
            setSheet(null)
            setSheet('doc1')
          }}
        >
          Continue
        </Button>
      </MortgageSheet>

      <MortgageSheet open={sheet === 'doc1'} onClose={() => setSheet(null)} maxHeightClassName="max-h-[90vh]">
        <h3 className="mb-2 text-center text-lg font-bold text-[#1E293B]">Documentation</h3>
        <div className="mb-6 flex justify-center gap-2">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white',
                step === 1 ? 'bg-[var(--sf-button,#1E40AF)]' : 'bg-gray-300',
              )}
            >
              {step === 1 ? <Check className="h-4 w-4" /> : step}
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {['Bank statement', 'Proof of address'].map((label) => (
            <div key={label} className="flex items-center justify-between rounded-2xl bg-gray-100 px-3 py-3">
              <div className="flex items-center gap-3">
                <Cloud className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-800">{label}</p>
                  <p className="text-[10px] text-gray-500">PDF format · Max. 5MB</p>
                </div>
              </div>
              <button type="button" className="rounded-lg bg-black px-3 py-2 text-[10px] font-bold text-white">
                Upload
              </button>
            </div>
          ))}
          <FieldLabel>Purpose of property</FieldLabel>
          <RoundedSelect value={doc1Purpose} onChange={setDoc1Purpose} placeholder="Select">
            <option value="live">Live in</option>
            <option value="invest">Investment</option>
          </RoundedSelect>
          <FieldLabel>Is this your first property</FieldLabel>
          <RoundedSelect value={doc1FirstProp} onChange={setDoc1FirstProp} placeholder="Select">
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </RoundedSelect>
          <FieldLabel>Address</FieldLabel>
          <textarea
            className="min-h-[88px] w-full rounded-2xl border-0 bg-gray-100 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--sf-primary,#2563EB)_30%,transparent)]"
            placeholder="Full address"
          />
        </div>
        <Button
          type="button"
          className={cn('mt-6 h-12 w-full rounded-full font-semibold', MORTGAGE_PRIMARY)}
          onClick={() => setSheet('doc2')}
        >
          Next
        </Button>
        <p className="mt-4 text-center text-[10px] text-gray-400">
          Status preview:{' '}
          <button type="button" className="font-medium text-[var(--sf-button,#1E40AF)] underline" onClick={() => setSheet('doc_poa_missing')}>
            not submitted
          </button>
          {' · '}
          <button type="button" className="font-medium text-[var(--sf-button,#1E40AF)] underline" onClick={() => setSheet('doc_poa_pending')}>
            pending
          </button>
          {' · '}
          <button type="button" className="font-medium text-[var(--sf-button,#1E40AF)] underline" onClick={() => setSheet('doc_poa_rejected')}>
            rejected
          </button>
        </p>
      </MortgageSheet>

      <MortgageSheet open={sheet === 'doc2'} onClose={() => setSheet(null)} maxHeightClassName="max-h-[90vh]">
        <h3 className="mb-2 text-center text-lg font-bold text-[#1E293B]">Documentation</h3>
        <div className="mb-6 flex justify-center gap-2">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white',
                step <= 2 ? 'bg-[var(--sf-button,#1E40AF)]' : 'bg-gray-300',
              )}
            >
              {step <= 2 ? <Check className="h-4 w-4" /> : step}
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <FieldLabel>Down payment</FieldLabel>
          <RoundedInput readOnly value={product.interestRate || '3% P.A'} />
          <FieldLabel>Select insurance</FieldLabel>
          <RoundedSelect value={doc2Insurance} onChange={setDoc2Insurance} placeholder="Select">
            <option value="aicco">AICCO Insurance</option>
          </RoundedSelect>
          <FieldLabel>Repayment option</FieldLabel>
          <RoundedSelect value={doc2Repay} onChange={setDoc2Repay} placeholder="Select">
            <option value="monthly">Monthly</option>
          </RoundedSelect>
          <FieldLabel>Automation</FieldLabel>
          <RoundedSelect value={doc2Auto} onChange={setDoc2Auto} placeholder="Select">
            <option value="debit">Auto-debit</option>
          </RoundedSelect>
          <FieldLabel>Loan tenure</FieldLabel>
          <RoundedSelect value={doc2Tenure} onChange={setDoc2Tenure} placeholder="Select">
            <option value="7">7 years</option>
          </RoundedSelect>
        </div>
        <Button
          type="button"
          className={cn('mt-6 h-12 w-full rounded-full font-semibold', MORTGAGE_PRIMARY)}
          onClick={() => setSheet('doc3')}
        >
          Next
        </Button>
      </MortgageSheet>

      <MortgageSheet open={sheet === 'doc3'} onClose={() => setSheet(null)} maxHeightClassName="max-h-[92vh]">
        <h3 className="mb-2 text-center text-lg font-bold text-[#1E293B]">Documentation</h3>
        <div className="mb-4 flex justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={`doc3-step-${i}`}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--sf-button,#1E40AF)] text-white"
            >
              <Check className="h-4 w-4" />
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <FieldLabel>Name of employer or CAC reg number</FieldLabel>
          <RoundedInput placeholder="Enter value" />
          <FieldLabel>Type of business</FieldLabel>
          <RoundedInput placeholder="Enter value" />
          <FieldLabel>Next of kin name</FieldLabel>
          <RoundedInput placeholder="Enter value" />
          <FieldLabel>Next of kin phone number</FieldLabel>
          <RoundedInput placeholder="Enter value" />
          <FieldLabel>Next of kin address</FieldLabel>
          <RoundedInput placeholder="Enter value" />
          <FieldLabel>Relationship with next of kin</FieldLabel>
          <RoundedSelect value={doc3Relation} onChange={setDoc3Relation} placeholder="Select">
            <option value="spouse">Spouse</option>
            <option value="sibling">Sibling</option>
            <option value="parent">Parent</option>
          </RoundedSelect>
          <label className="flex items-start gap-2 pt-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={docAgreed}
              onChange={(e) => setDocAgreed(e.target.checked)}
              className="mt-1"
            />
            I agree with the terms and condition
          </label>
        </div>
        <Button
          type="button"
          disabled={!docAgreed}
          className={cn('mt-6 h-12 w-full rounded-full font-semibold', MORTGAGE_PRIMARY, !docAgreed && 'opacity-50')}
          onClick={() => setSheet('doc_submit_success')}
        >
          Submit
        </Button>
      </MortgageSheet>

      <MortgageSheet open={sheet === 'doc_poa_missing'} onClose={() => setSheet(null)}>
        <div className="flex flex-col items-center py-4 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-200 text-2xl text-white">
            <span className="font-bold text-gray-600">!</span>
          </div>
          <h3 className="text-lg font-bold text-[#1E293B]">Proof of address not submitted</h3>
          <p className="mt-2 text-sm text-gray-500">Dear customer, your proof of address was not submitted.</p>
          <Button type="button" className={cn('mt-6 h-12 w-full rounded-full font-semibold', MORTGAGE_PRIMARY)} onClick={() => setSheet(null)}>
            Go back
          </Button>
        </div>
      </MortgageSheet>

      <MortgageSheet open={sheet === 'doc_poa_pending'} onClose={() => setSheet(null)}>
        <div className="flex flex-col items-center py-4 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-400">
            <AlertTriangle className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-lg font-bold text-[#1E293B]">Proof of address pending</h3>
          <p className="mt-2 text-sm text-gray-500">Dear customer, your proof of address is pending.</p>
          <Button type="button" className={cn('mt-6 h-12 w-full rounded-full font-semibold', MORTGAGE_PRIMARY)} onClick={() => setSheet(null)}>
            Go back
          </Button>
        </div>
      </MortgageSheet>

      <MortgageSheet open={sheet === 'doc_poa_rejected'} onClose={() => setSheet(null)}>
        <div className="flex flex-col items-center py-4 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500">
            <XCircle className="h-9 w-9 text-white" />
          </div>
          <h3 className="text-lg font-bold text-[#1E293B]">Proof of address rejected</h3>
          <p className="mt-2 text-sm text-gray-500">Dear customer, your proof of address was rejected.</p>
          <Button type="button" className={cn('mt-6 h-12 w-full rounded-full font-semibold', MORTGAGE_PRIMARY)} onClick={() => setSheet(null)}>
            Go back
          </Button>
        </div>
      </MortgageSheet>

      <MortgageSheet open={sheet === 'doc_submit_success'} onClose={() => setSheet(null)}>
        <div className="flex flex-col items-center py-4 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500">
            <CheckCircle2 className="h-9 w-9 text-white" />
          </div>
          <h3 className="text-lg font-bold text-[#1E293B]">Successful</h3>
          <p className="mt-2 text-sm text-gray-500">Your transaction has been submitted successfully.</p>
          <Button
            type="button"
            className={cn('mt-6 h-12 w-full rounded-full font-semibold', MORTGAGE_PRIMARY)}
            onClick={() => {
              setSheet(null)
              setPhase('outright_payment')
            }}
          >
            View offer
          </Button>
        </div>
      </MortgageSheet>

      <MortgageSheet open={sheet === 'pay_success'} onClose={() => setSheet(null)}>
        <div className="flex flex-col items-center py-4 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500">
            <Check className="h-9 w-9 text-white" strokeWidth={3} />
          </div>
          <h3 className="text-lg font-bold text-[#1E293B]">Successful</h3>
          <p className="mt-2 text-sm text-gray-500">Your transaction has been submitted successfully.</p>
          <Button
            type="button"
            className={cn('mt-6 h-12 w-full rounded-full font-semibold', MORTGAGE_PRIMARY)}
            onClick={() => {
              setSheet(null)
              setPhase('physical')
            }}
          >
            Continue
          </Button>
        </div>
      </MortgageSheet>

      <MortgageSheet open={sheet === 'pay_pending'} onClose={() => setSheet(null)}>
        <div className="flex flex-col items-center py-4 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100">
            <Clock className="h-8 w-8 text-amber-600" />
          </div>
          <h3 className="text-lg font-bold text-[#1E293B]">Pending</h3>
          <p className="mt-2 text-sm text-gray-500">We&apos;re reviewing your transaction.</p>
          <Button
            type="button"
            className={cn('mt-4 h-12 w-full rounded-full font-semibold', MORTGAGE_PRIMARY)}
            onClick={() => {
              setSheet(null)
              setPhase('physical')
            }}
          >
            Done
          </Button>
          <button type="button" className="mt-3 text-sm font-semibold text-[var(--sf-button,#1E40AF)]" onClick={() => setSheet(null)}>
            Go back
          </button>
        </div>
      </MortgageSheet>

      <MortgageSheet open={sheet === 'insp_progress'} onClose={() => setSheet(null)}>
        <div className="flex flex-col items-center py-6 text-center">
          <h3 className="text-lg font-bold text-[#1E293B]">Inspection in progress</h3>
          <Skeleton className="mx-auto my-8 h-16 w-16 shrink-0 rounded-full bg-gray-200/90" />
          <p className="max-w-xs text-sm text-gray-500">
            Kindly visit the property within two to three working days.
          </p>
          <Button
            type="button"
            className={cn('mt-8 h-12 w-full rounded-full font-semibold', MORTGAGE_PRIMARY)}
            onClick={() => setSheet('insp_status')}
          >
            Next
          </Button>
        </div>
      </MortgageSheet>

      <MortgageSheet open={sheet === 'insp_status'} onClose={() => setSheet(null)}>
        <h3 className="mb-6 text-center text-lg font-bold text-[#1E293B]">Inspection status</h3>
        <div className="space-y-4">
          {['Inspection completed', 'Declined offer'].map((label) => (
            <button
              key={label}
              type="button"
              className="flex w-full items-center justify-between rounded-2xl border border-gray-200 px-4 py-4 text-left font-medium text-[#1E293B]"
            >
              {label}
              <span className="h-5 w-5 rounded-full border-2 border-gray-300" />
            </button>
          ))}
        </div>
        <Button
          type="button"
          className={cn('mt-8 h-12 w-full rounded-full font-semibold', MORTGAGE_PRIMARY)}
          onClick={() => {
            setSheet(null)
            setPhase('contract')
          }}
        >
          Continue
        </Button>
      </MortgageSheet>

    </div>
  )
}
