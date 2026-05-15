'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const FUSPAY_VERIFICATION_URL = 'https://transid2.fuspay.finance/?verificationId=6a0197aee19e6a83826fca08';

export default function CreateKycPage() {
  return (
    <div className="flex flex-col h-full bg-[#FAFAFA]">
      <div className="pt-12 px-6 flex items-center mb-6">
        <Link href="/mobile-v2/profile" className="w-10 h-10 flex items-center justify-center -ml-2 text-gray-700">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <h1 className="flex-1 text-center text-lg font-bold text-[#1E293B] mr-8">KYC</h1>
      </div>

      <div className="px-6 pb-8 flex-1 flex flex-col justify-center">
        <p className="text-center text-sm text-gray-500 mb-4">
          KYC is completed securely on Fuspay.
        </p>
        <Button asChild className="w-full h-12 rounded-xl bg-[var(--sf-button,#1E40AF)] hover:bg-[var(--sf-button,#1E40AF)]">
          <a href={FUSPAY_VERIFICATION_URL}>START KYC</a>
        </Button>
      </div>
    </div>
  );
}
