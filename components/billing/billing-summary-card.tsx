'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { billingService } from '@/lib/services/billing-service'
import { formatCurrency, formatDate, getRelativeTime } from '@/lib/utils/billing-utils'
import type { OneTimeBilling } from '@/types/billing'

export function BillingSummaryCard() {
  const [currentBill, setCurrentBill] = useState<OneTimeBilling | null>(null)
  const [upcomingBill, setUpcomingBill] = useState<OneTimeBilling | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBillingData()
  }, [])

  const fetchBillingData = async () => {
    try {
      setLoading(true)
      // Get user ID from localStorage or auth context
      const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') || 'current-user' : 'current-user'

      const response = await billingService.getOneTimeBillings({ limit: 10 })

      if (response.success && response.data) {
        const bills = response.data

        // Find current pending bill
        const pending = bills.find(b => b.status === 'pending')
        setCurrentBill(pending || null)

        // Find next upcoming bill (future due date)
        const upcoming = bills
          .filter(b => b.status === 'pending' && new Date(b.dueDate) > new Date())
          .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0]
        setUpcomingBill(upcoming || null)
      }
    } catch (err) {
      console.error('Error fetching billing data:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <Card className="bg-purple-600 text-white p-6 rounded-lg">
        <div>
          <h3 className="text-lg font-semibold mb-2">Current Bill</h3>
          {currentBill ? (
            <>
              <p className="text-purple-200 mb-3">Amount {formatCurrency(currentBill.amount, currentBill.currency)}</p>
              <div className="flex items-center gap-2">
                <span className="text-sm">Status</span>
                <span className="bg-yellow-400 text-black px-3 py-1 rounded-full text-xs font-semibold">
                  {currentBill.status.charAt(0).toUpperCase() + currentBill.status.slice(1)}
                </span>
              </div>
            </>
          ) : (
            <p className="text-purple-200">No current bills</p>
          )}
        </div>
      </Card>

      <Card className="bg-purple-600 text-white p-6 rounded-lg">
        <div>
          <h3 className="text-lg font-semibold mb-2">Upcoming Bills</h3>
          {upcomingBill ? (
            <>
              <p className="text-purple-200 mb-3">Amount {formatCurrency(upcomingBill.amount, upcomingBill.currency)}</p>
              <p className="text-sm">Due {getRelativeTime(upcomingBill.dueDate)}</p>
            </>
          ) : (
            <p className="text-purple-200">No upcoming bills</p>
          )}
        </div>
      </Card>
    </div>
  )
}

