'use client'

import { useState, useEffect } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Download, Loader2 } from 'lucide-react'
import { billingService } from '@/lib/services/billing-service'
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils/billing-utils'
import type { Transaction } from '@/types/billing'

interface BillingHistoryTableProps {
  onTransactionClick: (transaction: any) => void
}

export function BillingHistoryTable({ onTransactionClick }: BillingHistoryTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalPages, setTotalPages] = useState(1)

  const itemsPerPage = 6

  useEffect(() => {
    fetchTransactions()
  }, [currentPage])

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await billingService.getTransactions({
        page: currentPage,
        limit: itemsPerPage,
      })

      if (response.success && response.data) {
        setTransactions(response.data)
        // Calculate total pages if pagination info is available
        setTotalPages(Math.max(1, Math.ceil(response.data.length / itemsPerPage)))
      } else {
        setTransactions([])
      }
    } catch (err: any) {
      console.error('Error fetching transactions:', err)
      setError(err.message || 'Failed to load transactions')
      setTransactions([])
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

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={fetchTransactions} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-2">No transactions found</p>
        <p className="text-sm text-gray-400">Your billing history will appear here</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="font-semibold text-foreground">Date</TableHead>
              <TableHead className="font-semibold text-foreground">Amount</TableHead>
              <TableHead className="font-semibold text-foreground">Status</TableHead>
              <TableHead className="font-semibold text-foreground">Payment Method</TableHead>
              <TableHead className="font-semibold text-foreground">Transaction ID</TableHead>
              <TableHead className="font-semibold text-foreground">Payment link</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map(tx => (
              <TableRow
                key={tx.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => onTransactionClick(tx)}
              >
                <TableCell className="py-4">{formatDate(tx.date || tx.createdAt)}</TableCell>
                <TableCell className="py-4">{formatCurrency(tx.amount, tx.currency)}</TableCell>
                <TableCell className="py-4">
                  <Badge className={`${getStatusColor(tx.status)} border-0`}>
                    {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell className="py-4">{tx.paymentMethod || 'N/A'}</TableCell>
                <TableCell className="py-4">{tx.transactionId}</TableCell>
                <TableCell className="py-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={tx.status !== 'successful'}
                    className="text-xs"
                  >
                    {tx.status === 'successful' ? (
                      <>
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </>
                    ) : (
                      'Unavailable'
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <Button
              key={page}
              variant={currentPage === page ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrentPage(page)}
              className="min-w-10"
            >
              {page}
            </Button>
          ))}

          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

