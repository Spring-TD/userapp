'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  AlertCircle,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  HelpCircle,
  Loader2,
  Minus,
  Percent,
  Plus,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CopyableDetailRow } from '@/components/mobile-v2/CopyableDetailRow'
import { useMobileProductDetail } from '@/hooks/useMobileProductDetail'
import { useMobileV2Tenant } from '@/contexts/MobileV2TenantContext'
import { useUserWallet } from '@/hooks/useUserWallet'
import { useAuthUserProfile } from '@/hooks/useAuthUserProfile'
import { MobileV2ProductListSkeleton } from '@/components/mobile-v2/data-skeletons'
import {
  asCommodityCatalogProduct,
  type CommodityCatalogProduct,
} from '@/lib/commodityCatalog'
import {
  fetchCommodityProductMeta,
  loadCommodityPurchaseContext,
  purchaseCommodity,
  resolveCommodityMinQuantity,
  resolveCommodityUnitPrice,
  type CommodityProductMeta,
  type CommodityPurchaseContext,
} from '@/lib/commodityApi'
import { formatNgn, formatNaira, poweredBy } from '@/lib/mobileProductDetailDisplay'
import { isVirtualNubanActive } from '@/lib/userWallet'
import { walletSpendableBalance } from '@/lib/userWallet'
import { YesNoField, PepSearchNotice } from '@/components/mobile-v2/application/ApplicantProfileFields'
import type { PepAnswer } from '@/lib/applicantProfileFields'

type PurchaseSheet = 'purchase' | 'insufficient_funds' | 'fund_bank' | null

type PurchaseSummary = {
  productName: string
  quantity: number
  principal: number
  commission: number
  totalDebit: number
  maturityAt?: string
  totalAtMaturity?: number
  applicationId?: string
}

function formatWalletNgn(amount?: number | null) {
  if (amount == null || Number.isNaN(amount)) return 'NGN 0.0'
  return `NGN ${amount.toLocaleString('en-NG', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}`
}

function formatDateLabel(value?: string | null) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return value
  }
}

function displayNameFromProfile(user: ReturnType<typeof useAuthUserProfile>['user']): string {
  if (!user) return ''
  const first = (user.first_name || '').trim()
  const last = (user.last_name || '').trim()
  if (first && last) return `${first} ${last}`
  return first || last || ''
}

function isInsufficientFundsError(message: string, status?: number): boolean {
  if (status === 402) return true
  const m = message.toLowerCase()
  return (
    m.includes('insufficient') ||
    m.includes('not enough') ||
    m.includes('low balance') ||
    m.includes('balance is not sufficient')
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-5 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-semibold text-gray-700">{value}</span>
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
    <div className="absolute inset-0 z-50 flex items-end">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="relative w-full rounded-t-[26px] bg-white px-8 pb-10 pt-3 shadow-2xl">
        <div className="mx-auto mb-6 h-1.5 w-16 rounded-full bg-gray-300" />
        {children}
      </div>
    </div>
  )
}

export default function CommodityDetailPage() {
  const params = useParams()
  const productId = typeof params?.id === 'string' ? decodeURIComponent(params.id) : ''
  const { ready: tenantReady, displayName, appId } = useMobileV2Tenant()
  const { user: profile } = useAuthUserProfile()
  const { product: detailProduct, loading } = useMobileProductDetail({
    productId,
    enabled: tenantReady && Boolean(productId),
  })

  const product = useMemo<CommodityCatalogProduct | undefined>(() => {
    if (!productId) return undefined
    if (detailProduct) return asCommodityCatalogProduct(detailProduct)
    return undefined
  }, [detailProduct, productId])

  const [quantity, setQuantity] = useState(1)
  const [sheet, setSheet] = useState<PurchaseSheet>(null)
  const [step, setStep] = useState<'details' | 'success'>('details')
  const [processing, setProcessing] = useState(false)
  const [purchaseError, setPurchaseError] = useState<string | null>(null)
  const [purchaseSummary, setPurchaseSummary] = useState<PurchaseSummary | null>(null)
  const [purchaseContext, setPurchaseContext] = useState<CommodityPurchaseContext | null>(null)
  const [productMeta, setProductMeta] = useState<CommodityProductMeta | null>(null)
  const [contextLoading, setContextLoading] = useState(false)
  const [politicallyExposed, setPoliticallyExposed] = useState<PepAnswer>('')
  const { wallet, loading: walletLoading, refetch: refetchWallet } = useUserWallet()

  const walletBalance = walletSpendableBalance(wallet)
  const userId = wallet?.userId

  const unitPrice = useMemo(() => {
    if (!product) return 1
    return resolveCommodityUnitPrice({
      price: product.price,
      unitAmount: product.unitAmount,
      structure: productMeta?.structure,
    })
  }, [product, productMeta?.structure])

  const minQuantity = useMemo(() => {
    if (!product) return 1
    return resolveCommodityMinQuantity({
      minimumQuantity: product.minimumQuantity,
      structure: productMeta?.structure,
    })
  }, [product, productMeta?.structure])

  const loadPurchaseData = useCallback(async () => {
    if (!product || !userId || !appId) {
      setPurchaseContext(null)
      return
    }

    setContextLoading(true)
    try {
      const meta = await fetchCommodityProductMeta(product.id)
      setProductMeta(meta)
      const context = await loadCommodityPurchaseContext({
        userId,
        appId,
        productId: product.id,
        product: {
          price: product.price,
          unitAmount: product.unitAmount,
          minimumQuantity: product.minimumQuantity,
          structure: meta.structure,
        },
        quantity,
        walletBalance,
      })
      setPurchaseContext(context)
    } finally {
      setContextLoading(false)
    }
  }, [appId, product, quantity, userId, walletBalance])

  useEffect(() => {
    if (!product?.id) return
    void fetchCommodityProductMeta(product.id).then(setProductMeta)
  }, [product?.id])

  useEffect(() => {
    void loadPurchaseData()
  }, [loadPurchaseData])

  useEffect(() => {
    if (sheet === 'purchase') {
      void loadPurchaseData()
    }
  }, [sheet, loadPurchaseData])

  const totals = purchaseContext ?? {
    unitPrice,
    minQuantity,
    principal: unitPrice * quantity,
    commission: 0,
    totalDebit: unitPrice * quantity,
    commissionRatePercent: 1,
    walletBalance,
    holdingBalance: 0,
    canPurchase: walletBalance >= unitPrice * quantity,
    pricing: null,
  }

  const shortfall = Math.max(0, totals.totalDebit - walletBalance)
  const hasEnoughFunds = totals.canPurchase

  const providerName = poweredBy(displayName || undefined)
  const domicileName = productMeta?.merchantName || product?.name.split(' ')[0] || providerName
  const nuban = wallet?.virtualNuban
  const nubanReady = isVirtualNubanActive(wallet)
  const accountHolder = wallet?.name || displayNameFromProfile(profile) || '—'

  const handlePurchase = async () => {
    if (!product || quantity <= 0) return

    if (politicallyExposed !== 'yes' && politicallyExposed !== 'no') {
      setPurchaseError('Please indicate whether you are a politically exposed person.')
      return
    }

    if (!hasEnoughFunds) {
      setPurchaseError(null)
      setSheet('insufficient_funds')
      return
    }

    setProcessing(true)
    setPurchaseError(null)
    try {
      const result = await purchaseCommodity(product.id, quantity, {
        platformFields: {
          isPoliticallyExposedPerson: politicallyExposed === 'yes',
        },
      })
      if (!result.ok) {
        if (isInsufficientFundsError(result.error, result.status)) {
          setSheet('insufficient_funds')
          return
        }
        setPurchaseError(result.error)
        return
      }

      const account = result.data.account
      const purchase = account?.purchase

      await refetchWallet()
      await loadPurchaseData()
      setPurchaseSummary({
        productName: product.name,
        quantity,
        principal: account?.principal ?? totals.principal,
        commission: purchase?.commissionAmount ?? totals.commission,
        totalDebit: purchase?.totalAmount ?? totals.totalDebit,
        maturityAt: account?.maturityAt,
        totalAtMaturity: account?.totalAtMaturity,
        applicationId: result.data.applicationId || account?.applicationId || account?.id,
      })
      setSheet(null)
      setStep('success')
    } finally {
      setProcessing(false)
    }
  }

  if (!tenantReady || loading) {
    return (
      <div className="flex h-full flex-col sf-page-bg px-6 pt-12">
        <MobileV2ProductListSkeleton />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 sf-page-bg px-6 text-center">
        <p className="text-sm text-gray-600">This commodity product could not be found.</p>
        <Link href="/mobile-v2/products/commodity">
          <Button className="rounded-full bg-[var(--sf-button,#1E40AF)] text-white">
            Back to commodities
          </Button>
        </Link>
      </div>
    )
  }

  if (!appId) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 sf-page-bg px-6 text-center">
        <p className="text-sm text-gray-600">Store configuration is still loading. Please try again in a moment.</p>
        <Link href="/mobile-v2/products/commodity">
          <Button className="rounded-full bg-[var(--sf-button,#1E40AF)] text-white">
            Back to commodities
          </Button>
        </Link>
      </div>
    )
  }

  if (step === 'success' && purchaseSummary) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-[color-mix(in_srgb,var(--sf-button,#1E40AF)_6%,white)] px-8 text-center">
        <div className="relative mb-8 h-32 w-32">
          <div className="absolute inset-0 rounded-full bg-[var(--sf-button,#1E40AF)] opacity-15" />
          <div className="absolute inset-4 flex items-center justify-center rounded-full bg-[var(--sf-button,#1E40AF)] shadow-lg">
            <Check className="h-16 w-16 stroke-[4] text-white" />
          </div>
        </div>
        <h1 className="text-xl font-bold text-[var(--sf-ink,#1E293B)]">Commodity enrolled</h1>
        <p className="mt-3 text-sm text-gray-600">
          You purchased {purchaseSummary.quantity} unit{purchaseSummary.quantity === 1 ? '' : 's'} of{' '}
          <span className="font-semibold text-[var(--sf-ink,#1E293B)]">{purchaseSummary.productName}</span>.
        </p>
        <div className="mt-5 w-full max-w-sm rounded-2xl border border-gray-100 bg-white px-4 py-4 text-left text-sm">
          <div className="flex justify-between gap-4 py-1.5">
            <span className="text-gray-500">Debited from wallet</span>
            <span className="font-semibold">{formatWalletNgn(purchaseSummary.totalDebit)}</span>
          </div>
          <div className="flex justify-between gap-4 py-1.5">
            <span className="text-gray-500">Holding value</span>
            <span className="font-semibold">{formatWalletNgn(purchaseSummary.principal)}</span>
          </div>
          {purchaseSummary.maturityAt ? (
            <div className="flex justify-between gap-4 py-1.5">
              <span className="text-gray-500">Unlocks on</span>
              <span className="font-semibold">{formatDateLabel(purchaseSummary.maturityAt)}</span>
            </div>
          ) : null}
          {purchaseSummary.totalAtMaturity != null ? (
            <div className="flex justify-between gap-4 border-t border-gray-100 pt-3">
              <span className="text-gray-500">Expected at maturity</span>
              <span className="font-semibold text-[var(--sf-button,#1E40AF)]">
                {formatWalletNgn(purchaseSummary.totalAtMaturity)}
              </span>
            </div>
          ) : null}
        </div>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-gray-500">
          Funds are locked until maturity. Check your notifications for enrollment details and your receipt email.
        </p>
        <div className="mt-10 flex w-full max-w-sm flex-col gap-3">
          <Link href="/mobile-v2/notifications">
            <Button
              variant="outline"
              className="h-12 w-full rounded-full border-[var(--sf-button,#1E40AF)] text-[var(--sf-button,#1E40AF)]"
            >
              View notifications
            </Button>
          </Link>
          <Link href="/mobile-v2/products/commodity">
            <Button className="h-14 w-full rounded-full bg-[var(--sf-button,#1E40AF)] text-base font-semibold text-white">
              Done
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const holdingPeriod = productMeta?.moratoriumLabel || product.duration || '—'
  const interestLabel = productMeta?.offerYieldLabel || product.interestRate || '—'

  return (
    <div className="relative flex h-full flex-col bg-[color-mix(in_srgb,var(--sf-button,#1E40AF)_6%,white)]">
      <div className="flex-1 overflow-y-auto pb-12">
        <div className="px-6 pt-12">
          <Link
            href="/mobile-v2/products/commodity"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-700 shadow-sm"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </div>

        <div className="px-6 pt-8">
          <div
            className="relative h-[190px] overflow-hidden rounded-[18px] bg-gray-100 bg-cover bg-center"
            style={{ backgroundImage: `url(${product.image})` }}
          >
            <span className="absolute left-3 top-3 rounded-full bg-white/95 px-4 py-1.5 text-[10px] font-medium text-gray-700 shadow-sm">
              By {providerName}
            </span>
          </div>

          <div className="mt-5 flex items-start justify-between gap-4">
            <h1 className="line-clamp-1 text-sm font-medium text-[var(--sf-ink,#1E293B)]">
              {product.name}
            </h1>
            <div className="shrink-0 text-right">
              <p className="text-[8px] text-gray-500">Cost per unit</p>
              <p className="text-sm font-bold text-[var(--sf-ink,#1E293B)]">{formatNgn(unitPrice)}</p>
            </div>
          </div>

          <p className="mt-3 text-[11px] leading-relaxed text-gray-600">{product.description}</p>

          <div className="mt-4 flex gap-6 text-[11px] font-semibold text-gray-600">
            <span className="inline-flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-gray-400" />
              {holdingPeriod}
            </span>
            <span className="inline-flex items-center gap-2">
              <Percent className="h-3.5 w-3.5 text-gray-400" />
              {interestLabel}
            </span>
          </div>

          <div className="mt-10 space-y-8">
            <InfoRow label="Min purchase" value={`${minQuantity} unit${minQuantity === 1 ? '' : 's'}`} />
            <InfoRow label="Unit" value={product.unitOfMeasure || 'unit'} />
            <InfoRow
              label="Holding period"
              value={
                <span className="inline-flex items-center gap-1">
                  {holdingPeriod}
                  <ChevronDown className="h-4 w-4" />
                </span>
              }
            />
            <InfoRow label="Powered by:" value={providerName} />
            <InfoRow label="Cost per purchase" value={formatNaira(unitPrice)} />
          </div>

          <Button
            onClick={() => {
              setQuantity(Math.max(minQuantity, quantity))
              setSheet('purchase')
            }}
            className="mt-8 h-14 w-full rounded-full bg-[var(--sf-button,#1E40AF)] text-base font-semibold text-white"
          >
            Continue
          </Button>
        </div>
      </div>

      {sheet === 'purchase' && (
        <BottomSheet onClose={() => !processing && setSheet(null)}>
          <h2 className="mb-7 text-center text-xl font-bold text-[var(--sf-ink,#1E293B)]">Commodity Purchase</h2>

          <div className="space-y-6">
            <div>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-1.5 text-sm text-gray-700">
                  <span>
                    Quantity<span className="text-[var(--sf-button,#1E40AF)]">*</span>
                  </span>
                  <HelpCircle className="h-4 w-4 text-gray-400" aria-hidden />
                </div>
                <button type="button" className="shrink-0 text-sm text-gray-400 hover:text-gray-600">
                  Help?
                </button>
              </div>

              <div className="flex h-12 items-stretch overflow-hidden rounded-xl border border-gray-200 bg-white">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => setQuantity((value) => Math.max(minQuantity, value - 1))}
                  className="flex w-12 shrink-0 items-center justify-center border-r border-gray-200 text-xl text-gray-500 transition-colors hover:bg-gray-50 active:bg-gray-100"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <div className="flex flex-1 items-center justify-center text-2xl font-medium text-gray-400">
                  {quantity}
                </div>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() => setQuantity((value) => value + 1)}
                  className="flex w-12 shrink-0 items-center justify-center border-l border-gray-200 text-xl text-gray-500 transition-colors hover:bg-gray-50 active:bg-gray-100"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <p className="mt-4 flex gap-1.5 text-sm text-gray-500">
                <HelpCircle className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                <span>
                  Cost per unit{' '}
                  <span className="font-semibold text-[var(--sf-ink,#1E293B)]">{formatNgn(unitPrice)}</span>
                  {' · '}
                  Min {minQuantity}
                </span>
              </p>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-500">From</span>
                <span className="text-right font-medium text-[var(--sf-ink,#1E293B)]">
                  Central wallet <span className="text-gray-400">→</span>{' '}
                  {walletLoading || contextLoading ? '…' : formatWalletNgn(walletBalance)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-500">To</span>
                <span className="text-right font-medium text-[var(--sf-ink,#1E293B)]">
                  Commodity holding <span className="text-gray-400">→</span>{' '}
                  {contextLoading ? '…' : formatWalletNgn(totals.holdingBalance)}
                </span>
              </div>
            </div>

            <div className="rounded-2xl bg-gray-50 px-4 py-3 text-xs text-gray-600">
              <div className="flex justify-between gap-4">
                <span>Principal</span>
                <span className="font-medium">{formatWalletNgn(totals.principal)}</span>
              </div>
              <div className="mt-1 flex justify-between gap-4">
                <span>Commission ({totals.commissionRatePercent}%)</span>
                <span className="font-medium">{formatWalletNgn(totals.commission)}</span>
              </div>
            </div>

            <p className="text-center text-xs leading-5 text-gray-500">
              Commodity holding is domiciled with {domicileName}, a CBN licensed entity.
            </p>

            <div className="rounded-2xl bg-[#E8F8EF] px-5 py-4 text-center text-base font-semibold text-[#1E293B]">
              Total debit <span className="text-gray-400">→</span> {formatWalletNgn(totals.totalDebit)}
            </div>

            <YesNoField
              label="Are you a politically exposed person?"
              value={politicallyExposed}
              onChange={setPoliticallyExposed}
            />
            <PepSearchNotice isPep={politicallyExposed === 'yes'} />

            {purchaseError ? (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-center text-xs text-red-600">{purchaseError}</p>
            ) : null}
          </div>

          <Button
            onClick={() => void handlePurchase()}
            disabled={processing || quantity <= 0 || (politicallyExposed !== 'yes' && politicallyExposed !== 'no')}
            className="mt-8 h-14 w-full rounded-full bg-[var(--sf-button,#1E40AF)] text-base font-semibold text-white disabled:opacity-50"
          >
            {processing ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </span>
            ) : (
              'Purchase'
            )}
          </Button>
        </BottomSheet>
      )}

      {sheet === 'insufficient_funds' && (
        <BottomSheet onClose={() => setSheet('purchase')}>
          <div className="text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
              <AlertCircle className="h-9 w-9" />
            </div>
            <h2 className="text-xl font-bold text-[var(--sf-ink,#1E293B)]">Insufficient balance</h2>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-gray-500">
              Your central wallet does not have enough funds for this purchase (principal + commission). Fund your
              wallet and try again.
            </p>
          </div>

          <div className="mt-6 space-y-4 rounded-2xl bg-gray-50 px-4 py-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-500">Total debit</span>
              <span className="font-semibold text-[var(--sf-ink,#1E293B)]">{formatWalletNgn(totals.totalDebit)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-500">Wallet balance</span>
              <span className="font-semibold text-[var(--sf-ink,#1E293B)]">{formatWalletNgn(walletBalance)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-gray-200 pt-4">
              <span className="font-medium text-gray-700">Amount to fund</span>
              <span className="font-bold text-[var(--sf-button,#1E40AF)]">{formatWalletNgn(shortfall)}</span>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3">
            <Button
              onClick={() => setSheet('fund_bank')}
              className="h-14 w-full rounded-full bg-[var(--sf-button,#1E40AF)] text-base font-semibold text-white"
            >
              Fund wallet
            </Button>
            <Button
              variant="outline"
              onClick={() => setSheet('purchase')}
              className="h-12 w-full rounded-full"
            >
              Back to purchase
            </Button>
          </div>
        </BottomSheet>
      )}

      {sheet === 'fund_bank' && (
        <BottomSheet onClose={() => setSheet('insufficient_funds')}>
          <div className="mb-6 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-[var(--sf-ink,#1E1B4B)]">Fund wallet via bank transfer</h2>
            <button type="button" onClick={() => setSheet('insufficient_funds')} aria-label="Close">
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          <div className="mb-4 rounded-2xl bg-[#FEF3C7] px-4 py-3 text-xs leading-relaxed text-[#92400E]">
            Transfer at least <strong>{formatWalletNgn(shortfall)}</strong> to your wallet, then return here to complete
            your commodity purchase.
          </div>

          <div className="space-y-6">
            {walletLoading ? (
              <p className="text-sm text-gray-500">Loading account details...</p>
            ) : nubanReady ? (
              <>
                <CopyableDetailRow label="Account Holder" value={accountHolder} />
                <CopyableDetailRow label="Account Number" value={nuban?.accountNumber} />
                <CopyableDetailRow label="Bank Name" value={nuban?.bankName} />
              </>
            ) : (
              <div className="rounded-2xl sf-accent-soft p-4">
                <div className="mb-3 flex items-start gap-3">
                  <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--sf-primary,#2563EB)]" />
                  <div>
                    <p className="text-sm font-semibold text-[var(--sf-ink,#1E1B4B)]">Bank account not active yet</p>
                    <p className="mt-1 text-sm text-gray-600">
                      Complete identity verification to activate your bank transfer account, then fund your wallet.
                    </p>
                  </div>
                </div>
                <Link href="/mobile-v2/profile/kyc/create">
                  <Button className="h-10 rounded-full bg-[var(--sf-button,#1E40AF)] px-4 text-sm font-semibold text-white">
                    Complete KYC
                  </Button>
                </Link>
              </div>
            )}
          </div>

          <Button
            onClick={() => {
              void refetchWallet()
              void loadPurchaseData()
              setSheet('purchase')
            }}
            className="mt-8 h-14 w-full rounded-full bg-[var(--sf-button,#1E40AF)] text-base font-semibold text-white"
          >
            I&apos;ve funded my wallet
          </Button>
        </BottomSheet>
      )}
    </div>
  )
}
