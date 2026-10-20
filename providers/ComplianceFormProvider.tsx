"use client"

import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from "react"
import { WEBSITE_URL_PREFIX } from "@/lib/websiteUrl"

export interface ShareholderRow {
  name: string
  email: string
  phone: string
  date: string
  kyc: string
  status: "Successful" | "Failed" | "Pending"
}


export interface MerchantBusinessSurveyState {
  businessType: string
  userBase: string
  businessModel: string
  monthlyVolume: string
  industry: string
  country: string
  businessName: string
  website: string
  companyRegId: string
}

export function createDefaultMerchantBusinessSurvey(): MerchantBusinessSurveyState {
  return {
    businessType: "",
    userBase: "",
    businessModel: "",
    monthlyVolume: "",
    industry: "",
    country: "",
    businessName: "",
    website: WEBSITE_URL_PREFIX,
    companyRegId: "",
  }
}

interface ComplianceFormContextType {
  businessFiles: Record<string, File>
  setBusinessFile: (key: string, file: File | null) => void
  shareholders: ShareholderRow[]
  setShareholders: (shareholders: ShareholderRow[]) => void
  addShareholder: (shareholder: ShareholderRow) => void
  shareholderDrawerOpen: boolean
  setShareholderDrawerOpen: (open: boolean) => void
  merchantBusinessSurvey: MerchantBusinessSurveyState
  setMerchantBusinessSurvey: Dispatch<SetStateAction<MerchantBusinessSurveyState>>
}

const ComplianceFormContext = createContext<ComplianceFormContextType | undefined>(undefined)

export function ComplianceFormProvider({ children }: { children: ReactNode }) {
  const [businessFiles, setBusinessFiles] = useState<Record<string, File>>({})
  const [shareholders, setShareholders] = useState<ShareholderRow[]>([])
  const [shareholderDrawerOpen, setShareholderDrawerOpen] = useState(false)
  const [merchantBusinessSurvey, setMerchantBusinessSurvey] = useState<MerchantBusinessSurveyState>(() =>
    createDefaultMerchantBusinessSurvey(),
  )

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
        merchantBusinessSurvey,
        setMerchantBusinessSurvey,
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
