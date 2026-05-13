'use client';

import React, { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { V2SplashScreen, V2OnboardingView } from '@/components/mobile-templates';
import { StorefrontPwaInstall } from '@/components/mobile-v2/StorefrontPwaInstall';
import { useMobileConfig } from '@/hooks/useMobileConfig';
import { useMobileV2Tenant } from '@/contexts/MobileV2TenantContext';
import { Loader2 } from 'lucide-react';

function LoadingScreen() {
    return (
        <div className="flex items-center justify-center h-full bg-[#2563EB]">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
    );
}

/** Resolves tenant (host subdomain, ?appId, ?subdomain, session) before loading config. */
function MobileV2Content() {
    const { appId, ready, error } = useMobileV2Tenant();

    if (!ready) {
        return <LoadingScreen />;
    }

    return <MobileV2Configured appId={appId ?? undefined} resolveNote={error} />;
}

function MobileV2Configured({
    appId,
    resolveNote,
}: {
    appId?: string;
    resolveNote: string | null;
}) {
    const [showSplash, setShowSplash] = useState(true);
    const router = useRouter();

    const { config, loading } = useMobileConfig({ appId });

    const handleOnboardingComplete = () => {
        router.push('/mobile-v2/auth/login');
    };

    if (loading || !config) {
        return <LoadingScreen />;
    }

    const installAppId = appId ?? config.appId ?? undefined;

    return (
        <>
            {resolveNote ? (
                <p className="sr-only" role="status">
                    {resolveNote}
                </p>
            ) : null}
            <AnimatePresence>
                {showSplash && (
                    <V2SplashScreen
                        logo={config.splash.logo}
                        appName={config.appName}
                        backgroundColor={config.splash.backgroundColor}
                        textColor={config.splash.textColor}
                        onComplete={() => setShowSplash(false)}
                        autoAdvance={true}
                        duration={2500}
                    />
                )}
            </AnimatePresence>
            {!showSplash && (
                <V2OnboardingView
                    steps={config.onboarding.steps}
                    backgroundColor={config.onboarding.backgroundColor}
                    textColor={config.onboarding.textColor}
                    secondaryTextColor={config.onboarding.secondaryTextColor}
                    buttonColor={config.onboarding.buttonColor}
                    buttonTextColor={config.onboarding.buttonTextColor}
                    onComplete={handleOnboardingComplete}
                    onSkip={handleOnboardingComplete}
                    leadingSlot={<StorefrontPwaInstall installAppId={installAppId} />}
                />
            )}
        </>
    );
}

export default function MobileV2Home() {
    return (
        <Suspense fallback={<LoadingScreen />}>
            <MobileV2Content />
        </Suspense>
    );
}
