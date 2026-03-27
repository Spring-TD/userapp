"use client"

import { useSearchParams } from "next/navigation"
import { Suspense, useState, useEffect, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AssetTab } from "@/components/app-builder/asset-tab"
import { SplashTab } from "@/components/app-builder/splash-tab"
import { OnboardingTab } from "@/components/app-builder/onboarding-tab"
import { AppProfileTab } from "@/components/app-builder/app-profile-tab"
import { PolicyTab } from "@/components/app-builder/policy-tab"
import { SupportTab } from "@/components/app-builder/support-tab"
import { DNSTab } from "@/components/app-builder/dns-tab"
import { PublishTab } from "@/components/app-builder/publish-tab"
import { TemplateTab } from "@/components/app-builder/template-tab"
import { TabNavigation, KeyboardHints } from "@/components/app-builder/ui"

import { Button } from "@/components/ui/button"
import { RotateCw, Check, Loader2, AlertCircle } from "lucide-react"
import { AppBuilderProvider, useAppBuilder } from "@/contexts/AppBuilderContext"
import {
   Tooltip,
   TooltipContent,
   TooltipProvider,
   TooltipTrigger,
} from "@/components/ui/tooltip"

// Tab configuration with icons and metadata
const tabs = [
    { value: "template", label: "Template", description: "Choose your app template" },
    { value: "asset", label: "Asset", description: "Upload logos and images" },
    { value: "splash", label: "Splash", description: "Configure splash screen" },
    { value: "onboarding", label: "Onboarding", description: "Setup onboarding flow" },
    { value: "profile", label: "App Profile", description: "Customize app colors" },
    { value: "policy", label: "Policy/Terms", description: "Add legal documents" },
    { value: "support", label: "Support", description: "Contact information" },
    { value: "dns", label: "DNS", description: "Custom domain setup" },
    { value: "publish", label: "Publish", description: "Deploy your app" },
]

// Helper to determine tab completion status
function useTabCompletion() {
    const { selectedTemplateId, appElements, onboarding, appProfile, support, policy, dns } = useAppBuilder()
    
    return {
        template: !!selectedTemplateId,
        asset: !!(appElements.logo || appElements.splash),
        splash: !!(appElements.buttons?.primaryColor),
        onboarding: !!(onboarding.splash1?.title || onboarding.splash2?.title),
        profile: !!(appProfile.elementColors?.primary),
        policy: !!(policy.termsSection?.content || policy.policySection?.content),
        support: !!(support.email || support.phone),
        dns: !!(dns.customDomain || !dns.useCustomDomain),
        publish: false, // Never "complete" - it's an action
    }
}

function AppBuilderContent() {
    const searchParams = useSearchParams()
    const appId = searchParams.get('appId')
    const [activeTab, setActiveTab] = useState("template")
    
    const { 
        isLoading, 
        isSaving, 
        hasUnsavedChanges,
        error,
        saveConfiguration,
        selectedTemplateId,
        applyTemplate,
        lastSavedAt,
    } = useAppBuilder()

    const completionStatus = useTabCompletion()

    const handleUpdateApp = async () => {
        await saveConfiguration()
    }

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ctrl/Cmd + S to save
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault()
                handleUpdateApp()
            }
            // Arrow keys for tab navigation (when not in input)
            if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
                const currentIndex = tabs.findIndex(t => t.value === activeTab)
                if (e.key === 'ArrowRight' && currentIndex < tabs.length - 1) {
                    setActiveTab(tabs[currentIndex + 1].value)
                } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
                    setActiveTab(tabs[currentIndex - 1].value)
                }
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [activeTab])

    // Calculate completion
    const completedTabs = Object.values(completionStatus).filter(Boolean).length
    const totalTabs = tabs.length - 1 // Exclude publish from count

    // Loading state
    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 text-[#7C3AED] animate-spin" />
                    <p className="text-gray-500">Loading configuration...</p>
                </div>
            </div>
        )
    }

    return (
        <TooltipProvider>
            <div className="h-full flex flex-col pt-6 px-8 relative">
                {/* Header */}
                <div className="mb-4 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                         <h1 className="text-xl font-semibold text-gray-900">App Builder</h1>
                         {appId && (
                             <span className="px-2 py-0.5 text-xs font-mono bg-gray-100 text-gray-500 rounded">
                                 {appId.slice(0, 8)}...
                             </span>
                         )}
                     </div>
                     <div className="flex items-center gap-2 text-sm text-gray-500">
                         {lastSavedAt && (
                             <span className="text-xs text-gray-400">
                                 Saved {new Date(lastSavedAt).toLocaleTimeString()}
                             </span>
                         )}
                     </div>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                {/* Main Builder Content */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6 flex-1">
                    <div className="flex items-center justify-between border-b border-gray-200">
                        <TabsList className="bg-transparent h-auto p-0 gap-1 border-b-0 justify-start rounded-none overflow-x-auto scrollbar-hide">
                            {tabs.map((tab) => {
                                const isComplete = completionStatus[tab.value as keyof typeof completionStatus]
                                const isActive = activeTab === tab.value
                                
                                return (
                                    <Tooltip key={tab.value}>
                                        <TooltipTrigger asChild>
                                            <TabsTrigger
                                                value={tab.value}
                                                className={`
                                                    relative flex items-center gap-2 bg-transparent shadow-none border-b-2 
                                                    ${isActive ? 'border-b-[#7C3AED]' : 'border-transparent'} 
                                                    !border-t-0 !border-x-0 rounded-none px-3 pb-3 text-sm font-medium 
                                                    ${isActive ? 'text-[#7C3AED]' : isComplete ? 'text-green-600' : 'text-gray-500'}
                                                    hover:text-gray-700 data-[state=active]:bg-transparent data-[state=active]:shadow-none whitespace-nowrap
                                                    transition-colors
                                                `}
                                            >
                                                {tab.label}
                                            </TabsTrigger>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom">
                                            <p>{tab.description}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                )
                            })}
                        </TabsList>

                        <div className="pb-3 px-2 flex items-center gap-3">
                            {hasUnsavedChanges && (
                                <span className="text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                                    Unsaved changes
                                </span>
                            )}
                            <Button 
                                onClick={handleUpdateApp}
                                disabled={isSaving || !appId}
                                className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white gap-2 shadow-sm rounded-lg px-5 disabled:opacity-50"
                            >
                                {isSaving ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : hasUnsavedChanges ? (
                                    <RotateCw className="w-4 h-4" />
                                ) : (
                                    <Check className="w-4 h-4" />
                                )}
                                {isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Saved'}
                            </Button>
                        </div>
                    </div>

                    <div className="pb-8">
                        {/* Template Tab */}
                        <TabsContent value="template" className="mt-0 focus-visible:outline-none focus:outline-none">
                            <TemplateTab 
                                selectedTemplateId={selectedTemplateId}
                                onTemplateSelected={applyTemplate} 
                            />
                            <TabNavigation 
                                currentTab="template" 
                                tabs={tabs} 
                                onNavigate={setActiveTab}
                                showSaveOnLast={false}
                            />
                        </TabsContent>
                        
                        <TabsContent value="asset" className="mt-0 focus-visible:outline-none focus:outline-none">
                            <AssetTab />
                            <TabNavigation currentTab="asset" tabs={tabs} onNavigate={setActiveTab} showSaveOnLast={false} />
                        </TabsContent>
                        
                        <TabsContent value="splash" className="mt-0 focus-visible:outline-none focus:outline-none">
                            <SplashTab />
                            <TabNavigation currentTab="splash" tabs={tabs} onNavigate={setActiveTab} showSaveOnLast={false} />
                        </TabsContent>
                        
                        <TabsContent value="onboarding" className="mt-0 focus-visible:outline-none focus:outline-none">
                            <OnboardingTab />
                            <TabNavigation currentTab="onboarding" tabs={tabs} onNavigate={setActiveTab} showSaveOnLast={false} />
                        </TabsContent>
                        
                        <TabsContent value="profile" className="mt-0 focus-visible:outline-none focus:outline-none">
                            <AppProfileTab />
                            <TabNavigation currentTab="profile" tabs={tabs} onNavigate={setActiveTab} showSaveOnLast={false} />
                        </TabsContent>
                        
                        <TabsContent value="policy" className="mt-0 focus-visible:outline-none focus:outline-none">
                            <PolicyTab />
                            <TabNavigation currentTab="policy" tabs={tabs} onNavigate={setActiveTab} showSaveOnLast={false} />
                        </TabsContent>
                        
                        <TabsContent value="support" className="mt-0 focus-visible:outline-none focus:outline-none">
                            <SupportTab />
                            <TabNavigation currentTab="support" tabs={tabs} onNavigate={setActiveTab} showSaveOnLast={false} />
                        </TabsContent>
                        
                        <TabsContent value="dns" className="mt-0 focus-visible:outline-none focus:outline-none">
                            <DNSTab />
                            <TabNavigation currentTab="dns" tabs={tabs} onNavigate={setActiveTab} showSaveOnLast={false} />
                        </TabsContent>
                        
                        <TabsContent value="publish" className="mt-0 focus-visible:outline-none focus:outline-none">
                            <PublishTab />
                        </TabsContent>
                    </div>
                </Tabs>

                {/* Keyboard hints */}
                <KeyboardHints />
            </div>
        </TooltipProvider>
    )
}

function AppBuilderPageInner() {
    const searchParams = useSearchParams()
    const appId = searchParams.get('appId') || undefined

    return (
        <AppBuilderProvider initialAppId={appId}>
            <AppBuilderContent />
        </AppBuilderProvider>
    )
}

export default function AppBuilderPage() {
    return (
        <Suspense fallback={
            <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#7C3AED] animate-spin" />
            </div>
        }>
            <AppBuilderPageInner />
        </Suspense>
    )
}
