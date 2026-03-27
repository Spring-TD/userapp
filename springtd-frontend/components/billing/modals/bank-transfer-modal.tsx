'use client'

import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { X, Copy } from 'lucide-react'

interface BankTransferModalProps {
  isOpen: boolean
  onClose: () => void
}

export function BankTransferModal({ isOpen, onClose }: BankTransferModalProps) {
  const accountDetails = {
    accountNumber: '12345678910111',
    accountHolder: 'Grace Ayomide',
    bankName: 'SpringTB Bank',
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Payment via bank transfer</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          <p className="text-sm text-gray-600">Make a transfer to your account details below</p>

          <ol className="space-y-3 text-sm">
            <li><span className="font-semibold">1. Open your Bank App</span></li>
            <li><span className="font-semibold">2. Make payment into account details below:</span></li>
          </ol>

          <div className="border-2 border-dashed border-gray-300 p-4 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-lg font-bold">{accountDetails.accountNumber}</span>
              <button
                onClick={() => handleCopy(accountDetails.accountNumber)}
                className="text-gray-500 hover:text-gray-700"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <div className="text-sm text-gray-600">{accountDetails.accountHolder}</div>
            <div className="text-sm text-gray-600">{accountDetails.bankName}</div>
          </div>

          <ol start={3} className="space-y-2 text-sm">
            <li><span className="font-semibold">3. Transfer money from the account of "Allowed users" with active KYC below.</span></li>
            <li className="text-red-600"><span className="font-semibold">Third Party Funding is not allowed.</span></li>
            <li className="font-semibold">4. Click "I have Paid". We will confirm payment and add the funds to your wallet.</li>
          </ol>

          <Button className="w-full bg-black hover:bg-black/90 text-white">
            I have paid
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
