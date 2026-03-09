'use client';

import MobileBottomNav from '../../components/MobileBottomNav';
import { ArrowLeft, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

const TARGETS = [
    { id: 1, title: 'Save To a Buy Building', image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop', price: 'N30M' },
    { id: 2, title: 'Save To buy a Car', image: 'https://images.unsplash.com/photo-1503376763036-066120622c74?q=80&w=2070&auto=format&fit=crop', price: 'N30M' },
    { id: 3, title: 'Save To a Buy Building', image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop', price: 'N30M' },
    { id: 4, title: 'Save To buy a Car', image: 'https://images.unsplash.com/photo-1503376763036-066120622c74?q=80&w=2070&auto=format&fit=crop', price: 'N30M' },
    { id: 5, title: 'Save To a Buy Building', image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop', price: 'N30M' },
    { id: 6, title: 'Save To buy a Car', image: 'https://images.unsplash.com/photo-1503376763036-066120622c74?q=80&w=2070&auto=format&fit=crop', price: 'N30M' },
];

export default function TargetSavingsPage() {
    const router = useRouter();

    return (
        <div className="flex flex-col min-h-screen bg-white pb-24">
            {/* Header */}
            <div className="p-6 pt-8 flex items-center gap-4">
                <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
                    <ArrowLeft className="w-6 h-6 text-gray-900" />
                </button>
            </div>

            <div className="px-6 space-y-6">
                {/* Balance Card */}
                <div className="bg-[#367c3d] rounded-2xl p-6 text-white relative overflow-hidden">
                    <div className="flex justify-between items-start mb-8">
                        <span className="bg-white text-black text-[10px] font-bold px-2 py-1 rounded">12% per annum</span>
                        <span className="bg-white text-black text-[10px] font-bold px-2 py-1 rounded">AG BANK: 1234567890</span>
                    </div>

                    <div className="text-center">
                        <p className="text-white/90 text-sm mb-1">Target Saving Balance</p>
                        <h1 className="text-3xl font-bold">₦500,039.12</h1>
                    </div>
                </div>

                {/* Info Box */}
                <div className="bg-[#dcfce7] rounded-2xl p-4 relative">
                    <button className="absolute top-4 right-4 text-green-700">
                        <X size={16} />
                    </button>
                    <h3 className="font-bold text-gray-900 text-sm mb-3">What is new on Flex Naira?</h3>
                    <ul className="space-y-3 text-xs text-gray-800 leading-relaxed">
                        <li className="flex gap-2">
                            <span className="block w-1 h-1 bg-gray-800 rounded-full mt-1.5 flex-shrink-0" />
                            Click Add Money to generate a PocketApp account number. It is the fastest and most reliable way to fund your Flex Naira wallet
                        </li>
                        <li className="flex gap-2">
                            <span className="block w-1 h-1 bg-gray-800 rounded-full mt-1.5 flex-shrink-0" />
                            Search for PocketApp on your bank app and enter your new PocketApp account number
                        </li>
                        <li className="flex gap-2">
                            <span className="block w-1 h-1 bg-gray-800 rounded-full mt-1.5 flex-shrink-0" />
                            Send funds and it'll be credited to your Flex Naira wallet in seconds
                        </li>
                    </ul>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-6">
                    {TARGETS.map((target) => (
                        <Link href="/mobile/savings/target-detail" key={target.id} className="group">
                            <div className="aspect-[4/3] rounded-2xl overflow-hidden mb-3 bg-gray-100 relative">
                                <img src={target.image} alt={target.title} className="w-full h-full object-cover" />
                                <span className="absolute top-2 right-2 bg-[#367c3d] text-white text-[10px] font-bold px-2 py-0.5 rounded">
                                    {target.price}
                                </span>
                            </div>
                            <p className="font-bold text-gray-900 text-xs text-center">{target.title}</p>
                        </Link>
                    ))}
                </div>
            </div>

            <MobileBottomNav />
        </div>
    );
}
