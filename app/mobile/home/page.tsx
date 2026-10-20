'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  Bell,
  ArrowRight,
  Repeat,
  Home,
  Wallet,
  ShoppingCart,
  Plus,
  Share,
  CreditCard,
  FileText,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useWalletBalance } from '@/hooks/useWalletBalance';
import { getAccessToken } from '@/lib/cookieAuth';
import MobileBottomNav from '../components/MobileBottomNav';
import { FundWalletDrawer } from '../components/FundWalletDrawer';

export default function HomePage() {
  const [isFundDrawerOpen, setIsFundDrawerOpen] = useState(false);
  const [displayName, setDisplayName] = useState('User');
  const { formattedBalance, loading: walletLoading } = useWalletBalance();

  useEffect(() => {
    try {
      const token = getAccessToken();
      if (!token) return;
      const payload = JSON.parse(atob(token.split('.')[1]));
      const name = payload.firstName || payload.name || payload.email?.split('@')[0] || 'User';
      setDisplayName(name);
    } catch {
      // no-op: fallback name already set
    }
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[#F3F3F3] pb-28">
      <header className="flex items-center justify-between p-6 pt-8">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 overflow-hidden rounded-full bg-gray-300">
            <img src="https://github.com/shadcn.png" alt="User" className="h-full w-full object-cover" />
          </div>
          <div className="text-gray-900">
            <span className="text-gray-500">Welcome </span>
            <span className="font-bold capitalize">{displayName}</span>
          </div>
        </div>
        <div className="relative">
          <Bell className="h-6 w-6 text-gray-600" />
          <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full border-2 border-gray-50 bg-red-500" />
        </div>
      </header>

      <div className="space-y-8 px-6">
        <Card className="overflow-hidden rounded-[2rem] border-none bg-[#1E5CE5] p-0 shadow-sm">
          <div className="rounded-[2rem] bg-white p-6 pb-4">
            <div className="mb-6 text-center">
              <p className="mb-1 text-sm text-gray-500">Wallet Balance</p>
              <div className="mb-6 flex items-center justify-center gap-2">
                {walletLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                ) : (
                  <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">{formattedBalance}</h1>
                )}
                <span className="rounded-full bg-[#EEF2FF] px-3 py-1 text-sm font-semibold text-[#1D4ED8]">4.00%</span>
              </div>
              <div className="flex gap-3">
                <Button
                  className="h-12 flex-1 rounded-full bg-gray-900 font-semibold text-white hover:bg-gray-800"
                  onClick={() => setIsFundDrawerOpen(true)}
                >
                  Fund Withdraw
                </Button>
                <Button variant="outline" className="h-12 flex-1 rounded-full border-gray-900 font-semibold text-gray-900">
                  Send
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between px-5 py-5 text-white">
            <div>
              <p className="mb-1 text-sm text-blue-100">Get some Earning...</p>
              <p className="text-lg font-semibold leading-tight">Check on your next advance</p>
            </div>
            <ArrowRight className="h-8 w-8 text-white" />
          </div>
        </Card>

        <div>
          <h3 className="mb-4 font-bold text-gray-900">Quick Actions</h3>
          <div className="grid grid-cols-4 gap-y-6">
            <QuickAction icon={<Repeat className="h-6 w-6" />} label="Loan" />
            <QuickAction icon={<Home className="h-6 w-6" />} label="Mortgage" />
            <QuickAction icon={<Wallet className="h-6 w-6" />} label="saving" />
            <QuickAction icon={<ShoppingCart className="h-6 w-6" />} label="Shop" />
            <QuickAction icon={<Plus className="h-6 w-6" />} label="Top Up" iconBg="bg-blue-600 text-white" />
            <QuickAction icon={<Share className="h-6 w-6" />} label="Send" />
            <QuickAction icon={<CreditCard className="h-6 w-6" />} label="Add card" />
            <QuickAction icon={<FileText className="h-6 w-6" />} label="orders" />
          </div>
        </div>

        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">History</h3>
            <Link href="/mobile/history" className="text-sm font-medium text-blue-600">
              See all
            </Link>
          </div>
          <div className="space-y-4">
            <HistoryRow type="Receive" name="Charles Boss" amount="N10,000.00" time="12.00 pm" positive />
            <HistoryRow type="Transfer" name="Chidi David" amount="N3000.00" time="12.00 pm" />
          </div>
        </div>
      </div>

      <MobileBottomNav />
      <FundWalletDrawer open={isFundDrawerOpen} onOpenChange={setIsFundDrawerOpen} />
    </div>
  );
}

function QuickAction({
  icon,
  label,
  iconBg = 'bg-blue-50 text-blue-600',
}: {
  icon: ReactNode;
  label: string;
  iconBg?: string;
}) {
  return (
    <button className="flex flex-col items-center gap-2">
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconBg}`}>{icon}</div>
      <span className="text-xs font-medium text-gray-800">{label}</span>
    </button>
  );
}

function HistoryRow({
  type,
  name,
  amount,
  time,
  positive = false,
}: {
  type: string;
  name: string;
  amount: string;
  time: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-400">{type}</p>
          <p className="text-xl font-semibold text-gray-800">{name}</p>
        </div>
        <div className="text-right">
          <p className={`text-xl font-semibold ${positive ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>{amount}</p>
          <p className="text-xs text-gray-400">{time}</p>
        </div>
      </div>
    </div>
  );
}
