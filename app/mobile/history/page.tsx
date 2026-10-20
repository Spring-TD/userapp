'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import MobileBottomNav from '../components/MobileBottomNav';

const transactions = [
  { type: 'Receive', name: 'Charles Boss', amount: 'N10,000.00', time: '12.00 pm', positive: true },
  { type: 'Transfer', name: 'Chidi David', amount: 'N3000.00', time: '12.00 pm', positive: false },
  { type: 'Receive', name: 'Charles Boss', amount: 'N10,000.00', time: '12.00 pm', positive: true },
  { type: 'Transfer', name: 'Chidi David', amount: 'N3000.00', time: '12.00 pm', positive: false },
  { type: 'Receive', name: 'Charles Boss', amount: 'N10,000.00', time: '12.00 pm', positive: true },
  { type: 'Transfer', name: 'Chidi David', amount: 'N3000.00', time: '12.00 pm', positive: false },
  { type: 'Receive', name: 'Charles Boss', amount: 'N10,000.00', time: '12.00 pm', positive: true },
  { type: 'Transfer', name: 'Chidi David', amount: 'N3000.00', time: '12.00 pm', positive: false },
];

export default function MobileHistoryPage() {
  return (
    <div className="min-h-screen bg-[#F3F3F3] pb-28">
      <div className="px-6 pt-10">
        <div className="mb-4 flex items-center justify-between">
          <Link href="/mobile/home" className="h-9 w-9 flex items-center justify-center rounded-full text-gray-700">
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-[22px] font-semibold text-gray-900">History</h1>
          <button className="text-sm font-medium text-[#2563EB]">See all</button>
        </div>

        <div className="space-y-3">
          {transactions.map((tx, idx) => (
            <div key={`${tx.name}-${idx}`} className="rounded-2xl bg-white px-4 py-3 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] text-gray-400">{tx.type}</p>
                  <p className="mt-1 text-base font-semibold text-gray-900">{tx.name}</p>
                </div>
                <div className="text-right">
                  <p className={`text-base font-semibold ${tx.positive ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                    {tx.amount}
                  </p>
                  <p className="mt-1 text-[11px] text-gray-400">{tx.time}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
