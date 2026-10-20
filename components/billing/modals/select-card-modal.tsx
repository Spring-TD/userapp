'use client'

import { useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { X, ArrowRight } from 'lucide-react'

interface SelectCardModalProps {
  isOpen: boolean
  onClose: () => void
  onAddCardClick: () => void
}

export function SelectCardModal({ isOpen, onClose, onAddCardClick }: SelectCardModalProps) {
  const [selectedCard, setSelectedCard] = useState(0)

  const cards = [
    {
      id: 0,
      type: 'VISA',
      number: '5282 **** **** **89',
      name: 'Grace Ayo',
      valid: '09/25',
      isDefault: true,
    },
    {
      id: 1,
      type: 'MASTERCARD',
      number: '5282 **** **** **89',
      name: 'Grace Ayo',
      valid: '09/25',
      isDefault: false,
    },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Select card</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          {cards.map(card => (
            <div
              key={card.id}
              onClick={() => setSelectedCard(card.id)}
              className="flex items-center gap-4 p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
            >
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedCard === card.id ? 'border-purple-600 bg-purple-600' : 'border-gray-300'}`}>
                {selectedCard === card.id && <div className="w-2 h-2 bg-white rounded-full"></div>}
              </div>
              <div className="flex-1">
                <div className="font-bold">{card.type} {card.number}</div>
                <div className="text-sm text-gray-600">NAME {card.name} VALID THRU {card.valid}</div>
              </div>
              {card.isDefault && <span className="text-xs bg-gray-200 px-2 py-1 rounded">DEFAULT</span>}
            </div>
          ))}

          <button
            onClick={onAddCardClick}
            className="flex items-center justify-center gap-2 w-full p-3 border border-dashed border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <span>Add new card</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <Button className="w-full bg-black hover:bg-black/90 text-white">
          Pay
        </Button>
      </DialogContent>
    </Dialog>
  )
}
