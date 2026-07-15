'use client'

import { Loader2 } from 'lucide-react'
import {
  PepSearchNotice,
  LabeledSelectField,
  YesNoBooleanField,
} from '@/components/mobile-v2/application/ApplicantProfileFields'
import {
  shouldShowPlatformField,
  type PlatformFieldDefinition,
  type PlatformFieldsDraft,
  type PlatformSelectOption,
} from '@/lib/platformApplicationFields'

const BRAND_INK = 'text-[var(--sf-ink,#1E293B)]'

function InputPill({
  placeholder,
  value,
  onChange,
  type = 'text',
  inputMode,
}: {
  placeholder: string
  value: string
  onChange: (value: string) => void
  type?: React.HTMLInputTypeAttribute
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
}) {
  return (
    <label className="flex h-12 items-center justify-between rounded-2xl bg-gray-100 px-4 ring-[var(--sf-button,#1E40AF)]/20 focus-within:ring-2">
      <input
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`min-w-0 flex-1 bg-transparent text-[12px] placeholder:text-gray-400 focus:outline-none ${BRAND_INK}`}
      />
    </label>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className={`pt-2 text-sm font-bold ${BRAND_INK}`}>{children}</h2>
}

function readDraftString(draft: PlatformFieldsDraft, key: string): string {
  const value = draft[key as keyof PlatformFieldsDraft]
  return typeof value === 'string' ? value : ''
}

function readDraftBoolean(draft: PlatformFieldsDraft, key: string): boolean | undefined {
  const value = draft[key as keyof PlatformFieldsDraft]
  return typeof value === 'boolean' ? value : undefined
}

export function PlatformApplicationFieldsForm({
  fields,
  optionsByPath,
  draft,
  onChange,
  loading,
  productKind,
}: {
  fields: PlatformFieldDefinition[]
  optionsByPath: Record<string, PlatformSelectOption[]>
  draft: PlatformFieldsDraft
  onChange: (draft: PlatformFieldsDraft) => void
  loading?: boolean
  productKind: 'loan' | 'mortgage'
}) {
  const updateField = (key: keyof PlatformFieldsDraft, value: string | boolean | undefined) => {
    onChange({ ...draft, [key]: value })
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl bg-gray-50 px-4 py-6 text-xs text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading application questions...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {fields.map((field) => {
        if (!shouldShowPlatformField(field, draft)) return null

        const otherKey = field.otherFieldKey as keyof PlatformFieldsDraft | undefined
        const selectValue = readDraftString(draft, field.key)
        const options = field.optionsPath ? optionsByPath[field.optionsPath] || [] : []

        if (field.type === 'boolean') {
          const boolValue = readDraftBoolean(draft, field.key)
          const label =
            field.key === 'repayingWithSpouse'
              ? productKind === 'loan'
                ? 'Are you repaying this loan with a spouse?'
                : 'Are you repaying this mortgage with a spouse?'
              : field.label

          return (
            <div key={field.key} className="space-y-2">
              <YesNoBooleanField
                label={label}
                value={boolValue}
                onChange={(value) => {
                  const next = { ...draft, [field.key]: value } as PlatformFieldsDraft
                  if (field.key === 'repayingWithSpouse' && value === false) {
                    next.spouseFullName = ''
                    next.spouseEmail = ''
                    next.spousePhone = ''
                    next.spouseOccupation = ''
                    next.spouseCountry = ''
                  }
                  onChange(next)
                }}
              />
              {field.key === 'isPoliticallyExposedPerson' ? (
                <PepSearchNotice isPep={boolValue === true} />
              ) : null}
            </div>
          )
        }

        if (field.type === 'number') {
          return (
            <div key={field.key} className="space-y-3">
              <SectionTitle>{field.label}</SectionTitle>
              <InputPill
                placeholder={field.label}
                value={readDraftString(draft, field.key)}
                onChange={(value) => updateField(field.key as keyof PlatformFieldsDraft, value)}
                type="number"
                inputMode="numeric"
              />
            </div>
          )
        }

        if (field.type === 'select') {
          return (
            <div key={field.key} className="space-y-3">
              <SectionTitle>{field.label}</SectionTitle>
              <LabeledSelectField
                placeholder={`Select ${field.label.toLowerCase()}`}
                value={selectValue}
                onChange={(value) => {
                  onChange({
                    ...draft,
                    [field.key]: value,
                    ...(otherKey ? { [otherKey]: '' } : {}),
                  } as PlatformFieldsDraft)
                }}
                options={options}
              />
              {otherKey && selectValue === 'other' ? (
                <InputPill
                  placeholder={field.otherFieldLabel || 'Please specify'}
                  value={readDraftString(draft, otherKey)}
                  onChange={(value) => updateField(otherKey, value)}
                />
              ) : null}
            </div>
          )
        }

        return (
          <div key={field.key} className="space-y-3">
            <SectionTitle>{field.label}</SectionTitle>
            <InputPill
              placeholder={field.label}
              value={readDraftString(draft, field.key)}
              onChange={(value) => updateField(field.key as keyof PlatformFieldsDraft, value)}
              type={field.key.toLowerCase().includes('email') ? 'email' : field.key.toLowerCase().includes('phone') ? 'tel' : 'text'}
            />
          </div>
        )
      })}
    </div>
  )
}
