"use client"

import React from 'react'
import { Button } from '@/components/ui/button'

interface TabNavigationProps {
   currentTab: string
   tabs: { value: string; label: string }[]
   onNavigate: (tabValue: string) => void
   onSave?: () => void
   isSaving?: boolean
   showSaveOnLast?: boolean
}

export function TabNavigation({
   currentTab,
   tabs,
   onNavigate,
   onSave,
   isSaving = false,
   showSaveOnLast = true
}: TabNavigationProps) {
   const currentIndex = tabs.findIndex(t => t.value === currentTab)
   const isFirst = currentIndex === 0
   const isLast = currentIndex === tabs.length - 1
   const prevTab = isFirst ? null : tabs[currentIndex - 1]
   const nextTab = isLast ? null : tabs[currentIndex + 1]

   return (
      <div className="flex items-center justify-between pt-8 mt-8 border-t border-gray-100">
         {/* Previous Button */}
         <div>
            {prevTab ? (
               <Button
                  variant="outline"
                  onClick={() => onNavigate(prevTab.value)}
                  className="gap-2 text-gray-600 border-gray-200 hover:bg-gray-50"
               >
                  <span className="hidden sm:inline">Previous:</span>
                  <span>{prevTab.label}</span>
               </Button>
            ) : (
               <div /> // Spacer
            )}
         </div>

         {/* Next / Save Button */}
         <div>
            {isLast && showSaveOnLast && onSave ? (
               <Button
                  onClick={onSave}
                  disabled={isSaving}
                  className="gap-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
               >
                  {isSaving ? 'Saving...' : 'Save & Publish'}
               </Button>
            ) : nextTab ? (
               <Button
                  onClick={() => onNavigate(nextTab.value)}
                  className="gap-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
               >
                  <span className="hidden sm:inline">Next:</span>
                  <span>{nextTab.label}</span>
               </Button>
            ) : null}
         </div>
      </div>
   )
}
