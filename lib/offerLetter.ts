/**
 * Shared offer letter fields returned on applications / pending-approved detail.
 */

export type OfferLetterPayload = {
  html?: string
  text?: string
  reference?: string
  offerValidUntil?: string
  pdfUrl?: string
  pdfFileName?: string
  signedPdfUrl?: string
  signedPdfFileName?: string
}

export function extractOfferLetterFromRecord(
  raw: Record<string, unknown> | null | undefined,
): OfferLetterPayload | null {
  if (!raw || typeof raw !== "object") return null

  const offerLetter = raw.offerLetter
  const fromOffer =
    offerLetter && typeof offerLetter === "object" ? (offerLetter as Record<string, unknown>) : null

  const paf = raw.postApprovalFulfillment
  const contract =
    paf && typeof paf === "object"
      ? ((paf as Record<string, unknown>).contract as Record<string, unknown> | undefined)
      : undefined

  const pdfUrl = String(fromOffer?.pdfUrl || contract?.documentUrl || "").trim()
  const pdfFileName = String(fromOffer?.pdfFileName || contract?.documentFileName || "").trim()

  if (!pdfUrl && !fromOffer) return null

  return {
    pdfUrl: pdfUrl || undefined,
    pdfFileName: pdfFileName || undefined,
    html: typeof fromOffer?.html === "string" ? fromOffer.html : undefined,
    text: typeof fromOffer?.text === "string" ? fromOffer.text : undefined,
    reference: typeof fromOffer?.reference === "string" ? fromOffer.reference : undefined,
    offerValidUntil:
      typeof fromOffer?.offerValidUntil === "string" ? fromOffer.offerValidUntil : undefined,
    signedPdfUrl: typeof fromOffer?.signedPdfUrl === "string" ? fromOffer.signedPdfUrl : undefined,
    signedPdfFileName:
      typeof fromOffer?.signedPdfFileName === "string" ? fromOffer.signedPdfFileName : undefined,
  }
}
