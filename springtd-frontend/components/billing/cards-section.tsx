'use client'

import { Card } from '@/components/ui/card'
import { Plus } from 'lucide-react'

interface CardsSectionProps {
  onAddCardClick: () => void
}

export function CardsSection({ onAddCardClick }: CardsSectionProps) {
  const cards = [
    {
      id: 1,
      name: 'Grace Ayo',
      type: 'mastercard',
      number: '5282 3456 7890 1289',
      valid: '09/25',
    },
    {
      id: 2,
      name: 'Grace Ayo',
      type: 'visa',
      number: '5282 3456 7890 1289',
      valid: '09/25',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {cards.map(card => (
        <Card key={card.id} className="bg-gray-900 text-white p-6 rounded-xl h-48 flex flex-col justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase mb-2">NAME</p>
            <p className="font-semibold">{card.name}</p>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-1">{card.number}</p>
              <p className="text-xs text-gray-400">VALID THRU {card.valid}</p>
            </div>
            {card.type === 'mastercard' ? (
              <div className="flex gap-1">
                <div className="w-6 h-4 rounded-full bg-red-500"></div>
                <div className="w-6 h-4 rounded-full bg-orange-500"></div>
              </div>
            ) : (
              <div className="text-white font-bold text-sm">VISA</div>
            )}
          </div>
        </Card>
      ))}

      <button
        onClick={onAddCardClick}
        className="border-2 border-dashed border-purple-600 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-purple-50 transition h-48"
      >
        <Plus className="w-8 h-8 text-purple-600" />
        <span className="text-purple-600 font-medium">Add new card</span>
      </button>
    </div>
  )
}
