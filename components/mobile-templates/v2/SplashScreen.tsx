'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import type { SplashScreenConfig } from '../types';

interface SplashScreenProps extends SplashScreenConfig {
  onComplete?: () => void;
  autoAdvance?: boolean;
  duration?: number;
}

export function V2SplashScreen({
  logo,
  image,
  appName = '',
  backgroundColor = '#2563EB',
  textColor = '#FFFFFF',
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

  const mark = logo || image;

  return (
    <motion.div
      className="relative w-full h-full flex items-center justify-center overflow-hidden"
      style={{ backgroundColor }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {showDecorations ? (
        <>
          <div className="absolute top-[-50px] right-[-100px] w-[300px] h-[300px] rounded-full border border-white/10" />
          <div className="absolute top-[50px] right-[-50px] w-[200px] h-[200px] rounded-full border border-white/10" />
          <div className="absolute bottom-[-50px] left-[-100px] w-[300px] h-[300px] rounded-full border border-white/10" />
          <div className="absolute bottom-[50px] left-[-50px] w-[200px] h-[200px] rounded-full border border-white/10" />
        </>
      ) : null}

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="relative z-10 flex flex-col items-center gap-4 px-8"
      >
        {mark ? (
          <img
            src={mark}
            alt={appName || 'App'}
            className="h-28 w-28 rounded-2xl object-contain shadow-lg"
          />
        ) : null}
        {appName ? (
          <p
            className={mark ? 'text-center text-lg font-semibold tracking-wide' : 'text-center text-4xl font-bold tracking-wide'}
            style={{ color: textColor }}
          >
            {appName}
          </p>
        ) : null}
      </motion.div>
    </motion.div>
  );
}

export default V2SplashScreen;
