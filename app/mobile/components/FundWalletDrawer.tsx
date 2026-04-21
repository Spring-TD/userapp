'use client';

import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Landmark, CreditCard, Copy, X, CircleDot } from "lucide-react";
import { useState } from "react";
import { Label } from "@/components/ui/label";

interface FundWalletDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function FundWalletDrawer({ open, onOpenChange }: FundWalletDrawerProps) {
    const [step, setStep] = useState<'method' | 'bank-details'>('method');

    const handleClose = () => {
        onOpenChange(false);
        // Reset step after animation
        setTimeout(() => setStep('method'), 300);
    };

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent className="bg-white rounded-t-[2rem] max-w-md mx-auto border-none">
                <div className="mx-auto w-full max-w-md">
                    <div className="p-6 pb-12">
                        <div className="flex justify-center mb-6">
                            <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
                        </div>

                        {step === 'method' ? (
                            <>
                                <div className="flex justify-between items-center mb-8">
                                    <DrawerTitle className="text-2xl font-bold text-center flex-1">Choose ways to Fund wallet</DrawerTitle>
                                    <button onClick={handleClose} className="absolute right-6 top-6">
                                        <X className="w-5 h-5 text-gray-400" />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <button
                                        className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-gray-50 transition-colors text-left"
                                        onClick={() => setStep('bank-details')}
                                    >
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                                            <Landmark className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900 text-base">Add via bank transfer</h3>
                                            <p className="text-xs text-gray-500">Fund your account by sending money to your unique USD bank account.</p>
                                        </div>
                                    </button>

                                    <button className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-gray-50 transition-colors text-left">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                                            <CreditCard className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900 text-base">Add via Card</h3>
                                            <p className="text-xs text-gray-500">Add fund from your card to your wallet.</p>
                                        </div>
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex justify-between items-center mb-8">
                                    <DrawerTitle className="text-2xl font-bold text-center flex-1">Fund wallet via Bank Transfer</DrawerTitle>
                                    <button onClick={handleClose} className="absolute right-6 top-6">
                                        <X className="w-5 h-5 text-gray-400" />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-1">
                                        <Label className="text-gray-500 text-xs font-normal">Account Holder</Label>
                                        <div className="flex justify-between items-center">
                                            <p className="font-bold text-base text-gray-900">Chidi Vera</p>
                                            <Copy className="w-4 h-4 text-gray-400 cursor-pointer" />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-gray-500 text-xs font-normal">Account Number</Label>
                                        <div className="flex justify-between items-center">
                                            <p className="font-bold text-base text-gray-900">1234567891</p>
                                            <Copy className="w-4 h-4 text-gray-400 cursor-pointer" />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-gray-500 text-xs font-normal">Bank Name</Label>
                                        <div className="flex justify-between items-center">
                                            <p className="font-bold text-base text-gray-900">AG Mortgage Bank</p>
                                            <Copy className="w-4 h-4 text-gray-400 cursor-pointer" />
                                        </div>
                                    </div>

                                    <div className="bg-[#FEF3C7] p-4 rounded-xl space-y-2 mt-6">
                                        <h4 className="font-semibold text-gray-900 text-sm">
                                            Please take note of the following when sending money to your NGN account:
                                        </h4>
                                        <ul className="text-xs text-gray-700 space-y-1">
                                            <li className="flex gap-2"><CircleDot className="w-3 h-3 mt-0.5 shrink-0" />The account can only receive funds in Nigeria Naira (NGN)</li>
                                            <li className="flex gap-2"><CircleDot className="w-3 h-3 mt-0.5 shrink-0" />Payments will take a few mins to reflect.</li>
                                            <li className="flex gap-2"><CircleDot className="w-3 h-3 mt-0.5 shrink-0" />There are no additional fees on deposits.</li>
                                        </ul>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </DrawerContent>
        </Drawer>
    );
}
