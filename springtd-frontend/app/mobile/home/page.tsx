'use client';

import MobileBottomNav from '../components/MobileBottomNav';
import { Bell, ArrowRight, Repeat, Home, Wallet, ShoppingCart, Plus, Share, CreditCard, FileText, ArrowUpRight, ArrowDownLeft, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FundWalletDrawer } from '../components/FundWalletDrawer';
import { useWalletBalance } from '@/hooks/useWalletBalance';

export default function HomePage() {
  const [isFundDrawerOpen, setIsFundDrawerOpen] = useState(false);
  const { formattedBalance, loading: walletLoading } = useWalletBalance();

  // Extract user's name from JWT token
  const [displayName, setDisplayName] = useState('User');
  useEffect(() => {
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const name = payload.firstName || payload.name || payload.email?.split('@')[0] || 'User';
        setDisplayName(name);
      }
    } catch {
      // silently fail
    }
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="flex justify-between items-center p-6 pt-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-300 overflow-hidden">
            <img src="https://github.com/shadcn.png" alt="User" className="w-full h-full object-cover" />
          </div>
          <div className="text-gray-900">
            <span className="text-gray-500">Welcome </span>
            <span className="font-bold capitalize">{displayName}</span>
          </div>
        </div>
        <div className="relative">
          <Bell className="text-gray-600 w-6 h-6" />
          <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-gray-50"></span>
        </div>
      </header>

      <div className="px-6 space-y-6">
        {/* Balance Card */}
        <Card className="p-6 rounded-[2rem] border-none shadow-sm bg-white">
          <div className="text-center mb-6">
            <p className="text-gray-500 text-sm mb-1">Wallet Balance</p>
            <div className="flex items-center justify-center gap-2 mb-6">
              {walletLoading ? (
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              ) : (
                <h1 className="text-3xl font-bold text-gray-900">{formattedBalance}</h1>
              )}
            </div>
            <div className="flex gap-4">
              <Button
                className="flex-1 bg-gray-900 hover:bg-gray-800 text-white rounded-full h-12 font-medium"
                onClick={() => setIsFundDrawerOpen(true)}
              >
                Fund / Withdraw
              </Button>
              <Button variant="outline" className="flex-1 rounded-full h-12 font-medium border-gray-300">
                Send
              </Button>
            </div>
          </div>
        </Card>

        {/* Blue Banner */}
        <div className="bg-blue-600 rounded-2xl p-5 text-white flex justify-between items-center shadow-lg shadow-blue-200">
          <div>
            <p className="text-blue-100 text-sm mb-1">Get some Earning....</p>
            <p className="font-semibold text-lg">Check on your next advance</p>
          </div>
          <ArrowRight className="text-white w-6 h-6" />
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="font-bold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-4 gap-y-6">
            <QuickAction icon={<Repeat className="w-6 h-6" />} label="Loan" />
            <QuickAction icon={<Home className="w-6 h-6" />} label="Mortgage" />
            <QuickAction icon={<Wallet className="w-6 h-6" />} label="Saving" />
            <QuickAction icon={<ShoppingCart className="w-6 h-6" />} label="Shop" />
            <QuickAction icon={<Plus className="w-6 h-6" />} label="Top Up" iconBg="bg-blue-600 text-white" />
            <QuickAction icon={<Share className="w-6 h-6" />} label="Send" />
            <QuickAction icon={<CreditCard className="w-6 h-6" />} label="Add card" />
            <QuickAction icon={<FileText className="w-6 h-6" />} label="Orders" />
          </div>
        </div>

        {/* History */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-900 text-lg">History</h3>
            <button className="text-blue-600 text-sm font-medium">See all</button>
          </div>
          {/* TODO: Wire to userWalletApi.getUserTransactions(userId) — see P3-006 */}
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl text-center text-sm text-gray-400 shadow-sm">
              No transaction history yet
            </div>
          </div>
        </div>
      </div>

      <MobileBottomNav />
      <FundWalletDrawer open={isFundDrawerOpen} onOpenChange={setIsFundDrawerOpen} />
    </div>
  );
}

function QuickAction({ icon, label, iconBg = "bg-blue-50 text-blue-600" }: { icon: React.ReactNode, label: string, iconBg?: string }) {
  return (
    <button className="flex flex-col items-center gap-2">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBg}`}>
        {icon}
      </div>
      <span className="text-xs text-gray-600 font-medium">{label}</span>
    </button>
  );
}
