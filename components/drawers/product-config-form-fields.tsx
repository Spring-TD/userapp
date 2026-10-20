"use client"

import type { ChangeEvent } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

interface ProductConfigTabsProps {
  steps: string[]
  activeStep: number
  onStepChange: (step: number) => void
}

export function ProductConfigTabs({ steps, activeStep, onStepChange }: ProductConfigTabsProps) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-5 border-b border-gray-200">
      {steps.map((step, index) => {
        const current = index + 1
        const isActive = current === activeStep
        return (
          <button
            key={step}
            type="button"
            onClick={() => onStepChange(current)}
            className={cn(
              "border-b-2 pb-2 text-sm font-medium transition-colors",
              isActive ? "border-[#9A813F] text-[#9A813F]" : "border-transparent text-gray-600 hover:text-gray-900",
            )}
          >
            {step}
          </button>
        )
      })}
    </div>
  )
}

interface ProductConfigInputProps {
  label: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
  type?: "text" | "number"
  numericOnly?: boolean
  disabled?: boolean
}

export function ProductConfigInput({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
  numericOnly = false,
  disabled = false,
}: ProductConfigInputProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!numericOnly) {
      onChange(event.target.value)
      return
    }
    const cleaned = event.target.value.replace(/[^0-9.,]/g, "")
    onChange(cleaned)
  }

  return (
    <div className="space-y-2">
      {label ? <label className="block text-sm font-medium text-gray-700">{label}</label> : null}
      <input
        type={type}
        value={value}
        onChange={handleChange}
        inputMode={numericOnly ? "decimal" : undefined}
        disabled={disabled}
        placeholder={placeholder}
        className="h-10 w-full rounded-md border border-[#e5e7eb] bg-white px-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-[#9A813F] focus:ring-2 focus:ring-[#9A813F]/20 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
      />
    </div>
  )
}

interface ProductConfigSelectProps {
  label: string
  placeholder: string
  value: string
  options: string[]
  onChange: (value: string) => void
}

export function ProductConfigSelect({
  label,
  placeholder,
  value,
  options,
  onChange,
}: ProductConfigSelectProps) {
  return (
    <div className="space-y-2">
      {label ? <label className="block text-sm font-medium text-gray-700">{label}</label> : null}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          className="h-10 data-[size=default]:h-10 w-full rounded-md border border-[#e5e7eb] bg-white px-3 py-0 text-sm outline-none transition focus:border-[#9A813F] focus:ring-2 focus:ring-[#9A813F]/20 shadow-none"
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="py-4">
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

interface ProductConfigToggleProps {
  id: string
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

export function ProductConfigToggle({ id, label, checked, onChange }: ProductConfigToggleProps) {
  return (
    <div className="flex items-center gap-3">
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        className="h-5 w-9 shrink-0 data-[state=checked]:bg-[#9A813F] data-[state=unchecked]:bg-slate-200"
      />
      <label htmlFor={id} className="cursor-pointer text-sm leading-snug text-gray-700">
        {label}
      </label>
    </div>
  )
}

/** Default sequences for loan / mortgage Structure step (stored value uses `->`). */
export const DEFAULT_REPAYMENT_WORKFLOWS = [
  "Principal -> Interest -> Charges",
  "Charges -> Principal -> Interest",
  "Interest -> Charges -> Principal",
] as const

function formatWorkflowLabel(workflow: string) {
  return workflow.replace(/->/g, " → ")
}

export interface ProductConfigRepaymentWorkflowPanelProps {
  workflows?: readonly string[]
  selectedWorkflow: string
  onSelectWorkflow: (workflow: string) => void
  minAmount: string
  maxAmount: string
  onMinAmountChange: (value: string) => void
  onMaxAmountChange: (value: string) => void
  /** Right column title (default: Loan Amount) */
  amountLabel?: string
  minPlaceholder?: string
  maxPlaceholder?: string
}

/**
 * Single container: left = repayment options as mutually exclusive switches; right = min/max amount.
 * Use on loan & mortgage configure drawers (and any future product with the same pattern).
 */
export function ProductConfigRepaymentWorkflowPanel({
  workflows = [...DEFAULT_REPAYMENT_WORKFLOWS],
  selectedWorkflow,
  onSelectWorkflow,
  minAmount,
  maxAmount,
  onMinAmountChange,
  onMaxAmountChange,
  amountLabel = "Loan Amount",
  minPlaceholder = "Min Amount",
  maxPlaceholder = "Max Amount",
}: ProductConfigRepaymentWorkflowPanelProps) {
  const list = workflows.length ? workflows : [...DEFAULT_REPAYMENT_WORKFLOWS]

  const handleSwitchChange = (workflow: string, checked: boolean) => {
    if (checked) {
      onSelectWorkflow(workflow)
      return
    }
    if (selectedWorkflow !== workflow) return
    const other = list.find((w) => w !== workflow)
    if (other) onSelectWorkflow(other)
  }

  return (
    <div className="rounded-xl bg-white ">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-4 sm:items-start">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-800">Repayment Workflow</h3>
          <div className="flex flex-col gap-3">
            {list.map((wf) => {
              const id = `repayment-workflow-${wf.replace(/\s/g, "-")}`
              return (
                <div key={wf} className="flex items-center gap-3">
                  <Switch
                    id={id}
                    checked={selectedWorkflow === wf}
                    onCheckedChange={(on) => handleSwitchChange(wf, on)}
                    className="h-5 w-9 shrink-0 data-[state=checked]:bg-[#9A813F] data-[state=unchecked]:bg-slate-200"
                  />
                  <label htmlFor={id} className="cursor-pointer text-sm leading-snug text-slate-700">
                    {formatWorkflowLabel(wf)}
                  </label>
                </div>
              )
            })}
          </div>
        </div>
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-800">{amountLabel}</h3>
          <div className="space-y-2">
            <ProductConfigInput label="" placeholder={minPlaceholder} value={minAmount} onChange={onMinAmountChange} numericOnly />
            <ProductConfigInput label="" placeholder={maxPlaceholder} value={maxAmount} onChange={onMaxAmountChange} numericOnly />
          </div>
        </div>
      </div>
    </div>
  )
}

export { ProductConfigAboutStep, type ProductAboutTypeRow } from "./product-config-about-step"
