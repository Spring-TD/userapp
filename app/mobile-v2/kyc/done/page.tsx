import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Return target after modular KYC `redirect` (see `buildModularVerificationPostBody`). */
export default function KycDonePage() {
  return (
    <div className="flex flex-col h-full bg-[#FAFAFA] px-6 pt-12">
      <Link href="/mobile-v2/profile" className="mb-8 inline-flex w-10 items-center justify-center text-gray-700">
        <ChevronLeft className="h-6 w-6" />
      </Link>
      <h1 className="text-xl font-bold text-[#1E293B] mb-2">Verification</h1>
      <p className="text-sm text-gray-600 mb-8">
        If you finished the hosted flow, your status will update when the provider calls our webhook. You can return to
        your profile anytime.
      </p>
      <Button asChild className="w-full rounded-xl bg-[var(--sf-button,#1E40AF)]">
        <Link href="/mobile-v2/profile">Back to profile</Link>
      </Button>
    </div>
  );
}
