'use client'

import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CheckCircle } from 'lucide-react'

interface SuccessModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SuccessModal({ isOpen, onClose }: SuccessModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <div className="flex flex-col items-center justify-center py-8">
          <div className="mb-4">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-center mb-2">Card added successfully</h2>
          <p className="text-gray-600 text-center mb-8">
            Card 5129 ****·····12 has been added successfully
          </p>
          <Button 
            onClick={onClose}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
