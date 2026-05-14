'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoanDetailPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-white pb-24 flex flex-col">
            {/* Header */}
            <div className="p-6 pt-8 flex items-center gap-4">
                <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
                    <ArrowLeft className="w-6 h-6 text-gray-900" />
                </button>
            </div>

            {/* Banner */}
            <div className="px-6 mb-6">
                <div className="aspect-[16/9] bg-orange-400 rounded-2xl flex items-center justify-center">
                    <span className="text-white text-7xl font-bold">15%</span>
                </div>
            </div>

            {/* Details */}
            <div className="px-6 flex-1">
                <p className="text-gray-600 leading-relaxed mb-6 text-sm">
                    Lorem ipsum dolor sit amet consectetur. Malesuada volutpat risus adipiscing nunc amet dolor eu fermentum. Sollicitudin magna massa purus elit a eu. Lorem ipsum dolor sit amet consectetur. Malesuada volu
                </p>

                <div className="flex flex-wrap gap-y-2 gap-x-6 mb-8 text-xs font-bold text-gray-900">
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-yellow-100 flex items-center justify-center">
                            <div className="w-2.5 h-2.5 bg-yellow-600 rounded-full" />
                        </div>
                        <span>Sellers details</span>
                    </div>
                    <div>Price: 18M</div>
                    <div>Interest: 18M</div>
                </div>

                <Link href="/mobile/loan/apply">
                    <Button
                        className="w-32 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm"
                    >
                        Apply
                    </Button>
                </Link>

                {/* More Hot Loan Section */}
                <div className="mt-12">
                    <h3 className="font-bold text-lg text-gray-900 mb-4">Hot Loan</h3>
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { id: 1, type: 'FA', rate: '15%', color: 'bg-orange-400' },
                            { id: 2, type: 'CA', rate: '20%', color: 'bg-green-300' },
                            { id: 3, type: 'VC', rate: '15%', color: 'bg-[#8CD4CC]' },
                            { id: 4, type: 'FA', rate: '50%', color: 'bg-yellow-400' },
                        ].map((item) => (
                            <Link href={`/mobile/loan/${item.id}`} key={item.id} className="group">
                                <div className={`${item.color} aspect-square rounded-2xl flex flex-col items-center justify-center mb-3`}>
                                    <span className="text-white text-5xl font-bold mb-2">{item.type}</span>
                                    <span className="text-white text-2xl font-bold">{item.rate}</span>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-gray-500 line-clamp-1">Lorem ipsum dolor sit amet consectetur.</p>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded-full bg-yellow-100 flex items-center justify-center">
                                            <div className="w-2 h-2 bg-yellow-600 rounded-full" />
                                        </div>
                                        <span className="text-xs text-gray-900 font-medium">Sellers details</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
