"use client"

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react"
import { 
    AppConfiguration, 
    appConfigurationApi, 
    PredefinedTemplate,
    AppElementsConfig,
    OnboardingConfig,
    AppProfileConfig,
    PolicyConfig,
    SupportConfig,
    DNSConfig
} from "@/lib/appService"

// ============================================
// TYPES
// ============================================

interface AppBuilderState {
    // Core identifiers
    appId: string | null
    configurationId: string | null
    
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
    publishConfiguration: () => Promise<{ success: boolean; versionId?: string }>
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

    // Load configuration when appId changes
    useEffect(() => {
        if (initialAppId) {
            loadConfiguration(initialAppId)
        }
    }, [initialAppId])

    // ==================
    // Core Actions
    // ==================

    const setAppId = useCallback((appId: string) => {
        setState(prev => ({ ...prev, appId }))
    }, [])

    const loadConfiguration = useCallback(async (appId: string) => {
        setState(prev => ({ ...prev, isLoading: true, error: null }))
        
        try {
            const response = await appConfigurationApi.getActiveConfiguration(appId)
            const config = response.data
            
            if (config) {
                setState(prev => ({
                    ...prev,
                    appId,
                    configurationId: config.id,
                    appElements: config.appElements || defaultAppElements,
                    onboarding: config.onboarding || defaultOnboarding,
                    appProfile: config.appProfile || defaultAppProfile,
                    policy: config.policy || defaultPolicy,
                    support: config.support || defaultSupport,
                    dns: config.dns || defaultDNS,
                    isLoading: false,
                    hasUnsavedChanges: false,
                }))
            } else {
                setState(prev => ({ ...prev, appId, isLoading: false }))
            }
        } catch (error) {
            console.error('Failed to load configuration:', error)
            setState(prev => ({
                ...prev,
                appId,
                isLoading: false,
                error: error instanceof Error ? error.message : 'Failed to load configuration',
            }))
        }
    }, [])

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
            const configUpdate: Partial<AppConfiguration> = {
                appElements: state.appElements,
                onboarding: state.onboarding,
                appProfile: state.appProfile,
                policy: state.policy,
                support: state.support,
                dns: state.dns,
            }

            await appConfigurationApi.updateConfiguration(state.appId, configUpdate)

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
    }, [state.appId, state.appElements, state.onboarding, state.appProfile, state.policy, state.support, state.dns])

    const saveSection = useCallback(async (section: 'appElements' | 'onboarding' | 'appProfile' | 'policy' | 'support' | 'dns') => {
        if (!state.appId) {
            console.error('Cannot save: No appId set')
            return
        }

        setState(prev => ({ ...prev, isSaving: true, error: null }))

        try {
            const configUpdate: Partial<AppConfiguration> = {
                [section]: state[section],
            }

            await appConfigurationApi.updateConfiguration(state.appId, configUpdate)

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
    }, [state.appId, state])

    // ==================
    // Publish Actions
    // ==================

    const publishConfiguration = useCallback(async (): Promise<{ success: boolean; versionId?: string }> => {
        if (!state.appId) {
            console.error('Cannot publish: No appId set')
            return { success: false }
        }

        setState(prev => ({ ...prev, isSaving: true, error: null }))

        try {
            // First save any unsaved changes
            const configUpdate: Partial<AppConfiguration> = {
                appElements: state.appElements,
                onboarding: state.onboarding,
                appProfile: state.appProfile,
                policy: state.policy,
                support: state.support,
                dns: state.dns,
            }

            // Create a new configuration version (this creates an immutable snapshot)
            const createResponse = await appConfigurationApi.createConfiguration(
                state.appId,
                configUpdate,
                { isActive: true }
            )

            if (createResponse.data) {
                // Update publishing status to mark as published
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
            setState(prev => ({
                ...prev,
                isSaving: false,
                error: error instanceof Error ? error.message : 'Failed to publish configuration',
            }))
            return { success: false }
        }
    }, [state.appId, state.appElements, state.onboarding, state.appProfile, state.policy, state.support, state.dns])

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
                
                // Update local state with the restored configuration
                setState(prev => ({
                    ...prev,
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
