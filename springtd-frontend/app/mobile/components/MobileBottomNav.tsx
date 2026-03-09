'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Package, User } from 'lucide-react';

export default function MobileBottomNav() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <div className="fixed bottom-0 left-0 right-0 mx-auto max-w-md bg-white border-t border-gray-100 flex justify-around items-center h-20 pb-4 rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-50">
      <Link href="/mobile/home" className={`flex flex-col items-center justify-center w-full h-full gap-1 ${isActive('/mobile/home') ? 'text-blue-600' : 'text-gray-400'}`}>
        <Home size={24} fill={isActive('/mobile/home') ? "currentColor" : "none"} />
        <span className="text-[10px] font-medium">Home</span>
      </Link>
      <Link href="/mobile/account" className={`flex flex-col items-center justify-center w-full h-full gap-1 ${isActive('/mobile/account') ? 'text-blue-600' : 'text-gray-400'}`}>
        <User size={24} />
        <span className="text-[10px] font-medium">Account</span>
      </Link>
      <Link href="/mobile/products" className={`flex flex-col items-center justify-center w-full h-full gap-1 ${isActive('/mobile/products') ? 'text-blue-600' : 'text-gray-400'}`}>
        <Package size={24} />
        <span className="text-[10px] font-medium">Product</span>
      </Link>
      <Link href="/mobile/profile" className={`flex flex-col items-center justify-center w-full h-full gap-1 ${isActive('/mobile/profile') ? 'text-blue-600' : 'text-gray-400'}`}>
        <div className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden">
          <img src="https://github.com/shadcn.png" alt="Profile" className="w-full h-full object-cover" />
        </div>
        <span className="text-[10px] font-medium">Profile</span>
      </Link>
    </div>
  );
}
