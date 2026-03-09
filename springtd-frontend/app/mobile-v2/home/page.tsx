'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
    Bell,
    ChevronRight,
    Home,
    User,
    CreditCard,
    PieChart,
    Landmark,
    Briefcase,
    ShoppingCart,
    Plus,
    Send as SendIcon,
    FileText,
    Building2,
    Copy,
    X
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HomePage() {
    const [activeModal, setActiveModal] = useState<'none' | 'fund_options' | 'fund_bank' | 'account_details'>('none');

    const closeModal = () => setActiveModal('none');

    return (
        <div className="flex flex-col h-full bg-[#FAFAFA] relative overflow-y-auto no-scrollbar pb-24">
            {/* Header */}
            <div className="px-6 pt-12 pb-4 flex items-center justify-between">
                <div>
                    <h1 className="text-[19px] font-bold text-[#1E293B]">
                        Hello <span className="text-[#1E1B4B]">John</span>
                    </h1>
                    <p className="text-gray-500 text-[13px]">
                        Your finances are looking good
                    </p>
                </div>
                <button className="w-10 h-10 rounded-full bg-[#E0E7FF] flex items-center justify-center text-[#2563EB]">
                    <Bell className="w-5 h-5" />
                </button>
            </div>

            {/* Balance Card */}
            <div className="px-6 mb-6">
                <div className="relative w-full h-[220px] rounded-[30px] overflow-hidden shadow-xl shadow-blue-900/10">
                    {/* Background Image/Pattern */}
                    <div className="absolute inset-0 bg-[#1E40AF]">
                        <div className="absolute inset-0 opacity-10 bg-[url('/home-card-bg.png')] bg-cover bg-center mix-blend-overlay"></div>
                    </div>

                    <div className="relative z-10 flex flex-col items-center justify-center h-full text-white pt-4">
                        {/* Avatar in Card */}
                        <div className="w-12 h-12 rounded-full border-2 border-green-400/30 p-0.5 mb-3 bg-white/10 backdrop-blur-sm">
                            <div className="relative w-full h-full rounded-full overflow-hidden">
                                <Image src="/avatar-john.png" alt="User" fill className="object-cover" />
                            </div>
                        </div>

                        <span className="text-sm font-medium text-blue-100 mb-1">Your available balance is</span>
                        <h2 className="text-4xl font-bold mb-2">N20,983</h2>
                        <p className="text-[11px] text-blue-200 bg-black/10 px-3 py-1 rounded-full backdrop-blur-md">
                            By this time last month, you spent slightly higher (N22,719)
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Actions */}
            <div className="px-6 flex gap-4 mb-6">
                <button
                    onClick={() => setActiveModal('fund_options')}
                    className="flex-1 w-full h-12 rounded-full bg-[#1E1B4B] text-white hover:bg-[#1E1B4B]/90 text-[13px] font-semibold flex items-center justify-center"
                >
                    Fund/Withdraw
                </button>
                <button
                    onClick={() => setActiveModal('account_details')}
                    className="flex-1 w-full h-12 rounded-full bg-[#94A3B8] text-white hover:bg-[#94A3B8]/90 text-[13px] font-semibold flex items-center justify-center"
                >
                    Send
                </button>
            </div>

            {/* Promo/Sort Card */}
            <div className="px-6 mb-8">
                <div className="w-full h-[80px] bg-[#1E40AF] rounded-[24px] flex items-center px-4 relative overflow-hidden shadow-lg shadow-blue-900/5">
                    {/* Icon Box */}
                    <div className="w-10 h-10 rounded-xl bg-[#4F46E5] flex items-center justify-center text-white mr-4 shadow-inner">
                        <span className="text-lg font-bold">%</span>
                    </div>
                    <div className="flex-1 text-white">
                        <h3 className="font-semibold text-sm">Sort your transactions</h3>
                        <p className="text-[11px] text-blue-200">Get points for sorting your transactions</p>
                    </div>
                    <button className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white backdrop-blur-sm">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="px-6">
                <h3 className="font-bold text-[#1E293B] mb-4">Quick Actions</h3>
                <div className="grid grid-cols-4 gap-y-6 gap-x-2">
                    {[
                        { icon: <Briefcase className="w-6 h-6" />, label: "Loan", color: "text-[#2563EB]", link: "/mobile-v2/products/loan" },
                        { icon: <Home className="w-6 h-6" />, label: "Mortgage", color: "text-[#2563EB]", link: "/mobile-v2/products/mortgage" },
                        { icon: <Landmark className="w-6 h-6" />, label: "Saving", color: "text-[#2563EB]", link: "/mobile-v2/products/savings" },
                        { icon: <ShoppingCart className="w-6 h-6" />, label: "Shop", color: "text-[#2563EB]" },

                        { icon: <Plus className="w-6 h-6" />, label: "Top Up", color: "text-[#2563EB]" },
                        { icon: <SendIcon className="w-6 h-6" />, label: "Send", color: "text-[#2563EB]" },
                        { icon: <CreditCard className="w-6 h-6" />, label: "Add card", color: "text-[#2563EB]" },
                        { icon: <FileText className="w-6 h-6" />, label: "Orders", color: "text-[#2563EB]" },
                    ].map((item, idx) => {
                        const Content = (
                            <>
                                <div className="w-[50px] h-[50px] rounded-[18px] bg-white border border-gray-100 shadow-sm flex items-center justify-center text-[#2563EB] group-hover:bg-blue-50 transition-colors">
                                    {item.icon}
                                </div>
                                <span className="text-[11px] font-medium text-gray-500">{item.label}</span>
                            </>
                        );

                        return item.link ? (
                            <Link key={idx} href={item.link} className="flex flex-col items-center gap-2 group">
                                {Content}
                            </Link>
                        ) : (
                            <button key={idx} className="flex flex-col items-center gap-2 group">
                                {Content}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* --- MODALS --- */}

            {/* Backdrop */}
            {activeModal !== 'none' && (
                <div
                    className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={closeModal}
                />
            )}

            {/* Modal 1: Fund Options */}
            {activeModal === 'fund_options' && (
                <div className="absolute bottom-0 left-0 right-0 z-50 bg-white rounded-t-[30px] p-6 pb-12 animate-in slide-in-from-bottom duration-300">
                    <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-8" />
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-[#1E1B4B]">Choose ways to Fund wallet</h2>
                        <button onClick={closeModal}><X className="w-5 h-5 text-gray-400" /></button>
                    </div>
                    <div className="space-y-6">
                        <button
                            onClick={() => setActiveModal('fund_bank')}
                            className="flex items-start gap-4 w-full text-left group"
                        >
                            <div className="w-12 h-12 rounded-full bg-[#E0E7FF] flex items-center justify-center text-[#2563EB] shrink-0">
                                <Building2 className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-[#1E1B4B]">Add via bank transfer</h3>
                                <p className="text-sm text-gray-500 mt-1">Fund your account by sending money to your unique USD bank account</p>
                            </div>
                        </button>
                        <button className="flex items-start gap-4 w-full text-left group">
                            <div className="w-12 h-12 rounded-full bg-[#E0E7FF] flex items-center justify-center text-[#2563EB] shrink-0">
                                <CreditCard className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-[#1E1B4B]">Add via Card</h3>
                                <p className="text-sm text-gray-500 mt-1">Add funds from your card to your wallet.</p>
                            </div>
                        </button>
                    </div>
                </div>
            )}

            {/* Modal 2: Fund via Bank Details */}
            {activeModal === 'fund_bank' && (
                <div className="absolute bottom-0 left-0 right-0 z-50 bg-white rounded-t-[30px] p-6 pb-12 animate-in slide-in-from-bottom duration-300">
                    <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-8" />
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold text-[#1E1B4B] pr-8">Fund wallet via Bank Transfer</h2>
                        <button onClick={closeModal}><X className="w-5 h-5 text-gray-400" /></button>
                    </div>

                    <div className="space-y-6 mb-8">
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Account Holder</label>
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-[#1E1B4B]">Chidi Vera</span>
                                <Copy className="w-4 h-4 text-gray-400" />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Account Number</label>
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-[#1E1B4B]">1234567891</span>
                                <Copy className="w-4 h-4 text-gray-400" />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Bank Name</label>
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-[#1E1B4B]">AG Mortgage Bank</span>
                                <Copy className="w-4 h-4 text-gray-400" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#FEF3C7] rounded-xl p-4 text-[#92400E] text-xs leading-relaxed">
                        <p className="font-bold mb-2">Please take note of the following when sending money to your NGN account:</p>
                        <ul className="list-disc pl-4 space-y-1">
                            <li>The account can only receive funds in Nigeria Naira (NGN)</li>
                            <li>Payments will take a few mins to reflect.</li>
                            <li>There are no additional fees on deposits.</li>
                        </ul>
                    </div>
                </div>
            )}

            {/* Modal 3: Account Details (Triggered by Send button) */}
            {activeModal === 'account_details' && (
                <div className="absolute bottom-0 left-0 right-0 z-50 bg-white rounded-t-[30px] p-6 pb-12 animate-in slide-in-from-bottom duration-300">
                    <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-8" />
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-[#1E1B4B]">Account Details</h2>
                        <button onClick={closeModal}><X className="w-5 h-5 text-gray-400" /></button>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Account Type</label>
                            <h3 className="font-bold text-[#1E1B4B]">Savings Account</h3>
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Account Number</label>
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-[#1E1B4B]">7012345678</span>
                                <Copy className="w-4 h-4 text-gray-400" />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Bank Name</label>
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-[#1E1B4B]">AG Mortgage Bank</span>
                                <Copy className="w-4 h-4 text-gray-400" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Nav */}
            <div className="absolute bottom-6 left-6 right-6 h-[72px] bg-white rounded-[24px] shadow-[0_4px_30px_rgba(0,0,0,0.08)] flex items-center justify-around px-2 z-40">
                <button className="flex flex-col items-center gap-1 text-[#1E40AF]">
                    <Home className="w-6 h-6 fill-current" />
                    <span className="text-[10px] font-bold">Home</span>
                </button>
                {/* Linked to Accounts Page */}
                <Link href="/mobile-v2/accounts" className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors">
                    <User className="w-6 h-6" />
                    <span className="text-[10px] font-medium">Account</span>
                </Link>
                {/* Linked to Mortgage/Product Page */}
                <Link href="/mobile-v2/products/mortgage" className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors">
                    <Briefcase className="w-6 h-6" />
                    <span className="text-[10px] font-medium">Product</span>
                </Link>
                <Link href="/mobile-v2/profile" className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors">
                    <User className="w-6 h-6" />
                    <span className="text-[10px] font-medium">Profile</span>
                </Link>
            </div>

        </div>
    );
}
