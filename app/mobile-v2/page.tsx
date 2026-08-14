'use client';

import React, { useState, Suspense, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { V2SplashScreen, V2OnboardingView } from '@/components/mobile-templates';
import { StorefrontPwaInstall } from '@/components/mobile-v2/StorefrontPwaInstall';
import type { MobileAppConfig } from '@/hooks/useMobileConfig';
import { useMobileV2Tenant } from '@/contexts/MobileV2TenantContext';
import { applyManifestToMobileAppConfig, emptyMobileShellConfig } from '@/lib/webAppManifest';
import { Loader2 } from 'lucide-react';

function LoadingScreen() {
    return (
        <div className="flex items-center justify-center h-full bg-[var(--sf-shell,#2563EB)]">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
    );
}

/**
 * Splash / onboarding come only from resolve `pwaManifest` (app_builder + W3C).
 * Do not fetch `/api/apps/.../configuration/public` — that route is a dummy fallback.
 */
function MobileV2Content() {
    const { appId, pwaManifest, branding, error: resolveNote, ready: tenantReady } = useMobileV2Tenant();

    const effectiveAppId = appId ?? undefined;

    const mergedConfig = useMemo(() => {
        const base = applyManifestToMobileAppConfig(
            emptyMobileShellConfig(appId),
            pwaManifest,
            null,
        );
        const kycLogo = branding?.companyLogoUrl?.trim();
        const kycName = branding?.companyName?.trim();
        return {
            ...base,
            splash: {
                ...base.splash,
                logo: base.splash.logo || kycLogo,
            },
            appName: base.appName || kycName || "",
        };
    }, [appId, pwaManifest, branding]);

    if (!tenantReady) {
        return <LoadingScreen />;
    }

    return (
        <MobileV2Configured
            config={mergedConfig}
            resolveNote={resolveNote}
            installAppId={effectiveAppId}
        />
    );
}

function MobileV2Configured({
    config,
    resolveNote,
    installAppId,
}: {
    config: MobileAppConfig;
    resolveNote: string | null;
    installAppId?: string;
}) {
    const [showSplash, setShowSplash] = useState(true);
    const router = useRouter();

    const handleOnboardingComplete = () => {
        router.push('/mobile-v2/auth/signup');
    };

    const handleOnboardingSignIn = () => {
        router.push('/mobile-v2/auth/login');
    };

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
                        image={config.splash.image}
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
                    logo={config.splash.logo || config.splash.image}
                    appName={config.appName}
                    backgroundColor={config.onboarding.backgroundColor}
                    textColor={config.onboarding.textColor}
                    secondaryTextColor={config.onboarding.secondaryTextColor}
                    buttonColor={config.onboarding.buttonColor}
                    buttonTextColor={config.onboarding.buttonTextColor}
                    onComplete={handleOnboardingComplete}
                    onSignIn={handleOnboardingSignIn}
                    onSkip={handleOnboardingSignIn}
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
