import { sanitizeHtml, sanitizeText, sanitizeUrl } from "@/lib/sanitize"
import type { ManifestDocument, ManifestFaqItem, ManifestSupport, WebAppManifestBranding } from "@/lib/webAppManifest"

export function manifestDocumentHtml(document?: ManifestDocument | null): string {
  const raw = document?.contentHtml || document?.contentText || ""
  if (!raw.trim()) return ""
  return document?.contentHtml ? sanitizeHtml(raw) : sanitizeText(raw).replace(/\n/g, "<br>")
}

export function manifestDocumentTitle(document: ManifestDocument | undefined | null, fallback: string): string {
  return document?.title?.trim() || fallback
}

export function manifestFaqItems(manifest: WebAppManifestBranding | null): ManifestFaqItem[] {
  return manifest?.policyTerms?.faq?.filter((item) => item.questionHtml || item.answerHtml) ?? []
}

export function supportFromManifest(manifest: WebAppManifestBranding | null): ManifestSupport {
  return manifest?.support ?? {}
}

export function externalUrl(value?: string): string {
  return value ? sanitizeUrl(value) : ""
}

export function mailto(email?: string): string {
  const clean = sanitizeText(email || "")
  return clean ? `mailto:${clean}` : ""
}

export function tel(phone?: string): string {
  const clean = sanitizeText(phone || "")
  return clean ? `tel:${clean.replace(/\s+/g, "")}` : ""
}

export function whatsappUrl(value?: string): string {
  const clean = sanitizeText(value || "")
  if (!clean) return ""
  if (/^https?:\/\//i.test(clean)) return sanitizeUrl(clean)
  const digits = clean.replace(/[^\d]/g, "")
  return digits ? `https://wa.me/${digits}` : ""
}

export function htmlToPlainText(html?: string): string {
  return sanitizeText(String(html || "").replace(/<[^>]+>/g, " "))
}
