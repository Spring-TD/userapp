'use client'

import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { X, Download, Share2 } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

interface TransactionHistoryModalProps {
  isOpen: boolean
  transaction: any
  onClose: () => void
}

export function TransactionHistoryModal({ isOpen, transaction, onClose }: TransactionHistoryModalProps) {
  if (!transaction) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Transaction History {transaction.transactionId}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Payment for</p>
              <p className="font-semibold">Loan product creation</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Amount</p>
              <p className="font-semibold text-lg">N50,000.00</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Transaction ID</p>
              <p className="font-semibold">{transaction.transactionId}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Date</p>
              <p className="font-semibold">Sep 12, 2025</p>
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-1">Status</p>
            <p className="font-semibold text-green-600">Successful</p>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-3">Initiated by</p>
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=40&h=40&fit=crop" />
                <AvatarFallback>GA</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">Grace Ayo</p>
                <p className="text-sm text-gray-600">grace.yo@spring.td</p>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <Button variant="outline" className="flex-1 gap-2">
              <Download className="w-4 h-4" />
              Download
            </Button>
            <Button variant="outline" className="flex-1 gap-2">
              <Share2 className="w-4 h-4" />
              Share
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
