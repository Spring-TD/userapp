"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react"
import { MobileTemplatePreview, buildMobileConfig } from "./mobile-template-preview"
import { useAppBuilder } from "@/contexts/AppBuilderContext"
import { DeviceFrame } from "./ui/device-frame"
import { ColorPickerEnhanced } from "./ui/color-picker-enhanced"
import { CollapsibleSection } from "./ui/collapsible-section"
import {
   Tooltip,
   TooltipContent,
   TooltipProvider,
   TooltipTrigger,
} from "@/components/ui/tooltip"

type ScreenKey = 'splash1' | 'splash2' | 'splash3'

const CloudUploadIcon = () => (
   <svg width="40" height="40" viewBox="0 0 68 68" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M48.1666 56.6667H19.8333C12.0008 56.6667 5.66663 50.3325 5.66663 42.5001C5.66663 35.1901 11.1625 29.1551 18.275 28.4184C19.0683 19.3517 26.69 12.2776 35.8983 12.2776C44.4024 12.2776 51.5641 18.3376 53.0516 26.4917C59.6274 27.6109 64.5 33.3292 64.5 40.2334C64.5 47.7842 58.3841 53.9001 50.8333 53.9001" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="34" cy="46" r="14" fill="white" stroke="#7C3AED" strokeWidth="2.5" />
      <path d="M29 46L32.5 49.5L39 43" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
   </svg>
)

// Default content helpers
function getDefaultTitle(screen: number): string {
   const titles = ["Welcome to Your App", "Track Your Progress", "Get Started Today"]
   return titles[screen - 1] || titles[0]
}

function getDefaultSubtitle(screen: number): string {
   const subtitles = [
      "Discover amazing features and possibilities",
      "Monitor your activities and achieve your goals",
      "Join thousands of happy users"
   ]
   return subtitles[screen - 1] || subtitles[0]
}

export function OnboardingTab() {
   const { onboarding, appElements, selectedTemplateId, updateOnboarding } = useAppBuilder()
   const imageInputRef = useRef<HTMLInputElement>(null)
   const [currentScreen, setCurrentScreen] = useState<number>(1)

   // Global colors (shared across all screens)
   const textPrimary = onboarding.textColors?.primary || "#FFFFFF"
   const textSecondary = onboarding.textColors?.secondary || "#E5E7EB"
   const bgPrimary = onboarding.backgroundColors?.primary || "#7C3AED"
   const bgSecondary = onboarding.backgroundColors?.secondary || "#6D28D9"
   const fontFamily = onboarding.fontFamily || "Inter"

   // Get current screen data
   const screenKey = `splash${currentScreen}` as ScreenKey
   const currentSplash = onboarding[screenKey] || { title: "", subtitle: "", image: "" }

   const handleTextColorChange = (type: 'primary' | 'secondary', color: string) => {
      updateOnboarding({
         textColors: {
            ...onboarding.textColors,
            [type]: color,
         }
      })
   }

   const handleBgColorChange = (type: 'primary' | 'secondary', color: string) => {
      updateOnboarding({
         backgroundColors: {
            ...onboarding.backgroundColors,
            [type]: color,
         }
      })
   }

   const handleFontChange = (font: string) => {
      updateOnboarding({ fontFamily: font })
   }

   const handleSplashChange = (field: 'title' | 'subtitle', value: string) => {
      updateOnboarding({
         [screenKey]: {
            ...currentSplash,
            [field]: value,
         }
      })
   }

   const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
         const url = URL.createObjectURL(file)
         updateOnboarding({
            [screenKey]: {
               ...currentSplash,
               image: url,
            }
         })
      }
   }

   const clearImage = () => {
      updateOnboarding({
         [screenKey]: {
            ...currentSplash,
            image: "",
         }
      })
      if (imageInputRef.current) imageInputRef.current.value = ""
   }

   const goToPrevScreen = () => {
      if (currentScreen > 1) setCurrentScreen(currentScreen - 1)
   }

   const goToNextScreen = () => {
      if (currentScreen < 3) setCurrentScreen(currentScreen + 1)
   }

   // Build config using the same structure as actual mobile templates
   const appConfig = buildMobileConfig({
      templateId: selectedTemplateId,
      logo: appElements.logo || undefined,
      onboardingBackgroundColor: bgPrimary,
      onboardingTextColor: textPrimary,
      onboardingSecondaryTextColor: textSecondary,
      onboardingButtonColor: appElements.buttons?.primaryColor || bgPrimary,
      onboardingButtonTextColor: '#FFFFFF',
      onboardingSteps: [
         {
            id: 'step-1',
            title: onboarding.splash1?.title || getDefaultTitle(1),
            description: onboarding.splash1?.subtitle || getDefaultSubtitle(1),
            image: onboarding.splash1?.image,
         },
         {
            id: 'step-2',
            title: onboarding.splash2?.title || getDefaultTitle(2),
            description: onboarding.splash2?.subtitle || getDefaultSubtitle(2),
            image: onboarding.splash2?.image,
         },
         {
            id: 'step-3',
            title: onboarding.splash3?.title || getDefaultTitle(3),
            description: onboarding.splash3?.subtitle || getDefaultSubtitle(3),
            image: onboarding.splash3?.image,
         },
      ],
      primaryColor: appElements.buttons?.primaryColor || bgPrimary,
   })

   const handleOpenFullPreview = () => {
      const previewUrl = selectedTemplateId === 'mobile-v2' ? '/mobile-v2' : '/mobile'
      window.open(previewUrl, '_blank')
   }

   return (
      <TooltipProvider>
         <div className="flex flex-col lg:flex-row gap-12 py-6">
            {/* Left Column */}
            <div className="flex-1 max-w-xl space-y-6">
               {/* Header */}
               <div className="flex items-center justify-between">
                  <div>
                     <h2 className="text-xl font-semibold text-gray-900">Onboarding Flow</h2>
                     <p className="text-sm text-gray-500 mt-1">
                        Create an engaging first-time experience
                     </p>
                  </div>
               </div>

               {/* Screen Selector */}
               <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-white rounded-xl border border-purple-100">
                  <div className="flex items-center gap-3">
                     <Tooltip>
                        <TooltipTrigger asChild>
                           <button
                              onClick={goToPrevScreen}
                              disabled={currentScreen === 1}
                              className="p-2.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                           >
                              <ChevronLeft className="w-5 h-5 text-gray-600" />
                           </button>
                        </TooltipTrigger>
                        <TooltipContent>Previous Screen</TooltipContent>
                     </Tooltip>
                     
                     <div className="text-center">
                        <h3 className="font-semibold text-gray-900">Screen {currentScreen}</h3>
                        <p className="text-xs text-gray-500">of 3 screens</p>
                     </div>
                     
                     <Tooltip>
                        <TooltipTrigger asChild>
                           <button
                              onClick={goToNextScreen}
                              disabled={currentScreen === 3}
                              className="p-2.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                           >
                              <ChevronRight className="w-5 h-5 text-gray-600" />
                           </button>
                        </TooltipTrigger>
                        <TooltipContent>Next Screen</TooltipContent>
                     </Tooltip>
                  </div>
               </div>

               {/* Screen Content */}
               <CollapsibleSection 
                  title={`Screen ${currentScreen} Content`}
                  defaultOpen={true}
                  badge={currentSplash.title ? '✓' : undefined}
               >
                  <div className="space-y-4">
                     <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-600">Title</label>
                        <Input 
                           value={currentSplash.title || ""}
                           onChange={(e) => handleSplashChange('title', e.target.value)}
                           placeholder={getDefaultTitle(currentScreen)}
                           className="bg-white border-gray-200 h-11 focus-visible:ring-[#7C3AED]" 
                        />
                     </div>
                     
                     <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-600">Description</label>
                        <Input 
                           value={currentSplash.subtitle || ""}
                           onChange={(e) => handleSplashChange('subtitle', e.target.value)}
                           placeholder={getDefaultSubtitle(currentScreen)}
                           className="bg-white border-gray-200 h-11 focus-visible:ring-[#7C3AED]" 
                        />
                     </div>

                     {/* Image Upload */}
                     <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-600">Screen Image</label>
                        {currentSplash.image ? (
                           <div className="relative border border-gray-200 rounded-xl p-3 h-[120px] flex items-center justify-center bg-gray-50">
                              <img src={currentSplash.image} alt="Screen preview" className="max-h-full max-w-full object-contain" />
                              <button 
                                 onClick={clearImage}
                                 className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow-md hover:bg-red-50 hover:text-red-500 transition-colors"
                              >
                                 <X className="w-4 h-4" />
                              </button>
                           </div>
                        ) : (
                           <div 
                              onClick={() => imageInputRef.current?.click()}
                              className="border-2 border-dashed border-gray-200 bg-gray-50 hover:bg-white hover:border-[#7C3AED] rounded-xl p-6 flex flex-col items-center gap-3 transition-all cursor-pointer group"
                           >
                              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                                 <CloudUploadIcon />
                              </div>
                              <div className="text-center">
                                 <p className="text-sm font-medium text-gray-700">Click to upload image</p>
                                 <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
                              </div>
                           </div>
                        )}
                        <input
                           ref={imageInputRef}
                           type="file"
                           accept="image/*"
                           onChange={handleImageUpload}
                           className="hidden"
                        />
                     </div>
                  </div>
               </CollapsibleSection>

               {/* Global Styling */}
               <CollapsibleSection 
                  title="Global Styling"
                  defaultOpen={false}
               >
                  <div className="space-y-5">
                     {/* Font Selection */}
                     <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Font Family</span>
                        <div className="relative w-40">
                           <select 
                              value={fontFamily}
                              onChange={(e) => handleFontChange(e.target.value)}
                              className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-lg py-2.5 px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30"
                           >
                              <option value="Inter">Inter</option>
                              <option value="Roboto">Roboto</option>
                              <option value="Arial">Arial</option>
                              <option value="Poppins">Poppins</option>
                           </select>
                           <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                     </div>

                     {/* Color Pickers */}
                     <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                           <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Text Colors</span>
                           <ColorPickerEnhanced 
                              label="Primary" 
                              color={textPrimary} 
                              onChange={(c) => handleTextColorChange('primary', c)}
                              showPalettes={false}
                           />
                           <ColorPickerEnhanced 
                              label="Secondary" 
                              color={textSecondary} 
                              onChange={(c) => handleTextColorChange('secondary', c)}
                              showPalettes={false}
                           />
                        </div>
                        
                        <div className="space-y-3">
                           <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Background</span>
                           <ColorPickerEnhanced 
                              label="Primary" 
                              color={bgPrimary} 
                              onChange={(c) => handleBgColorChange('primary', c)}
                              showPalettes={false}
                           />
                           <ColorPickerEnhanced 
                              label="Secondary" 
                              color={bgSecondary} 
                              onChange={(c) => handleBgColorChange('secondary', c)}
                              showPalettes={false}
                           />
                        </div>
                     </div>
                  </div>
               </CollapsibleSection>
            </div>

            {/* Right Column: Preview */}
            <div className="flex-shrink-0">
               <DeviceFrame 
                  title={`Screen ${currentScreen} Preview`}
                  showControls={true}
                  defaultZoom={0.78}
                  onOpenFullPreview={handleOpenFullPreview}
               >
                  <MobileTemplatePreview
                     templateId={selectedTemplateId}
                     screenType="onboarding"
                     appConfig={appConfig}
                     currentStep={currentScreen - 1}
                  />
               </DeviceFrame>
            </div>
         </div>
      </TooltipProvider>
   )
}
