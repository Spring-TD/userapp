"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { billingService } from "@/lib/services/billing-service"
import type { Transaction } from "@/types/billing"

interface UsageItem {
  name: string
  usage: number
  limit: number
  unit: string
}

export function BillingUsageTab() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [usageData, setUsageData] = useState<UsageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadUsageData()
  }, [])

  const loadUsageData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Load transactions from billing-ms
      const transactionsResponse = await billingService.getTransactions({ limit: 50 })
      if (transactionsResponse.data) {
        setTransactions(transactionsResponse.data)
      }
      
      // Calculate usage metrics from transactions
      const loadedTransactions = transactionsResponse.data || []
      const totalPayments = loadedTransactions.filter(t => t.type === 'payment').length
      const totalTransfers = loadedTransactions.filter(t => t.type === 'transfer').length
      const totalAmount = loadedTransactions.reduce((sum, t) => sum + t.amount, 0)
      
      setUsageData([
        { name: 'API Calls', usage: totalPayments * 10, limit: 10000, unit: 'calls' },
        { name: 'Transactions', usage: loadedTransactions.length, limit: 1000, unit: 'txns' },
        { name: 'Data Transfer', usage: Math.round(totalTransfers * 2.5), limit: 100, unit: 'GB' },
        { name: 'Volume Processed', usage: Math.round(totalAmount / 100), limit: 100000, unit: 'USD' },
      ])
    } catch (err) {
      console.error('Failed to load usage data:', err)
      setError('Failed to load usage data')
      // Set fallback empty data
      setUsageData([
        { name: 'API Calls', usage: 0, limit: 10000, unit: 'calls' },
        { name: 'Transactions', usage: 0, limit: 1000, unit: 'txns' },
        { name: 'Data Transfer', usage: 0, limit: 100, unit: 'GB' },
        { name: 'Volume Processed', usage: 0, limit: 100000, unit: 'USD' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const getUsagePercentage = (usage: number, limit: number) => {
    return Math.min((usage / limit) * 100, 100)
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 70) return 'bg-orange-500'
    return 'bg-green-500'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
            <Button onClick={loadUsageData} variant="outline" className="mt-2">
              Retry
            </Button>
          </div>
        )}

        {/* Usage Data */}
        {!loading && !error && (
          <div className="space-y-6">
            {usageData.map((item, index) => {
              const percentage = getUsagePercentage(item.usage, item.limit)
              return (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-gray-600">
                      {item.usage.toLocaleString()} / {item.limit.toLocaleString()} {item.unit}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${getUsageColor(percentage)}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
            
            {/* Transaction Summary */}
            {transactions.length > 0 && (
              <div className="mt-8 pt-6 border-t">
                <h4 className="font-medium mb-4">Recent Activity</h4>
                <div className="space-y-2">
                  {transactions.slice(0, 5).map((txn) => (
                    <div key={txn.id} className="flex justify-between text-sm py-2 border-b border-gray-100">
                      <span className="capitalize">{txn.type}</span>
                      <span className="font-medium">${txn.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {usageData.every(item => item.usage === 0) && (
              <div className="text-center py-4 text-gray-500">
                No usage data available yet
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
