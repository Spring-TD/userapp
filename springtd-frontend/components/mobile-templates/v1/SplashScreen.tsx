'use client';

import React, { useEffect } from 'react';
import type { SplashScreenConfig } from '../types';

interface SplashScreenProps extends SplashScreenConfig {
  onComplete?: () => void;
  autoAdvance?: boolean;
  duration?: number;
}

export function V1SplashScreen({
  logo,
  appName = 'Classic Banking',
  backgroundColor = '#FFFFFF',
  textColor = '#2563EB',
  showDecorations = true,
  onComplete,
  autoAdvance = true,
  duration = 2500,
}: SplashScreenProps) {
  useEffect(() => {
    if (autoAdvance && onComplete) {
      const timer = setTimeout(() => {
        onComplete();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [autoAdvance, onComplete, duration]);

  return (
    <div
      className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden"
      style={{ backgroundColor }}
    >
      {/* Decorative Circles */}
      {showDecorations && (
        <>
          <div className="absolute top-[-15%] right-[-35%] w-[70vh] h-[70vh] rounded-full border border-gray-100 opacity-60 pointer-events-none" />
          <div className="absolute top-[-5%] right-[-25%] w-[50vh] h-[50vh] rounded-full border border-gray-100 opacity-60 pointer-events-none" />
          <div className="absolute bottom-[-15%] left-[-35%] w-[70vh] h-[70vh] rounded-full border border-gray-100 opacity-60 pointer-events-none" />
          <div className="absolute bottom-[-5%] left-[-25%] w-[50vh] h-[50vh] rounded-full border border-gray-100 opacity-60 pointer-events-none" />
        </>
      )}

      {/* Logo or App Name */}
      <div className="flex flex-col items-center z-10">
        {logo ? (
          <img src={logo} alt={appName} className="w-20 h-20 object-contain" />
        ) : (
          <h1 className="text-3xl font-bold" style={{ color: textColor }}>
            {appName}
          </h1>
        )}
      </div>
    </div>
  );
}

export default V1SplashScreen;
