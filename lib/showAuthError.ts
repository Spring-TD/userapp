import { toast } from "sonner"

/** User-visible auth error — toast + non-empty string for inline banners. */
export function showAuthError(message: string | null | undefined): string {
  const text = (message ?? "").trim() || "Something went wrong. Please try again."
  toast.error(text, { duration: 6000 })
  return text
}
