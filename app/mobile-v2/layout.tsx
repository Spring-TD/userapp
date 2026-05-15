import React, { Suspense } from 'react';

import '@/app/storefront-brand.css';
import { MobileV2TenantProvider } from '@/contexts/MobileV2TenantContext';
import { MobileV2LayoutSkeleton } from '@/components/mobile-v2/data-skeletons';
import { MobileV2ThemedChrome } from '@/components/mobile-v2/MobileV2ThemedChrome';

export default function MobileV2Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <Suspense fallback={<MobileV2LayoutSkeleton />}>
        <MobileV2TenantProvider>
            <MobileV2ThemedChrome>{children}</MobileV2ThemedChrome>
        </MobileV2TenantProvider>
        </Suspense>
    );
}
