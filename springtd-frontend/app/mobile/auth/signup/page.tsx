'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Phone, User, AtSign, Mail, MessageSquare, Lock, Delete, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

type Step = 'phone' | 'otp' | 'name' | 'username' | 'pin' | 'terms';

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [formData, setFormData] = useState({
    phone: '',
    email: '',
    name: '',
    username: '',
    otp: '',
    pin: ''
  });
  const [useEmail, setUseEmail] = useState(false);
  const [timer, setTimer] = useState(56);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'otp' && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const handleNext = () => {
    if (step === 'phone') setStep('otp');
    else if (step === 'otp') setStep('name');
    else if (step === 'name') setStep('username');
    else if (step === 'username') setStep('pin');
    else if (step === 'pin') setStep('terms');
    else if (step === 'terms') {
      // Submit form
      router.push('/mobile/home');
    }
  };

  const handleBack = () => {
    if (step === 'terms') setStep('pin');
    else if (step === 'pin') setStep('username');
    else if (step === 'username') setStep('name');
    else if (step === 'name') setStep('otp');
    else if (step === 'otp') setStep('phone');
    else router.back();
  };

  const handlePinInput = (num: string) => {
    if (formData.pin.length < 4) {
      setFormData(prev => ({ ...prev, pin: prev.pin + num }));
    }
  };

  const handlePinDelete = () => {
    setFormData(prev => ({ ...prev, pin: prev.pin.slice(0, -1) }));
  };

  const renderIcon = () => {
    switch (step) {
      case 'phone':
        return useEmail ? <Mail className="w-6 h-6 text-blue-600" /> : <Phone className="w-6 h-6 text-blue-600" />;
      case 'otp':
        return <MessageSquare className="w-6 h-6 text-blue-600" />;
      case 'name':
        return <User className="w-6 h-6 text-blue-600" />;
      case 'username':
        return <AtSign className="w-6 h-6 text-blue-600" />;
      case 'pin':
        return <Lock className="w-6 h-6 text-blue-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white p-6">
      {/* Header */}
      <div className="flex items-center mb-6 pt-4">
        <button onClick={handleBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft className="w-6 h-6 text-gray-900" />
        </button>
        <div className="flex-1 text-center font-semibold text-lg">
          {step === 'terms' ? 'Terms & Conditions' : ''}
        </div>
        <div className="w-10" />
      </div>

      {/* Icon (Hidden for Terms) */}
      {step !== 'terms' && (
        <div className="mb-6">
          <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center">
            {renderIcon()}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col">
        {step === 'phone' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {useEmail ? 'Enter your email' : 'Enter your phone number'}
              </h1>
              <p className="text-gray-500 text-sm leading-relaxed">
                {useEmail
                  ? 'To register our system please enter your valid email address'
                  : 'To register our system please enter your valid phone number'
                }
              </p>
            </div>

            <div className="bg-gray-50 rounded-2xl px-4 py-3 flex items-center">
              {!useEmail && <Phone className="w-5 h-5 text-gray-400 mr-3" />}
              {useEmail && <Mail className="w-5 h-5 text-gray-400 mr-3" />}
              <Input
                type={useEmail ? "email" : "tel"}
                placeholder={useEmail ? "ex: john@example.com" : "+1 ---- ---- -- --"}
                className="border-0 bg-transparent shadow-none focus-visible:ring-0 p-0 text-base placeholder:text-gray-400 h-auto"
                value={useEmail ? formData.email : formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, [useEmail ? 'email' : 'phone']: e.target.value }))}
              />
            </div>
          </div>
        )}

        {step === 'otp' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Enter OTP</h1>
              <p className="text-gray-500 text-sm leading-relaxed">
                We are sent to one time verification code to your {useEmail ? formData.email : 'phone number'}
              </p>
            </div>

            <div className="flex justify-between gap-2 px-2">
              {[1, 2, 3, 4, 5, 6].map((_, i) => (
                <div key={i} className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center">
                  <div className={cn("w-2.5 h-2.5 rounded-full", formData.otp.length > i ? "bg-gray-900" : "bg-gray-300")} />
                </div>
              ))}
            </div>
            {/* Hidden input for actual typing if needed, or just simulate for now */}
            <Input
              className="opacity-0 absolute pointer-events-none"
              autoFocus
              value={formData.otp}
              onChange={(e) => setFormData(prev => ({ ...prev, otp: e.target.value.slice(0, 6) }))}
            />

            <p className="text-center text-sm text-gray-500">
              You can get code again in <span className="text-blue-600 font-medium">{timer} seconds</span>
            </p>
          </div>
        )}

        {step === 'name' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Your full name</h1>
              <p className="text-gray-500 text-sm leading-relaxed">
                Enter your full name below to confirm your personal information
              </p>
            </div>

            <div className="bg-gray-50 rounded-2xl px-4 py-3 flex items-center">
              <User className="w-5 h-5 text-gray-400 mr-3" />
              <Input
                type="text"
                placeholder="ex: John Doe"
                className="border-0 bg-transparent shadow-none focus-visible:ring-0 p-0 text-base placeholder:text-gray-400 h-auto"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
          </div>
        )}

        {step === 'username' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Choose username</h1>
              <p className="text-gray-500 text-sm leading-relaxed">
                Username helps to send or receive money from others
              </p>
            </div>

            <div className="bg-gray-50 rounded-2xl px-4 py-3 flex items-center">
              <AtSign className="w-5 h-5 text-gray-400 mr-3" />
              <Input
                type="text"
                placeholder="ex: paygenix-user"
                className="border-0 bg-transparent shadow-none focus-visible:ring-0 p-0 text-base placeholder:text-gray-400 h-auto"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
              />
            </div>
          </div>
        )}

        {step === 'pin' && (
          <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-6">Enter New PIN</h1>
              <div className="flex justify-center gap-4">
                {[1, 2, 3, 4].map((_, i) => (
                  <div key={i} className={cn("w-4 h-4 rounded-full", formData.pin.length > i ? "bg-blue-600" : "bg-gray-200")} />
                ))}
              </div>
            </div>

            <div className="mt-auto grid grid-cols-3 gap-y-8 gap-x-12 px-8 pb-8">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  onClick={() => handlePinInput(num.toString())}
                  className="text-3xl font-medium text-gray-900 hover:bg-gray-50 rounded-full w-16 h-16 flex items-center justify-center transition-colors"
                >
                  {num}
                </button>
              ))}
              <button className="text-sm text-blue-600 font-medium flex items-center justify-center">
                Forgot PIN?
              </button>
              <button
                onClick={() => handlePinInput('0')}
                className="text-3xl font-medium text-gray-900 hover:bg-gray-50 rounded-full w-16 h-16 flex items-center justify-center transition-colors"
              >
                0
              </button>
              <button
                onClick={handlePinDelete}
                className="flex items-center justify-center text-gray-900 hover:bg-gray-50 rounded-full w-16 h-16 transition-colors"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
            </div>
          </div>
        )}

        {step === 'terms' && (
          <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex-1 overflow-y-auto pr-2 space-y-6 text-gray-600 text-sm leading-relaxed">
              <div>
                <h3 className="text-gray-900 font-bold text-base mb-2">Effective Date: January 1, 2025</h3>
                <p>This document governs your rights and obligations when using our services, effective from the date above.</p>
              </div>

              <div>
                <h3 className="text-gray-900 font-bold text-base mb-2">1. Introduction</h3>
                <p>Welcome to [YourApp Name]. By using our mobile application or website, you agree to these Terms and Conditions. Please read them carefully.</p>
              </div>

              <div>
                <h3 className="text-gray-900 font-bold text-base mb-2">2. Eligibility</h3>
                <p>You must be at least 18 years old to use our services. By registering, you confirm that the information you provide is accurate and complete.</p>
              </div>

              <div>
                <h3 className="text-gray-900 font-bold text-base mb-2">3. Services</h3>
                <p>Our platform offers digital wallet services, peer-to-peer transfers, card management, and international transactions. We reserve the right to modify or terminate any part of the service at any time.</p>
              </div>

              <div>
                <h3 className="text-gray-900 font-bold text-base mb-2">4. Fees and Charges</h3>
                <p>We aim to keep fees transparent. You will be notified of any charges before confirming a transaction. Please refer to our Pricing Page for up-to-date details.</p>
              </div>

              <div>
                <h3 className="text-gray-900 font-bold text-base mb-2">5. User Responsibilities</h3>
                <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Buttons (Hidden for PIN step as it has its own keypad) */}
      {step !== 'pin' && (
        <div className="mt-auto pt-6 pb-4 flex gap-4 bg-white">
          {step === 'phone' && (
            <Button
              variant="secondary"
              className="flex-1 bg-blue-50 text-blue-600 hover:bg-blue-100 h-12 rounded-full font-medium"
              onClick={() => setUseEmail(!useEmail)}
            >
              {useEmail ? 'Use Phone' : 'Use Email'}
            </Button>
          )}
          <Button
            className={cn(
              "bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-full font-medium",
              step === 'phone' ? "flex-1" : "w-full"
            )}
            onClick={handleNext}
          >
            {step === 'terms' ? 'Accept & Continue' : step === 'otp' ? 'Confirm' : 'Next'}
          </Button>
        </div>
      )}
    </div>
  );
}
