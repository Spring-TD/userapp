'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, Globe, Info } from 'lucide-react';
import { useMobileV2Tenant } from '@/contexts/MobileV2TenantContext';
import { externalUrl, supportFromManifest } from '@/lib/mobileManifestContent';
import { pickManifestIconUrl, storefrontDisplayName } from '@/lib/webAppManifest';

export default function AboutPage() {
    const { pwaManifest, displayName, tenantSubdomain } = useMobileV2Tenant();
    const support = supportFromManifest(pwaManifest);
    const appName = displayName || storefrontDisplayName(pwaManifest) || 'This app';
    const description = pwaManifest?.description?.trim() || 'The app owner has not added an about description yet.';
    const icon = pickManifestIconUrl(pwaManifest);
    const website = externalUrl(support.website);

    return (
        <div className="flex flex-col h-full bg-[#FAFAFA] relative">
            <div className="flex-1 overflow-y-auto no-scrollbar pb-8">
                <div className="pt-12 px-6 flex items-center mb-6 bg-white sticky top-0 z-10 border-b border-gray-50 pb-4">
                    <Link href="/mobile-v2/profile" className="w-10 h-10 flex items-center justify-center -ml-2 text-gray-700">
                        <ChevronLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="flex-1 text-center text-lg font-bold text-[#1E293B] mr-8">About</h1>
                </div>

                <div className="px-6 space-y-4">
                    <section className="rounded-[28px] border border-gray-100 bg-white p-6 text-center shadow-sm">
                        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl bg-[var(--sf-tint,#E0E7FF)] text-[var(--sf-button,#1E40AF)]">
                            {icon ? (
                                <Image src={icon} alt={appName} width={80} height={80} className="h-full w-full object-cover" />
                            ) : (
                                <Info className="h-9 w-9" />
                            )}
                        </div>
                        <h2 className="text-lg font-bold text-[#1E293B]">{appName}</h2>
                        {tenantSubdomain ? <p className="mt-1 text-xs text-gray-400">{tenantSubdomain}</p> : null}
                        <p className="mt-4 text-sm leading-relaxed text-gray-500">{description}</p>
                    </section>

                    {website ? (
                        <a
                            href={website}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between rounded-[24px] border border-gray-100 bg-white p-5 shadow-sm"
                        >
                            <div className="flex min-w-0 items-center gap-4 text-gray-700">
                                <Globe className="h-5 w-5 shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-sm font-medium">Website</p>
                                    <p className="truncate text-xs text-gray-400">{support.website}</p>
                                </div>
                            </div>
                        </a>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
