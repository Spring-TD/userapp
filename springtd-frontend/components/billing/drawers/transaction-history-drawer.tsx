'use client'

import { Drawer } from '@/components/drawer'
import { Button } from '@/components/ui/button'
import { Download, Share2 } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

interface TransactionHistoryDrawerProps {
    isOpen: boolean
    transaction: any
    onClose: () => void
}

export function TransactionHistoryDrawer({ isOpen, transaction, onClose }: TransactionHistoryDrawerProps) {
    if (!transaction) return null

    return (
        <Drawer
            open={isOpen}
            onOpenChange={onClose}
            title={`Transaction ${transaction.transactionId || transaction.id}`}
            subtitle="View complete transaction details"
        >
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <p className="text-sm text-gray-600 mb-1">Payment for</p>
                        <p className="font-semibold text-gray-900">Loan product creation</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600 mb-1">Amount</p>
                        <p className="font-semibold text-lg text-gray-900">₦50,000.00</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600 mb-1">Transaction ID</p>
                        <p className="font-semibold text-gray-900">{transaction.transactionId || transaction.id}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600 mb-1">Date</p>
                        <p className="font-semibold text-gray-900">{transaction.date || 'Sep 12, 2025'}</p>
                    </div>
                </div>

                <div>
                    <p className="text-sm text-gray-600 mb-1">Status</p>
                    <p className={`font-semibold ${transaction.status === 'successful' || transaction.status === 'Successful'
                            ? 'text-green-600'
                            : transaction.status === 'failed' || transaction.status === 'Failed'
                                ? 'text-red-600'
                                : 'text-orange-600'
                        }`}>
                        {transaction.status || 'Successful'}
                    </p>
                </div>

                <div>
                    <p className="text-sm text-gray-600 mb-3">Initiated by</p>
                    <div className="flex items-center gap-3">
                        <Avatar>
                            <AvatarImage src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=40&h=40&fit=crop" />
                            <AvatarFallback>GA</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-semibold text-gray-900">Grace Ayo</p>
                            <p className="text-sm text-gray-600">grace.yo@spring.td</p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 pt-6 border-t border-gray-100">
                    <button
                        type="button"
                        className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        Download
                    </button>
                    <button
                        type="button"
                        className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <Share2 className="w-4 h-4" />
                        Share
                    </button>
                </div>
            </div>
        </Drawer>
    )
}
