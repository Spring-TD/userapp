'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ChevronLeft,
    ChevronRight,
    Check,
    Home,
    User,
    Briefcase,
    Loader2,
    CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SurveyQuestion {
    id: number;
    question: string;
    type: 'single' | 'multiple' | 'scale' | 'input';
    options?: string[];
    placeholder?: string;
}

const surveyQuestions: SurveyQuestion[] = [
    {
        id: 1,
        question: "What is your current employment status?",
        type: 'single',
        options: ['Employed Full-Time', 'Employed Part-Time', 'Self-Employed', 'Business Owner', 'Retired', 'Not Currently Employed']
    },
    {
        id: 2,
        question: "What is your monthly income range?",
        type: 'single',
        options: ['Below ₦200,000', '₦200,000 - ₦500,000', '₦500,000 - ₦1,000,000', '₦1,000,000 - ₦2,500,000', '₦2,500,000 - ₦5,000,000', 'Above ₦5,000,000']
    },
    {
        id: 3,
        question: "Do you have any existing loans or mortgages?",
        type: 'single',
        options: ['No existing loans', 'Yes, 1 loan', 'Yes, 2-3 loans', 'Yes, more than 3 loans']
    },
    {
        id: 4,
        question: "What type of property are you interested in?",
        type: 'single',
        options: ['Apartment/Flat', '2-3 Bedroom House', '4+ Bedroom House', 'Duplex', 'Commercial Property', 'Land Only']
    },
    {
        id: 5,
        question: "What is your preferred mortgage duration?",
        type: 'single',
        options: ['5 years', '10 years', '15 years', '20 years', '25 years', '30 years']
    },
    {
        id: 6,
        question: "How much can you afford for a down payment?",
        type: 'single',
        options: ['Less than 10%', '10% - 20%', '20% - 30%', '30% - 40%', 'More than 40%']
    },
    {
        id: 7,
        question: "On a scale of 1-5, how urgent is your need for a mortgage?",
        type: 'scale',
        options: ['1', '2', '3', '4', '5']
    }
];

export default function MortgageSurveyPage() {
    const router = useRouter();
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string | string[]>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isComplete, setIsComplete] = useState(false);

    const question = surveyQuestions[currentQuestion];
    const progress = ((currentQuestion + 1) / surveyQuestions.length) * 100;
    const isLastQuestion = currentQuestion === surveyQuestions.length - 1;
    const hasAnswer = answers[question.id] !== undefined && answers[question.id] !== '';

    const handleSelectOption = (option: string) => {
        setAnswers(prev => ({
            ...prev,
            [question.id]: option
        }));
    };

    const handleNext = () => {
        if (isLastQuestion) {
            handleSubmit();
        } else {
            setCurrentQuestion(prev => prev + 1);
        }
    };

    const handleBack = () => {
        if (currentQuestion > 0) {
            setCurrentQuestion(prev => prev - 1);
        } else {
            router.push('/mobile-v2/products/mortgage');
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000));
        setIsSubmitting(false);
        setIsComplete(true);
    };

    // Success Screen
    if (isComplete) {
        return (
            <div className="flex flex-col h-full bg-white">
                <div className="flex-1 flex flex-col items-center justify-center px-6">
                    <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-in zoom-in duration-300">
                        <CheckCircle2 className="w-12 h-12 text-green-500" />
                    </div>
                    
                    <h1 className="text-2xl font-bold text-[#1E1B4B] text-center mb-3">
                        Survey Complete!
                    </h1>
                    
                    <p className="text-gray-500 text-center text-sm mb-2 max-w-[280px]">
                        Thank you for completing the mortgage eligibility survey.
                    </p>
                    
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mt-6 w-full max-w-[300px]">
                        <p className="text-[#1E40AF] font-semibold text-center text-sm mb-1">
                            Eligibility Status
                        </p>
                        <p className="text-green-600 font-bold text-center text-lg">
                            Pre-Qualified ✓
                        </p>
                        <p className="text-gray-500 text-center text-xs mt-2">
                            Based on your responses, you may qualify for mortgage products. A specialist will contact you within 24-48 hours.
                        </p>
                    </div>
                    
                    <div className="w-full space-y-3 mt-8">
                        <Button
                            onClick={() => router.push('/mobile-v2/products/mortgage')}
                            className="w-full h-14 rounded-full bg-[#1E40AF] hover:bg-[#1e3a8a] text-white font-semibold"
                        >
                            Browse Mortgages
                        </Button>
                        
                        <Button
                            variant="outline"
                            onClick={() => router.push('/mobile-v2/home')}
                            className="w-full h-14 rounded-full border-gray-200 text-gray-700 font-semibold"
                        >
                            Back to Home
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white relative">
            <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
                {/* Header */}
                <div className="pt-12 px-6 pb-6 bg-white sticky top-0 z-30">
                    {/* Top Bar */}
                    <div className="flex items-center justify-between mb-6">
                        <button 
                            onClick={handleBack}
                            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
                        >
                            <ChevronLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <h1 className="text-lg font-bold text-[#1E1B4B]">Eligibility Survey</h1>
                        <div className="w-10 h-10" />
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500 font-medium">
                                Question {currentQuestion + 1} of {surveyQuestions.length}
                            </span>
                            <span className="text-xs text-[#1E40AF] font-semibold">
                                {Math.round(progress)}%
                            </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-[#1E40AF] rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Question Content */}
                <div className="px-6 py-4">
                    <h2 className="text-xl font-bold text-[#1E1B4B] mb-6 leading-tight">
                        {question.question}
                    </h2>

                    {/* Options */}
                    {question.type === 'single' && question.options && (
                        <div className="space-y-3">
                            {question.options.map((option, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleSelectOption(option)}
                                    className={cn(
                                        "w-full p-4 rounded-2xl border-2 text-left transition-all duration-200",
                                        answers[question.id] === option
                                            ? "border-[#1E40AF] bg-blue-50"
                                            : "border-gray-100 bg-white hover:border-gray-200"
                                    )}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className={cn(
                                            "font-medium",
                                            answers[question.id] === option
                                                ? "text-[#1E40AF]"
                                                : "text-gray-700"
                                        )}>
                                            {option}
                                        </span>
                                        {answers[question.id] === option && (
                                            <div className="w-6 h-6 rounded-full bg-[#1E40AF] flex items-center justify-center">
                                                <Check className="w-4 h-4 text-white" />
                                            </div>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Scale Options */}
                    {question.type === 'scale' && question.options && (
                        <div className="space-y-4">
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>Not Urgent</span>
                                <span>Very Urgent</span>
                            </div>
                            <div className="flex justify-between gap-2">
                                {question.options.map((option, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleSelectOption(option)}
                                        className={cn(
                                            "flex-1 h-14 rounded-2xl border-2 font-bold text-lg transition-all duration-200",
                                            answers[question.id] === option
                                                ? "border-[#1E40AF] bg-[#1E40AF] text-white"
                                                : "border-gray-100 bg-white text-gray-700 hover:border-gray-200"
                                        )}
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Action */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-100">
                <Button
                    onClick={handleNext}
                    disabled={!hasAnswer || isSubmitting}
                    className={cn(
                        "w-full h-14 rounded-full font-semibold text-base transition-all",
                        hasAnswer
                            ? "bg-[#1E40AF] hover:bg-[#1e3a8a] text-white"
                            : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    )}
                >
                    {isSubmitting ? (
                        <span className="flex items-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Submitting...
                        </span>
                    ) : isLastQuestion ? (
                        'Submit Survey'
                    ) : (
                        <span className="flex items-center gap-2">
                            Continue
                            <ChevronRight className="w-5 h-5" />
                        </span>
                    )}
                </Button>
            </div>
        </div>
    );
}
