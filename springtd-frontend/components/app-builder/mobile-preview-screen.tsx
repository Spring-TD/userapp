"use client"

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Bell, ArrowRight, Repeat, Home, Wallet, ShoppingCart, Plus, Share, CreditCard, FileText, ArrowUpRight, ArrowDownLeft, Search, User, Menu, ScanLine } from 'lucide-react';

interface MobilePreviewScreenProps {
  screenType?: "landing" | "home";
  templateId?: string; // mobile-v1, mobile-v2, blank
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  logoUrl?: string;
}

export function MobilePreviewScreen({
  screenType = "home",
  templateId = "mobile-v1",
  primaryColor = "#7C3AED",
  secondaryColor = "#6B7280",
  fontFamily = "Inter",
  logoUrl
}: MobilePreviewScreenProps) {

  // Use template-specific colors if provided, otherwise defaults
  const themeColor = templateId === 'mobile-v2' ? '#2563EB' : primaryColor;

  if (screenType === "landing") {
    return (
      <div
        className="relative flex flex-col items-center justify-between h-full overflow-hidden rounded-[2.5rem] border-8 border-gray-900 shadow-2xl"
        style={{
          fontFamily,
          backgroundColor: templateId === 'mobile-v2' ? '#2563EB' : 'white'
        }}
      >
        {/* Status Bar */}
        <div className="absolute top-0 w-32 h-6 bg-black rounded-b-xl z-20 left-1/2 -translate-x-1/2"></div>

        {/* =========================================================================================
                 TEMPLATE V1 / BLANK: CLASSIC LANDING (White Theme)
                ========================================================================================= */}
        {(templateId === 'mobile-v1' || templateId === 'blank') && (
          <>
            {/* Background Decoration */}
            <div className="absolute top-[-20%] right-[-40%] w-[300px] h-[300px] rounded-full border border-gray-100 opacity-60 pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-40%] w-[250px] h-[250px] rounded-full border border-gray-100 opacity-60 pointer-events-none" />

            {/* Logo Area */}
            <div className="flex-1 flex flex-col items-center justify-center z-10 w-full">
              <div className="w-24 h-24 flex items-center justify-center text-primary animate-in zoom-in duration-700" style={{ color: themeColor }}>
                {logoUrl ? (
                  <img src={logoUrl} alt="App Logo" className="w-full h-full object-contain" />
                ) : (
                  // Simple Logo Placeholder
                  <svg viewBox="0 0 100 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                    {templateId === 'blank' ? (
                      <rect x="25" y="25" width="50" height="50" rx="10" stroke="currentColor" strokeWidth="4" fill="none" className="opacity-30" />
                    ) : (
                      <>
                        <path d="M50 20 L80 50 L50 80 L20 50 Z" fill="currentColor" fillOpacity="0.1" />
                        <circle cx="50" cy="50" r="15" fill="currentColor" />
                      </>
                    )}
                  </svg>
                )}
              </div>
              <h1 className="text-2xl font-bold mt-6 text-gray-900">
                {templateId === 'blank' ? 'Your App' : 'Finance App'}
              </h1>
              <p className="text-sm text-gray-500 mt-2">The future of banking</p>
            </div>

            {/* Bottom Action */}
            <div className="w-full p-8 z-10 mb-4">
              <div className="w-full h-12 rounded-full flex items-center justify-center text-white font-medium text-sm shadow-lg transition-transform hover:scale-[1.02]" style={{ backgroundColor: themeColor }}>
                Get Started
              </div>
              <div className="w-full h-12 mt-3 rounded-full flex items-center justify-center border border-gray-200 text-gray-600 font-medium text-sm">
                Log In
              </div>
            </div>
          </>
        )}

        {/* =========================================================================================
                 TEMPLATE V2: MODERN FINTECH LANDING (Blue/Color Theme)
                ========================================================================================= */}
        {templateId === 'mobile-v2' && (
          <>
            {/* Background Patterns */}
            <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl" />

            {/* Content */}
            <div className="flex-1 flex flex-col items-center justify-center z-10 w-full px-6 text-center">
              <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-xl mb-8 animate-in fly-in-bottom duration-700">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                  <ArrowUpRight className="text-white w-6 h-6" />
                </div>
              </div>

              <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
                Manage your money
              </h1>
              <p className="text-blue-100 text-sm leading-relaxed max-w-[200px]">
                Track, save, and invest with the world's most modern banking platform.
              </p>
            </div>

            {/* Bottom Action */}
            <div className="w-full p-8 z-10 bg-white rounded-t-[2.5rem] shadow-2xl animate-in slide-in-from-bottom duration-500">
              <div className="w-full h-14 rounded-2xl flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-200 bg-blue-600 mb-4">
                Create Free Account
              </div>
              <p className="text-center text-xs text-gray-500">
                Already have an account? <span className="font-bold text-blue-600">Login</span>
              </p>
            </div>
          </>
        )}
      </div>
    )
  }

  // Home Screen rendering remains similar but using the passed screenType prop
  return (
    <div
      className="flex flex-col h-full bg-white overflow-hidden rounded-[2.5rem] border-8 border-gray-900 relative shadow-2xl"
      style={{ fontFamily }}
    >
      {/* Status Bar */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-xl z-30"></div>

      {/* =========================================================================================
            TEMPLATE V1: CLASSIC BANKING (Purple Theme)
           ========================================================================================= */}
      {(templateId === 'mobile-v1' || templateId === 'blank') && (
        <>
          {/* Header */}
          <header className="flex justify-between items-center p-6 pt-12 bg-white sticky top-0 z-20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden border border-gray-200">
                <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500">
                  <User size={20} />
                </div>
              </div>
              <div className="text-gray-900">
                <span className="text-gray-400 text-xs block">Good Morning</span>
                <span className="font-bold text-sm">John Doe</span>
              </div>
            </div>
            <div className="p-2 rounded-full bg-gray-50 relative">
              <Bell className="text-gray-600 w-5 h-5" />
              <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-6 space-y-6 pb-20 no-scrollbar bg-gray-50 pt-2">
            {/* V1 Balance Card */}
            <Card className="p-6 rounded-[1.5rem] border-none shadow-lg text-white relative overflow-hidden" style={{ backgroundColor: themeColor }}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full -ml-10 -mb-10 blur-xl pointer-events-none"></div>

              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <p className="text-white/80 text-xs mb-1">Total Balance</p>
                    <h1 className="text-2xl font-bold">₦852,360.00</h1>
                  </div>
                  <div className="px-2 py-1 rounded-lg bg-white/20 backdrop-blur-md text-[10px] font-medium">VISA</div>
                </div>

                <div className="flex gap-3">
                  <button className="flex-1 bg-white text-gray-900 rounded-xl h-9 text-xs font-semibold shadow-sm">Add Money</button>
                  <button className="flex-1 bg-white/20 text-white backdrop-blur-sm rounded-xl h-9 text-xs font-semibold">Transfer</button>
                </div>
              </div>
            </Card>

            {/* V1 Quick Actions */}
            <div>
              <h3 className="font-bold text-gray-900 mb-3 text-sm px-1">Quick Actions</h3>
              <div className="grid grid-cols-4 gap-4">
                <ActionV1 icon={<Share size={18} />} label="Send" color={themeColor} />
                <ActionV1 icon={<Wallet size={18} />} label="Bill" color={themeColor} />
                <ActionV1 icon={<Repeat size={18} />} label="Swap" color={themeColor} />
                <ActionV1 icon={<Menu size={18} />} label="More" color={themeColor} />
              </div>
            </div>

            {/* V1 Transactions */}
            <div>
              <div className="flex justify-between items-center mb-3 px-1">
                <h3 className="font-bold text-gray-900 text-sm">Transactions</h3>
                <span className="text-xs font-medium" style={{ color: themeColor }}>View all</span>
              </div>
              <div className="space-y-3">
                <TransactionV1 title="Netflix Subscription" subtitle="Entertainment" amount="-₦4,500" icon={<ScanLine size={16} />} />
                <TransactionV1 title="John Smith" subtitle="Transfer" amount="+₦25,000" isPositive icon={<ArrowDownLeft size={16} />} />
                <TransactionV1 title="Electric Bill" subtitle="Utility" amount="-₦12,000" icon={<FileText size={16} />} />
              </div>
            </div>
          </div>
        </>
      )}


      {/* =========================================================================================
            TEMPLATE V2: MODERN FINTECH (Blue Theme)
           ========================================================================================= */}
      {templateId === 'mobile-v2' && (
        <>
          <div className="bg-[#2563EB] text-white pt-12 pb-24 px-6 rounded-b-[2.5rem] relative">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
              <div className="flex flex-col">
                <span className="text-white/70 text-xs">Total Balance</span>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold">₦1,240,500</h1>
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/10">
                <Bell size={18} />
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex justify-between gap-4">
              <div className="flex flex-col items-center gap-1">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-1 hover:bg-white/30 transition-colors">
                  <ArrowUpRight size={20} />
                </div>
                <span className="text-[10px] opacity-80">Send</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-1 hover:bg-white/30 transition-colors">
                  <Plus size={20} />
                </div>
                <span className="text-[10px] opacity-80">Topup</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-1 hover:bg-white/30 transition-colors">
                  <CreditCard size={20} />
                </div>
                <span className="text-[10px] opacity-80">Cards</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-1 hover:bg-white/30 transition-colors">
                  <Menu size={20} />
                </div>
                <span className="text-[10px] opacity-80">More</span>
              </div>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 -mt-16 overflow-y-auto px-6 space-y-6 pb-20 no-scrollbar pt-4">

            {/* Promo Banner */}
            <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Get 5% Cashback</h3>
                <p className="text-xs text-gray-500">On your first transaction</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <span className="text-lg">🎁</span>
              </div>
            </div>

            {/* V2 Transactions */}
            <div>
              <h3 className="font-bold text-gray-900 mb-4 text-sm mt-4">Recent Activity</h3>
              <div className="space-y-4">
                <TransactionV2 name="Uber Ride" date="Today, 9:41 AM" amount="-₦4,500" icon={<span className="text-lg">🚗</span>} />
                <TransactionV2 name="Spotify Premium" date="Yesterday" amount="-₦1,900" icon={<span className="text-lg">🎵</span>} />
                <TransactionV2 name="Salary Deposit" date="Mon, 24 Oct" amount="+₦450,000" isPositive icon={<span className="text-lg">💰</span>} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Helper Components for Previews
function ActionV1({ icon, label, color }: { icon: any, label: string, color: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors" style={{ color }}>
        {icon}
      </div>
      <span className="text-xs font-medium text-gray-600">{label}</span>
    </div>
  )
}

function TransactionV1({ title, subtitle, amount, icon, isPositive }: any) {
  return (
    <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500">
          {icon}
        </div>
        <div>
          <h4 className="text-xs font-bold text-gray-900">{title}</h4>
          <p className="text-[10px] text-gray-500">{subtitle}</p>
        </div>
      </div>
      <span className={`text-xs font-bold ${isPositive ? 'text-green-600' : 'text-gray-900'}`}>{amount}</span>
    </div>
  )
}

function TransactionV2({ name, date, amount, icon, isPositive }: any) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-100">
          {icon}
        </div>
        <div>
          <h4 className="text-sm font-bold text-gray-900">{name}</h4>
          <p className="text-xs text-gray-500">{date}</p>
        </div>
      </div>
      <span className={`text-sm font-bold ${isPositive ? 'text-green-600' : 'text-gray-900'}`}>{amount}</span>
    </div>
  )
}
