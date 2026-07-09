import React, { Suspense } from 'react';

import '@/app/storefront-brand.css';
import { MobileV2TenantProvider } from '@/contexts/MobileV2TenantContext';
import { MobileV2LayoutSkeleton } from '@/components/mobile-v2/data-skeletons';
import { MobileV2ThemedChrome } from '@/components/mobile-v2/MobileV2ThemedChrome';
import { MobileV2AuthGuard } from '@/components/mobile-v2/MobileV2AuthGuard';

export default function MobileV2Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <Suspense fallback={<MobileV2LayoutSkeleton />}>
        <MobileV2TenantProvider>
            <MobileV2ThemedChrome>
                <MobileV2AuthGuard>{children}</MobileV2AuthGuard>
            </MobileV2ThemedChrome>
        </MobileV2TenantProvider>
        </Suspense>
    );
}
