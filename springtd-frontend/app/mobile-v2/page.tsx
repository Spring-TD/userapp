'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { V2SplashScreen, V2OnboardingView } from '@/components/mobile-templates';
import { useMobileConfig } from '@/hooks/useMobileConfig';
import { Loader2 } from 'lucide-react';

function LoadingScreen() {
    return (
        <div className="flex items-center justify-center h-full bg-[#2563EB]">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
    );
}

function MobileV2Content() {
    const [showSplash, setShowSplash] = useState(true);
    const router = useRouter();
    const searchParams = useSearchParams();
    
    // Get appId from URL params (e.g., /mobile-v2?appId=xxx)
    const appId = searchParams.get('appId') || undefined;
    
    // Fetch configuration from backend
    const { config, loading } = useMobileConfig({ appId });

    const handleOnboardingComplete = () => {
        router.push('/mobile-v2/auth/login');
    };

    // Show loading state while fetching config
    if (loading || !config) {
        return <LoadingScreen />;
    }

    return (
        <>
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
