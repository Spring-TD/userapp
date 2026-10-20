'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TransactionHistoryDrawer } from '@/components/TransactionHistoryDrawer';

interface BillingRecord {
  date: string;
  amount: string;
  status: 'Successful' | 'Failed' | 'Pending';
  method: string;
  transactionId: string;
  downloadable: boolean;
}

const mockData: BillingRecord[] = [
  {
    date: '12/09/2025',
    amount: '₦10,000',
    status: 'Successful',
    method: 'Visa 5134',
    transactionId: '3456788944',
    downloadable: true,
  },
  {
    date: '12/09/2025',
    amount: '₦10,000',
    status: 'Failed',
    method: 'Bank transfer',
    transactionId: '3456788945',
    downloadable: false,
  },
  {
    date: '12/09/2025',
    amount: '₦10,000',
    status: 'Successful',
    method: 'Bank transfer',
    transactionId: '3456788946',
    downloadable: false,
  },
  {
    date: '12/09/2025',
    amount: '₦10,000',
    status: 'Pending',
    method: 'Mastercard 5031',
    transactionId: '3456788947',
    downloadable: true,
  },
   {
    date: '12/09/2025',
    amount: '₦200,000',
    status: 'Failed',
    method: 'Mastercard 5031',
    transactionId: '3456788947',
    downloadable: false,
  },
   {
    date: '12/09/2025',
    amount: '₦600,000',
    status: 'Successful',
    method: 'Verve card 5531',
    transactionId: '3456787998',
    downloadable: true,
  },
];

export function BillingHistoryTab() {
  const [open, setOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<BillingRecord | null>(null);

  function handleRowClick(record: BillingRecord) {
    setSelectedRecord(record);
    setOpen(true);
  }

  return (
    <div className="space-y-8">
      {/* Table */}
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-4 font-medium">Date</th>
              <th className="px-4 py-4 font-medium">Amount</th>
              <th className="px-4 py-4 font-medium">Status</th>
              <th className="px-4 py-4 font-medium">Payment Method</th>
              <th className="px-4 py-4 font-medium">Transaction ID</th>
              <th className="px-4 py-4 font-medium">Payment Link</th>
            </tr>
          </thead>
          <tbody>
            {mockData.map((row, idx) => (
              <tr
                key={idx}
                className="border-t cursor-pointer hover:bg-gray-50"
                onClick={() => handleRowClick(row)}
              >
                <td className="px-4 py-8">{row.date}</td>
                <td className="px-4 py-8">{row.amount}</td>
                <td className="px-4 py-8">
                  <Badge
                    className={cn(
                      row.status === 'Successful' && 'bg-green-100 text-green-700',
                      row.status === 'Failed' && 'bg-red-100 text-red-700',
                      row.status === 'Pending' && 'bg-yellow-100 text-yellow-700'
                    )}
                  >
                    {row.status}
                  </Badge>
                </td>
                <td className="px-4 py-3">{row.method}</td>
                <td className="px-4 py-3">{row.transactionId}</td>
                <td className="px-4 py-3">
                  {row.downloadable ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Download
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled
                      className="opacity-50 cursor-not-allowed"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Unavailable
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-center items-center gap-2">
        <Button size="sm" variant="outline">{'<'}</Button>
        <Button size="sm" variant="outline">1</Button>
        <Button size="sm" variant="outline">2</Button>
        <Button size="sm" variant="outline" className="bg-black text-white">3</Button>
        <Button size="sm" variant="outline">4</Button>
        <Button size="sm" variant="outline">5</Button>
        <Button size="sm" variant="outline">{'>'}</Button>
      </div>

      {/* Transaction Drawer */}
      {selectedRecord && (
        <TransactionHistoryDrawer
          open={open}
          onOpenChange={setOpen}
          record={selectedRecord}
          onDownload={() => {}}
          onShare={() => {}}
        />
      )}
    </div>
  );
}
