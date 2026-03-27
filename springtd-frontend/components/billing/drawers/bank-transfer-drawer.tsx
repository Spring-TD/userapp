'use client'

import { Drawer } from '@/components/drawer'
import { Button } from '@/components/ui/button'
import { Copy } from 'lucide-react'

interface BankTransferDrawerProps {
    isOpen: boolean
    onClose: () => void
}

export function BankTransferDrawer({ isOpen, onClose }: BankTransferDrawerProps) {
    const accountDetails = {
        accountNumber: '12345678910111',
        accountHolder: 'Grace Ayomide',
        bankName: 'SpringTB Bank',
    }

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text)
    }

    return (
        <Drawer
            open={isOpen}
            onOpenChange={onClose}
            title="Payment via Bank Transfer"
            subtitle="Make a transfer to your account details below"
        >
            <div className="space-y-6">
                <ol className="space-y-3 text-sm text-gray-700">
                    <li><span className="font-semibold">1. Open your Bank App</span></li>
                    <li><span className="font-semibold">2. Make payment into account details below:</span></li>
                </ol>

                <div className="border-2 border-dashed border-gray-300 p-6 rounded-lg space-y-3 bg-gray-50">
                    <div className="flex items-center justify-between">
                        <span className="font-mono text-lg font-bold text-gray-900">{accountDetails.accountNumber}</span>
                        <button
                            onClick={() => handleCopy(accountDetails.accountNumber)}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            <Copy className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="text-sm text-gray-600">{accountDetails.accountHolder}</div>
                    <div className="text-sm text-gray-600">{accountDetails.bankName}</div>
                </div>

                <ol start={3} className="space-y-3 text-sm text-gray-700">
                    <li><span className="font-semibold">3. Transfer money from the account of "Allowed users" with active KYC below.</span></li>
                    <li className="text-red-600"><span className="font-semibold">Third Party Funding is not allowed.</span></li>
                    <li className="font-semibold">4. Click "I have Paid". We will confirm payment and add the funds to your wallet.</li>
                </ol>

                <div className="flex gap-3 pt-6 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors"
                    >
                        I have paid
                    </button>
                </div>
            </div>
        </Drawer>
    )
}
