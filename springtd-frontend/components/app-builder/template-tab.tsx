"use client"

import { useState } from "react"
import { Check, ArrowRight, Rocket, Briefcase, Layers, Eye, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PREDEFINED_TEMPLATES, PredefinedTemplate } from "@/lib/appService"
import { MobileTemplatePreview } from "./mobile-template-preview"

interface TemplateTabProps {
    selectedTemplateId: string
    onTemplateSelected: (template: PredefinedTemplate) => void
}

export function TemplateTab({ selectedTemplateId, onTemplateSelected }: TemplateTabProps) {
    const [isApplying, setIsApplying] = useState(false)
    const [applyingId, setApplyingId] = useState<string | null>(null)
    const [previewTemplate, setPreviewTemplate] = useState<PredefinedTemplate | null>(null)

    const handleApply = (template: PredefinedTemplate) => {
        if (template.id === 'coming-soon') return
        if (template.id === selectedTemplateId) return // Already selected
        
        setIsApplying(true)
        setApplyingId(template.id)

        // Simulate a small delay for better UX
        setTimeout(() => {
            onTemplateSelected(template)
            setIsApplying(false)
            setApplyingId(null)
        }, 600)
    }

    // Helper to get icon for template
    const getTemplateIcon = (id: string) => {
        if (id === 'mobile-v1') return <Briefcase className="w-10 h-10 text-[#7C3AED]" />;
        if (id === 'mobile-v2') return <Rocket className="w-10 h-10 text-[#2563EB]" />;
        if (id === 'coming-soon') return <Clock className="w-10 h-10 text-gray-400" />;
        return <Layers className="w-10 h-10 text-gray-500" />;
    }

    return (
        <div className="py-6">
            {/* Header */}
            <div className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Choose Your Template</h2>
                <p className="text-gray-500">
                    Select a professionally designed template to jumpstart your app. You can customize every detail in the other tabs.
                </p>
            </div>

            {/* Templates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {PREDEFINED_TEMPLATES.map((template) => {
                    const isSelected = selectedTemplateId === template.id
                    const isCurrentlyApplying = isApplying && applyingId === template.id
                    const isComingSoon = template.id === 'coming-soon'

                    return (
                        <div
                            key={template.id}
                            className={`
                                group relative flex flex-col bg-white rounded-xl border-2 transition-all duration-300 overflow-hidden 
                                ${isComingSoon
                                    ? "border-gray-100 opacity-60 cursor-not-allowed"
                                    : isSelected
                                        ? "border-[#7C3AED] ring-4 ring-[#7C3AED]/10 shadow-lg cursor-pointer"
                                        : "border-gray-100 hover:border-[#7C3AED]/30 hover:shadow-md cursor-pointer"
                                }
                            `}
                            onClick={() => !isComingSoon && handleApply(template)}
                        >
                            {/* Selection Indicator */}
                            {isSelected && (
                                <div className="absolute top-3 right-3 z-20 w-7 h-7 bg-[#7C3AED] rounded-full flex items-center justify-center shadow-md">
                                    <Check className="w-4 h-4 text-white" />
                                </div>
                            )}

                            {/* Icon Preview Area */}
                            <div
                                className={`
                                    h-32 w-full relative flex items-center justify-center
                                    ${template.category === 'banking'
                                        ? 'bg-gradient-to-br from-[#7C3AED]/5 to-[#6D28D9]/5'
                                        : template.category === 'fintech'
                                            ? 'bg-gradient-to-br from-[#2563EB]/5 to-[#1D4ED8]/5'
                                            : 'bg-gray-50'
                                    }
                                `}
                            >
                                <div className={`w-20 h-20 rounded-xl bg-white shadow-md flex items-center justify-center transition-transform duration-300 ${!isComingSoon ? 'group-hover:scale-105' : ''}`}>
                                    {getTemplateIcon(template.id)}
                                </div>

                                {/* Preview Button Overlay */}
                                {!isComingSoon && (
                                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
                                       <Button 
                                          variant="secondary" 
                                          size="sm" 
                                          className="bg-white/90 hover:bg-white text-gray-900 shadow-sm gap-2 translate-y-2 group-hover:translate-y-0 transition-all duration-300"
                                          onClick={(e) => {
                                             e.stopPropagation();
                                             setPreviewTemplate(template);
                                          }}
                                       >
                                          <Eye className="w-4 h-4" />
                                          Preview
                                       </Button>
                                    </div>
                                )}
                            </div>

                            {/* Content Area */}
                            <div className="p-5 flex flex-col flex-1 border-t border-gray-100">
                                <div className="mb-auto">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider
                                            ${template.category === 'blank' ? 'bg-gray-100 text-gray-600' : 'bg-purple-50 text-[#7C3AED]'}
                                        `}>
                                            {isComingSoon ? 'Coming Soon' : template.category}
                                        </span>
                                    </div>
                                    <h3 className={`text-lg font-bold text-gray-900 mb-1 transition-colors ${!isComingSoon ? 'group-hover:text-[#7C3AED]' : ''}`}>
                                        {template.name}
                                    </h3>
                                    <p className="text-gray-500 text-sm leading-relaxed line-clamp-2">
                                        {template.description}
                                    </p>
                                </div>

                                {!isComingSoon && (
                                    <div className="pt-4 mt-4 border-t border-gray-50">
                                        <Button
                                            size="sm"
                                            disabled={isApplying && applyingId !== template.id}
                                            className={`
                                                w-full h-10 text-sm font-medium shadow-none transition-all
                                                ${isSelected
                                                    ? 'bg-[#7C3AED]/10 border border-[#7C3AED] text-[#7C3AED] hover:bg-[#7C3AED]/20'
                                                    : template.category === 'blank'
                                                        ? 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                                                        : 'bg-[#7C3AED] hover:bg-[#6D28D9] text-white'
                                                }
                                            `}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleApply(template);
                                            }}
                                        >
                                            {isCurrentlyApplying ? (
                                                <span className="flex items-center gap-2">
                                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                    </svg>
                                                    Applying...
                                                </span>
                                            ) : isSelected ? (
                                                <span className="flex items-center gap-2">
                                                    <Check className="w-4 h-4" />
                                                    Selected
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-2">
                                                    {template.category === 'blank' ? 'Start Fresh' : 'Use Template'}
                                                    <ArrowRight className="w-3 h-3" />
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

            {/* Helper Text */}
            <p className="text-gray-400 text-sm text-center mt-8">
                Switching templates will update Splash and Onboarding configurations. Your custom assets will be preserved.
            </p>

            {/* Template Preview Modal */}
            {previewTemplate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setPreviewTemplate(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">{previewTemplate.name}</h3>
                                <p className="text-sm text-gray-500">{previewTemplate.description}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <Button variant="outline" onClick={() => setPreviewTemplate(null)}>Close</Button>
                                <Button 
                                    className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
                                    onClick={() => {
                                        handleApply(previewTemplate);
                                        setPreviewTemplate(null);
                                    }}
                                >
                                    Use Template
                                </Button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-12 bg-gray-50 flex items-center justify-center">
                            <div className="flex gap-16 items-start">
                                {/* Mobile Preview using actual template components */}
                                <div className="w-[280px] h-[560px] transform hover:scale-[1.02] transition-transform duration-300">
                                    <MobileTemplatePreview 
                                        templateId={previewTemplate.id}
                                        screenType="splash"
                                    />
                                </div>
                                
                                <div className="w-[320px] space-y-6 pt-4">
                                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                            <span className="w-1 h-4 bg-gray-900 rounded-full"></span>
                                            Visual Style
                                        </h4>
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                <span className="text-sm text-gray-600 font-medium">Primary</span>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-mono text-gray-500">{previewTemplate.configuration.appElements?.buttons?.primaryColor}</span>
                                                    <div className="w-8 h-8 rounded-lg shadow-sm ring-1 ring-gray-200" style={{ backgroundColor: previewTemplate.configuration.appElements?.buttons?.primaryColor }}></div>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                <span className="text-sm text-gray-600 font-medium">Secondary</span>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-mono text-gray-500">{previewTemplate.configuration.appElements?.buttons?.secondaryColor}</span>
                                                    <div className="w-8 h-8 rounded-lg shadow-sm ring-1 ring-gray-200" style={{ backgroundColor: previewTemplate.configuration.appElements?.buttons?.secondaryColor }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                            <span className="w-1 h-4 bg-gray-900 rounded-full"></span>
                                            What's Included
                                        </h4>
                                        <ul className="space-y-3">
                                            <li className="flex items-start gap-3 text-sm text-gray-600">
                                                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <Check className="w-3 h-3 text-green-600" />
                                                </div>
                                                <span>Professional {previewTemplate.category} UI layout</span>
                                            </li>
                                            <li className="flex items-start gap-3 text-sm text-gray-600">
                                                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <Check className="w-3 h-3 text-green-600" />
                                                </div>
                                                <span>Optimized onboarding flow screens</span>
                                            </li>
                                            <li className="flex items-start gap-3 text-sm text-gray-600">
                                                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <Check className="w-3 h-3 text-green-600" />
                                                </div>
                                                <span>Pre-configured brand palette</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
