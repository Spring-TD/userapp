"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, TrendingUp, FileText, Download, Loader2 } from "lucide-react"
import { billingService } from "@/lib/services/billing-service"
import type { Invoice, BillingStatus } from "@/types/billing"

interface BillingStat {
  title: string
  value: string
  change: string
  icon: typeof DollarSign
}

export function BillingOverviewTab() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [billingStats, setBillingStats] = useState<BillingStat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadBillingData()
  }, [])

  const loadBillingData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Load invoices from billing-ms
      const invoicesResponse = await billingService.getInvoices({ limit: 10 })
      if (invoicesResponse.data) {
        setInvoices(invoicesResponse.data)
      }
      
      // Calculate stats from invoices
      const loadedInvoices = invoicesResponse.data || []
      const currentBalance = loadedInvoices
        .filter(inv => inv.status === 'pending')
        .reduce((sum, inv) => sum + inv.amount, 0)
      const paidThisMonth = loadedInvoices
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + inv.amount, 0)
      const outstandingCount = loadedInvoices.filter(inv => inv.status === 'pending').length
      
      setBillingStats([
        {
          title: "Current Balance",
          value: `$${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
          change: "+12.5%",
          icon: DollarSign,
        },
        {
          title: "Monthly Spend",
          value: `$${paidThisMonth.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
          change: "+8.2%",
          icon: TrendingUp,
        },
        {
          title: "Outstanding Invoices",
          value: outstandingCount.toString(),
          change: "-2",
          icon: FileText,
        },
      ])
    } catch (err) {
      console.error('Failed to load billing data:', err)
      setError('Failed to load billing data')
      // Set fallback data
      setBillingStats([
        { title: "Current Balance", value: "$0.00", change: "--", icon: DollarSign },
        { title: "Monthly Spend", value: "$0.00", change: "--", icon: TrendingUp },
        { title: "Outstanding Invoices", value: "0", change: "--", icon: FileText },
      ])
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getInvoiceStatus = (status: Invoice['status']) => {
    switch (status) {
      case 'paid': return 'Paid'
      case 'pending': return 'Pending'
      case 'failed': return 'Overdue'
      case 'cancelled': return 'Cancelled'
      default: return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Paid":
        return "bg-green-100 text-green-800"
      case "Pending":
        return "bg-orange-100 text-orange-800"
      case "Overdue":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <p className="text-red-600">{error}</p>
            <Button onClick={loadBillingData} variant="outline" className="mt-2">
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      {!loading && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {billingStats.map((stat, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">{stat.title}</CardTitle>
                  <stat.icon className="h-4 w-4 text-gray-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-gray-600">
                    <span className="text-green-600">{stat.change}</span> from last month
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Recent Invoices */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No invoices found
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-5 gap-4 text-sm font-medium text-gray-700 pb-2 border-b">
                    <div>Invoice ID</div>
                    <div>Date</div>
                    <div>Amount</div>
                    <div>Status</div>
                    <div>Actions</div>
                  </div>
                  {invoices.map((invoice) => {
                    const statusLabel = getInvoiceStatus(invoice.status)
                    return (
                      <div key={invoice.id} className="grid grid-cols-5 gap-4 text-sm py-2">
                        <div className="font-medium">{invoice.id.substring(0, 11)}</div>
                        <div className="text-gray-600">{formatDate(invoice.createdAt)}</div>
                        <div className="font-medium">
                          {invoice.currency} ${invoice.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                        <div>
                          <Badge className={getStatusColor(statusLabel)}>{statusLabel}</Badge>
                        </div>
                        <div>
                          <Button variant="outline" size="sm">
                            <Download className="w-4 h-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
