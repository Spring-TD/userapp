'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowRightLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { transferProductApplicationToPrimary } from '@/lib/services/userWalletApi'
import { formatWalletBalance } from '@/lib/userWallet'
import { TRANSFER_TO_PRIMARY_MAX_AMOUNT } from '@/types/userWallet'

type TransferToPrimaryDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  applicationId: string
  productName?: string
  productType?: string
  availableBalance: number
  currency?: string
  onSuccess?: () => void
}

function parseAmountInput(raw: string): number {
  const n = Number(String(raw).replace(/,/g, '').trim())
  return Number.isFinite(n) ? n : 0
}

export function TransferToPrimaryDrawer({
  open,
  onOpenChange,
  userId,
  applicationId,
  productName,
  productType,
  availableBalance,
  currency = 'NGN',
  onSuccess,
}: TransferToPrimaryDrawerProps) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const defaultDescription = useMemo(() => {
    const label = productName || productType || 'product'
    return `Transfer ${label} funds to primary wallet`
  }, [productName, productType])

  useEffect(() => {
    if (!open) return
    setAmount(availableBalance > 0 ? String(availableBalance) : '')
    setDescription(defaultDescription)
    setError(null)
    setSubmitting(false)
  }, [open, availableBalance, defaultDescription])

  const amountNum = parseAmountInput(amount)
  const maxAllowed =
    availableBalance > 0
      ? Math.min(availableBalance, TRANSFER_TO_PRIMARY_MAX_AMOUNT)
      : TRANSFER_TO_PRIMARY_MAX_AMOUNT

  const amountValid =
    amountNum > 0 &&
    amountNum <= maxAllowed &&
    (availableBalance <= 0 || amountNum <= availableBalance)

  const canSubmit = Boolean(userId && applicationId && amountValid && !submitting)

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)

    const result = await transferProductApplicationToPrimary(userId, applicationId, {
      amount: amountNum,
      description: description.trim() || defaultDescription,
    })

    setSubmitting(false)

    if (result.error) {
      setError(result.error)
      return
    }

    const net = result.data?.loanChargeCollection?.netToPrimary
    const credited =
      typeof net === 'number' && Number.isFinite(net)
        ? net
        : result.data?.toWallet?.mainBalance ?? amountNum

    toast.success(result.message || 'Transferred to primary wallet', {
      description: `${formatWalletBalance(credited, currency)} credited to your central wallet`,
    })
    onOpenChange(false)
    onSuccess?.()
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-w-lg">
        <DrawerHeader className="text-left">
          <DrawerTitle className="flex items-center gap-2 text-[var(--sf-ink,#1E1B4B)]">
            <ArrowRightLeft className="h-4 w-4 text-[var(--sf-primary,#2563EB)]" />
            Transfer to primary wallet
          </DrawerTitle>
          <DrawerDescription>
            Move funds from this {String(productType || 'product').toLowerCase()} wallet into your
            central wallet. Loan or mortgage transfer charges are applied automatically when
            configured.
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-4 px-4 pb-2">
          <div className="rounded-2xl bg-[var(--sf-tint,#E0E7FF)]/60 px-4 py-3">
            <p className="text-xs text-gray-500">Available in product wallet</p>
            <p className="mt-0.5 text-lg font-bold text-[var(--sf-ink,#1E1B4B)]">
              {availableBalance > 0 ? formatWalletBalance(availableBalance, currency) : '—'}
            </p>
            <p className="mt-1 text-[11px] text-gray-500">
              Max per transfer: {formatWalletBalance(TRANSFER_TO_PRIMARY_MAX_AMOUNT, currency)}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transfer-amount">Amount</Label>
            <Input
              id="transfer-amount"
              inputMode="decimal"
              type="text"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.00"
              className="h-11 rounded-xl"
            />
            {amountNum > 0 && !amountValid ? (
              <p className="text-xs text-red-600">
                {amountNum > TRANSFER_TO_PRIMARY_MAX_AMOUNT
                  ? `Maximum is ${formatWalletBalance(TRANSFER_TO_PRIMARY_MAX_AMOUNT, currency)}`
                  : availableBalance > 0 && amountNum > availableBalance
                    ? 'Amount exceeds product wallet balance'
                    : 'Enter a valid amount'}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="transfer-description">Description</Label>
            <Input
              id="transfer-description"
              type="text"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={defaultDescription}
              className="h-11 rounded-xl"
            />
          </div>

          {error ? <p className="text-center text-xs text-red-600">{error}</p> : null}
        </div>

        <DrawerFooter>
          <Button
            type="button"
            disabled={!canSubmit}
            onClick={() => void handleSubmit()}
            className="h-12 w-full rounded-full bg-[var(--sf-button,#1E40AF)] text-sm font-semibold text-white"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Transferring…
              </span>
            ) : (
              'Transfer to primary wallet'
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={submitting}
            onClick={() => onOpenChange(false)}
            className="h-10 w-full rounded-full text-sm text-gray-500"
          >
            Cancel
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
