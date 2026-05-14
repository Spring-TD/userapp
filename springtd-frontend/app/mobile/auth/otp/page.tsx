'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"

export default function OTPPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [value, setValue] = useState("");

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate verification
    setTimeout(() => {
      setIsLoading(false);
      router.push('/mobile/home');
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full p-6 justify-center min-h-screen">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold mb-2">Verification</h1>
        <p className="text-muted-foreground">Enter the code sent to your email</p>
      </div>

      <form onSubmit={handleVerify} className="space-y-8 flex flex-col items-center">
        <InputOTP maxLength={6} value={value} onChange={(value) => setValue(value)}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>

        <Button type="submit" className="w-full" disabled={isLoading || value.length < 6}>
          {isLoading ? 'Verifying...' : 'Verify'}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm">
        <p className="text-muted-foreground">
          Didn't receive code?{' '}
          <button className="text-primary font-medium hover:underline">
            Resend
          </button>
        </p>
      </div>
    </div>
  );
}
