'use client'

import { Download, Mail, Printer, X } from 'lucide-react'
import {
  buildReceiptText,
  downloadReceipt,
  emailReceipt,
  printReceipt,
  type TransactionReceiptData,
} from '@/lib/transactionReceipt'
import { formatWalletBalance } from '@/lib/userWallet'

export function TransactionReceiptSheet({
  receipt,
  userEmail,
  onClose,
}: {
  receipt: TransactionReceiptData
  userEmail?: string | null
  onClose: () => void
}) {
  const isCredit = receipt.type === 'CREDIT'

  return (
    <div className="absolute inset-0 z-[80] flex items-end">
      <button type="button" aria-label="Close receipt" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-[81] max-h-[92vh] w-full overflow-y-auto rounded-t-[28px] bg-white px-5 pb-8 pt-3 shadow-2xl">
        <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-gray-300" />
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Transaction receipt</p>
            <h2 className="mt-1 text-lg font-bold text-[#111827]">{receipt.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-2xl bg-[#F8FAFC] px-4 py-5 text-center">
          <p className={`text-3xl font-bold ${isCredit ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatWalletBalance(receipt.amount, receipt.currency)}
          </p>
          <p className="mt-2 text-sm text-gray-500">{receipt.status}</p>
        </div>

        <dl className="mt-5 space-y-3 text-sm">
          {[
            ['Date', new Date(receipt.date).toLocaleString('en-NG')],
            ['Type', receipt.type],
            ['Method', receipt.method || '—'],
            ['Reference', receipt.reference || receipt.externalReference || '—'],
            ['Description', receipt.description || receipt.narration || receipt.title],
            ...(receipt.destinationBank
              ? [['Bank', receipt.destinationBank] as const, ['Account', receipt.destinationAccount || '—'] as const]
              : []),
            ...(receipt.balanceAfter != null
              ? [['Balance after', formatWalletBalance(receipt.balanceAfter, receipt.currency)] as const]
              : []),
          ].map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-4 border-b border-gray-100 pb-3">
              <dt className="text-gray-500">{label}</dt>
              <dd className="max-w-[58%] text-right font-medium text-[#111827]">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => downloadReceipt(receipt)}
            className="flex h-11 flex-col items-center justify-center gap-1 rounded-xl bg-[#111827] text-[10px] font-semibold text-white"
          >
            <Download className="h-4 w-4" />
            Download
          </button>
          <button
            type="button"
            onClick={() => printReceipt(receipt)}
            className="flex h-11 flex-col items-center justify-center gap-1 rounded-xl bg-gray-100 text-[10px] font-semibold text-[#111827]"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>
          <button
            type="button"
            disabled={!userEmail}
            onClick={() => userEmail && emailReceipt(receipt, userEmail)}
            className="flex h-11 flex-col items-center justify-center gap-1 rounded-xl bg-gray-100 text-[10px] font-semibold text-[#111827] disabled:opacity-50"
          >
            <Mail className="h-4 w-4" />
            Email
          </button>
        </div>

        <p className="mt-4 text-center text-[11px] leading-relaxed text-gray-400">
          {userEmail
            ? 'Download saves an HTML receipt you can print or share. Email opens your mail app with receipt details.'
            : 'Download saves an HTML receipt you can print or share.'}
        </p>
        <pre className="sr-only">{buildReceiptText(receipt)}</pre>
      </div>
    </div>
  )
}
