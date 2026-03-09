"use client"

import React, { useState, useEffect } from 'react'
import { Check, Copy, RotateCcw, ChevronDown, Palette, Clock } from 'lucide-react'
import {
   Popover,
   PopoverContent,
   PopoverTrigger,
} from "@/components/ui/popover"
import {
   Tooltip,
   TooltipContent,
   TooltipProvider,
   TooltipTrigger,
} from "@/components/ui/tooltip"
import { Button } from '@/components/ui/button'

// Predefined color palettes
const COLOR_PALETTES = {
   brand: {
      name: 'Brand Colors',
      colors: ['#7C3AED', '#2563EB', '#10B981', '#F59E0B', '#EF4444', '#EC4899']
   },
   fintech: {
      name: 'Fintech',
      colors: ['#0052FF', '#00D395', '#1A1A2E', '#16213E', '#0F3460', '#E94560']
   },
   banking: {
      name: 'Banking',
      colors: ['#1E3A8A', '#1D4ED8', '#0EA5E9', '#14B8A6', '#059669', '#047857']
   },
   modern: {
      name: 'Modern',
      colors: ['#8B5CF6', '#EC4899', '#F43F5E', '#F97316', '#EAB308', '#84CC16']
   },
   neutral: {
      name: 'Neutral',
      colors: ['#111827', '#374151', '#6B7280', '#9CA3AF', '#D1D5DB', '#F3F4F6']
   },
   pastel: {
      name: 'Pastel',
      colors: ['#DDD6FE', '#FBCFE8', '#FED7AA', '#FEF08A', '#BBF7D0', '#A5F3FC']
   },
}

interface ColorPickerEnhancedProps {
   label: string
   color: string
   onChange: (color: string) => void
   defaultColor?: string
   showPalettes?: boolean
   showRecent?: boolean
   tooltip?: string
}

// Get recently used colors from localStorage
const getRecentColors = (): string[] => {
   if (typeof window === 'undefined') return []
   try {
      const stored = localStorage.getItem('app-builder-recent-colors')
      return stored ? JSON.parse(stored) : []
   } catch {
      return []
   }
}

// Save to recent colors
const saveRecentColor = (color: string) => {
   if (typeof window === 'undefined') return
   try {
      const recent = getRecentColors()
      const updated = [color, ...recent.filter(c => c !== color)].slice(0, 8)
      localStorage.setItem('app-builder-recent-colors', JSON.stringify(updated))
   } catch {
      // Ignore localStorage errors
   }
}

export function ColorPickerEnhanced({
   label,
   color,
   onChange,
   defaultColor,
   showPalettes = true,
   showRecent = true,
   tooltip
}: ColorPickerEnhancedProps) {
   const [isOpen, setIsOpen] = useState(false)
   const [copied, setCopied] = useState(false)
   const [recentColors, setRecentColors] = useState<string[]>([])
   const [activePalette, setActivePalette] = useState<string>('brand')

   useEffect(() => {
      setRecentColors(getRecentColors())
   }, [isOpen])

   const handleColorChange = (newColor: string) => {
      onChange(newColor)
      saveRecentColor(newColor)
   }

   const copyToClipboard = () => {
      navigator.clipboard.writeText(color)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
   }

   const resetToDefault = () => {
      if (defaultColor) {
         onChange(defaultColor)
      }
   }

   return (
      <TooltipProvider>
         <div className="flex items-center justify-between group">
            <div className="flex items-center gap-2">
               <span className="text-sm text-gray-600">{label}</span>
               {tooltip && (
                  <Tooltip>
                     <TooltipTrigger asChild>
                        <span className="text-gray-400 cursor-help text-xs">ⓘ</span>
                     </TooltipTrigger>
                     <TooltipContent>
                        <p className="max-w-xs text-xs">{tooltip}</p>
                     </TooltipContent>
                  </Tooltip>
               )}
            </div>

            <div className="flex items-center gap-2">
               {/* Color Preview with Native Picker */}
               <Popover open={isOpen} onOpenChange={setIsOpen}>
                  <PopoverTrigger asChild>
                     <button className="flex items-center gap-2 group/btn">
                        <div 
                           className="w-16 h-8 rounded-md border border-gray-200 shadow-sm cursor-pointer hover:ring-2 hover:ring-[#7C3AED]/30 transition-all"
                           style={{ backgroundColor: color }}
                        />
                        <div className="p-1.5 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors">
                           <ChevronDown className="w-4 h-4 text-gray-500" />
                        </div>
                     </button>
                  </PopoverTrigger>

                  <PopoverContent className="w-72 p-4" align="end">
                     <div className="space-y-4">
                        {/* Current Color & Actions */}
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-3">
                              <div 
                                 className="w-10 h-10 rounded-lg border border-gray-200 shadow-sm"
                                 style={{ backgroundColor: color }}
                              />
                              <div>
                                 <p className="text-xs text-gray-500">Current</p>
                                 <p className="text-sm font-mono font-medium text-gray-700">{color.toUpperCase()}</p>
                              </div>
                           </div>
                           
                           <div className="flex items-center gap-1">
                              <Tooltip>
                                 <TooltipTrigger asChild>
                                    <Button
                                       variant="ghost"
                                       size="icon"
                                       className="h-8 w-8"
                                       onClick={copyToClipboard}
                                    >
                                       {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                    </Button>
                                 </TooltipTrigger>
                                 <TooltipContent><p>Copy Hex</p></TooltipContent>
                              </Tooltip>

                              {defaultColor && (
                                 <Tooltip>
                                    <TooltipTrigger asChild>
                                       <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                          onClick={resetToDefault}
                                       >
                                          <RotateCcw className="w-4 h-4" />
                                       </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Reset to Default</p></TooltipContent>
                                 </Tooltip>
                              )}
                           </div>
                        </div>

                        {/* Native Color Input */}
                        <div className="relative">
                           <input
                              type="color"
                              value={color}
                              onChange={(e) => handleColorChange(e.target.value)}
                              className="w-full h-10 rounded-lg cursor-pointer border-0"
                              style={{ padding: 0 }}
                           />
                        </div>

                        {/* Hex Input */}
                        <div className="flex items-center gap-2">
                           <span className="text-sm text-gray-500">#</span>
                           <input
                              type="text"
                              value={color.replace('#', '')}
                              onChange={(e) => {
                                 const val = e.target.value.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6)
                                 if (val.length === 6) {
                                    handleColorChange(`#${val}`)
                                 }
                              }}
                              className="flex-1 px-2 py-1.5 text-sm font-mono border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 uppercase"
                              maxLength={6}
                              placeholder="7C3AED"
                           />
                        </div>

                        {/* Recent Colors */}
                        {showRecent && recentColors.length > 0 && (
                           <div className="space-y-2">
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                 <Clock className="w-3 h-3" />
                                 <span>Recent</span>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                 {recentColors.map((c, i) => (
                                    <button
                                       key={i}
                                       onClick={() => handleColorChange(c)}
                                       className={`w-7 h-7 rounded-md border-2 transition-all hover:scale-110 ${
                                          c === color ? 'border-[#7C3AED] ring-2 ring-[#7C3AED]/30' : 'border-gray-200'
                                       }`}
                                       style={{ backgroundColor: c }}
                                    />
                                 ))}
                              </div>
                           </div>
                        )}

                        {/* Color Palettes */}
                        {showPalettes && (
                           <div className="space-y-2">
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                 <Palette className="w-3 h-3" />
                                 <span>Palettes</span>
                              </div>
                              
                              {/* Palette Tabs */}
                              <div className="flex flex-wrap gap-1 mb-2">
                                 {Object.entries(COLOR_PALETTES).map(([key, palette]) => (
                                    <button
                                       key={key}
                                       onClick={() => setActivePalette(key)}
                                       className={`px-2 py-1 text-xs rounded-md transition-colors ${
                                          activePalette === key
                                             ? 'bg-[#7C3AED] text-white'
                                             : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                       }`}
                                    >
                                       {palette.name}
                                    </button>
                                 ))}
                              </div>

                              {/* Palette Colors */}
                              <div className="flex flex-wrap gap-1.5">
                                 {COLOR_PALETTES[activePalette as keyof typeof COLOR_PALETTES].colors.map((c, i) => (
                                    <button
                                       key={i}
                                       onClick={() => handleColorChange(c)}
                                       className={`w-9 h-9 rounded-md border-2 transition-all hover:scale-110 ${
                                          c === color ? 'border-[#7C3AED] ring-2 ring-[#7C3AED]/30' : 'border-transparent'
                                       }`}
                                       style={{ backgroundColor: c }}
                                    />
                                 ))}
                              </div>
                           </div>
                        )}
                     </div>
                  </PopoverContent>
               </Popover>
            </div>
         </div>
      </TooltipProvider>
   )
}

// Simple inline color picker variant
export function ColorPickerSimple({
   color,
   onChange,
   size = 'md'
}: {
   color: string
   onChange: (color: string) => void
   size?: 'sm' | 'md' | 'lg'
}) {
   const sizeClasses = {
      sm: 'w-6 h-6',
      md: 'w-8 h-8',
      lg: 'w-10 h-10'
   }

   return (
      <div 
         className={`${sizeClasses[size]} rounded-md border border-gray-200 shadow-sm relative overflow-hidden cursor-pointer hover:ring-2 hover:ring-[#7C3AED]/30 transition-all`}
         style={{ backgroundColor: color }}
      >
         <input
            type="color"
            value={color}
            onChange={(e) => {
               onChange(e.target.value)
               saveRecentColor(e.target.value)
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
         />
      </div>
   )
}
