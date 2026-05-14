'use client';

import React from 'react';
import Link from 'next/link';
import {
    ChevronLeft,
    ChevronRight,
    LifeBuoy,
    Globe,
    MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ContactSupportPage() {
    return (
        <div className="flex flex-col h-full bg-[#FAFAFA] relative">
            <div className="flex-1 overflow-y-auto no-scrollbar">
                {/* Header */}
                <div className="pt-12 px-6 flex items-center mb-8">
                    <Link href="/mobile-v2/profile" className="w-10 h-10 flex items-center justify-center -ml-2 text-gray-700">
                        <ChevronLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="flex-1 text-center text-lg font-bold text-[#1E293B] mr-8">Contact Support</h1>
                </div>

                <div className="px-6 space-y-4">
                    {/* List */}
                    <div className="bg-white rounded-[24px] overflow-hidden shadow-sm border border-gray-100">
                        <SupportItem
                            icon={<LifeBuoy className="w-5 h-5" />}
                            label="Customer Support"
                        />
                        <SupportItem
                            icon={<Globe className="w-5 h-5" />}
                            label="Website"
                        />
                        <SupportItem
                            icon={<MessageSquare className="w-5 h-5" />}
                            label="WhatsApp"
                            last
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

function SupportItem({ icon, label, last }: { icon: React.ReactNode, label: string, last?: boolean }) {
    return (
        <button className={cn(
            "w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors",
            !last && "border-b border-gray-100"
        )}>
            <div className="flex items-center gap-4 text-gray-700">
                {icon}
                <span className="text-sm font-medium">{label}</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>
    );
}
