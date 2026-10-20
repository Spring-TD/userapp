const OBJECT_ID_RE = /^[a-f0-9]{24}$/i

/**
 * Normalizes a product id from URL params or API fields.
 * Strips accidental path/query suffixes such as `id/?subdomain=crbc`.
 */
export function sanitizeProductId(raw: string | null | undefined): string {
  const trimmed = String(raw ?? '').trim()
  if (!trimmed) return ''

  const head = trimmed.split(/[/?#]/)[0]?.trim() ?? ''
  if (OBJECT_ID_RE.test(head)) return head

  const embedded = head.match(/[a-f0-9]{24}/i)
  return embedded?.[0] ?? head
}
