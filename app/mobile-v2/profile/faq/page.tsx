'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { useMobileV2Tenant } from '@/contexts/MobileV2TenantContext';
import { htmlToPlainText, manifestFaqItems } from '@/lib/mobileManifestContent';
import { sanitizeHtml } from '@/lib/sanitize';

export default function FAQPage() {
    const { pwaManifest } = useMobileV2Tenant();
    const [query, setQuery] = useState('');
    const configuredFaqs = manifestFaqItems(pwaManifest);
    const filteredFaqs = useMemo(() => {
        const needle = query.trim().toLowerCase();
        if (!needle) return configuredFaqs;
        return configuredFaqs.filter((item) => {
            const haystack = `${htmlToPlainText(item.questionHtml)} ${htmlToPlainText(item.answerHtml)}`.toLowerCase();
            return haystack.includes(needle);
        });
    }, [configuredFaqs, query]);

    return (
        <div className="flex flex-col h-full sf-page-bg relative">
            <div className="flex-1 overflow-y-auto no-scrollbar pb-8">
                {/* Header */}
                <div className="pt-12 px-6 flex items-center mb-6 bg-white sticky top-0 z-10 border-b border-gray-50 pb-4">
                    <Link href="/mobile-v2/profile" className="w-10 h-10 flex items-center justify-center -ml-2 text-gray-700">
                        <ChevronLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="flex-1 text-center text-lg font-bold text-[#1E293B] mr-8">FAQ</h1>
                </div>

                <div className="px-6 space-y-6">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                            placeholder="Search"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            className="h-12 pl-12 rounded-[12px] border-gray-200 bg-white"
                        />
                    </div>

                    {filteredFaqs.length > 0 ? (
                        <Accordion type="single" collapsible className="w-full space-y-4">
                            {filteredFaqs.map((item, index) => (
                                <div key={item.id || index} className="bg-white rounded-[24px] px-6 py-2 shadow-sm border border-gray-100">
                                    <AccordionItem value={item.id || `item-${index}`} className="border-none">
                                        <AccordionTrigger className="text-left text-sm font-semibold text-[#1E293B] hover:no-underline">
                                            <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.questionHtml || 'Question') }} />
                                        </AccordionTrigger>
                                        <AccordionContent className="text-xs text-gray-500 leading-relaxed">
                                            <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.answerHtml || 'No answer configured.') }} />
                                        </AccordionContent>
                                    </AccordionItem>
                                </div>
                            ))}
                        </Accordion>
                    ) : (
                        <div className="rounded-[24px] border border-gray-100 bg-white p-6 text-center shadow-sm">
                            <p className="text-sm font-semibold text-[#1E293B]">No FAQ configured</p>
                            <p className="mt-2 text-xs leading-relaxed text-gray-500">
                                The app owner has not added FAQ items to this storefront manifest yet.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
