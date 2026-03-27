"use client"

import React from 'react'
import { Check, Circle } from 'lucide-react'
import {
   Tooltip,
   TooltipContent,
   TooltipProvider,
   TooltipTrigger,
} from "@/components/ui/tooltip"

export interface TabInfo {
   value: string
   label: string
   isComplete?: boolean
   isRequired?: boolean
}

interface TabProgressProps {
   tabs: TabInfo[]
   activeTab: string
   onTabChange: (value: string) => void
   showProgress?: boolean
}

export function TabProgress({
   tabs,
   activeTab,
   onTabChange,
   showProgress = true
}: TabProgressProps) {
   const completedCount = tabs.filter(t => t.isComplete).length
   const progressPercentage = (completedCount / tabs.length) * 100

   return (
      <TooltipProvider>
         <div className="space-y-4">
            {/* Progress Bar */}
            {showProgress && (
               <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                     <div 
                        className="h-full bg-gradient-to-r from-[#7C3AED] to-[#A78BFA] transition-all duration-500 ease-out rounded-full"
                        style={{ width: `${progressPercentage}%` }}
                     />
                  </div>
                  <span className="text-sm text-gray-500 whitespace-nowrap">
                     {completedCount}/{tabs.length} complete
                  </span>
               </div>
            )}

            {/* Tab List */}
            <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-hide">
               {tabs.map((tab, index) => {
                  const isActive = activeTab === tab.value
                  const isPast = tabs.findIndex(t => t.value === activeTab) > index

                  return (
                     <React.Fragment key={tab.value}>
                        <Tooltip>
                           <TooltipTrigger asChild>
                              <button
                                 onClick={() => onTabChange(tab.value)}
                                 className={`
                                    relative flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all whitespace-nowrap
                                    ${isActive 
                                       ? 'bg-[#7C3AED] text-white shadow-md shadow-purple-200' 
                                       : tab.isComplete
                                          ? 'bg-green-50 text-green-700 hover:bg-green-100'
                                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                    }
                                 `}
                              >
                                 {/* Completion Indicator */}
                                 <span className={`
                                    flex items-center justify-center w-5 h-5 rounded-full text-xs font-medium
                                    ${isActive 
                                       ? 'bg-white/20 text-white' 
                                       : tab.isComplete
                                          ? 'bg-green-500 text-white'
                                          : 'bg-gray-200 text-gray-500'
                                    }
                                 `}>
                                    {tab.isComplete && !isActive ? (
                                       <Check className="w-3 h-3" />
                                    ) : (
                                       index + 1
                                    )}
                                 </span>
                                 
                                 <span className="text-sm font-medium">{tab.label}</span>

                                 {/* Required indicator */}
                                 {tab.isRequired && !tab.isComplete && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                 )}
                              </button>
                           </TooltipTrigger>
                           <TooltipContent>
                              <p>
                                 {tab.isComplete ? '✓ Completed' : tab.isRequired ? 'Required' : 'Optional'}
                              </p>
                           </TooltipContent>
                        </Tooltip>

                        {/* Connector Line */}
                        {index < tabs.length - 1 && (
                           <div className={`w-6 h-0.5 flex-shrink-0 ${
                              isPast || tab.isComplete ? 'bg-green-300' : 'bg-gray-200'
                           }`} />
                        )}
                     </React.Fragment>
                  )
               })}
            </div>
         </div>
      </TooltipProvider>
   )
}

// Simpler underline-style tabs
export function TabList({
   tabs,
   activeTab,
   onTabChange
}: {
   tabs: TabInfo[]
   activeTab: string
   onTabChange: (value: string) => void
}) {
   return (
      <div className="flex items-center gap-6 border-b border-gray-200">
         {tabs.map((tab) => {
            const isActive = activeTab === tab.value

            return (
               <button
                  key={tab.value}
                  onClick={() => onTabChange(tab.value)}
                  className={`
                     relative flex items-center gap-2 pb-3 text-sm font-medium transition-colors
                     ${isActive 
                        ? 'text-[#7C3AED]' 
                        : 'text-gray-500 hover:text-gray-700'
                     }
                  `}
               >
                  {tab.isComplete && (
                     <span className="w-4 h-4 rounded-full bg-green-500 text-white flex items-center justify-center">
                        <Check className="w-3 h-3" />
                     </span>
                  )}
                  {tab.label}
                  
                  {/* Active indicator */}
                  {isActive && (
                     <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7C3AED] rounded-full" />
                  )}
               </button>
            )
         })}
      </div>
   )
}
