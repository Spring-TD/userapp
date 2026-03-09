"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

export interface ShareholderRow {
  name: string
  email: string
  phone: string
  date: string
  kyc: string
  status: "Successful" | "Failed" | "Pending"
}

interface ComplianceFormContextType {
  businessFiles: Record<string, File>
  setBusinessFile: (key: string, file: File | null) => void
  shareholders: ShareholderRow[]
  setShareholders: (shareholders: ShareholderRow[]) => void
  addShareholder: (shareholder: ShareholderRow) => void
  shareholderDrawerOpen: boolean
  setShareholderDrawerOpen: (open: boolean) => void
}

const ComplianceFormContext = createContext<ComplianceFormContextType | undefined>(undefined)

export function ComplianceFormProvider({ children }: { children: ReactNode }) {
  const [businessFiles, setBusinessFiles] = useState<Record<string, File>>({})
  const [shareholders, setShareholders] = useState<ShareholderRow[]>([])
  const [shareholderDrawerOpen, setShareholderDrawerOpen] = useState(false)

  const setBusinessFile = (key: string, file: File | null) => {
    setBusinessFiles((prev) => {
      if (file === null) {
        const { [key]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [key]: file }
    })
  }

  const addShareholder = (shareholder: ShareholderRow) => {
    setShareholders((prev) => [...prev, shareholder])
  }

  return (
    <ComplianceFormContext.Provider
      value={{
        businessFiles,
        setBusinessFile,
        shareholders,
        setShareholders,
        addShareholder,
        shareholderDrawerOpen,
        setShareholderDrawerOpen,
      }}
    >
      {children}
    </ComplianceFormContext.Provider>
  )
}

export function useComplianceForm() {
  const context = useContext(ComplianceFormContext)
  if (context === undefined) {
    throw new Error("useComplianceForm must be used within a ComplianceFormProvider")
  }
  return context
}
