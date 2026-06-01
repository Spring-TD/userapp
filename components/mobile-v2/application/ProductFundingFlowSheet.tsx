'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import Image from 'next/image';
import { AlertCircle, Check, CheckCircle, ChevronDown, Copy, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ensureInvestmentAccount } from '@/lib/investmentApplyClient';
import { ensureSavingsAccount } from '@/lib/savingsApplyClient';

type FundingFlowStep = 'terms' | 'accountCreated' | 'application' | 'accountDetails' | 'success' | 'failure';

type FundingFlowForm = {
    name: string;
    purpose: string;
    duration: string;
    frequency: string;
    amount: string;
    acceptedTerms: boolean;
};

type FundingAccountKind = 'savings' | 'investment';

type ProductFundingFlowSheetProps = {
    open: boolean;
    onClose: () => void;
    /** App-scoped product id from the storefront catalog. */
    productId?: string;
    accountKind?: FundingAccountKind;
    productName: string;
    productKindLabel: string;
    termsTitle: string;
    termsDescription: ReactNode;
    formTitle: string;
    namePlaceholder: string;
    amountPlaceholder: string;
    actionLabel: string;
    successTitle: string;
    successMessage: string;
    failureMessage: string;
    centralWalletBalance?: number;
};

const DEFAULT_CENTRAL_WALLET_BALANCE = 250000;

export function ProductFundingFlowSheet({
    open,
    onClose,
    productId = '',
    accountKind = 'savings',
    productName,
    productKindLabel,
    termsTitle,
    termsDescription,
    formTitle,
    namePlaceholder,
    amountPlaceholder,
    actionLabel,
    successTitle,
    successMessage,
    failureMessage,
    centralWalletBalance = DEFAULT_CENTRAL_WALLET_BALANCE,
}: ProductFundingFlowSheetProps) {
    const [step, setStep] = useState<FundingFlowStep>('terms');
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [privacyAccepted, setPrivacyAccepted] = useState(false);
    const [useCentralWallet, setUseCentralWallet] = useState(false);
    const [setupError, setSetupError] = useState<string | null>(null);
    const [settingUpAccount, setSettingUpAccount] = useState(false);
    const [accountCreationMessage, setAccountCreationMessage] = useState('');
    const [form, setForm] = useState<FundingFlowForm>({
        name: '',
        purpose: '',
        duration: '',
        frequency: '',
        amount: '',
        acceptedTerms: false,
    });

    if (!open) return null;

    const updateForm = (field: keyof FundingFlowForm, value: string | boolean) => {
        setForm((current) => ({ ...current, [field]: value }));
    };

    const enteredAmount = Number(form.amount.replace(/[^\d.]/g, '')) || 0;
    const canSubmit = Boolean(
        form.name.trim() &&
        form.purpose.trim() &&
        form.duration.trim() &&
        form.frequency &&
        enteredAmount > 0 &&
        form.acceptedTerms,
    );

    const close = () => {
        setStep('terms');
        setTermsAccepted(false);
        setPrivacyAccepted(false);
        setUseCentralWallet(false);
        setSetupError(null);
        setSettingUpAccount(false);
        setAccountCreationMessage('');
        onClose();
    };

    const handleCreateAccount = async () => {
        if (!termsAccepted || !privacyAccepted) {
            setSetupError('Please accept the terms and privacy policy to continue.');
            return;
        }

        if (!productId.trim()) {
            setSetupError('No product selected.');
            return;
        }

        setSettingUpAccount(true);
        setSetupError(null);

        try {
            const ensure =
                accountKind === 'investment' ? ensureInvestmentAccount : ensureSavingsAccount;
            const result = await ensure(productId.trim(), { currency: 'NGN' });
            if (!result.ok) {
                setSetupError(result.error || 'Could not create your account. Please try again.');
                return;
            }

            setAccountCreationMessage(
                result.message || `Your ${productKindLabel} account was created successfully.`,
            );
            setStep('accountCreated');
        } finally {
            setSettingUpAccount(false);
        }
    };

    const submitFundingAccount = async () => {
        setSettingUpAccount(true);
        setSetupError(null);

        try {
            const ensure =
                accountKind === 'investment' ? ensureInvestmentAccount : ensureSavingsAccount;
            const result = await ensure(productId.trim(), { amount: enteredAmount, currency: 'NGN' });
            if (!result.ok) {
                setSetupError(result.error || 'Could not set up your account.');
                setStep('application');
                return;
            }
            setStep('success');
        } finally {
            setSettingUpAccount(false);
        }
    };

    const processPayment = async () => {
        if (useCentralWallet && enteredAmount > centralWalletBalance) {
            setStep('failure');
            return;
        }

        await submitFundingAccount();
    };

    return (
        <div className="absolute inset-0 z-50 flex items-end">
            <button
                type="button"
                aria-label={`Close ${productName} ${productKindLabel} sheet`}
                className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
                onClick={close}
            />

            {step === 'terms' ? (
                <div className="relative z-10 w-full rounded-t-[28px] bg-white px-6 pb-8 pt-3 shadow-2xl">
                    <div className="mx-auto mb-6 h-1.5 w-16 rounded-full bg-gray-300" />
                    <div className="text-center">
                        <h2 className="text-xl font-bold text-[#1E293B]">{termsTitle}</h2>
                        <p className="mx-auto mt-4 max-w-xs text-xs leading-relaxed text-gray-500">
                            {termsDescription}
                        </p>
                    </div>

                    <div className="mt-5 flex items-center gap-3 rounded bg-green-50 p-3 text-left text-xs text-green-900">
                        <Image
                            src="/images/mobile/cbn.png"
                            alt="Central Bank of Nigeria"
                            width={32}
                            height={32}
                            className="h-8 w-8 shrink-0 object-contain"
                        />
                        <span>
                            <strong>AG Mortgage Bank</strong> is a licensed financial institution by the Central Bank of Nigeria.
                        </span>
                    </div>

                    <div className="mt-5 space-y-3 text-left text-xs text-gray-700">
                        {[
                            {
                                checked: termsAccepted,
                                onClick: () => setTermsAccepted((value) => !value),
                                label: 'Accept Terms & Condition, Data Sharing with AG Mortgage Bank',
                            },
                            {
                                checked: privacyAccepted,
                                onClick: () => setPrivacyAccepted((value) => !value),
                                label: 'Accept Data Privacy & Use of Data',
                            },
                        ].map((item) => (
                            <button
                                key={item.label}
                                type="button"
                                onClick={item.onClick}
                                className="flex items-center gap-2"
                            >
                                <span
                                    className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                                        item.checked ? 'border-black bg-black text-white' : 'border-gray-400 bg-white'
                                    }`}
                                >
                                    {item.checked ? <Check className="h-3 w-3" /> : null}
                                </span>
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </div>

                    {setupError ? (
                        <p className="mt-4 text-center text-xs text-red-600">{setupError}</p>
                    ) : null}

                    <Button
                        disabled={!termsAccepted || !privacyAccepted || settingUpAccount}
                        onClick={() => void handleCreateAccount()}
                        className="mt-7 h-12 w-full rounded-full bg-[var(--sf-button,#2563EB)] text-sm font-semibold text-white hover:bg-[var(--sf-button-hover,#1e3a8a)] disabled:opacity-50"
                    >
                        {settingUpAccount ? (
                            <span className="inline-flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Creating account...
                            </span>
                        ) : (
                            'Go ahead, Create Bank account'
                        )}
                    </Button>

                    <button
                        type="button"
                        onClick={close}
                        className="mt-5 w-full text-sm font-medium text-[#1E293B]"
                    >
                        No. Go back
                    </button>
                </div>
            ) : step === 'accountCreated' ? (
                <div className="relative z-10 w-full rounded-t-[28px] bg-white px-8 pb-8 pt-4 text-center shadow-2xl">
                    <div className="mx-auto mb-8 h-1.5 w-20 rounded-full bg-gray-300" />
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
                        <CheckCircle className="h-9 w-9" />
                    </div>
                    <h2 className="text-xl font-bold text-[#1E293B]">Account Created Successfully</h2>
                    <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-gray-500">
                        {accountCreationMessage || `Your ${productKindLabel} account has been created successfully.`}
                    </p>
                    <Button
                        type="button"
                        onClick={() => setStep('application')}
                        className="mt-8 h-12 w-full rounded-full bg-[var(--sf-button,#2563EB)] text-sm font-semibold text-white hover:bg-[var(--sf-button-hover,#1e3a8a)]"
                    >
                        Continue to Application
                    </Button>
                    <button
                        type="button"
                        onClick={close}
                        className="mt-5 w-full text-sm font-medium text-[#1E293B]"
                    >
                        Not now
                    </button>
                </div>
            ) : step === 'application' ? (
                <div className="relative z-10 w-full rounded-t-[28px] bg-white px-6 pb-8 pt-3 shadow-2xl">
                    <div className="mx-auto mb-6 h-1.5 w-16 rounded-full bg-gray-300" />
                    <h2 className="mb-7 text-center text-xl font-bold text-[#1E293B]">{formTitle}</h2>

                    <div className="space-y-4">
                        <input
                            value={form.name}
                            onChange={(event) => updateForm('name', event.target.value)}
                            placeholder={namePlaceholder}
                            className="h-12 w-full rounded-full bg-gray-100 px-5 text-sm outline-none placeholder:text-gray-400"
                        />
                        <input
                            value={form.purpose}
                            onChange={(event) => updateForm('purpose', event.target.value)}
                            placeholder="Purpose"
                            className="h-12 w-full rounded-full bg-gray-100 px-5 text-sm outline-none placeholder:text-gray-400"
                        />
                        <input
                            value={form.duration}
                            onChange={(event) => updateForm('duration', event.target.value)}
                            placeholder="Duration"
                            className="h-12 w-full rounded-full bg-gray-100 px-5 text-sm outline-none placeholder:text-gray-400"
                        />
                        <div className="relative">
                            <select
                                value={form.frequency}
                                onChange={(event) => updateForm('frequency', event.target.value)}
                                className={`h-12 w-full appearance-none rounded-full bg-gray-100 px-5 pr-12 text-sm outline-none ${
                                    form.frequency ? 'text-gray-700' : 'text-gray-400'
                                }`}
                            >
                                <option value="">Frequency</option>
                                <option value="Daily">Daily</option>
                                <option value="Weekly">Weekly</option>
                                <option value="Monthly">Monthly</option>
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                        </div>
                        <input
                            value={form.amount}
                            onChange={(event) => updateForm('amount', event.target.value)}
                            placeholder={amountPlaceholder}
                            inputMode="numeric"
                            className="h-12 w-full rounded-full bg-gray-100 px-5 text-sm outline-none placeholder:text-gray-400"
                        />
                        <button
                            type="button"
                            onClick={() => updateForm('acceptedTerms', !form.acceptedTerms)}
                            className="flex items-center gap-3 px-1 text-left text-sm text-gray-700"
                        >
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black text-white">
                                {form.acceptedTerms ? <Check className="h-3.5 w-3.5" /> : null}
                            </span>
                            <span>Accept terms &amp; conditions</span>
                        </button>
                    </div>

                    <Button
                        disabled={!canSubmit}
                        onClick={() => setStep('accountDetails')}
                        className="mt-6 h-12 w-full rounded-full bg-[var(--sf-button,#2563EB)] text-sm font-semibold text-white hover:bg-[var(--sf-button-hover,#1e3a8a)] disabled:opacity-50"
                    >
                        {actionLabel}
                    </Button>

                    <button
                        type="button"
                        onClick={close}
                        className="mt-5 w-full text-sm font-medium text-[#1E293B]"
                    >
                        No. Go back
                    </button>
                </div>
            ) : step === 'accountDetails' ? (
                <div className="relative z-10 w-full rounded-t-[28px] bg-white px-10 pb-8 pt-4 shadow-2xl">
                    <div className="mx-auto mb-8 h-1.5 w-20 rounded-full bg-gray-300" />
                    <button
                        type="button"
                        onClick={close}
                        aria-label="Close account details"
                        className="absolute right-14 top-[62px] text-[#111827]"
                    >
                        <X className="h-4 w-4" />
                    </button>

                    <h2 className="mb-8 text-center text-xl font-bold text-[#343434]">Account Details</h2>

                    <div className="space-y-5 text-left">
                        <div>
                            <p className="text-[10px] text-gray-400">Bank Name</p>
                            <p className="mt-1 text-sm font-bold text-[#1E293B]">AG Mortgage Bank</p>
                        </div>

                        <div className="flex items-center justify-between border-b border-dashed border-gray-200 pb-5">
                            <div>
                                <p className="text-[10px] text-gray-400">Account Number</p>
                                <p className="mt-1 text-sm font-bold text-[#1E293B]">7012345678</p>
                            </div>
                            <button type="button" aria-label="Copy account number" className="text-gray-400">
                                <Copy className="h-4 w-4" />
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={() => setUseCentralWallet((current) => !current)}
                            className="flex w-full items-center justify-between py-1 text-sm text-[#343434]"
                        >
                            <span>Central Wallet</span>
                            <span
                                className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                                    useCentralWallet ? 'border-[var(--sf-button,#2563EB)]' : 'border-gray-400'
                                }`}
                            >
                                {useCentralWallet ? (
                                    <span className="h-2.5 w-2.5 rounded-full bg-[var(--sf-button,#2563EB)]" />
                                ) : null}
                            </span>
                        </button>
                    </div>

                    <Button
                        onClick={() => void processPayment()}
                        disabled={settingUpAccount}
                        className="mt-9 h-14 w-full rounded-full bg-[var(--sf-button,#2563EB)] text-base font-semibold text-white hover:bg-[var(--sf-button-hover,#1e3a8a)]"
                    >
                        {settingUpAccount ? (
                            <span className="inline-flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Processing...
                            </span>
                        ) : (
                            'Continue'
                        )}
                    </Button>
                </div>
            ) : (
                <div className="relative z-10 w-full rounded-t-[28px] bg-white px-8 pb-8 pt-4 text-center shadow-2xl">
                    <div className="mx-auto mb-8 h-1.5 w-20 rounded-full bg-gray-300" />
                    <div
                        className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full ${
                            step === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                        }`}
                    >
                        {step === 'success' ? <CheckCircle className="h-9 w-9" /> : <AlertCircle className="h-9 w-9" />}
                    </div>
                    <h2 className="text-xl font-bold text-[#1E293B]">
                        {step === 'success' ? successTitle : 'Insufficient Balance'}
                    </h2>
                    <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-gray-500">
                        {step === 'success' ? successMessage : failureMessage}
                    </p>
                    {step === 'failure' ? (
                        <p className="mt-4 text-xs font-medium text-gray-500">
                            Available balance: ₦{centralWalletBalance.toLocaleString()}
                        </p>
                    ) : null}

                    <Button
                        onClick={close}
                        className="mt-8 h-12 w-full rounded-full bg-[var(--sf-button,#2563EB)] text-sm font-semibold text-white hover:bg-[var(--sf-button-hover,#1e3a8a)]"
                    >
                        {step === 'success' ? 'Done' : 'Try Again'}
                    </Button>
                </div>
            )}
        </div>
    );
}
