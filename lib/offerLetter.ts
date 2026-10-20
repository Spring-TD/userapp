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

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null
}

function pickPdfFromOfferLike(source: Record<string, unknown> | null | undefined): {
  pdfUrl?: string
  pdfFileName?: string
} {
  if (!source) return {}
  const pdfUrl = String(
    source.pdfUrl || source.documentUrl || source.url || source.fileUrl || "",
  ).trim()
  const pdfFileName = String(
    source.pdfFileName || source.documentFileName || source.fileName || source.name || "",
  ).trim()
  return {
    pdfUrl: pdfUrl || undefined,
    pdfFileName: pdfFileName || undefined,
  }
}

export function extractOfferLetterFromRecord(
  raw: Record<string, unknown> | null | undefined,
): OfferLetterPayload | null {
  if (!raw || typeof raw !== "object") return null

  const application = asRecord(raw.application)
  const topOfferLetter = asRecord(raw.offerLetter)
  const nestedOfferLetter = asRecord(application?.offerLetter)
  const fromOffer = topOfferLetter || nestedOfferLetter

  const topPaf = asRecord(raw.postApprovalFulfillment)
  const nestedPaf = asRecord(application?.postApprovalFulfillment)
  const paf = topPaf || nestedPaf
  const contract = asRecord(paf?.contract)
  const offer = asRecord(paf?.offer)

  const fromOfferPdf = pickPdfFromOfferLike(fromOffer)
  const fromContractPdf = pickPdfFromOfferLike(contract)
  const fromPafOfferPdf = pickPdfFromOfferLike(offer)

  const pdfUrl = fromOfferPdf.pdfUrl || fromContractPdf.pdfUrl || fromPafOfferPdf.pdfUrl
  const pdfFileName =
    fromOfferPdf.pdfFileName || fromContractPdf.pdfFileName || fromPafOfferPdf.pdfFileName

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
