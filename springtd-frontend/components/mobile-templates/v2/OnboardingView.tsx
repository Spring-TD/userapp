'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { OnboardingStep } from '../types';

interface OnboardingViewProps {
  steps: OnboardingStep[];
  backgroundColor?: string;
  textColor?: string;
  secondaryTextColor?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  cardBackgroundColor?: string;
  onComplete?: () => void;
  onSkip?: () => void;
  initialStep?: number;
  showSkipButton?: boolean;
  showSignInButton?: boolean;
}

export function V2OnboardingView({
  steps,
  backgroundColor = '#2563EB',
  textColor = '#1e293b',
  secondaryTextColor = '#6b7280',
  buttonColor = '#2563EB',
  buttonTextColor = '#FFFFFF',
  cardBackgroundColor = '#FFFFFF',
  onComplete,
  onSkip,
  initialStep = 0,
  showSkipButton = true,
  showSignInButton = true,
}: OnboardingViewProps) {
  const [currentStep, setCurrentStep] = useState(initialStep);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      onComplete?.();
    }
  };

  const handleSkip = () => {
    onSkip?.() || onComplete?.();
  };

  const currentStepData = steps[currentStep];

  return (
    <motion.div
      className="flex flex-col h-full relative overflow-hidden"
      style={{ backgroundColor }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Top Section: Header & Image */}
      <div className="flex-1 flex flex-col relative z-10 w-full">
        {/* Header */}
        <div className="flex justify-between items-center px-6 pt-12 pb-4 w-full">
          <div className="w-12" />
          {showSkipButton && (
            <button
              onClick={handleSkip}
              className="px-4 py-1.5 rounded-full bg-white/10 text-white text-sm font-medium backdrop-blur-sm hover:bg-white/20 transition-colors"
            >
              Skip
            </button>
          )}
        </div>

        {/* Image Area */}
        <div className="flex-1 flex items-center justify-center p-6 w-full relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="relative w-full h-[60%] flex items-center justify-center"
            >
              {currentStepData?.image && (
                <div className="relative w-[280px] h-[280px]">
                  <Image
                    src={currentStepData.image}
                    alt="Onboarding Illustration"
                    fill
                    className="object-contain drop-shadow-2xl"
                    priority
                  />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom Sheet Card */}
      <div
        className="relative rounded-t-[40px] px-8 pt-10 pb-8 w-full min-h-[380px] flex flex-col justify-between z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]"
        style={{ backgroundColor: cardBackgroundColor }}
      >
        <div className="flex flex-col items-center text-center space-y-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <h2
                className="text-2xl md:text-3xl font-bold leading-tight max-w-xs mx-auto"
                style={{ color: textColor }}
              >
                {currentStepData?.title}
              </h2>
              <p
                className="mt-4 text-base leading-relaxed max-w-xs mx-auto"
                style={{ color: secondaryTextColor }}
              >
                {currentStepData?.description}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex flex-col items-center w-full space-y-6 mt-4">
          {/* Pagination Indicators */}
          <div className="flex space-x-2">
            {steps.map((_, index) => (
              <motion.div
                key={index}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  index === currentStep ? "w-6" : "w-1.5 bg-gray-300"
                )}
                style={index === currentStep ? { backgroundColor: buttonColor } : undefined}
                layoutId="pagination"
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="w-full flex flex-col items-center space-y-3">
            {currentStep === 0 && showSignInButton ? (
              <>
                <Button
                  className="w-full h-14 rounded-full text-lg shadow-lg"
                  style={{
                    backgroundColor: buttonColor,
                    color: buttonTextColor,
                    boxShadow: `0 10px 15px -3px ${buttonColor}30`,
                  }}
                  onClick={handleNext}
                >
                  Get Started
                </Button>
                <Button
                  variant="ghost"
                  className="font-semibold text-lg hover:bg-transparent"
                  style={{ color: buttonColor }}
                  onClick={onComplete}
                >
                  Sign In
                </Button>
              </>
            ) : (
              <Button
                className="w-full h-14 rounded-full text-lg shadow-lg"
                style={{
                  backgroundColor: buttonColor,
                  color: buttonTextColor,
                  boxShadow: `0 10px 15px -3px ${buttonColor}30`,
                }}
                onClick={handleNext}
              >
                {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default V2OnboardingView;
