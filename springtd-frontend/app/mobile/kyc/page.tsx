'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    ArrowLeft,
    FolderOpen,
    User,
    FileText,
    CheckCircle2,
    Loader2,
    Upload,
    AlertCircle,
    ChevronRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { submitIndividualKyc, getKycStatus } from '@/lib/kycService';
import type { IndividualKycRequest } from '@/app/types/kyc';
import { toast } from 'sonner';

type KycStep = 'intro' | 'personal' | 'address' | 'documents' | 'review' | 'submitting' | 'success' | 'error';

export default function KYCPage() {
    const router = useRouter();
    const [step, setStep] = useState<KycStep>('intro');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Personal Info
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [nationality, setNationality] = useState('');

    // Address
    const [street, setStreet] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [country, setCountry] = useState('');

    // Documents (base64)
    const [idDocument, setIdDocument] = useState<{ name: string; data: string; type: string; size: number } | null>(null);
    const [proofOfAddress, setProofOfAddress] = useState<{ name: string; data: string; type: string; size: number } | null>(null);

    const handleFileUpload = useCallback((setter: typeof setIdDocument) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,application/pdf';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            if (file.size > 10 * 1024 * 1024) {
                toast.error('File must be under 10MB');
                return;
            }
            const reader = new FileReader();
            reader.onload = () => {
                setter({
                    name: file.name,
                    data: reader.result as string,
                    type: file.type,
                    size: file.size,
                });
            };
            reader.readAsDataURL(file);
        };
        input.click();
    }, []);

    const canProceedPersonal = firstName && lastName && dateOfBirth && nationality;
    const canProceedAddress = street && city && country;
    const canProceedDocuments = idDocument !== null;

    const handleSubmit = async () => {
        setStep('submitting');
        setSubmitting(true);
        setError(null);

        try {
            const payload: IndividualKycRequest = {
                personalInfo: {
                    firstName,
                    lastName,
                    dateOfBirth,
                    nationality,
                    address: {
                        street,
                        city,
                        state: state || undefined,
                        postalCode: postalCode || undefined,
                        country,
                    },
                },
                documents: [
                    ...(idDocument
                        ? [{
                            type: 'government_id',
                            fileName: idDocument.name,
                            fileType: idDocument.type,
                            fileSize: idDocument.size,
                            fileData: idDocument.data,
                        }]
                        : []),
                    ...(proofOfAddress
                        ? [{
                            type: 'proof_of_address',
                            fileName: proofOfAddress.name,
                            fileType: proofOfAddress.type,
                            fileSize: proofOfAddress.size,
                            fileData: proofOfAddress.data,
                        }]
                        : []),
                ],
            };

            await submitIndividualKyc(payload);
            setStep('success');
            toast.success('KYC submitted successfully!');
        } catch (err: any) {
            console.error('[KYC] Submit failed:', err);
            setError(err?.response?.data?.error || err?.message || 'Something went wrong');
            setStep('error');
        } finally {
            setSubmitting(false);
        }
    };

    // ─── Intro Screen ──────────────────────────────────────────────────────────
    if (step === 'intro') {
        return (
            <div className="flex flex-col h-screen bg-white p-6">
                <div className="flex items-center mb-8 pt-4">
                    <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
                        <ArrowLeft className="w-6 h-6 text-gray-900" />
                    </button>
                    <div className="flex-1 text-center font-semibold text-lg">Verify Identity</div>
                    <div className="w-10" />
                </div>

                <div className="flex-1 flex flex-col items-center justify-center text-center -mt-20">
                    <div className="mb-8">
                        <div className="w-24 h-24 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                            <div className="relative">
                                <FolderOpen className="w-16 h-16" />
                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 font-bold text-xl">KYC</div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6 w-full max-w-xs">
                        {[
                            { icon: User, title: 'Enter Basic Information', desc: 'Full legal name, date of birth, nationality, residential address' },
                            { icon: FileText, title: 'Upload Documents', desc: 'Government-issued ID and proof of address' },
                            { icon: CheckCircle2, title: 'Get Verified', desc: "We'll review your information within 24 hours" },
                        ].map((item, i) => (
                            <div key={i} className="flex items-start gap-4 text-left">
                                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                                    <item.icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                                    <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-full font-medium mb-4"
                    onClick={() => setStep('personal')}
                >
                    Start Verification
                </Button>
            </div>
        );
    }

    // ─── Personal Info Step ────────────────────────────────────────────────────
    if (step === 'personal') {
        return (
            <div className="flex flex-col h-screen bg-white p-6">
                <div className="flex items-center mb-6 pt-4">
                    <button onClick={() => setStep('intro')} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
                        <ArrowLeft className="w-6 h-6 text-gray-900" />
                    </button>
                    <div className="flex-1 text-center font-semibold text-lg">Personal Info</div>
                    <div className="w-10 text-xs text-gray-400 text-right">1/4</div>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-1.5 mb-8">
                    <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: '25%' }} />
                </div>

                <div className="flex-1 space-y-5">
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-1.5 block">First Name *</label>
                        <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="e.g. John" className="h-12" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-1.5 block">Last Name *</label>
                        <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="e.g. Doe" className="h-12" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-1.5 block">Date of Birth *</label>
                        <Input type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} className="h-12" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-1.5 block">Nationality *</label>
                        <Input value={nationality} onChange={e => setNationality(e.target.value)} placeholder="e.g. Nigerian" className="h-12" />
                    </div>
                </div>

                <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-full font-medium mb-4"
                    disabled={!canProceedPersonal}
                    onClick={() => setStep('address')}
                >
                    Continue <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
            </div>
        );
    }

    // ─── Address Step ──────────────────────────────────────────────────────────
    if (step === 'address') {
        return (
            <div className="flex flex-col h-screen bg-white p-6">
                <div className="flex items-center mb-6 pt-4">
                    <button onClick={() => setStep('personal')} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
                        <ArrowLeft className="w-6 h-6 text-gray-900" />
                    </button>
                    <div className="flex-1 text-center font-semibold text-lg">Address</div>
                    <div className="w-10 text-xs text-gray-400 text-right">2/4</div>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-1.5 mb-8">
                    <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: '50%' }} />
                </div>

                <div className="flex-1 space-y-5">
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-1.5 block">Street Address *</label>
                        <Input value={street} onChange={e => setStreet(e.target.value)} placeholder="123 Main Street" className="h-12" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-1.5 block">City *</label>
                            <Input value={city} onChange={e => setCity(e.target.value)} placeholder="Lagos" className="h-12" />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-1.5 block">State</label>
                            <Input value={state} onChange={e => setState(e.target.value)} placeholder="Lagos" className="h-12" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Postal Code</label>
                            <Input value={postalCode} onChange={e => setPostalCode(e.target.value)} placeholder="100001" className="h-12" />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Country *</label>
                            <Input value={country} onChange={e => setCountry(e.target.value)} placeholder="Nigeria" className="h-12" />
                        </div>
                    </div>
                </div>

                <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-full font-medium mb-4"
                    disabled={!canProceedAddress}
                    onClick={() => setStep('documents')}
                >
                    Continue <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
            </div>
        );
    }

    // ─── Documents Step ────────────────────────────────────────────────────────
    if (step === 'documents') {
        return (
            <div className="flex flex-col h-screen bg-white p-6">
                <div className="flex items-center mb-6 pt-4">
                    <button onClick={() => setStep('address')} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
                        <ArrowLeft className="w-6 h-6 text-gray-900" />
                    </button>
                    <div className="flex-1 text-center font-semibold text-lg">Documents</div>
                    <div className="w-10 text-xs text-gray-400 text-right">3/4</div>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-1.5 mb-8">
                    <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: '75%' }} />
                </div>

                <div className="flex-1 space-y-6">
                    <p className="text-sm text-gray-500">Upload clear images or PDFs of the following documents.</p>

                    {/* Gov ID */}
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Government-Issued ID *</label>
                        <button
                            onClick={() => handleFileUpload(setIdDocument)}
                            className={`w-full border-2 border-dashed rounded-xl p-6 text-center transition-colors ${idDocument ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                                }`}
                        >
                            {idDocument ? (
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
                                    <div className="text-left flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{idDocument.name}</p>
                                        <p className="text-xs text-gray-500">{(idDocument.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                    <span className="text-xs text-blue-600 font-medium">Change</span>
                                </div>
                            ) : (
                                <div>
                                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                    <p className="text-sm text-gray-600">Tap to upload</p>
                                    <p className="text-xs text-gray-400 mt-1">Passport, Driver's License, or National ID</p>
                                </div>
                            )}
                        </button>
                    </div>

                    {/* Proof of Address (optional) */}
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Proof of Address <span className="text-gray-400">(optional)</span></label>
                        <button
                            onClick={() => handleFileUpload(setProofOfAddress)}
                            className={`w-full border-2 border-dashed rounded-xl p-6 text-center transition-colors ${proofOfAddress ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                                }`}
                        >
                            {proofOfAddress ? (
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
                                    <div className="text-left flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{proofOfAddress.name}</p>
                                        <p className="text-xs text-gray-500">{(proofOfAddress.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                    <span className="text-xs text-blue-600 font-medium">Change</span>
                                </div>
                            ) : (
                                <div>
                                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                    <p className="text-sm text-gray-600">Tap to upload</p>
                                    <p className="text-xs text-gray-400 mt-1">Utility bill, bank statement, or tenancy agreement</p>
                                </div>
                            )}
                        </button>
                    </div>
                </div>

                <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-full font-medium mb-4"
                    disabled={!canProceedDocuments}
                    onClick={() => setStep('review')}
                >
                    Review <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
            </div>
        );
    }

    // ─── Review Step ───────────────────────────────────────────────────────────
    if (step === 'review') {
        return (
            <div className="flex flex-col h-screen bg-white p-6">
                <div className="flex items-center mb-6 pt-4">
                    <button onClick={() => setStep('documents')} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
                        <ArrowLeft className="w-6 h-6 text-gray-900" />
                    </button>
                    <div className="flex-1 text-center font-semibold text-lg">Review</div>
                    <div className="w-10 text-xs text-gray-400 text-right">4/4</div>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-1.5 mb-8">
                    <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: '100%' }} />
                </div>

                <div className="flex-1 space-y-6 overflow-y-auto">
                    <div className="bg-gray-50 rounded-xl p-5 space-y-3">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <User className="w-4 h-4 text-blue-600" /> Personal Information
                        </h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div><span className="text-gray-500">First Name</span><p className="font-medium">{firstName}</p></div>
                            <div><span className="text-gray-500">Last Name</span><p className="font-medium">{lastName}</p></div>
                            <div><span className="text-gray-500">Date of Birth</span><p className="font-medium">{dateOfBirth}</p></div>
                            <div><span className="text-gray-500">Nationality</span><p className="font-medium">{nationality}</p></div>
                        </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-5 space-y-3">
                        <h3 className="font-semibold text-gray-900">Address</h3>
                        <p className="text-sm text-gray-700">{street}, {city}{state ? `, ${state}` : ''}{postalCode ? ` ${postalCode}` : ''}, {country}</p>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-5 space-y-3">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-600" /> Documents
                        </h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                <span>{idDocument?.name || 'Government ID'}</span>
                            </div>
                            {proofOfAddress && (
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                    <span>{proofOfAddress.name}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-full font-medium mb-4"
                    onClick={handleSubmit}
                >
                    Submit for Verification
                </Button>
            </div>
        );
    }

    // ─── Submitting ────────────────────────────────────────────────────────────
    if (step === 'submitting') {
        return (
            <div className="flex flex-col h-screen bg-white items-center justify-center p-6">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-6" />
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Submitting Verification</h2>
                <p className="text-sm text-gray-500 text-center">Please wait while we securely upload your information...</p>
            </div>
        );
    }

    // ─── Success ───────────────────────────────────────────────────────────────
    if (step === 'success') {
        return (
            <div className="flex flex-col h-screen bg-white items-center justify-center p-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 className="w-10 h-10 text-green-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Verification Submitted!</h2>
                <p className="text-sm text-gray-500 text-center mb-8 max-w-xs">
                    Your identity verification is being reviewed. You'll be notified once the process is complete.
                </p>
                <Button
                    className="w-full max-w-xs bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-full font-medium"
                    onClick={() => router.push('/mobile/home')}
                >
                    Back to Home
                </Button>
            </div>
        );
    }

    // ─── Error ─────────────────────────────────────────────────────────────────
    if (step === 'error') {
        return (
            <div className="flex flex-col h-screen bg-white items-center justify-center p-6">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
                    <AlertCircle className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Submission Failed</h2>
                <p className="text-sm text-red-600 text-center mb-2 max-w-xs">{error}</p>
                <p className="text-xs text-gray-400 text-center mb-8 max-w-xs">
                    Please try again. If the problem persists, contact support.
                </p>
                <div className="flex gap-3 w-full max-w-xs">
                    <Button
                        variant="outline"
                        className="flex-1 h-12 rounded-full"
                        onClick={() => router.push('/mobile/home')}
                    >
                        Go Back
                    </Button>
                    <Button
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-full font-medium"
                        onClick={() => setStep('review')}
                    >
                        Try Again
                    </Button>
                </div>
            </div>
        );
    }

    return null;
}
