'use client';

import React from 'react';
import Link from 'next/link';
import {
    ChevronLeft,
    ChevronRight,
    LifeBuoy,
    Globe,
    MessageSquare,
    Phone,
    Mail,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMobileV2Tenant } from '@/contexts/MobileV2TenantContext';
import { externalUrl, mailto, supportFromManifest, tel, whatsappUrl } from '@/lib/mobileManifestContent';

export default function ContactSupportPage() {
    const { pwaManifest } = useMobileV2Tenant();
    const support = supportFromManifest(pwaManifest);
    const supportItems = [
        {
            icon: <Mail className="w-5 h-5" />,
            label: 'Email',
            value: support.contactEmail,
            href: mailto(support.contactEmail),
        },
        {
            icon: <Phone className="w-5 h-5" />,
            label: 'Phone',
            value: support.contactPhone,
            href: tel(support.contactPhone),
        },
        {
            icon: <Globe className="w-5 h-5" />,
            label: 'Website',
            value: support.website,
            href: externalUrl(support.website),
        },
        {
            icon: <MessageSquare className="w-5 h-5" />,
            label: 'WhatsApp',
            value: support.whatsapp || support.whatsappNumber,
            href: whatsappUrl(support.whatsapp || support.whatsappNumber),
        },
        {
            icon: <LifeBuoy className="w-5 h-5" />,
            label: 'LinkedIn',
            value: support.linkedinPage,
            href: externalUrl(support.linkedinPage),
        },
        {
            icon: <MessageSquare className="w-5 h-5" />,
            label: 'Instagram',
            value: support.instagramHandle,
            href: externalUrl(support.instagramHandle),
        },
        {
            icon: <MessageSquare className="w-5 h-5" />,
            label: 'Twitter',
            value: support.twitterHandle,
            href: externalUrl(support.twitterHandle),
        },
    ].filter((item) => item.value && item.href);

    return (
        <div className="flex flex-col h-full sf-page-bg relative">
            <div className="flex-1 overflow-y-auto no-scrollbar">
                {/* Header */}
                <div className="pt-12 px-6 flex items-center mb-8">
                    <Link href="/mobile-v2/profile" className="w-10 h-10 flex items-center justify-center -ml-2 text-gray-700">
                        <ChevronLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="flex-1 text-center text-lg font-bold text-[#1E293B] mr-8">Contact Support</h1>
                </div>

                <div className="px-6 space-y-4">
                    {supportItems.length > 0 ? (
                        <div className="bg-white rounded-[24px] overflow-hidden shadow-sm border border-gray-100">
                            {supportItems.map((item, index) => (
                                <SupportItem
                                    key={item.label}
                                    icon={item.icon}
                                    label={item.label}
                                    value={item.value || ''}
                                    href={item.href || ''}
                                    last={index === supportItems.length - 1}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-[24px] border border-gray-100 bg-white p-6 text-center shadow-sm">
                            <p className="text-sm font-semibold text-[#1E293B]">No support information configured</p>
                            <p className="mt-2 text-xs leading-relaxed text-gray-500">
                                The app owner has not added contact support details to this storefront manifest yet.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function SupportItem({
    icon,
    label,
    value,
    href,
    last,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    href: string;
    last?: boolean;
}) {
    return (
        <a
            href={href}
            target={href.startsWith('http') ? '_blank' : undefined}
            rel={href.startsWith('http') ? 'noreferrer' : undefined}
            className={cn(
            "w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors",
            !last && "border-b border-gray-100"
        )}>
            <div className="flex items-center gap-4 text-gray-700">
                {icon}
                <div className="min-w-0 text-left">
                    <span className="block text-sm font-medium">{label}</span>
                    <span className="block truncate text-xs text-gray-400">{value}</span>
                </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
        </a>
    );
}
