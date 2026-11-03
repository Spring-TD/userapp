'use client';

/**
 * Retail KYC onboarding (Level 1 → 3) — the "new kyc flow" prototype, driven by account-ms
 * `GET /api/v1/kyc/onboarding`. Users land here right after login while KYC is incomplete:
 * Welcome → (Start) Contacts → BVN → NIN (Level 2) → Face → Address + proof → Finalising → Done (Level 3).
 * "I'll do this later" / "Save & exit" go into the real app; progress lives on the server.
 */

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getSecureAccessTokenSync } from '@/lib/tokenManager';
import { fetchAuthUserProfile } from '@/lib/userProfileClient';
import {
  DEFAULT_MOBILE_HOME,
  transactionPinSetupPath,
  userNeedsTransactionPinSetup,
} from '@/lib/transactionPinRouting';
import { safeMobileReturnPath } from '@/lib/userKycRouting';
import {
  kycOnboarding,
  OnboardingApiError,
  readFaceReference,
  type OnboardingProgress,
} from '@/lib/kycOnboardingClient';
import {
  AddressScreen,
  ContactsScreen,
  DoneScreen,
  FaceScreen,
  FinalisingScreen,
  IdentityScreen,
  WelcomeScreen,
  type AddressSubmission,
} from '@/components/mobile-v2/kyc-onboarding/screens';
import { Confetti, LevelUpModal, MilestonePop, PrimaryButton, StepChrome } from '@/components/mobile-v2/kyc-onboarding/ui';

type View = 'loading' | 'welcome' | 'step' | 'finalising' | 'done' | 'error';
type StepResult = { progress: OnboardingProgress; json: Record<string, unknown> };

const STEP_ORDER: OnboardingProgress['currentStep'][] = ['contacts', 'identity_bvn', 'identity_nin', 'face', 'address', 'done'];

const SEGMENT_INDEX: Record<OnboardingProgress['currentStep'], number> = {
  contacts: 0,
  identity_bvn: 1,
  identity_nin: 1,
  face: 2,
  address: 3,
  done: 3,
};

function KycOnboardingFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromRegistration = searchParams.get('from') === 'registration';
  const initialEmail = searchParams.get('email')?.trim().toLowerCase() || '';
  /** Where "the real app" is for this user (login may have been heading somewhere specific). */
  const appTarget = safeMobileReturnPath(searchParams.get('next'), DEFAULT_MOBILE_HOME);

  const [view, setView] = useState<View>('loading');
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [milestone, setMilestone] = useState<{ title: string; sub: string } | null>(null);
  const [levelUp, setLevelUp] = useState(false);
  const [confettiKey, setConfettiKey] = useState(0);
  const [award, setAward] = useState<{ amount: number; key: number } | null>(null);
  const [finalStage, setFinalStage] = useState(0);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [contactsPhase, setContactsPhase] = useState<string>('phone');
  const [leaving, setLeaving] = useState(false);
  /**
   * The step on screen. The server moves `currentStep` forward the moment a check succeeds, but the
   * prototype keeps the result card ("BVN confirmed… Looks right, continue") until the user taps on.
   */
  const [shownStep, setShownStep] = useState<OnboardingProgress['currentStep'] | null>(null);
  const [contactsKey, setContactsKey] = useState(0);
  const [profile, setProfile] = useState<{ phone: string; email: string }>({ phone: '', email: initialEmail });

  const loginUrl = useMemo(() => {
    const self = `/mobile-v2/profile/kyc/create?${searchParams.toString()}`;
    return `/mobile-v2/auth/login?email=${encodeURIComponent(initialEmail)}&next=${encodeURIComponent(self)}`;
  }, [initialEmail, searchParams]);

  const celebrate = () => setConfettiKey((k) => k + 1);

  /** Apply a fresh progress snapshot; float "+N pts" when the server awarded points. */
  const applyProgress = useCallback((next: OnboardingProgress) => {
    setProgress(next);
    if (next.pointsAwardedJustNow > 0) {
      setAward({ amount: next.pointsAwardedJustNow, key: Date.now() });
      setConfettiKey((k) => k + 1);
    }
  }, []);

  const isAuthError = useCallback(
    (err: unknown) => {
      if (err instanceof OnboardingApiError && err.status === 401) {
        router.replace(loginUrl);
        return true;
      }
      return false;
    },
    [loginUrl, router],
  );

  /** Leave onboarding for the real app — via transaction-PIN setup when the user has none yet. */
  const goToApp = useCallback(async () => {
    setLeaving(true);
    let target = appTarget;
    try {
      if (await userNeedsTransactionPinSetup()) target = transactionPinSetupPath(appTarget);
    } catch {
      /* PIN status unavailable — go straight in */
    }
    router.replace(target);
  }, [appTarget, router]);

  const load = useCallback(async () => {
    setView('loading');
    setLoadError(null);
    setShownStep(null);
    try {
      const { progress: p } = await kycOnboarding.get();
      setProgress(p);
      if (p.currentStep === 'done') setView('done');
      // Returning from the hosted face check: resume the step directly. Otherwise always offer the welcome.
      else if (readFaceReference() && p.currentStep === 'face') setView('step');
      else setView('welcome');
    } catch (err) {
      if (isAuthError(err)) return;
      if (err instanceof OnboardingApiError && err.status === 404) {
        setView('welcome'); // no retail profile yet — `start` creates it
        return;
      }
      setLoadError(err instanceof Error ? err.message : 'Could not load your verification progress.');
      setView('error');
    }
  }, [isAuthError]);

  useEffect(() => {
    if (!getSecureAccessTokenSync() && fromRegistration) {
      router.replace(loginUrl);
      return;
    }
    void load();
    void fetchAuthUserProfile().then(({ user }) => {
      setProfile((prev) => ({ phone: user?.phone ?? prev.phone, email: user?.email ?? prev.email }));
    });
  }, [fromRegistration, load, loginUrl, router]);

  const handleStart = async () => {
    setStarting(true);
    setStartError(null);
    try {
      const { progress: p } = await kycOnboarding.start();
      setShownStep(null);
      applyProgress(p);
      setView(p.currentStep === 'done' ? 'done' : 'step');
    } catch (err) {
      if (isAuthError(err)) return;
      setStartError(err instanceof Error ? err.message : 'Could not start verification.');
    } finally {
      setStarting(false);
    }
  };

  const saveAndExit = () => {
    toast.success('Progress saved', { description: 'Pick up anytime from Profile, KYC.' });
    void goToApp();
  };

  /** After each step: update progress and play the prototype's celebration for that step. */
  const handleStepDone = (step: OnboardingProgress['currentStep'], { progress: next }: StepResult) => {
    applyProgress(next);
    if (next.currentStep === 'done') {
      celebrate();
      setView('done');
      return;
    }
    if (step === 'contacts') {
      celebrate();
      setMilestone({ title: 'Contacts verified', sub: 'Phone and email are confirmed.' });
      setTimeout(() => setMilestone(null), 2000);
    } else if (step === 'identity_nin' && next.level >= 2) {
      celebrate();
      setLevelUp(true);
    } else if (step === 'face') {
      celebrate();
      setMilestone({ title: 'Face matched', sub: 'Your selfie matches your BVN photo.' });
      setTimeout(() => setMilestone(null), 2000);
    }
  };

  const handleAddressSubmit = async (address: AddressSubmission) => {
    if (!progress) return;
    setAddressError(null);
    setFinalStage(0);
    setView('finalising');
    let latest = progress;
    try {
      if (!latest.steps.addressVerified) {
        latest = (await kycOnboarding.saveAddress(address)).progress;
        applyProgress(latest);
      }
      setFinalStage(1);
      await new Promise((r) => setTimeout(r, 500));
      latest = (await kycOnboarding.complete()).progress;
      applyProgress(latest);
      setFinalStage(2);
      await new Promise((r) => setTimeout(r, 700));
      setFinalStage(3);
      await new Promise((r) => setTimeout(r, 500));
      celebrate();
      setView('done');
    } catch (err) {
      if (isAuthError(err)) return;
      setAddressError(err instanceof Error ? err.message : 'Could not finish verification.');
      setShownStep('address');
      setView('step');
    }
  };

  useEffect(() => {
    if (view === 'step' && progress && shownStep === null) setShownStep(progress.currentStep);
  }, [progress, shownStep, view]);
  /**
   * Move past a finished step. The step's own response can still report the same `currentStep`
   * (e.g. client-auth flags not synced yet), which used to leave the user on a finished screen.
   * So: re-read progress (GET syncs phone/email flags), and if the server still hasn't moved,
   * go to the next step in order. Contacts with an explicitly unverified email reopens on the email code.
   */
  const advance = async (step: OnboardingProgress['currentStep'], r: StepResult) => {
    let result = r;
    if (r.progress.currentStep === step) {
      try {
        result = await kycOnboarding.get();
      } catch (err) {
        if (isAuthError(err)) return;
      }
    }
    let nextStep = result.progress.currentStep;
    if (nextStep === step) {
      if (step === 'contacts' && result.progress.steps.emailVerified === false) {
        applyProgress(result.progress);
        setContactsKey((k) => k + 1);
        return;
      }
      nextStep = STEP_ORDER[STEP_ORDER.indexOf(step) + 1] ?? 'done';
      console.warn('[kyc] server still on step after completion; advancing locally', { step, progress: result.progress.raw });
    }
    handleStepDone(step, { ...result, progress: { ...result.progress, currentStep: nextStep } });
    setShownStep(nextStep);
  };

  const stepProgress = progress && shownStep ? { ...progress, currentStep: shownStep } : progress;

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[#F4F6FD] text-[#1E293B]">
      {(view === 'loading' || leaving) && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-[#F4F6FD] text-sm text-gray-500">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--sf-primary,#2563EB)]" />
          {leaving ? 'Opening your account…' : 'Loading your verification…'}
        </div>
      )}

      {view === 'error' && (
        <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
          <p className="text-lg font-semibold text-[var(--sf-ink,#1E1B4B)]">We couldn&apos;t load your verification</p>
          <p className="text-sm text-gray-500">{loadError}</p>
          <PrimaryButton className="max-w-xs" onClick={() => void load()}>
            Try again
          </PrimaryButton>
          <button type="button" onClick={() => void goToApp()} className="min-h-11 text-sm font-semibold text-gray-500">
            Skip for now
          </button>
        </div>
      )}

      {view === 'welcome' && (
        <WelcomeScreen
          justSignedUp={fromRegistration}
          progress={progress}
          starting={starting}
          error={startError}
          onStart={() => void handleStart()}
          onLater={() => {
            toast.message('No problem', { description: 'Finish anytime from Profile, KYC.' });
            void goToApp();
          }}
        />
      )}

      {view === 'step' && stepProgress && (
        <>
          <StepChrome
            progress={stepProgress}
            activeIndex={SEGMENT_INDEX[stepProgress.currentStep]}
            onSaveExit={saveAndExit}
            onBack={stepProgress.currentStep === 'contacts' && contactsPhase === 'phone' ? () => setView('welcome') : undefined}
            award={award}
          />
          {(() => {
            const p = stepProgress;
            const onProgress = (r: StepResult) => applyProgress(r.progress);
            switch (p.currentStep) {
              case 'contacts':
                return (
                  <ContactsScreen
                    key={`contacts-${contactsKey}`}
                    progress={p}
                    initialPhone={profile.phone}
                    email={profile.email}
                    onPhase={setContactsPhase}
                    onProgress={onProgress}
                    onDone={(r) => void advance('contacts', r)}
                  />
                );
              case 'identity_bvn':
                return <IdentityScreen key="bvn" kind="bvn" onProgress={onProgress} onDone={(r) => void advance('identity_bvn', r)} />;
              case 'identity_nin':
                return <IdentityScreen key="nin" kind="nin" onProgress={onProgress} onDone={(r) => void advance('identity_nin', r)} />;
              case 'face':
                return <FaceScreen onDone={(r) => void advance('face', r)} />;
              case 'address':
                return (
                  <AddressScreen
                    progress={p}
                    error={addressError}
                    onProgress={onProgress}
                    onSubmit={(input) => void handleAddressSubmit(input)}
                  />
                );
              default:
                return null;
            }
          })()}
        </>
      )}

      {view === 'finalising' && <FinalisingScreen stage={finalStage} />}
      {view === 'done' && <DoneScreen points={progress?.points ?? 0} onHome={() => void goToApp()} />}

      {milestone && <MilestonePop title={milestone.title} sub={milestone.sub} />}
      {levelUp && (
        <LevelUpModal
          level={2}
          sub="Your identity is confirmed. You can now fund your wallet and send money."
          onContinue={() => setLevelUp(false)}
        />
      )}
      {confettiKey > 0 && <Confetti key={confettiKey} />}
    </div>
  );
}

export default function CreateKycPage() {
  return (
    <Suspense
      fallback={<div className="flex h-full items-center justify-center bg-[#F4F6FD] text-sm text-gray-500">Loading KYC…</div>}
    >
      <KycOnboardingFlow />
    </Suspense>
  );
}
