'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
    ChevronLeft,
    User,
    Phone,
    Mail,
    HelpCircle,
    FileText,
    Shield,
    LifeBuoy,
    LogOut,
    ChevronRight,
    BadgeCheck,
    Home,
    Briefcase
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function ProfilePage() {
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    return (
        <div className="flex flex-col h-full bg-[#FAFAFA] relative">
            <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
                {/* Header */}
                <div className="pt-12 px-6 flex items-center mb-6">
                    <Link href="/mobile-v2/home" className="w-10 h-10 flex items-center justify-center -ml-2 text-gray-700">
                        <ChevronLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="flex-1 text-center text-lg font-bold text-[#1E293B] mr-8">Profile</h1>
                </div>

                <div className="px-6 space-y-6">
                    {/* Profile Card */}
                    <div className="bg-white rounded-[24px] p-4 flex items-center gap-4 shadow-sm border border-gray-100">
                        <div className="relative w-14 h-14 rounded-full overflow-hidden bg-gray-200">
                            <Image
                                src="/avatar-john.png"
                                alt="Profile"
                                fill
                                className="object-cover"
                            />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-[#1E293B]">Adedayo David</h2>
                            <div className="flex items-center gap-1 text-[#16A34A]">
                                <span className="text-xs font-medium">Identity Verified</span>
                                <BadgeCheck className="w-4 h-4 fill-current" />
                            </div>
                        </div>
                    </div>

                    {/* General Settings */}
                    <div>
                        <h3 className="text-sm font-bold text-[#1E293B] mb-3 ml-1">General Settings</h3>
                        <div className="bg-white rounded-[24px] overflow-hidden shadow-sm border border-gray-100">
                            <Link href="/mobile-v2/profile/edit">
                                <SettingItem icon={<User className="w-5 h-5" />} label="Name" />
                            </Link>
                            <Link href="/mobile-v2/profile/edit">
                                <SettingItem icon={<Shield className="w-5 h-5" />} label="Email" />
                            </Link>
                            <Link href="/mobile-v2/profile/edit">
                                <SettingItem icon={<Phone className="w-5 h-5" />} label="Phone Number" last />
                            </Link>
                        </div>
                    </div>

                    {/* Support & Legal */}
                    <div>
                        <h3 className="text-sm font-bold text-[#1E293B] mb-3 ml-1">Support & Legal</h3>
                        <div className="bg-white rounded-[24px] overflow-hidden shadow-sm border border-gray-100">
                            <Link href="/mobile-v2/profile/support">
                                <SettingItem icon={<LifeBuoy className="w-5 h-5" />} label="Contact Support" />
                            </Link>
                            <Link href="/mobile-v2/profile/faq">
                                <SettingItem icon={<HelpCircle className="w-5 h-5" />} label="FAQ" />
                            </Link>
                            <Link href="/mobile-v2/profile/reset-password/otp">
                                <SettingItem icon={<Shield className="w-5 h-5" />} label="Reset Password" />
                            </Link>
                            <Link href="/mobile-v2/profile/terms">
                                <SettingItem icon={<FileText className="w-5 h-5" />} label="Terms & Conditions" />
                            </Link>
                            <Link href="/mobile-v2/profile/privacy-policy">
                                <SettingItem icon={<FileText className="w-5 h-5" />} label="Privacy Policy" />
                            </Link>
                            <SettingItem icon={<FileText className="w-5 h-5" />} label="About" last />
                        </div>
                    </div>

                    {/* Account Control */}
                    <div>
                        <h3 className="text-sm font-bold text-[#1E293B] mb-3 ml-1">Account control</h3>
                        <div className="bg-white rounded-[24px] p-1 shadow-sm border border-gray-100">
                            <button
                                onClick={() => setShowLogoutModal(true)}
                                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors rounded-[20px]"
                            >
                                <div className="flex items-center gap-4 text-[#EF4444]">
                                    <LogOut className="w-5 h-5" />
                                    <span className="text-sm font-medium">Logout</span>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Nav */}
            <div className="absolute bottom-6 left-6 right-6 h-[72px] bg-white rounded-[24px] shadow-[0_4px_30px_rgba(0,0,0,0.08)] flex items-center justify-around px-2 z-40">
                <Link href="/mobile-v2/home" className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors">
                    <Home className="w-6 h-6" />
                    <span className="text-[10px] font-medium">Home</span>
                </Link>
                <Link href="/mobile-v2/accounts" className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors">
                    <User className="w-6 h-6" />
                    <span className="text-[10px] font-medium">Account</span>
                </Link>
                <Link href="/mobile-v2/products/savings" className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors">
                    <Briefcase className="w-6 h-6" />
                    <span className="text-[10px] font-medium">Product</span>
                </Link>
                <button className="flex flex-col items-center gap-1 text-[#1E40AF]">
                    <User className="w-6 h-6 fill-current" />
                    <span className="text-[10px] font-bold">Profile</span>
                </button>
            </div>

            {/* Logout Modal */}
            {showLogoutModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => setShowLogoutModal(false)}
                    />

                    {/* Modal */}
                    <div className="relative bg-white w-full max-w-[320px] rounded-[30px] p-6 flex flex-col items-center animate-in zoom-in-95 duration-200 z-50">
                        <div className="w-12 h-12 rounded-full bg-[#FEF2F2] flex items-center justify-center mb-4">
                            <LogOut className="w-6 h-6 text-[#EF4444]" />
                        </div>

                        <h2 className="text-lg font-bold text-[#1E293B] mb-2">Logout?</h2>
                        <p className="text-sm text-gray-500 text-center mb-8 px-4">
                            Are you sure to logout from your account?
                        </p>

                        <div className="flex gap-3 w-full">
                            <Button
                                onClick={() => setShowLogoutModal(false)}
                                className="flex-1 h-12 rounded-full bg-[#F3F4F6] hover:bg-gray-200 text-[#1E293B] font-semibold text-sm shadow-none"
                            >
                                No, Cancel
                            </Button>
                            <Button
                                onClick={() => {
                                    // Handle logout logic
                                    setShowLogoutModal(false);
                                }}
                                className="flex-1 h-12 rounded-full bg-[#EF4444] hover:bg-red-700 text-white font-semibold text-sm shadow-none"
                            >
                                Yes, logout
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function SettingItem({ icon, label, last }: { icon: React.ReactNode, label: string, last?: boolean }) {
    return (
        <div className={cn(
            "w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer",
            !last && "border-b border-gray-100"
        )}>
            <div className="flex items-center gap-4 text-gray-700">
                {icon}
                <span className="text-sm font-medium">{label}</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
        </div>
    );
}
