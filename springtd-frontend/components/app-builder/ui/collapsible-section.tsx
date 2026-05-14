"use client"

import React, { useState } from 'react'
import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
   Tooltip,
   TooltipContent,
   TooltipProvider,
   TooltipTrigger,
} from "@/components/ui/tooltip"

interface CollapsibleSectionProps {
   title: string
   children: React.ReactNode
   defaultOpen?: boolean
   onReset?: () => void
   badge?: string | number
   icon?: React.ReactNode
}

export function CollapsibleSection({
   title,
   children,
   defaultOpen = true,
   onReset,
   badge,
   icon
}: CollapsibleSectionProps) {
   const [isOpen, setIsOpen] = useState(defaultOpen)

   return (
      <TooltipProvider>
         <div className="border border-gray-100 rounded-xl overflow-hidden bg-white">
            {/* Header */}
            <button
               onClick={() => setIsOpen(!isOpen)}
               className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
               <div className="flex items-center gap-3">
                  {icon && (
                     <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-[#7C3AED]">
                        {icon}
                     </div>
                  )}
                  <span className="font-medium text-gray-800">{title}</span>
                  {badge !== undefined && (
                     <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-[#7C3AED] rounded-full">
                        {badge}
                     </span>
                  )}
               </div>

               <div className="flex items-center gap-2">
                  {onReset && isOpen && (
                     <Tooltip>
                        <TooltipTrigger asChild>
                           <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-400 hover:text-gray-600"
                              onClick={(e) => {
                                 e.stopPropagation()
                                 onReset()
                              }}
                           >
                              <RotateCcw className="w-4 h-4" />
                           </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Reset to Default</p></TooltipContent>
                     </Tooltip>
                  )}
                  <div className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                     <ChevronDown className="w-5 h-5" />
                  </div>
               </div>
            </button>

            {/* Content */}
            <div 
               className={`transition-all duration-300 ease-in-out overflow-hidden ${
                  isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
               }`}
            >
               <div className="px-4 pb-4 pt-0 space-y-4 border-t border-gray-50">
                  {children}
               </div>
            </div>
         </div>
      </TooltipProvider>
   )
}

// Simpler variant without border
export function CollapsibleGroup({
   title,
   children,
   defaultOpen = true,
}: {
   title: string
   children: React.ReactNode
   defaultOpen?: boolean
}) {
   const [isOpen, setIsOpen] = useState(defaultOpen)

   return (
      <div className="space-y-3">
         <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center justify-between w-full group"
         >
            <h4 className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
               {title}
            </h4>
            <div className={`text-gray-400 transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`}>
               <ChevronDown className="w-4 h-4" />
            </div>
         </button>
         
         <div 
            className={`transition-all duration-200 ease-in-out overflow-hidden ${
               isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
            }`}
         >
            <div className="space-y-3">
               {children}
            </div>
         </div>
      </div>
   )
}
