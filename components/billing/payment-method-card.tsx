'use client'

interface PaymentMethodCardProps {
  onCardPaymentClick: () => void
  onBankTransferClick: () => void
}

export function PaymentMethodCard({ onCardPaymentClick, onBankTransferClick }: PaymentMethodCardProps) {
  return (
    <div className="flex gap-4">
      <button
        onClick={onBankTransferClick}
        className="flex items-center gap-3 px-6 py-3 rounded-lg bg-gray-100 hover:bg-gray-200 transition"
      >
        <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white">
          →
        </div>
        <span className="font-medium text-foreground">Pay via bank transfer</span>
      </button>
    </div>
  )
}
