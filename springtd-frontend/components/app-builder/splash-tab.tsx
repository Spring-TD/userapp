"use client"

import { RotateCcw } from "lucide-react"
import { MobileTemplatePreview, buildMobileConfig } from "./mobile-template-preview"
import { useAppBuilder } from "@/contexts/AppBuilderContext"
import { DeviceFrame } from "./ui/device-frame"
import { ColorPickerEnhanced } from "./ui/color-picker-enhanced"
import { CollapsibleSection } from "./ui/collapsible-section"
import { Button } from "@/components/ui/button"
import {
   Tooltip,
   TooltipContent,
   TooltipProvider,
   TooltipTrigger,
} from "@/components/ui/tooltip"

// Default colors based on template
const DEFAULT_COLORS = {
   'mobile-v1': { primary: '#7C3AED', secondary: '#6B7280' },
   'mobile-v2': { primary: '#2563EB', secondary: '#6B7280' },
}

export function SplashTab() {
   const { appElements, selectedTemplateId, updateAppElements } = useAppBuilder()

   const defaults = DEFAULT_COLORS[selectedTemplateId as keyof typeof DEFAULT_COLORS] || DEFAULT_COLORS['mobile-v1']
   const primaryColor = appElements.buttons?.primaryColor || defaults.primary
   const secondaryColor = appElements.buttons?.secondaryColor || defaults.secondary
   const logo = appElements.logo || undefined

   const handlePrimaryColorChange = (color: string) => {
      updateAppElements({
         buttons: {
            ...appElements.buttons,
            primaryColor: color,
         }
      })
   }

   const handleSecondaryColorChange = (color: string) => {
      updateAppElements({
         buttons: {
            ...appElements.buttons,
            secondaryColor: color,
         }
      })
   }

   const handleResetColors = () => {
      updateAppElements({
         buttons: {
            ...appElements.buttons,
            primaryColor: defaults.primary,
            secondaryColor: defaults.secondary,
         }
      })
   }

   // Build config using the same structure as actual mobile templates
   const appConfig = buildMobileConfig({
      templateId: selectedTemplateId,
      logo: logo,
      splashBackgroundColor: selectedTemplateId === 'mobile-v2' ? primaryColor : '#FFFFFF',
      splashTextColor: selectedTemplateId === 'mobile-v2' ? '#FFFFFF' : primaryColor,
      primaryColor: primaryColor,
      secondaryColor: secondaryColor,
   })

   const handleOpenFullPreview = () => {
      const previewUrl = selectedTemplateId === 'mobile-v2' ? '/mobile-v2' : '/mobile'
      window.open(previewUrl, '_blank')
   }

   return (
      <TooltipProvider>
         <div className="flex flex-col lg:flex-row gap-16 py-6">
            {/* Left Column: Configuration */}
            <div className="flex-1 max-w-xl pt-4 space-y-6">
               {/* Header */}
               <div className="flex items-center justify-between">
                  <div>
                     <h2 className="text-xl font-semibold text-gray-900">Splash Screen</h2>
                     <p className="text-sm text-gray-500 mt-1">
                        Customize the colors shown when your app first loads
                     </p>
                  </div>
                  <Tooltip>
                     <TooltipTrigger asChild>
                        <Button 
                           variant="outline" 
                           size="sm"
                           onClick={handleResetColors}
                           className="gap-2 text-gray-500"
                        >
                           <RotateCcw className="w-4 h-4" />
                           Reset
                        </Button>
                     </TooltipTrigger>
                     <TooltipContent><p>Reset to template defaults</p></TooltipContent>
                  </Tooltip>
               </div>

               {/* Color Settings */}
               <CollapsibleSection 
                  title="Splash Screen Colors" 
                  defaultOpen={true}
                  onReset={handleResetColors}
               >
                  <div className="space-y-6 pt-2">
                     <ColorPickerEnhanced
                        label="Primary Color"
                        color={primaryColor}
                        onChange={handlePrimaryColorChange}
                        defaultColor={defaults.primary}
                        tooltip="Main brand color used for buttons and highlights"
                     />
                     
                     <ColorPickerEnhanced
                        label="Secondary Color"
                        color={secondaryColor}
                        onChange={handleSecondaryColorChange}
                        defaultColor={defaults.secondary}
                        tooltip="Used for secondary elements and text"
                     />
                  </div>
               </CollapsibleSection>

               {/* Tips Section */}
               <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                  <h4 className="font-medium text-purple-900 mb-2">💡 Design Tips</h4>
                  <ul className="text-sm text-purple-700 space-y-1.5">
                     <li>• Use contrasting colors for better visibility</li>
                     <li>• Keep your splash screen simple and branded</li>
                     <li>• Primary color should match your logo</li>
                  </ul>
               </div>
            </div>

            {/* Right Column: Preview */}
            <div className="flex-shrink-0">
               <DeviceFrame 
                  title="Splash Preview"
                  showControls={true}
                  defaultZoom={0.82}
                  onOpenFullPreview={handleOpenFullPreview}
               >
                  <MobileTemplatePreview
                     templateId={selectedTemplateId}
                     screenType="splash"
                     appConfig={appConfig}
                  />
               </DeviceFrame>
            </div>
         </div>
      </TooltipProvider>
   )
}
