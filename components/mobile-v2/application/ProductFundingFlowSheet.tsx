'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import Image from 'next/image';
import { AlertCircle, Check, CheckCircle, ChevronDown, Copy, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ensureInvestmentAccount } from '@/lib/investmentApplyClient';
import { ensureSavingsAccount } from '@/lib/savingsApplyClient';
import {
    formatApplicationAmountHint,
    parseApplicationAmount,
    validateApplicationAmount,
} from '@/lib/applicationAmount';
import { YesNoField, PepSearchNotice } from '@/components/mobile-v2/application/ApplicantProfileFields';
import type { PepAnswer } from '@/lib/applicantProfileFields';

type FundingFlowStep = 'terms' | 'accountCreated' | 'application' | 'accountDetails' | 'success' | 'failure';

type FundingFlowForm = {
    name: string;
    purpose: string;
    duration: string;
    frequency: string;
    amount: string;
    acceptedTerms: boolean;
    politicallyExposed: PepAnswer;
};

type FundingAccountKind = 'savings' | 'investment';
type ProvisionedAccount = {
    id?: string;
    accountNumber?: string;
    bankName?: string;
    currency?: string;
    status?: string;
};

type ProductFundingFlowSheetProps = {
    open: boolean;
    onClose: () => void;
    /** App-scoped product id from the storefront catalog. */
    productId?: string;
    accountKind?: FundingAccountKind;
    productName: string;
    productKindLabel: string;
    providerName?: string;
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
    amountMin?: number | null;
    amountMax?: number | null;
};

const DEFAULT_CENTRAL_WALLET_BALANCE = 250000;
const BRAND_BUTTON = 'bg-[var(--sf-button,#2563EB)] text-white hover:bg-[var(--sf-button-hover,#1e3a8a)]';
const BRAND_INK = 'text-[var(--sf-ink,#1E293B)]';
const BRAND_SOFT = 'bg-[color-mix(in_srgb,var(--sf-button,#2563EB)_10%,white)]';

export function ProductFundingFlowSheet({
    open,
    onClose,
    productId = '',
    accountKind = 'savings',
    productName,
    productKindLabel,
    providerName = 'your provider',
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
    amountMin = null,
    amountMax = null,
}: ProductFundingFlowSheetProps) {
    const [step, setStep] = useState<FundingFlowStep>('terms');
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [privacyAccepted, setPrivacyAccepted] = useState(false);
    const [useCentralWallet, setUseCentralWallet] = useState(false);
    const [setupError, setSetupError] = useState<string | null>(null);
    const [settingUpAccount, setSettingUpAccount] = useState(false);
    const [accountCreationMessage, setAccountCreationMessage] = useState('');
    const [provisionedAccount, setProvisionedAccount] = useState<ProvisionedAccount | null>(null);
    const [form, setForm] = useState<FundingFlowForm>({
        name: '',
        purpose: '',
        duration: '',
        frequency: '',
        amount: '',
        acceptedTerms: false,
        politicallyExposed: '',
    });

    if (!open) return null;

    const updateForm = (field: keyof FundingFlowForm, value: string | boolean) => {
        setForm((current) => ({ ...current, [field]: value }));
    };

    const enteredAmount = parseApplicationAmount(form.amount) ?? 0;
    const amountValidationError =
        enteredAmount > 0 ? validateApplicationAmount(enteredAmount, amountMin, amountMax) : null;
    const canSubmit = Boolean(
        form.name.trim() &&
        form.purpose.trim() &&
        form.duration.trim() &&
        form.frequency &&
        enteredAmount > 0 &&
        !amountValidationError &&
        form.acceptedTerms &&
        (form.politicallyExposed === 'yes' || form.politicallyExposed === 'no'),
    );

    const close = () => {
        setStep('terms');
        setTermsAccepted(false);
        setPrivacyAccepted(false);
        setUseCentralWallet(false);
        setSetupError(null);
        setSettingUpAccount(false);
        setAccountCreationMessage('');
        setProvisionedAccount(null);
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
            const result = await ensure(productId.trim(), {
                currency: 'NGN',
                politicallyExposed:
                    form.politicallyExposed === 'yes' || form.politicallyExposed === 'no'
                        ? form.politicallyExposed
                        : undefined,
            });
            if (!result.ok) {
                setSetupError(result.error || 'Could not create your account. Please try again.');
                return;
            }

            setProvisionedAccount(result.account ?? null);
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
            const result = await ensure(productId.trim(), {
                amount: enteredAmount,
                currency: 'NGN',
                politicallyExposed:
                    form.politicallyExposed === 'yes' || form.politicallyExposed === 'no'
                        ? form.politicallyExposed
                        : undefined,
            });
            if (!result.ok) {
                setSetupError(result.error || 'Could not set up your account.');
                setStep('application');
                return;
            }
            setProvisionedAccount(result.account ?? provisionedAccount);
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
                        <h2 className={`text-xl font-bold ${BRAND_INK}`}>{termsTitle}</h2>
                        <p className="mx-auto mt-4 max-w-xs text-xs leading-relaxed text-gray-500">
                            {termsDescription}
                        </p>
                    </div>

                    <div className={`mt-5 flex items-center gap-3 rounded p-3 text-left text-xs ${BRAND_SOFT} ${BRAND_INK}`}>
                        <Image
                            src="/images/mobile/cbn.png"
                            alt="Central Bank of Nigeria"
                            width={32}
                            height={32}
                            className="h-8 w-8 shrink-0 object-contain"
                        />
                        <span>
                            <strong>{providerName}</strong> is a licensed financial institution by the Central Bank of Nigeria.
                        </span>
                    </div>

                    <div className="mt-5 space-y-3 text-left text-xs text-gray-700">
                        {[
                            {
                                checked: termsAccepted,
                                onClick: () => setTermsAccepted((value) => !value),
                                label: `Accept Terms & Condition, Data Sharing with ${providerName}`,
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
                                        item.checked ? 'border-[var(--sf-button,#2563EB)] bg-[var(--sf-button,#2563EB)] text-white' : 'border-gray-400 bg-white'
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
                        className={`mt-7 h-12 w-full rounded-full text-sm font-semibold disabled:opacity-50 ${BRAND_BUTTON}`}
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
                        className={`mt-5 w-full text-sm font-medium ${BRAND_INK}`}
                    >
                        No. Go back
                    </button>
                </div>
            ) : step === 'accountCreated' ? (
                <div className="relative z-10 w-full rounded-t-[28px] bg-white px-8 pb-8 pt-4 text-center shadow-2xl">
                    <div className="mx-auto mb-8 h-1.5 w-20 rounded-full bg-gray-300" />
                    <div className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full ${BRAND_SOFT} text-[var(--sf-button,#2563EB)]`}>
                        <CheckCircle className="h-9 w-9" />
                    </div>
                    <h2 className={`text-xl font-bold ${BRAND_INK}`}>Account Created Successfully</h2>
                    <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-gray-500">
                        {accountCreationMessage || `Your ${productKindLabel} account has been created successfully.`}
                    </p>
                    <Button
                        type="button"
                        onClick={() => setStep('application')}
                        className={`mt-8 h-12 w-full rounded-full text-sm font-semibold ${BRAND_BUTTON}`}
                    >
                        Continue to Application
                    </Button>
                    <button
                        type="button"
                        onClick={close}
                        className={`mt-5 w-full text-sm font-medium ${BRAND_INK}`}
                    >
                        Not now
                    </button>
                </div>
            ) : step === 'application' ? (
                <div className="relative z-10 w-full rounded-t-[28px] bg-white px-6 pb-8 pt-3 shadow-2xl">
                    <div className="mx-auto mb-6 h-1.5 w-16 rounded-full bg-gray-300" />
                    <h2 className={`mb-7 text-center text-xl font-bold ${BRAND_INK}`}>{formTitle}</h2>

                    <div className="space-y-4">
                        <input
                            value={form.name}
                            onChange={(event) => updateForm('name', event.target.value)}
                            placeholder={namePlaceholder}
                            className="h-12 w-full rounded-full bg-gray-100 px-5 text-sm outline-none ring-[var(--sf-button,#2563EB)]/20 placeholder:text-gray-400 focus:ring-2"
                        />
                        <input
                            value={form.purpose}
                            onChange={(event) => updateForm('purpose', event.target.value)}
                            placeholder="Purpose"
                            className="h-12 w-full rounded-full bg-gray-100 px-5 text-sm outline-none ring-[var(--sf-button,#2563EB)]/20 placeholder:text-gray-400 focus:ring-2"
                        />
                        <input
                            value={form.duration}
                            onChange={(event) => updateForm('duration', event.target.value)}
                            placeholder="Duration"
                            className="h-12 w-full rounded-full bg-gray-100 px-5 text-sm outline-none ring-[var(--sf-button,#2563EB)]/20 placeholder:text-gray-400 focus:ring-2"
                        />
                        <div className="relative">
                            <select
                                value={form.frequency}
                                onChange={(event) => updateForm('frequency', event.target.value)}
                                className={`h-12 w-full appearance-none rounded-full bg-gray-100 px-5 pr-12 text-sm outline-none ring-[var(--sf-button,#2563EB)]/20 focus:ring-2 ${
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
                            className="h-12 w-full rounded-full bg-gray-100 px-5 text-sm outline-none ring-[var(--sf-button,#2563EB)]/20 placeholder:text-gray-400 focus:ring-2"
                        />
                        <p className="px-1 text-[11px] text-gray-500">
                            {formatApplicationAmountHint(amountMin, amountMax)}
                        </p>
                        {amountValidationError ? (
                            <p className="px-1 text-xs text-red-600">{amountValidationError}</p>
                        ) : null}
                        <button
                            type="button"
                            onClick={() => updateForm('acceptedTerms', !form.acceptedTerms)}
                            className="flex items-center gap-3 px-1 text-left text-sm text-gray-700"
                        >
                            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${form.acceptedTerms ? 'border-[var(--sf-button,#2563EB)] bg-[var(--sf-button,#2563EB)] text-white' : 'border-gray-400 bg-white text-transparent'}`}>
                                {form.acceptedTerms ? <Check className="h-3.5 w-3.5" /> : null}
                            </span>
                            <span>Accept terms &amp; conditions</span>
                        </button>
                        <YesNoField
                            label="Are you a politically exposed person?"
                            value={form.politicallyExposed}
                            onChange={(politicallyExposed) => updateForm('politicallyExposed', politicallyExposed)}
                        />
                        <PepSearchNotice isPep={form.politicallyExposed === 'yes'} />
                    </div>

                    <Button
                        disabled={!canSubmit}
                        onClick={() => setStep('accountDetails')}
                        className={`mt-6 h-12 w-full rounded-full text-sm font-semibold disabled:opacity-50 ${BRAND_BUTTON}`}
                    >
                        {actionLabel}
                    </Button>

                    <button
                        type="button"
                        onClick={close}
                        className={`mt-5 w-full text-sm font-medium ${BRAND_INK}`}
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
                        className="absolute right-14 top-[62px] text-[var(--sf-ink,#111827)]"
                    >
                        <X className="h-4 w-4" />
                    </button>

                    <h2 className={`mb-8 text-center text-xl font-bold ${BRAND_INK}`}>Account Details</h2>

                    <div className="space-y-5 text-left">
                        <div>
                            <p className="text-[10px] text-gray-400">Bank Name</p>
                            <p className={`mt-1 text-sm font-bold ${BRAND_INK}`}>
                                {provisionedAccount?.bankName || providerName}
                            </p>
                        </div>

                        <div className="flex items-center justify-between border-b border-dashed border-gray-200 pb-5">
                            <div>
                                <p className="text-[10px] text-gray-400">Account Number</p>
                                <p className={`mt-1 text-sm font-bold ${BRAND_INK}`}>
                                    {provisionedAccount?.accountNumber || 'Pending provisioning'}
                                </p>
                            </div>
                            <button
                                type="button"
                                aria-label="Copy account number"
                                className="text-gray-400 disabled:opacity-40"
                                disabled={!provisionedAccount?.accountNumber}
                                onClick={() => {
                                    if (provisionedAccount?.accountNumber) {
                                        void navigator.clipboard?.writeText(provisionedAccount.accountNumber);
                                    }
                                }}
                            >
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
                        className={`mt-9 h-14 w-full rounded-full text-base font-semibold ${BRAND_BUTTON}`}
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
                    <h2 className={`text-xl font-bold ${BRAND_INK}`}>
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
                        className={`mt-8 h-12 w-full rounded-full text-sm font-semibold ${BRAND_BUTTON}`}
                    >
                        {step === 'success' ? 'Done' : 'Try Again'}
                    </Button>
                </div>
            )}
        </div>
    );
}
