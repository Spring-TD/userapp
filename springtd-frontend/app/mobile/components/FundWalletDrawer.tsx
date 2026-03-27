'use client';

import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Landmark, CreditCard, Copy, X } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
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
            <DrawerContent className="bg-white rounded-t-[2rem] max-w-md mx-auto">
                <div className="mx-auto w-full max-w-md">
                    <div className="p-6 pb-12">
                        <div className="flex justify-center mb-6">
                            <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
                        </div>

                        {step === 'method' ? (
                            <>
                                <div className="flex justify-between items-center mb-8">
                                    <DrawerTitle className="text-xl font-bold text-center flex-1">Choose ways to Fund wallet</DrawerTitle>
                                    <button onClick={handleClose} className="absolute right-6 top-6">
                                        <X className="w-5 h-5 text-gray-400" />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <button
                                        className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors text-left"
                                        onClick={() => setStep('bank-details')}
                                    >
                                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                            <Landmark className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">Add via bank transfer</h3>
                                            <p className="text-sm text-gray-500">Fund your account by sending money to your unique USD bank account</p>
                                        </div>
                                    </button>

                                    <button className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors text-left">
                                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                            <CreditCard className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">Add via Card</h3>
                                            <p className="text-sm text-gray-500">Add funds from your card to your wallet.</p>
                                        </div>
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex justify-between items-center mb-8">
                                    <DrawerTitle className="text-xl font-bold text-center flex-1">Fund wallet via Bank Transfer</DrawerTitle>
                                    <button onClick={handleClose} className="absolute right-6 top-6">
                                        <X className="w-5 h-5 text-gray-400" />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-1">
                                        <Label className="text-gray-500 font-normal">Account Holder</Label>
                                        <div className="flex justify-between items-center">
                                            <p className="font-bold text-lg text-gray-900">Chidi Vera</p>
                                            <Copy className="w-5 h-5 text-gray-400 cursor-pointer" />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-gray-500 font-normal">Account Number</Label>
                                        <div className="flex justify-between items-center">
                                            <p className="font-bold text-lg text-gray-900">1234567891</p>
                                            <Copy className="w-5 h-5 text-gray-400 cursor-pointer" />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-gray-500 font-normal">Bank Name</Label>
                                        <div className="flex justify-between items-center">
                                            <p className="font-bold text-lg text-gray-900">AG Mortgage Bank</p>
                                            <Copy className="w-5 h-5 text-gray-400 cursor-pointer" />
                                        </div>
                                    </div>

                                    <div className="bg-orange-50 p-4 rounded-xl space-y-2 mt-6">
                                        <h4 className="font-semibold text-gray-900">Please take note of the following when sending money to your NGN account:</h4>
                                        <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                                            <li>The account can only receive funds in Nigeria Naira (NGN)</li>
                                            <li>Payments will take a few mins to reflect.</li>
                                            <li>There are no additional fees on deposits.</li>
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
