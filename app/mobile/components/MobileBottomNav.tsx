'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { House, Boxes, UserRound } from 'lucide-react';

export default function MobileBottomNav() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <div className="fixed bottom-3 left-4 right-4 mx-auto max-w-md bg-white/95 backdrop-blur border border-gray-200 flex justify-around items-center h-24 pb-5 rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.08)] z-50">
      <Link href="/mobile/home" className={`flex flex-col items-center justify-center w-full h-full gap-1 ${isActive('/mobile/home') ? 'text-blue-600' : 'text-gray-500'}`}>
        <div className={`w-7 h-7 rounded-full flex items-center justify-center ${isActive('/mobile/home') ? 'bg-blue-600 text-white' : ''}`}>
          <House size={16} fill={isActive('/mobile/home') ? "currentColor" : "none"} />
        </div>
        <span className="text-xs font-semibold">Home</span>
      </Link>
      <Link href="/mobile/account" className={`flex flex-col items-center justify-center w-full h-full gap-1 ${isActive('/mobile/account') ? 'text-blue-600' : 'text-gray-500'}`}>
        <UserRound size={22} />
        <span className="text-xs font-semibold">Account</span>
      </Link>
      <Link href="/mobile/products" className={`flex flex-col items-center justify-center w-full h-full gap-1 ${isActive('/mobile/products') ? 'text-blue-600' : 'text-gray-500'}`}>
        <Boxes size={22} />
        <span className="text-xs font-semibold">Product</span>
      </Link>
      <Link href="/mobile/profile" className={`flex flex-col items-center justify-center w-full h-full gap-1 ${isActive('/mobile/profile') ? 'text-blue-600' : 'text-gray-500'}`}>
        <div className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden">
          <img src="https://github.com/shadcn.png" alt="Profile" className="w-full h-full object-cover" />
        </div>
        <span className="text-xs font-semibold">Profile</span>
      </Link>
    </div>
  );
}
