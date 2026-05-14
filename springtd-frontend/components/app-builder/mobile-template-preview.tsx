"use client"

import React from 'react';
import { V1SplashScreen, V1OnboardingView, V2SplashScreen, V2OnboardingView } from '@/components/mobile-templates';
import type { MobileAppConfig, OnboardingStep as ConfigOnboardingStep } from '@/hooks/useMobileConfig';

// Re-export types for convenience
export type { MobileAppConfig };

interface MobileTemplatePreviewProps {
    templateId?: string;
    screenType?: "splash" | "onboarding";
    // Use the same MobileAppConfig structure as the actual mobile templates
    appConfig?: MobileAppConfig;
    // For onboarding preview, which step to show
    currentStep?: number;
}

// Default config matching the actual mobile templates
const DEFAULT_V1_CONFIG: MobileAppConfig = {
    appId: null,
    appName: 'Classic Banking',
    splash: {
        logo: undefined,
        backgroundColor: '#FFFFFF',
        textColor: '#7C3AED',
    },
    onboarding: {
        backgroundColor: '#FFFFFF',
        secondaryBackgroundColor: '#F3F4F6',
        textColor: '#1F2937',
        secondaryTextColor: '#6B7280',
        buttonColor: '#7C3AED',
        buttonTextColor: '#FFFFFF',
        fontFamily: 'Inter',
        steps: [
            {
                id: 'step-1',
                title: 'Welcome to Your App',
                description: 'Discover amazing features and possibilities with our platform.',
                image: undefined,
            },
            {
                id: 'step-2',
                title: 'Manage Your Finances',
                description: 'Keep track of your spending and save smarter every day.',
                image: undefined,
            },
            {
                id: 'step-3',
                title: 'Get Started Today',
                description: 'Join thousands of users and start your financial journey.',
                image: undefined,
            },
        ],
    },
    theme: {
        primaryColor: '#7C3AED',
        secondaryColor: '#A78BFA',
        headerBackgroundColor: '#FFFFFF',
        headerTextColor: '#1F2937',
        bodyBackgroundColor: '#F9FAFB',
        bodyTextColor: '#374151',
    },
};

const DEFAULT_V2_CONFIG: MobileAppConfig = {
    appId: null,
    appName: 'Airpay',
    splash: {
        logo: undefined,
        backgroundColor: '#2563EB',
        textColor: '#FFFFFF',
    },
    onboarding: {
        backgroundColor: '#2563EB',
        secondaryBackgroundColor: '#1d4ed8',
        textColor: '#1e293b',
        secondaryTextColor: '#6b7280',
        buttonColor: '#2563EB',
        buttonTextColor: '#FFFFFF',
        fontFamily: 'Inter',
        steps: [
            {
                id: 'step-1',
                title: 'You ought to know how mortgage works',
                description: 'Get an overview of how you are performing and motivate yourself to achieve even more.',
                image: '/onboarding-chart-original.png',
            },
            {
                id: 'step-2',
                title: 'Track your expenses and save money',
                description: 'Keep track of your spending habits and find new ways to save efficiently.',
                image: '/onboarding-chart-original.png',
            },
            {
                id: 'step-3',
                title: 'Secure your future with smart investments',
                description: 'Invest wisely and watch your wealth grow with our advanced analytics tools.',
                image: '/onboarding-chart-original.png',
            },
        ],
    },
    theme: {
        primaryColor: '#2563EB',
        secondaryColor: '#E5E7EB',
        headerBackgroundColor: '#FFFFFF',
        headerTextColor: '#1F2937',
        bodyBackgroundColor: '#F9FAFB',
        bodyTextColor: '#374151',
    },
};

// Blank Template Preview
function BlankScreen() {
    return (
        <div className="flex flex-col items-center justify-center h-full bg-gray-50">
            <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-gray-300 flex items-center justify-center mb-4">
                <span className="text-3xl text-gray-300">+</span>
            </div>
            <p className="text-gray-400 text-sm">Your app starts here</p>
        </div>
    );
}

/**
 * Renders accurate previews using the exact same components and config structure
 * as the actual mobile templates (/app/mobile and /app/mobile-v2).
 * 
 * This ensures WYSIWYG - what you see in the builder is what you get in the app.
 */
export function MobileTemplatePreview({
    templateId = "mobile-v1",
    screenType = "splash",
    appConfig,
    currentStep = 0,
}: MobileTemplatePreviewProps) {

    // Get the appropriate default config based on template
    const getDefaultConfig = (): MobileAppConfig => {
        return templateId === 'mobile-v2' ? DEFAULT_V2_CONFIG : DEFAULT_V1_CONFIG;
    };

    // Merge provided config with defaults
    const config = appConfig || getDefaultConfig();

    // Build onboarding steps - show only current step for preview
    const buildPreviewSteps = (): ConfigOnboardingStep[] => {
        if (config.onboarding.steps.length === 0) {
            return getDefaultConfig().onboarding.steps;
        }
        // Return only the current step for focused preview
        const step = config.onboarding.steps[currentStep] || config.onboarding.steps[0];
        return [step];
    };

    // Render the correct template based on ID and screen type
    // This matches EXACTLY how /app/mobile and /app/mobile-v2 render
    const renderContent = () => {
        if (templateId === 'blank') {
            return <BlankScreen />;
        }

        if (templateId === 'mobile-v2') {
            // V2: Modern Fintech - matches /app/mobile-v2/page.tsx exactly
            if (screenType === 'onboarding') {
                return (
                    <V2OnboardingView
                        steps={buildPreviewSteps()}
                        backgroundColor={config.onboarding.backgroundColor}
                        textColor={config.onboarding.textColor}
                        secondaryTextColor={config.onboarding.secondaryTextColor}
                        buttonColor={config.onboarding.buttonColor}
                        buttonTextColor={config.onboarding.buttonTextColor}
                        initialStep={0}
                        showSkipButton={true}
                        showSignInButton={true}
                    />
                );
            }
            // Splash screen - matches /app/mobile-v2/page.tsx exactly
            return (
                <V2SplashScreen
                    logo={config.splash.logo}
                    appName={config.appName}
                    backgroundColor={config.splash.backgroundColor}
                    textColor={config.splash.textColor}
                    showDecorations={true}
                    autoAdvance={false}
                />
            );
        }

        // V1: Classic Banking (default) - matches /app/mobile/page.tsx exactly
        if (screenType === 'onboarding') {
            return (
                <V1OnboardingView
                    backgroundColor={config.onboarding.backgroundColor}
                    textColor={config.onboarding.textColor}
                    buttonColor={config.onboarding.buttonColor}
                    buttonTextColor={config.onboarding.buttonTextColor}
                    logo={config.splash.logo}
                    showDecorations={true}
                />
            );
        }
        // Splash screen - matches /app/mobile/page.tsx exactly
        return (
            <V1SplashScreen
                logo={config.splash.logo}
                backgroundColor={config.splash.backgroundColor}
                textColor={config.theme.primaryColor}
                showDecorations={true}
                autoAdvance={false}
            />
        );
    };

    return (
        <div className="relative w-full h-full rounded-[2.5rem] overflow-hidden border-8 border-gray-900 shadow-2xl bg-white">
            {/* Status Bar Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-b-xl z-30"></div>

            {/* Content */}
            <div className="relative w-full h-full">
                {renderContent()}
            </div>
        </div>
    );
}

// Helper function to convert AppBuilder context state to MobileAppConfig
export function buildMobileConfig(params: {
    templateId: string;
    logo?: string;
    appName?: string;
    // Splash config
    splashBackgroundColor?: string;
    splashTextColor?: string;
    // Onboarding config
    onboardingBackgroundColor?: string;
    onboardingTextColor?: string;
    onboardingSecondaryTextColor?: string;
    onboardingButtonColor?: string;
    onboardingButtonTextColor?: string;
    onboardingSteps?: ConfigOnboardingStep[];
    // Theme config
    primaryColor?: string;
    secondaryColor?: string;
}): MobileAppConfig {
    const isV2 = params.templateId === 'mobile-v2';
    const defaults = isV2 ? DEFAULT_V2_CONFIG : DEFAULT_V1_CONFIG;

    return {
        appId: null,
        appName: params.appName || defaults.appName,
        splash: {
            logo: params.logo,
            backgroundColor: params.splashBackgroundColor || defaults.splash.backgroundColor,
            textColor: params.splashTextColor || defaults.splash.textColor,
        },
        onboarding: {
            backgroundColor: params.onboardingBackgroundColor || defaults.onboarding.backgroundColor,
            secondaryBackgroundColor: defaults.onboarding.secondaryBackgroundColor,
            textColor: params.onboardingTextColor || defaults.onboarding.textColor,
            secondaryTextColor: params.onboardingSecondaryTextColor || defaults.onboarding.secondaryTextColor,
            buttonColor: params.onboardingButtonColor || defaults.onboarding.buttonColor,
            buttonTextColor: params.onboardingButtonTextColor || defaults.onboarding.buttonTextColor,
            fontFamily: defaults.onboarding.fontFamily,
            steps: params.onboardingSteps || defaults.onboarding.steps,
        },
        theme: {
            primaryColor: params.primaryColor || defaults.theme.primaryColor,
            secondaryColor: params.secondaryColor || defaults.theme.secondaryColor,
            headerBackgroundColor: defaults.theme.headerBackgroundColor,
            headerTextColor: defaults.theme.headerTextColor,
            bodyBackgroundColor: defaults.theme.bodyBackgroundColor,
            bodyTextColor: defaults.theme.bodyTextColor,
        },
    };
}
