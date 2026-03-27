'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X } from 'lucide-react'

interface AddCardModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AddCardModal({ isOpen, onClose, onSuccess }: AddCardModalProps) {
  const [formData, setFormData] = useState({
    cardName: '',
    cardNumber: '',
    cvv: '',
    expiryDate: '',
    billingAddress: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSuccess()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Payment Method</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              placeholder="Card Name"
              value={formData.cardName}
              onChange={(e) => setFormData({ ...formData, cardName: e.target.value })}
              className="bg-white border-gray-300"
            />
          </div>

          <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 bg-white">
            <div className="flex gap-1">
              <div className="w-5 h-3 rounded-sm bg-red-500"></div>
              <div className="w-5 h-3 rounded-sm bg-orange-500"></div>
            </div>
            <Input
              placeholder="Card Number"
              value={formData.cardNumber}
              onChange={(e) => setFormData({ ...formData, cardNumber: e.target.value })}
              className="border-0 flex-1 bg-white"
            />
          </div>

          <div>
            <Input
              placeholder="CVV"
              value={formData.cvv}
              onChange={(e) => setFormData({ ...formData, cvv: e.target.value })}
              className="bg-white border-gray-300"
            />
          </div>

          <div>
            <Input
              placeholder="Expiry Date"
              value={formData.expiryDate}
              onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
              className="bg-white border-gray-300"
            />
          </div>

          <div>
            <Input
              placeholder="Billing Address"
              value={formData.billingAddress}
              onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
              className="bg-white border-gray-300"
            />
          </div>

          <Button type="submit" className="w-full bg-black hover:bg-black/90 text-white">
            Add card
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
