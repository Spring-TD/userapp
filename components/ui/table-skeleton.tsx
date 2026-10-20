"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface TableSkeletonProps {
  /** Number of columns (table header + each row) */
  columnCount?: number
  /** Number of body rows to show */
  rowCount?: number
  /** Use grid layout instead of table (e.g. for merchant apps grid) */
  variant?: "table" | "grid"
  /** Grid template columns (e.g. "1.5fr 1.5fr 1fr 1fr 1fr 0.8fr") for variant="grid" */
  gridCols?: string
  className?: string
}

const defaultCols = 6
const defaultRows = 5

export function TableSkeleton({
  columnCount = defaultCols,
  rowCount = defaultRows,
  variant = "table",
  gridCols,
  className,
}: TableSkeletonProps) {
  if (variant === "grid") {
    return (
      <div className={cn("rounded-xl border border-gray-200 overflow-hidden bg-white", className)}>
        <div
          className="grid gap-4 p-4 bg-[#F3F4F6] text-xs font-semibold text-gray-600 border-b border-gray-100"
          style={{ gridTemplateColumns: gridCols || `repeat(${columnCount}, 1fr)` }}
        >
          {Array.from({ length: columnCount }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full max-w-[80px]" />
          ))}
        </div>
        <div className="divide-y divide-gray-100">
          {Array.from({ length: rowCount }).map((_, rowIndex) => (
            <div
              key={rowIndex}
              className="grid gap-4 p-5 items-center"
              style={{ gridTemplateColumns: gridCols || `repeat(${columnCount}, 1fr)` }}
            >
              {Array.from({ length: columnCount }).map((_, colIndex) => (
                <Skeleton
                  key={colIndex}
                  className={cn(
                    "h-4",
                    colIndex === 0 ? "max-w-[140px]" : "max-w-[100px]"
                  )}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("rounded-lg border border-gray-200 overflow-hidden bg-white", className)}>
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {Array.from({ length: columnCount }).map((_, i) => (
              <th key={i} className="text-left py-3 px-4">
                <Skeleton className="h-4 w-24" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {Array.from({ length: rowCount }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: columnCount }).map((_, colIndex) => (
                <td key={colIndex} className="py-3 px-4">
                  <Skeleton
                    className={cn(
                      "h-4",
                      colIndex === 0 ? "w-32" : "w-24"
                    )}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
