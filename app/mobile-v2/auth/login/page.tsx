'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { clearAuthError, loginThunk } from '@/store/authSlice';
import { clearMobileClientAuthError } from '@/store/mobileClientAuthSlice';

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((s) => s.auth);
  const mobileErr = useAppSelector((s) => s.mobileClientAuth.error);

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearAuthError());
    }
    if (mobileErr) {
      toast.error(mobileErr);
      dispatch(clearMobileClientAuthError());
    }
  }, [error, mobileErr, dispatch]);

  const validate = () => {
    const next: { email?: string; password?: string } = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = 'Enter a valid email address.';
    if (!password) next.password = 'Password is required.';
    setFieldErrors(next);
    return { ok: Object.keys(next).length === 0, errors: next };
  };

  const handleLogin = async () => {
    const { ok, errors } = validate();
    if (!ok) {
      const msg = errors.email || errors.password;
      if (msg) toast.error(msg);
      return;
    }
    const res = await dispatch(loginThunk({ email: email.trim().toLowerCase(), password }));
    if (loginThunk.rejected.match(res)) {
      const status = (res.error as { message?: string })?.message;
      toast.error(res.payload ?? status ?? 'Sign in failed.');
      return;
    }
    toast.success('Signed in successfully.');
    router.push('/mobile-v2/home');
  };

  return (
    <div className="flex h-full flex-col bg-[#FAFAFA] p-6 pt-12 text-[#1E293B]">
      <div className="mb-8 flex items-center justify-between">
        <Link href="/mobile-v2" className="-ml-2 rounded-full p-2 transition-colors hover:bg-black/5">
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold">Login</h1>
        <div className="w-8" />
      </div>

      <div className="mb-10 text-center">
        <h2 className="mb-2 text-[28px] font-bold tracking-tight text-[#1E1B4B]">Welcome back</h2>
        <p className="px-4 text-[15px] leading-normal text-gray-500">Sign in with your email and password</p>
      </div>

      <div className="min-h-0 flex-1 space-y-6">
        <div className="group relative">
          <input
            id="email"
            type="email"
            placeholder=" "
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="peer h-14 w-full rounded-2xl border-0 bg-white px-4 pb-1 pt-4 text-base shadow-[0_2px_10px_rgba(0,0,0,0.03)] placeholder-transparent transition-all focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
          />
          <label
            htmlFor="email"
            className="pointer-events-none absolute left-4 top-1.5 text-[11px] font-medium text-gray-400 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-1.5 peer-focus:text-[11px] peer-focus:text-gray-400"
          >
            Email
          </label>
          {fieldErrors.email && <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>}
        </div>

        <div className="group relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder=" "
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="peer h-14 w-full rounded-2xl border-0 bg-white px-4 pb-1 pt-4 text-base shadow-[0_2px_10px_rgba(0,0,0,0.03)] placeholder-transparent transition-all focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
          />
          <label
            htmlFor="password"
            className="pointer-events-none absolute left-4 top-1.5 text-[11px] font-medium text-gray-400 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-1.5 peer-focus:text-[11px] peer-focus:text-gray-400"
          >
            Password
          </label>
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#2563EB] transition-colors hover:text-[#1d4ed8]"
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
          {fieldErrors.password && <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>}
        </div>

        <div className="flex justify-end pt-2">
          <Link href="/mobile-v2/auth/forgot-password" className="text-sm font-medium text-[#2563EB] hover:underline">
            Forgot Password?
          </Link>
        </div>
      </div>

      <div className="mb-4 mt-8 flex items-center gap-4">
        <Link href="/mobile-v2/auth/signup" className="flex-1">
          <Button
            variant="secondary"
            type="button"
            className="h-14 w-full rounded-[20px] border-0 bg-[#E0E7FF] text-base font-medium text-[#4338CA] shadow-none hover:bg-[#C7D2FE]"
          >
            Register
          </Button>
        </Link>
        <Button
          type="button"
          className="h-14 flex-[2] rounded-[20px] bg-[#1E40AF] text-base font-medium text-white shadow-lg shadow-blue-900/20 hover:bg-[#1e3a8a]"
          disabled={loading}
          onClick={handleLogin}
        >
          {loading ? 'Please wait…' : 'Login'}
        </Button>
      </div>
    </div>
  );
}
