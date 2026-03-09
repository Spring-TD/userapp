'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { BillingSummaryCard } from '@/components/billing/billing-summary-card'
import { PaymentMethodCard } from '@/components/billing/payment-method-card'
import { BillingHistoryTable } from '@/components/billing/billing-history-table'
import { CardsSection } from '@/components/billing/cards-section'
import { AddCardDrawer } from '@/components/billing/drawers/add-card-drawer'
import { SelectCardDrawer } from '@/components/billing/drawers/select-card-drawer'
import { BankTransferDrawer } from '@/components/billing/drawers/bank-transfer-drawer'
import { TransactionHistoryDrawer } from '@/components/billing/drawers/transaction-history-drawer'
import { SuccessModal } from '@/components/billing/modals/success-modal'

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState('billing-history')
  const [drawers, setDrawers] = useState({
    addCard: false,
    selectCard: false,
    bankTransfer: false,
    transactionHistory: false,
  })
  const [showSuccess, setShowSuccess] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null)

  const openDrawer = (drawer: keyof typeof drawers) => {
    setDrawers(prev => ({ ...prev, [drawer]: true }))
  }

  const closeDrawer = (drawer: keyof typeof drawers) => {
    setDrawers(prev => ({ ...prev, [drawer]: false }))
  }

  const handleTransactionClick = (transaction: any) => {
    setSelectedTransaction(transaction)
    openDrawer('transactionHistory')
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Billings</h1>
          <p className="text-muted-foreground">Control your integrations</p>
        </div>
        <Button className="bg-black hover:bg-black/90 text-white">
          Create Payment
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-transparent p-0 h-auto border-b border-gray-200">
          <TabsTrigger
            value="billing-history"
            className="px-0 py-3 mr-8 rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-[#7C3AED] data-[state=active]:bg-transparent data-[state=active]:shadow-none bg-transparent shadow-none"
          >
            Billing History
          </TabsTrigger>
          <TabsTrigger
            value="payment-method"
            className="px-0 py-3 mr-8 rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-[#7C3AED] data-[state=active]:bg-transparent data-[state=active]:shadow-none bg-transparent shadow-none"
          >
            Payment method
          </TabsTrigger>
        </TabsList>

        <TabsContent value="billing-history" className="space-y-6">
          <BillingHistoryTable onTransactionClick={handleTransactionClick} />
        </TabsContent>

        <TabsContent value="payment-method" className="space-y-6">
          <BillingSummaryCard />
          <PaymentMethodCard
            onCardPaymentClick={() => openDrawer('selectCard')}
            onBankTransferClick={() => openDrawer('bankTransfer')}
          />
          <div>
            <h2 className="text-xl font-semibold mb-4">Cards</h2>
            <CardsSection onAddCardClick={() => openDrawer('addCard')} />
          </div>
        </TabsContent>
      </Tabs>

      <AddCardDrawer
        isOpen={drawers.addCard}
        onClose={() => closeDrawer('addCard')}
        onSuccess={() => {
          closeDrawer('addCard')
          setShowSuccess(true)
        }}
      />

      <SelectCardDrawer
        isOpen={drawers.selectCard}
        onClose={() => closeDrawer('selectCard')}
        onAddCardClick={() => {
          closeDrawer('selectCard')
          openDrawer('addCard')
        }}
      />

      <BankTransferDrawer
        isOpen={drawers.bankTransfer}
        onClose={() => closeDrawer('bankTransfer')}
      />

      <TransactionHistoryDrawer
        isOpen={drawers.transactionHistory}
        transaction={selectedTransaction}
        onClose={() => closeDrawer('transactionHistory')}
      />

      <SuccessModal
        isOpen={showSuccess}
        onClose={() => setShowSuccess(false)}
      />
    </div>
  )
}
