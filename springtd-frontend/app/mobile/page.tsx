'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { V1SplashScreen, V1OnboardingView } from '@/components/mobile-templates';
import { useMobileConfig } from '@/hooks/useMobileConfig';
import { Loader2 } from 'lucide-react';

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-full bg-white">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
    </div>
  );
}

function MobileV1Content() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showSplash, setShowSplash] = useState(true);

  // Get appId from URL params (e.g., /mobile?appId=xxx)
  const appId = searchParams.get('appId') || undefined;
  
  // Fetch configuration from backend
  const { config, loading } = useMobileConfig({ appId });

  const handleSignIn = () => {
    router.push('/mobile/auth/signup');
  };

  // Show loading state while fetching config
  if (loading || !config) {
    return <LoadingScreen />;
  }

  if (showSplash) {
    return (
      <V1SplashScreen
        logo={config.splash.logo}
        backgroundColor="#FFFFFF"
        textColor={config.theme.primaryColor}
        onComplete={() => setShowSplash(false)}
        autoAdvance={true}
        duration={2000}
      />
    );
  }

  return (
    <V1OnboardingView
      backgroundColor="#FFFFFF"
      textColor={config.theme.headerTextColor}
      buttonColor={config.theme.primaryColor}
      buttonTextColor="#FFFFFF"
      logo={config.splash.logo}
      onSignIn={handleSignIn}
      showDecorations={true}
    />
  );
}

export default function MobileLandingPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <MobileV1Content />
    </Suspense>
  );
}
