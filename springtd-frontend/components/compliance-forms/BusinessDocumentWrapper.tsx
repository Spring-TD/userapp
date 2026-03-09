"use client"
import type React from "react"
import { useState } from "react"
import BusinessDocument from "./BusinessDocument"
import BusinessDocumentWithError from "../forms/BusinessDocumentError"

interface Props {
  onContinue?: () => void
}

const BusinessDocumentWrapper: React.FC<Props> = ({ onContinue }) => {
  const [errorState, setErrorState] = useState<{ enabled: boolean; missingIds: string[] }>({
    enabled: false,
    missingIds: [],
  })

  const handleContinue = (missingIds?: string[]) => {
    // Only switch to error view if there are actually missing IDs
    if (missingIds && missingIds.length > 0) {
      setErrorState({ enabled: true, missingIds })
    } else if (onContinue) {
      // No missing IDs means success - call parent's onContinue
      onContinue()
    }
  }

  return (
    <>
      {!errorState.enabled ? (
        <BusinessDocument onContinue={handleContinue} />
      ) : (
        <BusinessDocumentWithError missingIds={errorState.missingIds} />
      )}
    </>
  )
}

export default BusinessDocumentWrapper
