'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Transaction = {
    id: string;
    type: 'Receive' | 'Transfer';
    name: string;
    amount: number;
    time: string;
};

const TRANSACTIONS: Transaction[] = [
    { id: '1', type: 'Receive', name: 'Charles Boss', amount: 10000.00, time: '12.00 pm' },
    { id: '2', type: 'Transfer', name: 'Chidi David', amount: 3000.00, time: '12.00 pm' },
    { id: '3', type: 'Receive', name: 'Charles Boss', amount: 10000.00, time: '12.00 pm' },
    { id: '4', type: 'Transfer', name: 'Chidi David', amount: 3000.00, time: '12.00 pm' },
    { id: '5', type: 'Receive', name: 'Charles Boss', amount: 10000.00, time: '12.00 pm' },
    { id: '6', type: 'Transfer', name: 'Chidi David', amount: 3000.00, time: '12.00 pm' },
    { id: '7', type: 'Receive', name: 'Charles Boss', amount: 10000.00, time: '12.00 pm' },
    { id: '8', type: 'Transfer', name: 'Chidi David', amount: 3000.00, time: '12.00 pm' },
];

export default function TransactionsPage() {
    return (
        <div className="flex flex-col h-full bg-[#FAFAFA] relative">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-12 pb-4 bg-white border-b border-gray-100">
                <Link href="/mobile-v2/home" className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
                    <ChevronLeft className="w-6 h-6 text-[#1E293B]" />
                </Link>
                <h1 className="text-base font-semibold text-[#1E293B]">Transactions</h1>
                <button className="p-2 -mr-2 text-gray-400 hover:text-gray-600">
                    <Filter className="w-5 h-5" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {/* Search Bar Placeholder (Optional based on design, but good UX) */}
                <div className="bg-white rounded-2xl h-12 flex items-center px-4 mb-4 shadow-sm border border-gray-50">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500 mr-3"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                    <input
                        type="text"
                        placeholder="Search transactions"
                        className="flex-1 bg-transparent border-none focus:outline-none text-sm placeholder-gray-400"
                    />
                </div>

                {TRANSACTIONS.map((tx) => (
                    <div key={tx.id} className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-gray-50/50">
                        <div>
                            <p className="text-[11px] text-gray-400 font-medium mb-0.5">{tx.type}</p>
                            <h3 className="text-sm font-semibold text-[#1E1B4B]">{tx.name}</h3>
                        </div>
                        <div className="text-right">
                            <p className={`text-sm font-bold ${tx.type === 'Receive' ? 'text-green-500' : 'text-red-500'}`}>
                                {tx.type === 'Receive' ? '+' : '-'} N{tx.amount.toLocaleString()}
                            </p>
                            <p className="text-[11px] text-gray-400 font-medium mt-0.5">{tx.time}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
