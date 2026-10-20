'use client'

import { useState, useEffect } from 'react'
import { Drawer } from '@/components/drawer'
import { Button } from '@/components/ui/button'
import { ArrowRight, Loader2 } from 'lucide-react'
import paymentService from '@/lib/services/paymentService'
import type { PaymentMethod } from '@/lib/services/paymentService'

interface SelectCardDrawerProps {
    isOpen: boolean
    onClose: () => void
    onAddCardClick: () => void
    onPayClick?: (cardId: string) => void
}

export function SelectCardDrawer({ isOpen, onClose, onAddCardClick, onPayClick }: SelectCardDrawerProps) {
    const [selectedCard, setSelectedCard] = useState<string | null>(null)
    const [cards, setCards] = useState<PaymentMethod[]>([])
    const [loading, setLoading] = useState(true)
    const [paying, setPaying] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (isOpen) {
            loadCards()
        }
    }, [isOpen])

    const loadCards = async () => {
        try {
            setLoading(true)
            setError(null)
            const response = await paymentService.methods.getPaymentMethods()
            if (response.data) {
                // Filter to only card type payment methods
                const cardMethods = response.data.filter(m => m.type === 'card')
                setCards(cardMethods)
                // Auto-select default card if available
                const defaultCard = cardMethods.find(c => c.isDefault)
                if (defaultCard) {
                    setSelectedCard(defaultCard.id)
                } else if (cardMethods.length > 0) {
                    setSelectedCard(cardMethods[0].id)
                }
            }
        } catch (err) {
            console.error('Failed to load cards:', err)
            setError('Failed to load payment methods')
        } finally {
            setLoading(false)
        }
    }

    const handlePay = async () => {
        if (!selectedCard) return
        
        setPaying(true)
        try {
            if (onPayClick) {
                onPayClick(selectedCard)
            }
            onClose()
        } finally {
            setPaying(false)
        }
    }

    const formatCardNumber = (card: PaymentMethod) => {
        if (card.details?.brand && card.details?.last4) {
            return `${card.details.brand.toUpperCase()} **** **** **${card.details.last4}`
        }
        return 'Card ****'
    }

    const formatExpiry = (card: PaymentMethod) => {
        if (card.details?.expiryMonth && card.details?.expiryYear) {
            return `${String(card.details.expiryMonth).padStart(2, '0')}/${String(card.details.expiryYear).slice(-2)}`
        }
        return '--/--'
    }

    return (
        <Drawer
            open={isOpen}
            onOpenChange={onClose}
            title="Select Card"
            subtitle="Choose a card to complete your payment"
        >
            <div className="space-y-6">
                {/* Loading State */}
                {loading && (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                    </div>
                )}

                {/* Error State */}
                {error && !loading && (
                    <div className="text-center py-4">
                        <p className="text-red-600 mb-2">{error}</p>
                        <Button onClick={loadCards} variant="outline" size="sm">
                            Retry
                        </Button>
                    </div>
                )}

                {/* Cards List */}
                {!loading && !error && (
                    <div className="space-y-4">
                        {cards.length === 0 ? (
                            <p className="text-center text-gray-500 py-4">No cards added yet</p>
                        ) : (
                            cards.map(card => (
                                <div
                                    key={card.id}
                                    onClick={() => setSelectedCard(card.id)}
                                    className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                                >
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedCard === card.id ? 'border-purple-600 bg-purple-600' : 'border-gray-300'}`}>
                                        {selectedCard === card.id && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-gray-900">{formatCardNumber(card)}</div>
                                        <div className="text-sm text-gray-600">VALID THRU {formatExpiry(card)}</div>
                                    </div>
                                    {card.isDefault && <span className="text-xs bg-gray-200 px-2 py-1 rounded">DEFAULT</span>}
                                </div>
                            ))
                        )}

                        <button
                            onClick={onAddCardClick}
                            className="flex items-center justify-center gap-2 w-full p-4 border border-dashed border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
                        >
                            <span>Add new card</span>
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                )}

                <div className="flex gap-3 pt-6 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={paying}
                        className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handlePay}
                        disabled={!selectedCard || paying || loading}
                        className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {paying && <Loader2 className="w-4 h-4 animate-spin" />}
                        {paying ? 'Processing...' : 'Pay'}
                    </button>
                </div>
            </div>
        </Drawer>
    )
}
