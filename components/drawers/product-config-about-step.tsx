"use client"

import { useEffect, useRef, useState, type ChangeEvent } from "react"
import { Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ProductConfigInput, ProductConfigSelect } from "@/components/drawers/product-config-form-fields"

/** One row in the “add name + description” list (loan type, savings type, commodity type, etc.) */
export interface ProductAboutTypeRow {
  name: string
  description: string
}

export interface ProductConfigAboutStepProps {
  /** Prefix for React keys (unique per drawer) */
  idPrefix?: string

  nameLabel: string
  name: string
  onNameChange: (value: string) => void
  namePlaceholder?: string

  durationLabel: string
  durationValue: string
  durationOptions: string[]
  onDurationChange: (value: string) => void
  durationPlaceholder?: string

  description: string
  onDescriptionChange: (value: string) => void
  descriptionLabel?: string
  descriptionPlaceholder?: string
  descriptionRows?: number

  /** e.g. Loan Type, Savings Type, Commodity Type */
  typeSectionLabel: string
  typeNameDraft: string
  typeDescDraft: string
  onTypeNameDraftChange: (value: string) => void
  onTypeDescDraftChange: (value: string) => void
  onAddType: () => void
  typeRows: ProductAboutTypeRow[]

  /**
   * How added rows render:
   * - `split`: two grey cells (name | description) — default, matches most mocks
   * - `stacked`: single card with title + subtitle (legacy loan layout)
   */
  typeListVariant?: "split" | "stacked"
  addMoreLabel?: string

  previewFile: File | null
  onPreviewFileChange: (file: File | null) => void
  showPreviewThumbnail?: boolean
  /** Outer preview container border */
  previewOuterStyle?: "dashed" | "solid"

  accentColor?: string
  className?: string
}

const TEXTAREA_CLASS =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-[#9A813F] focus:ring-2 focus:ring-[#9A813F]/20"

/**
 * Shared **About Product** step for all product configure drawers.
 * Same layout everywhere; labels/options/lists are driven by props per product type.
 */
export function ProductConfigAboutStep({
  idPrefix = "about",
  nameLabel,
  name,
  onNameChange,
  namePlaceholder = "Enter Name",
  durationLabel,
  durationValue,
  durationOptions,
  onDurationChange,
  durationPlaceholder = "Select",
  description,
  onDescriptionChange,
  descriptionLabel = "Product Description",
  descriptionPlaceholder = "Enter Description",
  descriptionRows = 4,
  typeSectionLabel,
  typeNameDraft,
  typeDescDraft,
  onTypeNameDraftChange,
  onTypeDescDraftChange,
  onAddType,
  typeRows,
  typeListVariant = "split",
  addMoreLabel = "Add More",
  previewFile,
  onPreviewFileChange,
  showPreviewThumbnail = true,
  previewOuterStyle = "dashed",
  accentColor = "#9A813F",
  className = "",
}: ProductConfigAboutStepProps) {
  const previewInputRef = useRef<HTMLInputElement>(null)
  const [thumbUrl, setThumbUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!previewFile) {
      setThumbUrl(null)
      return undefined
    }
    const url = URL.createObjectURL(previewFile)
    setThumbUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [previewFile])

  const handlePreviewInput = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    onPreviewFileChange(f)
    e.target.value = ""
  }

  const outerPreviewClass =
    previewOuterStyle === "solid"
      ? "rounded-md border border-[#e5e7eb] p-3"
      : "rounded-md border border-dashed border-[#cdbf8b] p-3"

  return (
    <div className={`space-y-4 ${className}`.trim()}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ProductConfigInput label={nameLabel} placeholder={namePlaceholder} value={name} onChange={onNameChange} />
        <ProductConfigSelect
          label={durationLabel}
          placeholder={durationPlaceholder}
          value={durationValue}
          options={durationOptions}
          onChange={onDurationChange}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">{descriptionLabel}</label>
        <textarea
          value={description}
          onChange={(ev) => onDescriptionChange(ev.target.value)}
          placeholder={descriptionPlaceholder}
          rows={descriptionRows}
          className={TEXTAREA_CLASS}
        />
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">{typeSectionLabel}</label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <ProductConfigInput label="" placeholder="Enter Name" value={typeNameDraft} onChange={onTypeNameDraftChange} />
          <ProductConfigInput label="" placeholder="Enter Description" value={typeDescDraft} onChange={onTypeDescDraftChange} />
          <Button
            type="button"
            onClick={onAddType}
            className="h-10 self-end text-white hover:opacity-95"
            style={{ backgroundColor: accentColor }}
          >
            Add
          </Button>
        </div>

        {typeRows.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600">{addMoreLabel}</p>
            <div className="space-y-2">
              {typeRows.map((row, index) =>
                typeListVariant === "stacked" ? (
                  <div
                    key={`${idPrefix}-type-${row.name}-${index}`}
                    className="rounded-md bg-gray-100 px-3 py-2 text-sm"
                  >
                    <p className="font-medium text-gray-800">{row.name}</p>
                    <p className="text-xs text-gray-600">{row.description}</p>
                  </div>
                ) : (
                  <div
                    key={`${idPrefix}-type-${row.name}-${index}`}
                    className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2"
                  >
                    <div className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-800">{row.name}</div>
                    <div className="rounded-md bg-gray-100 px-3 py-2 text-xs text-gray-600 sm:text-sm">{row.description}</div>
                  </div>
                ),
              )}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Preview Image</label>
        <div className={`flex flex-col gap-3 sm:flex-row sm:items-stretch ${outerPreviewClass}`}>
          <div className="flex flex-1 flex-col justify-center gap-2 rounded-md border border-gray-200 p-3 sm:flex-row sm:items-center">
            <Upload className="shrink-0 text-gray-500" size={18} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-700">{previewFile?.name || "Add image"}</p>
              <p className="text-xs text-gray-500">PDF format • Max. 5MB</p>
            </div>
            <input ref={previewInputRef} type="file" accept=".pdf,image/*" className="hidden" onChange={handlePreviewInput} />
            <Button
              type="button"
              onClick={() => previewInputRef.current?.click()}
              className="h-10 shrink-0 text-white hover:opacity-95"
              style={{ backgroundColor: accentColor }}
            >
              Upload
            </Button>
          </div>
          {showPreviewThumbnail ? (
            <div className="mx-auto flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-gray-50 sm:mx-0">
              {thumbUrl && previewFile?.type.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="px-1 text-center text-[10px] text-gray-400">Preview</span>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
