'use client'

import { useState } from 'react'
import { Drawer } from '@/components/drawer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'
import paymentService from '@/lib/services/paymentService'

interface AddCardDrawerProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export function AddCardDrawer({ isOpen, onClose, onSuccess }: AddCardDrawerProps) {
    const [formData, setFormData] = useState({
        cardName: '',
        cardNumber: '',
        cvv: '',
        expiryDate: '',
        billingAddress: '',
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        
        try {
            // Parse expiry date (MM/YY format)
            const [expiryMonth, expiryYear] = formData.expiryDate.split('/')
            
            const response = await paymentService.methods.addPaymentMethod({
                type: 'card',
                cardNumber: formData.cardNumber.replace(/\s/g, ''),
                expiryMonth: expiryMonth?.trim() || '',
                expiryYear: expiryYear?.trim() || '',
                cardholderName: formData.cardName,
                setAsDefault: false,
            })
            
            if (response.success) {
                // Reset form
                setFormData({
                    cardName: '',
                    cardNumber: '',
                    cvv: '',
                    expiryDate: '',
                    billingAddress: '',
                })
                onSuccess()
            } else {
                setError('Failed to add card. Please try again.')
            }
        } catch (err) {
            console.error('Failed to add card:', err)
            setError('Failed to add card. Please check your details and try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Drawer
            open={isOpen}
            onOpenChange={onClose}
            title="Add Payment Method"
            subtitle="Enter your card details to add a new payment method"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-900 mb-3">
                        Card Name *
                    </label>
                    <Input
                        placeholder="Card Name"
                        value={formData.cardName}
                        onChange={(e) => setFormData({ ...formData, cardName: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent text-sm bg-gray-50 focus:bg-white transition-colors"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-900 mb-3">
                        Card Number *
                    </label>
                    <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-purple-600 transition-colors">
                        <div className="flex gap-1">
                            <div className="w-5 h-3 rounded-sm bg-red-500"></div>
                            <div className="w-5 h-3 rounded-sm bg-orange-500"></div>
                        </div>
                        <Input
                            placeholder="Card Number"
                            value={formData.cardNumber}
                            onChange={(e) => setFormData({ ...formData, cardNumber: e.target.value })}
                            className="border-0 flex-1 bg-transparent focus:ring-0 focus:outline-none"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-900 mb-3">
                        CVV *
                    </label>
                    <Input
                        placeholder="CVV"
                        value={formData.cvv}
                        onChange={(e) => setFormData({ ...formData, cvv: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent text-sm bg-gray-50 focus:bg-white transition-colors"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-900 mb-3">
                        Expiry Date *
                    </label>
                    <Input
                        placeholder="MM/YY"
                        value={formData.expiryDate}
                        onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent text-sm bg-gray-50 focus:bg-white transition-colors"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-900 mb-3">
                        Billing Address *
                    </label>
                    <Input
                        placeholder="Billing Address"
                        value={formData.billingAddress}
                        onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent text-sm bg-gray-50 focus:bg-white transition-colors"
                    />
                </div>

                <div className="flex gap-3 pt-6 border-t border-gray-100 mt-6">
                    {error && (
                        <p className="text-sm text-red-600 mb-2 w-full">{error}</p>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {loading ? 'Adding...' : 'Add Card'}
                    </button>
                </div>
            </form>
        </Drawer>
    )
}
