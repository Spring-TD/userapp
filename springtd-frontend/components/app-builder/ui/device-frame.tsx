"use client"

import React, { useState } from 'react'
import { 
   Smartphone, 
   Monitor, 
   ZoomIn, 
   ZoomOut, 
   RotateCcw,
   Maximize2,
   Sun,
   Moon,
   ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
   Tooltip,
   TooltipContent,
   TooltipProvider,
   TooltipTrigger,
} from "@/components/ui/tooltip"

interface DeviceFrameProps {
   children: React.ReactNode
   title?: string
   showControls?: boolean
   defaultZoom?: number
   onOpenFullPreview?: () => void
}

type DeviceType = 'iphone' | 'android' | 'tablet'

const deviceConfigs = {
   iphone: { width: 375, height: 812, name: 'iPhone 14', notch: true },
   android: { width: 360, height: 800, name: 'Pixel 7', notch: false },
   tablet: { width: 768, height: 1024, name: 'iPad Mini', notch: false },
}

export function DeviceFrame({ 
   children, 
   title = "Mobile Preview",
   showControls = true,
   defaultZoom = 0.85,
   onOpenFullPreview
}: DeviceFrameProps) {
   const [zoom, setZoom] = useState(defaultZoom)
   const [device, setDevice] = useState<DeviceType>('iphone')
   const [darkMode, setDarkMode] = useState(false)
   const [isLandscape, setIsLandscape] = useState(false)

   const config = deviceConfigs[device]
   const displayWidth = isLandscape ? config.height : config.width
   const displayHeight = isLandscape ? config.width : config.height

   const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 1.2))
   const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5))
   const handleResetZoom = () => setZoom(defaultZoom)
   const toggleOrientation = () => setIsLandscape(prev => !prev)

   return (
      <TooltipProvider>
         <div className="flex flex-col items-center gap-4">
            {/* Title & Controls */}
            <div className="flex items-center justify-between w-full max-w-md">
               <h3 className="text-lg font-semibold text-gray-700">{title}</h3>
               
               {showControls && (
                  <div className="flex items-center gap-1">
                     {/* Device Selector */}
                     <div className="flex items-center bg-gray-100 rounded-lg p-1 mr-2">
                        <Tooltip>
                           <TooltipTrigger asChild>
                              <button
                                 onClick={() => setDevice('iphone')}
                                 className={`p-1.5 rounded-md transition-colors ${
                                    device === 'iphone' 
                                       ? 'bg-white shadow-sm text-[#7C3AED]' 
                                       : 'text-gray-500 hover:text-gray-700'
                                 }`}
                              >
                                 <Smartphone className="w-4 h-4" />
                              </button>
                           </TooltipTrigger>
                           <TooltipContent><p>iPhone</p></TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                           <TooltipTrigger asChild>
                              <button
                                 onClick={() => setDevice('android')}
                                 className={`p-1.5 rounded-md transition-colors ${
                                    device === 'android' 
                                       ? 'bg-white shadow-sm text-[#7C3AED]' 
                                       : 'text-gray-500 hover:text-gray-700'
                                 }`}
                              >
                                 <Smartphone className="w-4 h-4" strokeWidth={1.5} />
                              </button>
                           </TooltipTrigger>
                           <TooltipContent><p>Android</p></TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                           <TooltipTrigger asChild>
                              <button
                                 onClick={() => setDevice('tablet')}
                                 className={`p-1.5 rounded-md transition-colors ${
                                    device === 'tablet' 
                                       ? 'bg-white shadow-sm text-[#7C3AED]' 
                                       : 'text-gray-500 hover:text-gray-700'
                                 }`}
                              >
                                 <Monitor className="w-4 h-4" />
                              </button>
                           </TooltipTrigger>
                           <TooltipContent><p>Tablet</p></TooltipContent>
                        </Tooltip>
                     </div>

                     {/* Zoom Controls */}
                     <Tooltip>
                        <TooltipTrigger asChild>
                           <button
                              onClick={handleZoomOut}
                              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                           >
                              <ZoomOut className="w-4 h-4" />
                           </button>
                        </TooltipTrigger>
                        <TooltipContent><p>Zoom Out</p></TooltipContent>
                     </Tooltip>

                     <span className="text-xs text-gray-500 w-10 text-center">
                        {Math.round(zoom * 100)}%
                     </span>

                     <Tooltip>
                        <TooltipTrigger asChild>
                           <button
                              onClick={handleZoomIn}
                              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                           >
                              <ZoomIn className="w-4 h-4" />
                           </button>
                        </TooltipTrigger>
                        <TooltipContent><p>Zoom In</p></TooltipContent>
                     </Tooltip>

                     <Tooltip>
                        <TooltipTrigger asChild>
                           <button
                              onClick={handleResetZoom}
                              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                           >
                              <RotateCcw className="w-4 h-4" />
                           </button>
                        </TooltipTrigger>
                        <TooltipContent><p>Reset Zoom</p></TooltipContent>
                     </Tooltip>

                     <div className="w-px h-5 bg-gray-200 mx-1" />

                     {/* Orientation Toggle */}
                     <Tooltip>
                        <TooltipTrigger asChild>
                           <button
                              onClick={toggleOrientation}
                              className={`p-1.5 rounded-md transition-colors ${
                                 isLandscape 
                                    ? 'text-[#7C3AED] bg-purple-50' 
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                              }`}
                           >
                              <Maximize2 className={`w-4 h-4 transition-transform ${isLandscape ? 'rotate-45' : ''}`} />
                           </button>
                        </TooltipTrigger>
                        <TooltipContent><p>{isLandscape ? 'Portrait' : 'Landscape'}</p></TooltipContent>
                     </Tooltip>

                     {/* Dark Mode Toggle */}
                     <Tooltip>
                        <TooltipTrigger asChild>
                           <button
                              onClick={() => setDarkMode(!darkMode)}
                              className={`p-1.5 rounded-md transition-colors ${
                                 darkMode 
                                    ? 'text-[#7C3AED] bg-purple-50' 
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                              }`}
                           >
                              {darkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                           </button>
                        </TooltipTrigger>
                        <TooltipContent><p>{darkMode ? 'Light Mode' : 'Dark Mode'}</p></TooltipContent>
                     </Tooltip>

                     {/* Open Full Preview */}
                     {onOpenFullPreview && (
                        <Tooltip>
                           <TooltipTrigger asChild>
                              <button
                                 onClick={onOpenFullPreview}
                                 className="p-1.5 text-gray-500 hover:text-[#7C3AED] hover:bg-purple-50 rounded-md transition-colors ml-1"
                              >
                                 <ExternalLink className="w-4 h-4" />
                              </button>
                           </TooltipTrigger>
                           <TooltipContent><p>Open Full Preview</p></TooltipContent>
                        </Tooltip>
                     )}
                  </div>
               )}
            </div>

            {/* Device Info */}
            <p className="text-xs text-gray-400">
               {config.name} • {displayWidth}×{displayHeight}
            </p>

            {/* Device Frame */}
            <div 
               className="transition-all duration-300 ease-out"
               style={{ 
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top center'
               }}
            >
               <div 
                  className={`
                     relative rounded-[3rem] p-3 shadow-2xl transition-colors duration-300
                     ${darkMode ? 'bg-gray-900' : 'bg-gray-800'}
                  `}
                  style={{
                     width: displayWidth + 24,
                     height: displayHeight + 24,
                  }}
               >
                  {/* Notch (iPhone style) */}
                  {config.notch && !isLandscape && (
                     <div className="absolute top-3 left-1/2 -translate-x-1/2 w-32 h-7 bg-black rounded-b-2xl z-20" />
                  )}
                  
                  {/* Status Bar */}
                  <div className={`
                     absolute top-6 left-8 right-8 flex justify-between items-center px-4 z-10
                     ${darkMode ? 'text-white' : 'text-gray-900'}
                  `}>
                     <span className="text-xs font-medium">9:41</span>
                     <div className="flex items-center gap-1">
                        <div className="flex gap-0.5">
                           <div className="w-1 h-2 bg-current rounded-sm opacity-40" />
                           <div className="w-1 h-3 bg-current rounded-sm opacity-60" />
                           <div className="w-1 h-4 bg-current rounded-sm opacity-80" />
                           <div className="w-1 h-4 bg-current rounded-sm" />
                        </div>
                        <div className="w-6 h-3 border border-current rounded-sm ml-1">
                           <div className="w-4 h-full bg-current rounded-sm" />
                        </div>
                     </div>
                  </div>

                  {/* Screen Content */}
                  <div 
                     className={`
                        w-full h-full rounded-[2.5rem] overflow-hidden
                        ${darkMode ? 'bg-gray-950' : 'bg-white'}
                     `}
                  >
                     {children}
                  </div>

                  {/* Home Indicator */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-32 h-1 bg-gray-600 rounded-full" />
               </div>
            </div>
         </div>
      </TooltipProvider>
   )
}
