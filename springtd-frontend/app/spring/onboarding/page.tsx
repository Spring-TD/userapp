"use client"

import { useState } from "react"
import { OnboardingLayout } from "@/components/onboarding-layout"
import { OnboardingIntent } from "@/components/onboarding/intent-step"
import { OnboardingSurvey } from "@/components/onboarding/survey-step"
import { OnboardingProfile } from "@/components/onboarding/profile-step"
import { OnboardingDocuments } from "@/components/onboarding/document-step"
import { OnboardingAgreement } from "@/components/onboarding/agreement-step"
import { OnboardingContinueAgreement } from "@/components/onboarding/continue-agreement-step"
import { OnboardingSuccess } from "@/components/onboarding/success-step"
import { useRouter } from "next/navigation"

export default function OnboardingPage() {
    const [step, setStep] = useState(1)
    const router = useRouter()

    const handleNext = () => {
        setStep((prev) => prev + 1)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleBack = () => {
        setStep((prev) => Math.max(1, prev - 1))
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleFinish = () => {
        // After registration and onboarding, user needs to log in to get access token
        router.push('/spring/signin')
    }

    return (
        <OnboardingLayout>
            {step === 1 && <OnboardingIntent onNext={handleNext} />}
            {step === 2 && <OnboardingSurvey onNext={handleNext} onBack={handleBack} />}
            {step === 3 && <OnboardingProfile onNext={handleNext} onBack={handleBack} />}
            {step === 4 && <OnboardingDocuments onNext={handleNext} onBack={handleBack} />}
            {step === 5 && <OnboardingAgreement onNext={handleNext} />}
            {step === 6 && <OnboardingContinueAgreement onNext={handleNext} />}
            {step === 7 && <OnboardingSuccess onFinish={handleFinish} />}
        </OnboardingLayout>
    )
}
