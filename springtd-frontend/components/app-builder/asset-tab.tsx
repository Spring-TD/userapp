"use client"

import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useAppBuilder } from "@/contexts/AppBuilderContext"
import { X, ImageIcon } from "lucide-react"

const CloudUploadIcon = () => (
   <svg width="68" height="68" viewBox="0 0 68 68" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M48.1666 56.6667H19.8333C12.0008 56.6667 5.66663 50.3325 5.66663 42.5001C5.66663 35.1901 11.1625 29.1551 18.275 28.4184C19.0683 19.3517 26.69 12.2776 35.8983 12.2776C44.4024 12.2776 51.5641 18.3376 53.0516 26.4917C59.6274 27.6109 64.5 33.3292 64.5 40.2334C64.5 47.7842 58.3841 53.9001 50.8333 53.9001" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="34" cy="46" r="14" fill="white" stroke="#7C3AED" strokeWidth="2.5"/>
      <path d="M29 46L32.5 49.5L39 43" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
   </svg>
)

export function AssetTab() {
   const { appElements, updateAppElements } = useAppBuilder()
   const logoInputRef = useRef<HTMLInputElement>(null)
   const splashInputRef = useRef<HTMLInputElement>(null)

   const logo = appElements.logo || ""
   const splash = appElements.splash || ""
   const siteDescription = appElements.siteDescription || ""

   const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
         // For now, create a local URL. In production, upload to server and get URL
         const url = URL.createObjectURL(file)
         updateAppElements({ logo: url })
      }
   }

   const handleSplashUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
         const url = URL.createObjectURL(file)
         updateAppElements({ splash: url })
      }
   }

   const handleDescriptionChange = (value: string) => {
      updateAppElements({ siteDescription: value })
   }

   const clearLogo = () => {
      updateAppElements({ logo: "" })
      if (logoInputRef.current) logoInputRef.current.value = ""
   }

   const clearSplash = () => {
      updateAppElements({ splash: "" })
      if (splashInputRef.current) splashInputRef.current.value = ""
   }

   return (
      <div className="space-y-10 py-6 max-w-5xl">
         <div className="grid grid-cols-2 gap-8">
            {/* Upload Logo */}
            <div className="space-y-4">
               <h3 className="text-sm font-medium text-gray-700">Upload Logo for the App</h3>
               {logo ? (
                  <div className="relative border border-gray-200 rounded-2xl p-4 h-[280px] flex items-center justify-center bg-gray-50">
                     <img src={logo} alt="Logo preview" className="max-h-full max-w-full object-contain" />
                     <button 
                        onClick={clearLogo}
                        className="absolute top-3 right-3 p-1.5 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
                     >
                        <X className="w-4 h-4 text-gray-600" />
                     </button>
                  </div>
               ) : (
                  <div 
                     onClick={() => logoInputRef.current?.click()}
                     className="border border-dashed border-[#D1D5DB] bg-[#F9FAFB] hover:bg-[#F3F4F6] rounded-2xl p-10 flex flex-col items-center justify-center text-center space-y-5 h-[280px] hover:border-[#7C3AED] transition-all cursor-pointer group"
                  >
                     <div className="relative mb-2">
                        <CloudUploadIcon />
                     </div>
                     <p className="text-gray-900 text-lg font-medium">Choose a file or drag & drop it here</p>
                     <Button 
                        variant="outline" 
                        className="border-[#7C3AED] text-[#7C3AED] hover:bg-[#7C3AED] hover:text-white rounded-full px-10 h-12 text-base font-medium bg-white transition-all shadow-sm"
                     >
                        Browse File
                     </Button>
                  </div>
               )}
               <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
               />
            </div>

            {/* Upload Splash Screen */}
            <div className="space-y-4">
               <h3 className="text-sm font-medium text-gray-700">Upload Splash Screen Image</h3>
               {splash ? (
                  <div className="relative border border-gray-200 rounded-2xl p-4 h-[280px] flex items-center justify-center bg-gray-50">
                     <img src={splash} alt="Splash preview" className="max-h-full max-w-full object-contain" />
                     <button 
                        onClick={clearSplash}
                        className="absolute top-3 right-3 p-1.5 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
                     >
                        <X className="w-4 h-4 text-gray-600" />
                     </button>
                  </div>
               ) : (
                  <div 
                     onClick={() => splashInputRef.current?.click()}
                     className="border border-dashed border-[#D1D5DB] bg-[#F9FAFB] hover:bg-[#F3F4F6] rounded-2xl p-10 flex flex-col items-center justify-center text-center space-y-5 h-[280px] hover:border-[#7C3AED] transition-all cursor-pointer group"
                  >
                     <div className="relative mb-2">
                        <CloudUploadIcon />
                     </div>
                     <p className="text-gray-900 text-lg font-medium">Choose a file or drag & drop it here</p>
                     <Button 
                        variant="outline" 
                        className="border-[#7C3AED] text-[#7C3AED] hover:bg-[#7C3AED] hover:text-white rounded-full px-10 h-12 text-base font-medium bg-white transition-all shadow-sm"
                     >
                        Browse File
                     </Button>
                  </div>
               )}
               <input
                  ref={splashInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleSplashUpload}
                  className="hidden"
               />
            </div>
         </div>

         {/* Description */}
         <div className="space-y-4 pt-2">
            <h3 className="text-sm font-medium text-gray-700">Site Description</h3>
            <Textarea 
               value={siteDescription}
               onChange={(e) => handleDescriptionChange(e.target.value)}
               placeholder="Describe your app - this will be shown to users" 
               className="min-h-[140px] bg-white border-gray-200 resize-none text-gray-700 rounded-xl p-4 focus-visible:ring-[#7C3AED] focus-visible:ring-offset-0 text-base"
            />
         </div>
      </div>
   )
}
