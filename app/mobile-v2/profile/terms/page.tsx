'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { useMobileV2Tenant } from '@/contexts/MobileV2TenantContext';
import { externalUrl, manifestDocumentHtml, manifestDocumentTitle, supportFromManifest } from '@/lib/mobileManifestContent';

export default function TermsConditionsPage() {
    const { pwaManifest } = useMobileV2Tenant();
    const terms = pwaManifest?.policyTerms?.termsOfService;
    const support = supportFromManifest(pwaManifest);
    const title = manifestDocumentTitle(terms, 'Terms & Conditions');
    const html = manifestDocumentHtml(terms);
    const termsLink = externalUrl(support.termsAndConditionsLink);

    return (
        <div className="flex flex-col h-full sf-page-bg relative">
            <div className="flex-1 overflow-y-auto no-scrollbar pb-8">
                {/* Header */}
                <div className="pt-12 px-6 flex items-center mb-6 bg-white sticky top-0 z-10 border-b border-gray-50 pb-4">
                    <Link href="/mobile-v2/profile" className="w-10 h-10 flex items-center justify-center -ml-2 text-gray-700">
                        <ChevronLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="flex-1 text-center text-lg font-bold text-[#1E293B] mr-8">{title}</h1>
                </div>

                <div className="px-6 text-[#1E293B]">
                    {html ? (
                        <article
                            className="prose prose-sm max-w-none rounded-[24px] border border-gray-100 bg-white p-5 text-gray-600 shadow-sm"
                            dangerouslySetInnerHTML={{ __html: html }}
                        />
                    ) : termsLink ? (
                        <div className="rounded-[24px] border border-gray-100 bg-white p-6 text-center shadow-sm">
                            <p className="text-sm font-semibold text-[#1E293B]">Terms document</p>
                            <p className="mt-2 text-xs leading-relaxed text-gray-500">
                                The app owner configured the terms and conditions as an external document.
                            </p>
                            <a
                                href={termsLink}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-[var(--sf-button,#1E40AF)] px-5 text-sm font-semibold text-white"
                            >
                                Open Terms
                            </a>
                        </div>
                    ) : (
                        <div className="rounded-[24px] border border-gray-100 bg-white p-6 text-center shadow-sm">
                            <p className="text-sm font-semibold text-[#1E293B]">No terms configured</p>
                            <p className="mt-2 text-xs leading-relaxed text-gray-500">
                                The app owner has not added terms and conditions to this storefront manifest yet.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
