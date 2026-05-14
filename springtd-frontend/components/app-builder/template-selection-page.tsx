"use client"

import { useState } from "react"
import { Check, ArrowRight, Building2, Wallet, FilePlus2, Rocket, Briefcase, Layers, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PREDEFINED_TEMPLATES, PredefinedTemplate } from "@/lib/appService"

interface TemplateSelectionPageProps {
    onTemplateSelected: (template: PredefinedTemplate) => void
}

export function TemplateSelectionPage({ onTemplateSelected }: TemplateSelectionPageProps) {
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
    const [isApplying, setIsApplying] = useState(false)

    const handleApply = (template: PredefinedTemplate) => {
        if (template.id === 'coming-soon') return
        setIsApplying(true)
        setSelectedTemplate(template.id)

        // Simulate a small delay for better UX
        setTimeout(() => {
            onTemplateSelected(template)
            setIsApplying(false)
        }, 600)
    }

    // Helper to get icon for template
    const getTemplateIcon = (id: string, category: string) => {
        if (id === 'mobile-v1') return <Briefcase className="w-12 h-12 text-[#7C3AED]" />;
        if (id === 'mobile-v2') return <Rocket className="w-12 h-12 text-[#2563EB]" />;
        if (id === 'coming-soon') return <Clock className="w-12 h-12 text-gray-400" />;
        return <Layers className="w-12 h-12 text-gray-500" />;
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] w-full max-w-7xl mx-auto px-4 py-12 animate-in fade-in duration-500">

            {/* Header Section */}
            <div className="text-center max-w-2xl mb-16 space-y-4">
                {/* Custom App Layout Icon */}
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-[#7C3AED]/10 mb-6">
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="4" y="4" width="32" height="32" rx="4" stroke="#7C3AED" strokeWidth="2.5" />
                        <line x1="4" y1="12" x2="36" y2="12" stroke="#7C3AED" strokeWidth="2.5" />
                        <rect x="8" y="16" width="10" height="10" rx="2" stroke="#7C3AED" strokeWidth="2" />
                        <rect x="22" y="16" width="10" height="10" rx="2" stroke="#7C3AED" strokeWidth="2" />
                        <line x1="8" y1="30" x2="32" y2="30" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" />
                        <circle cx="10" cy="8" r="1.5" fill="#7C3AED" />
                        <circle cx="15" cy="8" r="1.5" fill="#7C3AED" />
                    </svg>
                </div>

                <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Choose Your Template</h1>
                <p className="text-lg text-gray-500 leading-relaxed">
                    Select a professionally designed template to jumpstart your app, or start from scratch for full control. You can always customize every detail later.
                </p>
            </div>

            {/* Templates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full mb-12">
                {PREDEFINED_TEMPLATES.map((template) => {
                    const isComingSoon = template.id === 'coming-soon'
                    
                    return (
                        <div
                            key={template.id}
                            className={`
                                group relative flex flex-col bg-white rounded-2xl border-2 transition-all duration-300 overflow-hidden 
                                ${isComingSoon
                                    ? "border-gray-100 opacity-60 cursor-not-allowed"
                                    : selectedTemplate === template.id
                                        ? "border-[#7C3AED] ring-4 ring-[#7C3AED]/10 shadow-2xl scale-[1.02] cursor-pointer"
                                        : "border-gray-100 hover:border-[#7C3AED]/30 hover:shadow-xl hover:-translate-y-1 cursor-pointer"
                                }
                            `}
                            onClick={() => !isComingSoon && handleApply(template)}
                        >
                            {/* Selection Indicator */}
                            {selectedTemplate === template.id && (
                                <div className="absolute top-4 right-4 z-20 w-8 h-8 bg-[#7C3AED] rounded-full flex items-center justify-center shadow-lg animate-in zoom-in spin-in-12">
                                    <Check className="w-5 h-5 text-white" />
                                </div>
                            )}

                            {/* Icon Preview Area - Clean & Minimal */}
                            <div
                                className={`
                                    h-48 w-full relative flex items-center justify-center
                                    ${template.category === 'banking'
                                        ? 'bg-gradient-to-br from-[#7C3AED]/5 to-[#6D28D9]/5'
                                        : template.category === 'fintech'
                                            ? 'bg-gradient-to-br from-[#2563EB]/5 to-[#1D4ED8]/5'
                                            : 'bg-gray-50'
                                    }
                                `}
                            >
                                <div className={`w-24 h-24 rounded-2xl bg-white shadow-lg flex items-center justify-center transition-transform duration-300 ${!isComingSoon ? 'group-hover:scale-110' : ''}`}>
                                    {getTemplateIcon(template.id, template.category)}
                                </div>
                            </div>

                            {/* Content Area */}
                            <div className="p-8 flex flex-col flex-1 border-t border-gray-100">
                                <div className="mb-auto">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider
                                            ${template.category === 'blank' ? 'bg-gray-100 text-gray-600' : 'bg-purple-50 text-[#7C3AED]'}
                                        `}>
                                            {isComingSoon ? 'Coming Soon' : template.category}
                                        </span>
                                    </div>
                                    <h3 className={`text-xl font-bold text-gray-900 mb-2 transition-colors ${!isComingSoon ? 'group-hover:text-[#7C3AED]' : ''}`}>
                                        {template.name}
                                    </h3>
                                    <p className="text-gray-500 text-sm leading-relaxed">{template.description}</p>
                                </div>

                                {!isComingSoon && (
                                    <div className="pt-8 mt-4 border-t border-gray-50">
                                        <Button
                                            size="lg"
                                            disabled={isApplying && selectedTemplate !== template.id}
                                            className={`
                                                w-full h-12 text-base font-semibold shadow-none transition-all
                                                ${template.category === 'blank'
                                                    ? 'bg-white border-2 border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                                                    : 'bg-[#7C3AED] hover:bg-[#6D28D9] text-white hover:shadow-lg hover:shadow-purple-200'
                                                }
                                            `}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleApply(template);
                                            }}
                                        >
                                            {isApplying && selectedTemplate === template.id ? (
                                                <span className="flex items-center gap-2">
                                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                    </svg>
                                                    Applying...
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-2">
                                                    {template.category === 'blank' ? 'Start from Scratch' : 'Use This Template'}
                                                    <ArrowRight className="w-4 h-4" />
                                                </span>
                                            )}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            <p className="text-gray-400 text-sm">
                Don't worry, you can switch templates or customize individual sections at any time.
            </p>
        </div>
    )
}
