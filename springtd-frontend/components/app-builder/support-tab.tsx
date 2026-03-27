"use client"

import { Input } from "@/components/ui/input"
import { useAppBuilder } from "@/contexts/AppBuilderContext"
import { Loader2, CheckCircle2 } from "lucide-react"
import { useCallback, useState } from "react"

export function SupportTab() {
   const { support, updateSupport, saveSection, isSaving, appId } = useAppBuilder()
   const [savedAt, setSavedAt] = useState<Date | null>(null)

   // Save on blur of any field — this is the P2-002 fix
   const handleBlurSave = useCallback(async () => {
      if (!appId) return
      await saveSection('support')
      setSavedAt(new Date())
   }, [appId, saveSection])

   const handleChange = (field: string, value: string) => {
      if (field.startsWith('socialMedia.')) {
         const socialField = field.replace('socialMedia.', '') as 'instagram' | 'linkedin' | 'twitter' | 'facebook'
         updateSupport({
            socialMedia: {
               ...support.socialMedia,
               [socialField]: value,
            }
         })
      } else {
         updateSupport({ [field]: value })
      }
   }

   return (
      <div className="py-8 max-w-5xl space-y-12">
         {/* Save status bar */}
         <div className="flex items-center gap-2 text-sm text-gray-500 h-5">
            {isSaving ? (
               <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
               </>
            ) : savedAt ? (
               <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-green-600">Saved at {savedAt.toLocaleTimeString()}</span>
               </>
            ) : (
               <span className="text-xs text-gray-400">Changes are saved when you move to another field</span>
            )}
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            {/* Column 1 */}
            <div className="space-y-6">
               <Input
                  value={support.email || ""}
                  onChange={(e) => handleChange('email', e.target.value)}
                  onBlur={handleBlurSave}
                  placeholder="Contact email*"
                  className="h-14 px-4 bg-white border-gray-200 rounded-md focus-visible:ring-[#7C3AED] text-gray-700 placeholder:text-gray-400"
               />
               <Input
                  value={support.phone || ""}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  onBlur={handleBlurSave}
                  placeholder="Contact phone*"
                  className="h-14 px-4 bg-white border-gray-200 rounded-md focus-visible:ring-[#7C3AED] text-gray-700 placeholder:text-gray-400"
               />
               <Input
                  value={support.website || ""}
                  onChange={(e) => handleChange('website', e.target.value)}
                  onBlur={handleBlurSave}
                  placeholder="Website*"
                  className="h-14 px-4 bg-white border-gray-200 rounded-md focus-visible:ring-[#7C3AED] text-gray-700 placeholder:text-gray-400"
               />
               <Input
                  value={support.linkedinPage || ""}
                  onChange={(e) => handleChange('linkedinPage', e.target.value)}
                  onBlur={handleBlurSave}
                  placeholder="LinkedIn page*"
                  className="h-14 px-4 bg-white border-gray-200 rounded-md focus-visible:ring-[#7C3AED] text-gray-700 placeholder:text-gray-400"
               />
            </div>

            {/* Column 2 */}
            <div className="space-y-6">
               <Input
                  value={support.socialMedia?.instagram || ""}
                  onChange={(e) => handleChange('socialMedia.instagram', e.target.value)}
                  onBlur={handleBlurSave}
                  placeholder="Instagram Handle"
                  className="h-14 px-4 bg-white border-gray-200 rounded-md focus-visible:ring-[#7C3AED] text-gray-700 placeholder:text-gray-400"
               />
               <Input
                  value={support.socialMedia?.twitter || ""}
                  onChange={(e) => handleChange('socialMedia.twitter', e.target.value)}
                  onBlur={handleBlurSave}
                  placeholder="Twitter Handle"
                  className="h-14 px-4 bg-white border-gray-200 rounded-md focus-visible:ring-[#7C3AED] text-gray-700 placeholder:text-gray-400"
               />
               <Input
                  value={support.privacyPolicyLink || ""}
                  onChange={(e) => handleChange('privacyPolicyLink', e.target.value)}
                  onBlur={handleBlurSave}
                  placeholder="Link to privacy Policy*"
                  className="h-14 px-4 bg-white border-gray-200 rounded-md focus-visible:ring-[#7C3AED] text-gray-700 placeholder:text-gray-400"
               />
               <Input
                  value={support.termsLink || ""}
                  onChange={(e) => handleChange('termsLink', e.target.value)}
                  onBlur={handleBlurSave}
                  placeholder="Link to terms and conditions*"
                  className="h-14 px-4 bg-white border-gray-200 rounded-md focus-visible:ring-[#7C3AED] text-gray-700 placeholder:text-gray-400"
               />
            </div>
         </div>
      </div>
   )
}
