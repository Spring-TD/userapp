"use client"

import { useRef } from "react"
import { Upload, RotateCcw, Type, Palette, LayoutGrid, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
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

// Default colors
const DEFAULT_PROFILE = {
   textColors: { primary: '#1F2937', secondary: '#6B7280', aux: '#9CA3AF' },
   elementColors: { primary: '#7C3AED', secondary: '#A78BFA' },
   backgroundColors: { primary: '#FFFFFF', secondary: '#F3F4F6' },
   menuColors: { primary: '#7C3AED', secondary: '#6B7280', aux: '#E5E7EB' },
   auxElementColors: { primary: '#7C3AED', secondary: '#6B7280' },
}

export function AppProfileTab() {
   const { appProfile, appElements, selectedTemplateId, updateAppProfile, updateAppElements } = useAppBuilder()
   const fileInputRef = useRef<HTMLInputElement>(null)

   const logo = appElements.logo || ""

   // Extract colors from context with defaults
   const textPrimary = appProfile.textColors?.primary || DEFAULT_PROFILE.textColors.primary
   const textSecondary = appProfile.textColors?.secondary || DEFAULT_PROFILE.textColors.secondary
   const textAux = appProfile.textColors?.aux || DEFAULT_PROFILE.textColors.aux
   const elementPrimary = appProfile.elementColors?.primary || DEFAULT_PROFILE.elementColors.primary
   const elementSecondary = appProfile.elementColors?.secondary || DEFAULT_PROFILE.elementColors.secondary
   const bgPrimary = appProfile.backgroundColors?.primary || DEFAULT_PROFILE.backgroundColors.primary
   const bgSecondary = appProfile.backgroundColors?.secondary || DEFAULT_PROFILE.backgroundColors.secondary
   const menuPrimary = appProfile.menuColors?.primary || DEFAULT_PROFILE.menuColors.primary
   const menuSecondary = appProfile.menuColors?.secondary || DEFAULT_PROFILE.menuColors.secondary
   const menuAux = appProfile.menuColors?.aux || DEFAULT_PROFILE.menuColors.aux
   const auxPrimary = appProfile.auxElementColors?.primary || DEFAULT_PROFILE.auxElementColors.primary
   const auxSecondary = appProfile.auxElementColors?.secondary || DEFAULT_PROFILE.auxElementColors.secondary

   const handleColorChange = (group: string, field: string, value: string) => {
      switch (group) {
         case 'text':
            updateAppProfile({ textColors: { ...appProfile.textColors, [field]: value } })
            break
         case 'element':
            updateAppProfile({ elementColors: { ...appProfile.elementColors, [field]: value } })
            break
         case 'background':
            updateAppProfile({ backgroundColors: { ...appProfile.backgroundColors, [field]: value } })
            break
         case 'menu':
            updateAppProfile({ menuColors: { ...appProfile.menuColors, [field]: value } })
            break
         case 'aux':
            updateAppProfile({ auxElementColors: { ...appProfile.auxElementColors, [field]: value } })
            break
      }
   }

   const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
         const url = URL.createObjectURL(file)
         updateAppElements({ logo: url })
      }
   }

   const handleResetSection = (section: string) => {
      switch (section) {
         case 'text':
            updateAppProfile({ textColors: DEFAULT_PROFILE.textColors })
            break
         case 'element':
            updateAppProfile({ elementColors: DEFAULT_PROFILE.elementColors })
            break
         case 'background':
            updateAppProfile({ backgroundColors: DEFAULT_PROFILE.backgroundColors })
            break
         case 'menu':
            updateAppProfile({ menuColors: DEFAULT_PROFILE.menuColors })
            break
         case 'aux':
            updateAppProfile({ auxElementColors: DEFAULT_PROFILE.auxElementColors })
            break
      }
   }

   const handleResetAll = () => {
      updateAppProfile({
         textColors: DEFAULT_PROFILE.textColors,
         elementColors: DEFAULT_PROFILE.elementColors,
         backgroundColors: DEFAULT_PROFILE.backgroundColors,
         menuColors: DEFAULT_PROFILE.menuColors,
         auxElementColors: DEFAULT_PROFILE.auxElementColors,
      })
   }

   const handleOpenFullPreview = () => {
      const previewUrl = selectedTemplateId === 'mobile-v2' ? '/mobile-v2' : '/mobile'
      window.open(previewUrl, '_blank')
   }

   return (
      <TooltipProvider>
         <div className="flex flex-col lg:flex-row gap-16 py-6">
            {/* Left Column: Configuration */}
            <div className="flex-1 max-w-2xl space-y-6">
               {/* Header */}
               <div className="flex items-center justify-between">
                  <div>
                     <h2 className="text-xl font-semibold text-gray-900">App Profile</h2>
                     <p className="text-sm text-gray-500 mt-1">
                        Customize your app&apos;s visual identity
                     </p>
                  </div>
                  <Tooltip>
                     <TooltipTrigger asChild>
                        <Button 
                           variant="outline" 
                           size="sm"
                           onClick={handleResetAll}
                           className="gap-2 text-gray-500"
                        >
                           <RotateCcw className="w-4 h-4" />
                           Reset All
                        </Button>
                     </TooltipTrigger>
                     <TooltipContent><p>Reset all colors to defaults</p></TooltipContent>
                  </Tooltip>
               </div>
            
               {/* App Logo Upload */}
               <div className="p-5 bg-white rounded-xl border border-gray-100">
                  <div className="flex items-center gap-6">
                     <div className="w-20 h-20 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100 shadow-sm overflow-hidden flex-shrink-0">
                        {logo ? (
                           <img src={logo} alt="Logo" className="w-full h-full object-contain p-2" />
                        ) : (
                           <Upload className="w-6 h-6 text-gray-300" />
                        )}
                     </div>
                     <div className="flex-1 space-y-2">
                        <h4 className="font-medium text-gray-900">App Logo</h4>
                        <p className="text-xs text-gray-500">PNG, JPG, SVG • Max 2MB</p>
                        <Button 
                           variant="outline" 
                           size="sm" 
                           className="border-[#7C3AED] text-[#7C3AED] hover:bg-purple-50"
                           onClick={() => fileInputRef.current?.click()}
                        >
                           {logo ? 'Change Logo' : 'Upload Logo'}
                        </Button>
                        <input 
                           ref={fileInputRef}
                           type="file" 
                           accept="image/*" 
                           onChange={handleLogoUpload}
                           className="hidden"
                        />
                     </div>
                  </div>
               </div>

               {/* Color Sections */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Text Colors */}
                  <CollapsibleSection 
                     title="Text Colors" 
                     icon={<Type className="w-4 h-4" />}
                     onReset={() => handleResetSection('text')}
                  >
                     <ColorPickerEnhanced 
                        label="Primary" 
                        color={textPrimary} 
                        onChange={(c) => handleColorChange('text', 'primary', c)}
                        defaultColor={DEFAULT_PROFILE.textColors.primary}
                     />
                     <ColorPickerEnhanced 
                        label="Secondary" 
                        color={textSecondary} 
                        onChange={(c) => handleColorChange('text', 'secondary', c)}
                        defaultColor={DEFAULT_PROFILE.textColors.secondary}
                     />
                     <ColorPickerEnhanced 
                        label="Auxiliary" 
                        color={textAux} 
                        onChange={(c) => handleColorChange('text', 'aux', c)}
                        defaultColor={DEFAULT_PROFILE.textColors.aux}
                     />
                  </CollapsibleSection>

                  {/* Element Colors */}
                  <CollapsibleSection 
                     title="Element Colors" 
                     icon={<Palette className="w-4 h-4" />}
                     onReset={() => handleResetSection('element')}
                  >
                     <ColorPickerEnhanced 
                        label="Primary" 
                        color={elementPrimary} 
                        onChange={(c) => handleColorChange('element', 'primary', c)}
                        defaultColor={DEFAULT_PROFILE.elementColors.primary}
                     />
                     <ColorPickerEnhanced 
                        label="Secondary" 
                        color={elementSecondary} 
                        onChange={(c) => handleColorChange('element', 'secondary', c)}
                        defaultColor={DEFAULT_PROFILE.elementColors.secondary}
                     />
                  </CollapsibleSection>

                  {/* Background Colors */}
                  <CollapsibleSection 
                     title="Background Colors" 
                     icon={<LayoutGrid className="w-4 h-4" />}
                     onReset={() => handleResetSection('background')}
                  >
                     <ColorPickerEnhanced 
                        label="Primary" 
                        color={bgPrimary} 
                        onChange={(c) => handleColorChange('background', 'primary', c)}
                        defaultColor={DEFAULT_PROFILE.backgroundColors.primary}
                     />
                     <ColorPickerEnhanced 
                        label="Secondary" 
                        color={bgSecondary} 
                        onChange={(c) => handleColorChange('background', 'secondary', c)}
                        defaultColor={DEFAULT_PROFILE.backgroundColors.secondary}
                     />
                  </CollapsibleSection>

                  {/* Menu Colors */}
                  <CollapsibleSection 
                     title="Menu Colors" 
                     icon={<Menu className="w-4 h-4" />}
                     onReset={() => handleResetSection('menu')}
                  >
                     <ColorPickerEnhanced 
                        label="Primary" 
                        color={menuPrimary} 
                        onChange={(c) => handleColorChange('menu', 'primary', c)}
                        defaultColor={DEFAULT_PROFILE.menuColors.primary}
                     />
                     <ColorPickerEnhanced 
                        label="Secondary" 
                        color={menuSecondary} 
                        onChange={(c) => handleColorChange('menu', 'secondary', c)}
                        defaultColor={DEFAULT_PROFILE.menuColors.secondary}
                     />
                     <ColorPickerEnhanced 
                        label="Auxiliary" 
                        color={menuAux} 
                        onChange={(c) => handleColorChange('menu', 'aux', c)}
                        defaultColor={DEFAULT_PROFILE.menuColors.aux}
                     />
                  </CollapsibleSection>
               </div>
            </div>

            {/* Right Column: Preview */}
            <div className="flex-shrink-0">
               <DeviceFrame 
                  title="App Preview"
                  showControls={true}
                  defaultZoom={0.82}
                  onOpenFullPreview={handleOpenFullPreview}
               >
                  <MobileTemplatePreview 
                     templateId={selectedTemplateId}
                     screenType="splash"
                     appConfig={buildMobileConfig({
                        templateId: selectedTemplateId,
                        logo: logo || undefined,
                        splashBackgroundColor: selectedTemplateId === 'mobile-v2' ? elementPrimary : bgPrimary,
                        splashTextColor: selectedTemplateId === 'mobile-v2' ? '#FFFFFF' : elementPrimary,
                        primaryColor: elementPrimary,
                        secondaryColor: elementSecondary,
                     })}
                  />
               </DeviceFrame>
            </div>
         </div>
      </TooltipProvider>
   )
}
