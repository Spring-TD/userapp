"use client"

import * as React from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

/** Default tooltip styling: white background, shadow, black text. Use this to wrap elements that need a hover tooltip. */
const DEFAULT_CONTENT_CLASS =
  "bg-white text-black shadow-lg border border-gray-200 rounded-md px-3 py-2 text-sm"

interface DefaultTooltipProps {
  content: React.ReactNode
  children: React.ReactElement
  side?: "top" | "right" | "bottom" | "left"
  sideOffset?: number
  contentClassName?: string
}

/**
 * Default tooltip component. Wrap any element that should show a tooltip on hover.
 * When the wrapped element is not rendered (e.g. compliance complete and you render a Link instead),
 * the tooltip is not used and won't show.
 */
export function DefaultTooltip({
  content,
  children,
  side = "right",
  sideOffset = 8,
  contentClassName,
}: DefaultTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side={side}
        sideOffset={sideOffset}
        className={cn(DEFAULT_CONTENT_CLASS, "max-w-[220px]", contentClassName)}
      >
        {content}
      </TooltipContent>
    </Tooltip>
  )
}

