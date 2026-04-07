"use client"

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react"
import {
    AppConfiguration,
    appConfigurationApi,
    appTemplateApi,
    pwaPublishApi,
    type PwaPublishPayload,
    PredefinedTemplate,
    AppElementsConfig,
    OnboardingConfig,
    AppProfileConfig,
    PolicyConfig,
    SupportConfig,
    DNSConfig,
} from "@/lib/services/appService"
import {
    appBuilderSlicesToPwaConfig,
    pwaConfigToAppBuilderSlices,
    sectionToPwaConfigPatch,
} from "@/lib/pwaTemplateBridge"

// ============================================
// TYPES
// ============================================

interface AppBuilderState {
    // Core identifiers
    appId: string | null
    configurationId: string | null
    /** Create App MS PWA template id when loaded or created via /pwa-templates */
    pwaTemplateId: string | null

    // Selected template
    selectedTemplateId: string
    
    // Configuration sections (local state that can be modified)
    appElements: AppElementsConfig
    onboarding: OnboardingConfig
    appProfile: AppProfileConfig
    policy: PolicyConfig
    support: SupportConfig
    dns: DNSConfig
    
    // UI state
    isLoading: boolean
    isSaving: boolean
    hasUnsavedChanges: boolean
    lastSavedAt: Date | null
    error: string | null
}

interface AppBuilderContextValue extends AppBuilderState {
    // Actions
    setAppId: (appId: string) => void
    loadConfiguration: (appId: string) => Promise<void>
    applyTemplate: (template: PredefinedTemplate) => void
    
    // Section updaters
    updateAppElements: (updates: Partial<AppElementsConfig>) => void
    updateOnboarding: (updates: Partial<OnboardingConfig>) => void
    updateAppProfile: (updates: Partial<AppProfileConfig>) => void
    updatePolicy: (updates: Partial<PolicyConfig>) => void
    updateSupport: (updates: Partial<SupportConfig>) => void
    updateDNS: (updates: Partial<DNSConfig>) => void
    
    // Save actions
    saveConfiguration: () => Promise<void>
    saveSection: (section: 'appElements' | 'onboarding' | 'appProfile' | 'policy' | 'support' | 'dns') => Promise<void>
    
    // Publish actions
    publishConfiguration: () => Promise<{
        success: boolean
        versionId?: string
        publish?: PwaPublishPayload
        error?: string
    }>
    restoreConfiguration: (configurationId: string) => Promise<{ success: boolean }>
    
    // Utility
    getChangedSections: () => string[]
}

// ============================================
// DEFAULT VALUES
// ============================================

const defaultAppElements: AppElementsConfig = {
    buttons: { primaryColor: '#7C3AED', secondaryColor: '#E5E7EB' },
    header: { backgroundColor: '#FFFFFF', textColor: '#1F2937' },
    body: { backgroundColor: '#F9FAFB', textColor: '#374151' },
}

const defaultOnboarding: OnboardingConfig = {
    fontFamily: 'Inter',
    splash1: { title: 'Welcome', subtitle: 'Your app description here' },
    splash2: { title: 'Features', subtitle: 'Describe your key features' },
    splash3: { title: 'Get Started', subtitle: 'Start your journey' },
    textColors: { primary: '#FFFFFF', secondary: '#E5E7EB' },
    backgroundColors: { primary: '#7C3AED', secondary: '#6D28D9' },
}

const defaultAppProfile: AppProfileConfig = {
    textColors: { primary: '#1F2937', secondary: '#6B7280', aux: '#9CA3AF' },
    elementColors: { primary: '#7C3AED', secondary: '#A78BFA' },
    backgroundColors: { primary: '#FFFFFF', secondary: '#F3F4F6' },
}

const defaultPolicy: PolicyConfig = {}
const defaultSupport: SupportConfig = {}
const defaultDNS: DNSConfig = {
    useCustomDomain: false,
    customDomain: '',
    baseUrl: '',
    records: [],
    verified: false,
}

const initialState: AppBuilderState = {
    appId: null,
    configurationId: null,
    pwaTemplateId: null,
    selectedTemplateId: 'mobile-v1',
    appElements: defaultAppElements,
    onboarding: defaultOnboarding,
    appProfile: defaultAppProfile,
    policy: defaultPolicy,
    support: defaultSupport,
    dns: defaultDNS,
    isLoading: false,
    isSaving: false,
    hasUnsavedChanges: false,
    lastSavedAt: null,
    error: null,
}

// ============================================
// CONTEXT
// ============================================

const AppBuilderContext = createContext<AppBuilderContextValue | null>(null)

export function useAppBuilder() {
    const context = useContext(AppBuilderContext)
    if (!context) {
        throw new Error('useAppBuilder must be used within an AppBuilderProvider')
    }
    return context
}

// ============================================
// PROVIDER
// ============================================

interface AppBuilderProviderProps {
    children: ReactNode
    initialAppId?: string
}

export function AppBuilderProvider({ children, initialAppId }: AppBuilderProviderProps) {
    const [state, setState] = useState<AppBuilderState>({
        ...initialState,
        appId: initialAppId || null,
    })

    // ==================
    // Core Actions
    // ==================

    const setAppId = useCallback((appId: string) => {
        setState(prev => ({ ...prev, appId }))
    }, [])

    const loadConfiguration = useCallback(async (appId: string) => {
        setState(prev => ({ ...prev, isLoading: true, error: null }))

        const mergeLoadedState = (slices: ReturnType<typeof pwaConfigToAppBuilderSlices>, templateId: string) => {
            setState(prev => ({
                ...prev,
                appId,
                pwaTemplateId: templateId,
                configurationId: templateId,
                appElements: {
                    ...defaultAppElements,
                    ...slices.appElements,
                    buttons: {
                        ...defaultAppElements.buttons,
                        ...(slices.appElements.buttons || {}),
                    },
                    header: {
                        ...defaultAppElements.header,
                        ...(slices.appElements.header || {}),
                    },
                    body: {
                        ...defaultAppElements.body,
                        ...(slices.appElements.body || {}),
                    },
                },
                onboarding: {
                    ...defaultOnboarding,
                    ...slices.onboarding,
                    splash1: { ...defaultOnboarding.splash1, ...slices.onboarding.splash1 },
                    splash2: { ...defaultOnboarding.splash2, ...slices.onboarding.splash2 },
                    splash3: { ...defaultOnboarding.splash3, ...slices.onboarding.splash3 },
                    textColors: {
                        ...defaultOnboarding.textColors,
                        ...slices.onboarding.textColors,
                    },
                    backgroundColors: {
                        ...defaultOnboarding.backgroundColors,
                        ...slices.onboarding.backgroundColors,
                    },
                },
                appProfile: {
                    ...defaultAppProfile,
                    ...slices.appProfile,
                    textColors: {
                        ...defaultAppProfile.textColors,
                        ...slices.appProfile.textColors,
                    },
                    elementColors: {
                        ...defaultAppProfile.elementColors,
                        ...slices.appProfile.elementColors,
                    },
                    backgroundColors: {
                        ...defaultAppProfile.backgroundColors,
                        ...slices.appProfile.backgroundColors,
                    },
                    menuColors: {
                        ...defaultAppProfile.menuColors,
                        ...slices.appProfile.menuColors,
                    },
                    auxElementColors: {
                        ...defaultAppProfile.auxElementColors,
                        ...slices.appProfile.auxElementColors,
                    },
                },
                policy: { ...defaultPolicy, ...slices.policy },
                support: { ...defaultSupport, ...slices.support },
                dns: {
                    ...defaultDNS,
                    ...slices.dns,
                    records: slices.dns?.records ?? defaultDNS.records,
                },
                isLoading: false,
                hasUnsavedChanges: false,
                error: null,
            }))
        }

        try {
            const listRes = await appTemplateApi.getAllTemplates(appId)
            const raw = listRes.data as unknown
            let templates: Array<Record<string, unknown>> = []
            if (Array.isArray(raw)) {
                templates = raw as Array<Record<string, unknown>>
            } else if (raw && typeof raw === "object" && Array.isArray((raw as { templates?: unknown }).templates)) {
                templates = (raw as { templates: Array<Record<string, unknown>> }).templates
            }

            const applied =
                templates.find((t) => t.isApplied === true) ??
                templates.find((t) => t.isDefault === true) ??
                templates[0]
            const pwaCfg = applied?.config
            const legacyCfg = applied?.configuration as Partial<AppConfiguration> | undefined
            const tid = applied ? String(applied.id ?? applied._id ?? "") : ""

            if (tid && pwaCfg && typeof pwaCfg === "object") {
                const slices = pwaConfigToAppBuilderSlices(pwaCfg)
                mergeLoadedState(slices, tid)
                return
            }

            if (tid && legacyCfg && typeof legacyCfg === "object" && legacyCfg.appElements) {
                setState(prev => ({
                    ...prev,
                    appId,
                    pwaTemplateId: tid,
                    configurationId: tid,
                    appElements: legacyCfg.appElements || defaultAppElements,
                    onboarding: legacyCfg.onboarding || defaultOnboarding,
                    appProfile: legacyCfg.appProfile || defaultAppProfile,
                    policy: legacyCfg.policy || defaultPolicy,
                    support: legacyCfg.support || defaultSupport,
                    dns: legacyCfg.dns || defaultDNS,
                    isLoading: false,
                    hasUnsavedChanges: false,
                    error: null,
                }))
                return
            }
        } catch (e) {
            console.warn("[AppBuilder] PWA templates unavailable, falling back to legacy configuration", e)
        }

        try {
            const response = await appConfigurationApi.getActiveConfiguration(appId)
            const config = response.data

            if (config) {
                setState(prev => ({
                    ...prev,
                    appId,
                    pwaTemplateId: null,
                    configurationId: config.id,
                    appElements: config.appElements || defaultAppElements,
                    onboarding: config.onboarding || defaultOnboarding,
                    appProfile: config.appProfile || defaultAppProfile,
                    policy: config.policy || defaultPolicy,
                    support: config.support || defaultSupport,
                    dns: config.dns || defaultDNS,
                    isLoading: false,
                    hasUnsavedChanges: false,
                    error: null,
                }))
            } else {
                setState(prev => ({
                    ...prev,
                    appId,
                    pwaTemplateId: null,
                    isLoading: false,
                    error: null,
                }))
            }
        } catch (error) {
            console.error("Failed to load configuration:", error)
            setState(prev => ({
                ...prev,
                appId,
                pwaTemplateId: null,
                isLoading: false,
                error: error instanceof Error ? error.message : "Failed to load configuration",
            }))
        }
    }, [])

    // When the resolved app id appears (URL or Redux), set it immediately so publish/save work; then load config.
    useEffect(() => {
        if (!initialAppId) return
        setState((prev) => (prev.appId === initialAppId ? prev : { ...prev, appId: initialAppId }))
        void loadConfiguration(initialAppId)
    }, [initialAppId, loadConfiguration])

    const applyTemplate = useCallback((template: PredefinedTemplate) => {
        const config = template.configuration
        
        setState(prev => ({
            ...prev,
            selectedTemplateId: template.id,
            appElements: config.appElements || prev.appElements,
            onboarding: config.onboarding || prev.onboarding,
            appProfile: config.appProfile || prev.appProfile,
            hasUnsavedChanges: true,
        }))
    }, [])

    // ==================
    // Section Updaters
    // ==================

    const updateAppElements = useCallback((updates: Partial<AppElementsConfig>) => {
        setState(prev => ({
            ...prev,
            appElements: { ...prev.appElements, ...updates },
            hasUnsavedChanges: true,
        }))
    }, [])

    const updateOnboarding = useCallback((updates: Partial<OnboardingConfig>) => {
        setState(prev => ({
            ...prev,
            onboarding: { ...prev.onboarding, ...updates },
            hasUnsavedChanges: true,
        }))
    }, [])

    const updateAppProfile = useCallback((updates: Partial<AppProfileConfig>) => {
        setState(prev => ({
            ...prev,
            appProfile: { ...prev.appProfile, ...updates },
            hasUnsavedChanges: true,
        }))
    }, [])

    const updatePolicy = useCallback((updates: Partial<PolicyConfig>) => {
        setState(prev => ({
            ...prev,
            policy: { ...prev.policy, ...updates },
            hasUnsavedChanges: true,
        }))
    }, [])

    const updateSupport = useCallback((updates: Partial<SupportConfig>) => {
        setState(prev => ({
            ...prev,
            support: { ...prev.support, ...updates },
            hasUnsavedChanges: true,
        }))
    }, [])

    const updateDNS = useCallback((updates: Partial<DNSConfig>) => {
        setState(prev => ({
            ...prev,
            dns: { ...prev.dns, ...updates },
            hasUnsavedChanges: true,
        }))
    }, [])

    // ==================
    // Save Actions
    // ==================

    const saveConfiguration = useCallback(async () => {
        if (!state.appId) {
            console.error('Cannot save: No appId set')
            return
        }

        setState(prev => ({ ...prev, isSaving: true, error: null }))

        try {
            const slices = {
                appElements: state.appElements,
                onboarding: state.onboarding,
                appProfile: state.appProfile,
                policy: state.policy,
                support: state.support,
                dns: state.dns,
            }
            const fullPwaConfig = appBuilderSlicesToPwaConfig(slices)

            if (state.pwaTemplateId) {
                await appTemplateApi.updateTemplate(state.appId, state.pwaTemplateId, {
                    config: fullPwaConfig,
                })
            } else {
                const configUpdate: Partial<AppConfiguration> = {
                    appElements: state.appElements,
                    onboarding: state.onboarding,
                    appProfile: state.appProfile,
                    policy: state.policy,
                    support: state.support,
                    dns: state.dns,
                }
                await appConfigurationApi.updateConfiguration(state.appId, configUpdate)
            }

            setState(prev => ({
                ...prev,
                isSaving: false,
                hasUnsavedChanges: false,
                lastSavedAt: new Date(),
            }))
        } catch (error) {
            console.error('Failed to save configuration:', error)
            setState(prev => ({
                ...prev,
                isSaving: false,
                error: error instanceof Error ? error.message : 'Failed to save configuration',
            }))
        }
    }, [
        state.appId,
        state.pwaTemplateId,
        state.appElements,
        state.onboarding,
        state.appProfile,
        state.policy,
        state.support,
        state.dns,
    ])

    const saveSection = useCallback(
        async (section: 'appElements' | 'onboarding' | 'appProfile' | 'policy' | 'support' | 'dns') => {
            if (!state.appId) {
                console.error('Cannot save: No appId set')
                return
            }

            setState(prev => ({ ...prev, isSaving: true, error: null }))

            try {
                const slices = {
                    appElements: state.appElements,
                    onboarding: state.onboarding,
                    appProfile: state.appProfile,
                    policy: state.policy,
                    support: state.support,
                    dns: state.dns,
                }

                if (state.pwaTemplateId) {
                    const patch = sectionToPwaConfigPatch(section, slices)
                    await appTemplateApi.updateTemplate(state.appId, state.pwaTemplateId, {
                        config: patch,
                    })
                } else {
                    const configUpdate: Partial<AppConfiguration> = {
                        [section]: state[section],
                    }
                    await appConfigurationApi.updateConfiguration(state.appId, configUpdate)
                }

                setState(prev => ({
                    ...prev,
                    isSaving: false,
                    lastSavedAt: new Date(),
                }))
            } catch (error) {
                console.error(`Failed to save ${section}:`, error)
                setState(prev => ({
                    ...prev,
                    isSaving: false,
                    error: error instanceof Error ? error.message : `Failed to save ${section}`,
                }))
            }
        },
        [state.appId, state.pwaTemplateId, state],
    )

    // ==================
    // Publish Actions
    // ==================

    const publishConfiguration = useCallback(async (): Promise<{
        success: boolean
        versionId?: string
        publish?: PwaPublishPayload
        error?: string
    }> => {
        if (!state.appId) {
            console.error("Cannot publish: No appId set. Open App Builder with a selected merchant app (sidebar) or ?appId= in the URL.")
            return {
                success: false,
                error:
                    "No app selected. Choose an app from the merchant app dropdown, or open App Builder with ?appId=your-app-id.",
            }
        }

        setState(prev => ({ ...prev, isSaving: true, error: null }))

        try {
            const slices = {
                appElements: state.appElements,
                onboarding: state.onboarding,
                appProfile: state.appProfile,
                policy: state.policy,
                support: state.support,
                dns: state.dns,
            }
            const fullPwaConfig = appBuilderSlicesToPwaConfig(slices)

            if (state.pwaTemplateId) {
                await appTemplateApi.updateTemplate(state.appId, state.pwaTemplateId, {
                    config: fullPwaConfig,
                })
                const publishRes = await pwaPublishApi.publish(state.appId, {
                    templateId: state.pwaTemplateId,
                    publishMode: 'apply-and-publish',
                })
                setState(prev => ({
                    ...prev,
                    isSaving: false,
                    hasUnsavedChanges: false,
                    lastSavedAt: new Date(),
                }))
                return { success: true, versionId: state.pwaTemplateId, publish: publishRes.data }
            }

            const configUpdate: Partial<AppConfiguration> = {
                appElements: state.appElements,
                onboarding: state.onboarding,
                appProfile: state.appProfile,
                policy: state.policy,
                support: state.support,
                dns: state.dns,
            }

            const createResponse = await appConfigurationApi.createConfiguration(
                state.appId,
                configUpdate,
                { isActive: true },
            )

            if (createResponse.data) {
                await appConfigurationApi.updatePublishingStatus(state.appId, true)

                setState(prev => ({
                    ...prev,
                    configurationId: createResponse.data?.id || prev.configurationId,
                    isSaving: false,
                    hasUnsavedChanges: false,
                    lastSavedAt: new Date(),
                }))

                return { success: true, versionId: createResponse.data.id }
            }

            throw new Error('Failed to create configuration version')
        } catch (error) {
            console.error('Failed to publish configuration:', error)
            const message = error instanceof Error ? error.message : 'Failed to publish configuration'
            setState(prev => ({
                ...prev,
                isSaving: false,
                error: message,
            }))
            return { success: false, error: message }
        }
    }, [
        state.appId,
        state.pwaTemplateId,
        state.appElements,
        state.onboarding,
        state.appProfile,
        state.policy,
        state.support,
        state.dns,
    ])

    const restoreConfiguration = useCallback(async (configurationId: string): Promise<{ success: boolean }> => {
        if (!state.appId) {
            console.error('Cannot restore: No appId set')
            return { success: false }
        }

        setState(prev => ({ ...prev, isLoading: true, error: null }))

        try {
            // Activate the specified configuration version
            const response = await appConfigurationApi.activateConfiguration(state.appId, configurationId)
            
            if (response.data) {
                const config = response.data

                setState(prev => ({
                    ...prev,
                    pwaTemplateId: null,
                    configurationId: config.id,
                    appElements: config.appElements || defaultAppElements,
                    onboarding: config.onboarding || defaultOnboarding,
                    appProfile: config.appProfile || defaultAppProfile,
                    policy: config.policy || defaultPolicy,
                    support: config.support || defaultSupport,
                    dns: config.dns || defaultDNS,
                    isLoading: false,
                    hasUnsavedChanges: false,
                    lastSavedAt: new Date(),
                }))

                return { success: true }
            }

            throw new Error('Failed to restore configuration')
        } catch (error) {
            console.error('Failed to restore configuration:', error)
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: error instanceof Error ? error.message : 'Failed to restore configuration',
            }))
            return { success: false }
        }
    }, [state.appId])

    // ==================
    // Utility Functions
    // ==================

    const getChangedSections = useCallback((): string[] => {
        const sections: string[] = []
        
        // Check which sections have meaningful content
        if (state.appElements.logo || state.appElements.splash) sections.push('Assets')
        if (state.appElements.buttons?.primaryColor !== defaultAppElements.buttons?.primaryColor) sections.push('Splash')
        if (state.onboarding.splash1?.title || state.onboarding.splash2?.title || state.onboarding.splash3?.title) sections.push('Onboarding')
        if (state.appProfile.elementColors?.primary !== defaultAppProfile.elementColors?.primary) sections.push('Profile')
        if (state.policy.termsSection?.content || state.policy.policySection?.content) sections.push('Policy')
        if (state.support.email || state.support.phone || state.support.website) sections.push('Support')
        if (state.dns.useCustomDomain && state.dns.customDomain) sections.push('DNS')
        
        return sections.length > 0 ? sections : ['Initial Setup']
    }, [state])

    // ==================
    // Context Value
    // ==================

    const value: AppBuilderContextValue = {
        ...state,
        setAppId,
        loadConfiguration,
        applyTemplate,
        updateAppElements,
        updateOnboarding,
        updateAppProfile,
        updatePolicy,
        updateSupport,
        updateDNS,
        saveConfiguration,
        saveSection,
        publishConfiguration,
        restoreConfiguration,
        getChangedSections,
    }

    return (
        <AppBuilderContext.Provider value={value}>
            {children}
        </AppBuilderContext.Provider>
    )
}
