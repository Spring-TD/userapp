'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import type { OnboardingStep } from '../types';

interface OnboardingViewProps {
  steps?: OnboardingStep[];
  backgroundColor?: string;
  textColor?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  onComplete?: () => void;
  onSignIn?: () => void;
  showDecorations?: boolean;
  logo?: string;
}

export function V1OnboardingView({
  steps = [],
  backgroundColor = '#FFFFFF',
  textColor = '#111827',
  buttonColor = '#2563EB',
  buttonTextColor = '#FFFFFF',
  onComplete,
  onSignIn,
  showDecorations = true,
  logo,
}: OnboardingViewProps) {
  return (
    <div
      className="relative flex flex-col items-center justify-between h-full overflow-hidden p-6"
      style={{ backgroundColor }}
    >
      {/* Background Circles */}
      {showDecorations && (
        <>
          <div className="absolute top-[-15%] right-[-35%] w-[70vh] h-[70vh] rounded-full border border-gray-100 opacity-60 pointer-events-none" />
          <div className="absolute top-[-5%] right-[-25%] w-[50vh] h-[50vh] rounded-full border border-gray-100 opacity-60 pointer-events-none" />
          <div className="absolute bottom-[-15%] left-[-35%] w-[70vh] h-[70vh] rounded-full border border-gray-100 opacity-60 pointer-events-none" />
          <div className="absolute bottom-[-5%] left-[-25%] w-[50vh] h-[50vh] rounded-full border border-gray-100 opacity-60 pointer-events-none" />
        </>
      )}

      <div className="flex-1 flex flex-col items-center justify-center z-10 w-full">
        {/* Logo */}
        <div className="mb-12 relative">
          {logo ? (
            <img src={logo} alt="Logo" className="w-20 h-20 object-contain" />
          ) : (
            <div className="w-20 h-20" style={{ color: buttonColor }}>
              <svg viewBox="0 0 100 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M50 50 L50 20 A30 30 0 0 1 80 50 Z" fill="currentColor" />
                <path d="M50 50 L80 50 A30 30 0 0 1 50 80 Z" fill="currentColor" />
                <path d="M50 50 L50 80 A30 30 0 0 1 20 50 Z" fill="currentColor" />
                <path d="M50 50 L20 50 A30 30 0 0 1 50 20 Z" fill="currentColor" />
                <circle cx="50" cy="50" r="10" fill={backgroundColor} />
              </svg>
            </div>
          )}
        </div>
      </div>

      <div className="w-full z-10 mb-8 flex flex-col items-center space-y-8">
        <div className="flex flex-col items-center space-y-6 w-full">
          <h2
            className="text-lg font-semibold"
            style={{ color: textColor }}
          >
            Get started
          </h2>
          <Button
            className="w-full rounded-full h-12 text-base font-medium"
            style={{
              backgroundColor: buttonColor,
              color: buttonTextColor,
            }}
            onClick={onSignIn || onComplete}
          >
            Sign in
          </Button>
        </div>
      </div>
    </div>
  );
}

export default V1OnboardingView;
