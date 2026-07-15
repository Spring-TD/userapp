'use client'

import Link from 'next/link'
import { Briefcase, Home, User } from 'lucide-react'

type MobileV2BottomNavItem = 'home' | 'account' | 'products' | 'profile'

/**
 * Floating bottom nav — must sit inside the phone frame.
 * Uses absolute (not fixed) so it anchors to the storefront frame on desktop
 * and the full viewport shell on mobile.
 */
export function MobileV2BottomNav({ active }: { active: MobileV2BottomNavItem }) {
  const activeClass = 'text-[var(--sf-button,#1E40AF)]'
  const inactiveClass = 'text-gray-400 hover:text-gray-600 transition-colors'
  const itemClass = 'flex flex-col items-center gap-1'

  return (
    <nav className="pointer-events-none absolute inset-x-0 bottom-0 z-40 px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
      <div className="pointer-events-auto mx-auto flex h-[72px] w-full max-w-[352px] items-center justify-around rounded-[24px] bg-white px-2 shadow-[0_4px_30px_rgba(0,0,0,0.08)]">
        <Link
          href="/mobile-v2/home"
          className={`${itemClass} ${active === 'home' ? activeClass : inactiveClass}`}
        >
          <Home className={`h-6 w-6 ${active === 'home' ? 'fill-current' : ''}`} />
          <span className={`text-[10px] ${active === 'home' ? 'font-bold' : 'font-medium'}`}>Home</span>
        </Link>

        <Link
          href="/mobile-v2/accounts"
          className={`${itemClass} ${active === 'account' ? activeClass : inactiveClass}`}
        >
          <User className={`h-6 w-6 ${active === 'account' ? 'fill-current' : ''}`} />
          <span className={`text-[10px] ${active === 'account' ? 'font-bold' : 'font-medium'}`}>
            Account
          </span>
        </Link>

        <Link
          href="/mobile-v2/products/mortgage"
          className={`${itemClass} ${active === 'products' ? activeClass : inactiveClass}`}
        >
          <Briefcase className={`h-6 w-6 ${active === 'products' ? 'fill-current' : ''}`} />
          <span className={`text-[10px] ${active === 'products' ? 'font-bold' : 'font-medium'}`}>
            Products
          </span>
        </Link>

        <Link
          href="/mobile-v2/profile"
          className={`${itemClass} ${active === 'profile' ? activeClass : inactiveClass}`}
        >
          <User className={`h-6 w-6 ${active === 'profile' ? 'fill-current' : ''}`} />
          <span className={`text-[10px] ${active === 'profile' ? 'font-bold' : 'font-medium'}`}>
            Profile
          </span>
        </Link>
      </div>
    </nav>
  )
}
