// Shared types for mobile template components

export interface OnboardingStep {
  id: string;
  image?: string;
  title: string;
  description: string;
}

export interface SplashScreenConfig {
  logo?: string;
  appName?: string;
  backgroundColor?: string;
  textColor?: string;
  showDecorations?: boolean;
}

export interface OnboardingConfig {
  steps: OnboardingStep[];
  backgroundColor?: string;
  textColor?: string;
  secondaryTextColor?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  fontFamily?: string;
  onComplete?: () => void;
  onSkip?: () => void;
}

export interface MobileTemplateConfig {
  splash?: SplashScreenConfig;
  onboarding?: OnboardingConfig;
}
