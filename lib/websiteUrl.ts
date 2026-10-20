/** Default prefix for website/URL inputs. Always prefill and avoid double prefix. */
export const WEBSITE_URL_PREFIX = "https://";

export function ensureWebsiteUrlPrefix(url: string): string {
  const trimmed = (url || "").trim();
  if (!trimmed) return WEBSITE_URL_PREFIX;
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("https://")) return trimmed;
  if (lower.startsWith("http://")) return "https://" + trimmed.slice(7);
  return WEBSITE_URL_PREFIX + trimmed;
}

export function normalizeWebsiteUrlForSubmit(url: string): string {
  const trimmed = (url || "").trim();
  if (!trimmed || trimmed === WEBSITE_URL_PREFIX) return trimmed;
  return ensureWebsiteUrlPrefix(trimmed);
}
