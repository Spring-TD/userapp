'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export const FORGOT_PASSWORD_EMAIL_KEY = 'mobile_v2_forgot_password_email';

export default function EmailSentPage() {
  const [email, setEmail] = useState('');

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(FORGOT_PASSWORD_EMAIL_KEY) || '';
      setEmail(stored.trim());
    } catch {
      setEmail('');
    }
  }, []);

  return (
    <div className="relative flex h-full flex-col items-center justify-center sf-page-bg p-6 pt-12 text-[#1E293B]">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="relative mb-8 flex h-[280px] w-[280px] items-center justify-center"
      >
        <Image
          src="/email-icon-3d.png"
          alt="Email Sent"
          fill
          className="object-contain drop-shadow-xl"
        />
      </motion.div>

      <div className="mb-12 max-w-xs text-center">
        <h2 className="mb-4 text-[24px] font-bold text-[var(--sf-ink,#1E1B4B)]">Your email is on the way</h2>
        <p className="text-[15px] leading-relaxed text-gray-500">
          {email
            ? <>Check your email <strong className="text-[var(--sf-ink,#1E1B4B)]">{email}</strong> and follow the instructions to reset your password.</>
            : 'Check your email and follow the instructions to reset your password.'}
        </p>
      </div>

      <div className="mb-4 mt-auto w-full space-y-4">
        <Link href="/mobile-v2/auth/new-password">
          <Button className="h-14 w-full rounded-[20px] bg-[var(--sf-button,#1E40AF)] text-base font-medium text-white shadow-lg shadow-blue-900/20 hover:bg-[var(--sf-button-hover,#1e3a8a)]">
            Continue
          </Button>
        </Link>

        <Link href="/mobile-v2/auth/login" className="block text-center">
          <button type="button" className="text-sm font-medium text-gray-400 transition-colors hover:text-gray-600">
            Skip
          </button>
        </Link>
      </div>
    </div>
  );
}
