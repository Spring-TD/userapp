'use client';

import { Dialog, DialogContentMobile } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  User,
  Shield,
  Phone,
  Headphones,
  HelpCircle,
  Key,
  FileText,
  Info,
  LogOut,
  ChevronRight
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import MobileBottomNav from '../components/MobileBottomNav';
import Link from 'next/link';

export default function ProfilePage() {
  const router = useRouter();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = () => {
    setShowLogoutModal(false);
    router.push('/mobile/auth/login');
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white p-6 pt-8 flex items-center gap-4 border-b border-gray-100">
        <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft className="w-6 h-6 text-gray-900" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Profile</h1>
      </div>

      <div className="p-6 space-y-4">
        {/* User Card */}
        <div className="bg-white rounded-2xl p-4 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-300 overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop"
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-gray-900 text-lg">Adedayo David</h2>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-green-600 text-sm font-medium">Identity Verified</span>
              <div className="w-4 h-4 rounded-full bg-green-600 flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* General Settings */}
        <div className="bg-white rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">General Settings</h3>
          </div>
          <Link href="/mobile/profile/edit" className="flex items-center gap-3 px-4 py-4 border-b border-gray-100 hover:bg-gray-50">
            <User className="w-5 h-5 text-gray-600" />
            <span className="flex-1 text-gray-700">Name</span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
          <button className="w-full flex items-center gap-3 px-4 py-4 border-b border-gray-100 hover:bg-gray-50">
            <Shield className="w-5 h-5 text-gray-600" />
            <span className="flex-1 text-left text-gray-700">Email</span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50">
            <Phone className="w-5 h-5 text-gray-600" />
            <span className="flex-1 text-left text-gray-700">Phone Number</span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Support & Legal */}
        <div className="bg-white rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">Support & Legal</h3>
          </div>
          <button className="w-full flex items-center gap-3 px-4 py-4 border-b border-gray-100 hover:bg-gray-50">
            <Headphones className="w-5 h-5 text-gray-600" />
            <span className="flex-1 text-left text-gray-700">Contact Support</span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-4 border-b border-gray-100 hover:bg-gray-50">
            <HelpCircle className="w-5 h-5 text-gray-600" />
            <span className="flex-1 text-left text-gray-700">FAQ</span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-4 border-b border-gray-100 hover:bg-gray-50">
            <Key className="w-5 h-5 text-gray-600" />
            <span className="flex-1 text-left text-gray-700">Reset Password</span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
          <Link href="/mobile/terms-conditions" className="w-full flex items-center gap-3 px-4 py-4 border-b border-gray-100 hover:bg-gray-50">
            <FileText className="w-5 h-5 text-gray-600" />
            <span className="flex-1 text-left text-gray-700">Terms & Conditions</span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
          <Link href="/mobile/privacy-policy" className="w-full flex items-center gap-3 px-4 py-4 border-b border-gray-100 hover:bg-gray-50">
            <FileText className="w-5 h-5 text-gray-600" />
            <span className="flex-1 text-left text-gray-700">Privacy Policy</span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
          <button className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50">
            <Info className="w-5 h-5 text-gray-600" />
            <span className="flex-1 text-left text-gray-700">About</span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Account Control */}
        <div className="bg-white rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">Account control</h3>
          </div>
          <button
            onClick={() => setShowLogoutModal(true)}
            className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50"
          >
            <LogOut className="w-5 h-5 text-red-600" />
            <span className="flex-1 text-left text-red-600 font-medium">Logout</span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <Dialog open={showLogoutModal} onOpenChange={setShowLogoutModal}>
        <DialogContentMobile className="w-[90%] max-w-[360px] mx-auto rounded-3xl p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <LogOut className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Logout?</h2>
            <p className="text-sm text-gray-600">
              Are you sure to logout from your account?
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => setShowLogoutModal(false)}
              variant="outline"
              className="flex-1 h-12 rounded-full font-semibold border-gray-300"
            >
              No, Cancel
            </Button>
            <Button
              onClick={handleLogout}
              className="flex-1 h-12 bg-red-600 hover:bg-red-700 text-white rounded-full font-semibold"
            >
              Yes, logout
            </Button>
          </div>
        </DialogContentMobile>
      </Dialog>

      <MobileBottomNav />
    </div>
  );
}
