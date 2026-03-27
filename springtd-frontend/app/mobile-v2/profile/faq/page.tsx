'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

export default function FAQPage() {
    return (
        <div className="flex flex-col h-full bg-[#FAFAFA] relative">
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
                            className="h-12 pl-12 rounded-[12px] border-gray-200 bg-white"
                        />
                    </div>

                    {/* FAQ Items */}
                    <Accordion type="single" collapsible className="w-full space-y-4">
                        <div className="bg-white rounded-[24px] px-6 py-2 shadow-sm border border-gray-100">
                            <AccordionItem value="item-1" className="border-none">
                                <AccordionTrigger className="text-sm font-semibold text-[#1E293B] hover:no-underline">
                                    Why is SpringTD
                                </AccordionTrigger>
                                <AccordionContent className="text-xs text-gray-500 leading-relaxed">
                                    Lorem ipsum dolor sit amet consectetur. Rhoncus purus sed vestibulum dignissim libero tellus. Et vitae in eget dui id lectus parturient magna.
                                </AccordionContent>
                            </AccordionItem>
                        </div>

                        <div className="bg-white rounded-[24px] px-6 py-2 shadow-sm border border-gray-100">
                            <AccordionItem value="item-2" className="border-none">
                                <AccordionTrigger className="text-sm font-semibold text-[#1E293B] hover:no-underline">
                                    How does Mortgage Work?
                                </AccordionTrigger>
                                <AccordionContent className="text-xs text-gray-500 leading-relaxed">
                                    Lorem ipsum dolor sit amet consectetur. Rhoncus purus sed vestibulum dignissim libero tellus.
                                </AccordionContent>
                            </AccordionItem>
                        </div>

                        <div className="bg-white rounded-[24px] px-6 py-2 shadow-sm border border-gray-100">
                            <AccordionItem value="item-3" className="border-none">
                                <AccordionTrigger className="text-sm font-semibold text-[#1E293B] hover:no-underline">
                                    Who can use Mortgage?
                                </AccordionTrigger>
                                <AccordionContent className="text-xs text-gray-500 leading-relaxed">
                                    Detailed explanation about mortgage eligibility.
                                </AccordionContent>
                            </AccordionItem>
                        </div>

                        <div className="bg-white rounded-[24px] px-6 py-2 shadow-sm border border-gray-100">
                            <AccordionItem value="item-4" className="border-none">
                                <AccordionTrigger className="text-sm font-semibold text-[#1E293B] hover:no-underline">
                                    What is Product Builder?
                                </AccordionTrigger>
                                <AccordionContent className="text-xs text-gray-500 leading-relaxed">
                                    Information about the Product Builder feature.
                                </AccordionContent>
                            </AccordionItem>
                        </div>
                    </Accordion>
                </div>
            </div>
        </div>
    );
}
