'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate login
    router.push('/mobile/home');
  };

  return (
    <div className="min-h-screen bg-white p-6 flex flex-col">
      {/* Header */}
      <div className="pt-4 mb-10">
        <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft className="w-6 h-6 text-gray-900" />
        </button>
      </div>

      {/* Logo & Welcome */}
      <div className="flex flex-col items-center mb-10">
        <div className="w-20 h-20 mb-6 flex items-center justify-center">
          <img src="/images/logo.png" alt="Logo" className="w-full h-full object-contain" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome back!</h1>
        <p className="text-gray-500 text-center max-w-xs">
          Enter your email and password to complete sign in to your account
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleLogin} className="space-y-6 flex-1">
        <div className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="email"
              placeholder="liamdavis@gmail.com"
              className="pl-12 h-14 bg-gray-50 border-none rounded-xl text-gray-900 placeholder:text-gray-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              className="pl-12 pr-12 h-14 bg-gray-50 border-none rounded-xl text-gray-900 placeholder:text-gray-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox id="remember" className="border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600" />
            <label
              htmlFor="remember"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-600"
            >
              Remember Me
            </label>
          </div>
          <Link href="/mobile/auth/forgot-password" className="text-sm font-medium text-blue-600">
            Forgot Password?
          </Link>
        </div>

        <Button type="submit" className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-semibold text-lg">
          Sign In
        </Button>
      </form>
    </div>
  );
}
