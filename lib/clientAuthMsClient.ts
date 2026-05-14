/**
 * Browser / server helpers for the allowlisted **client-auth-ms** BFF proxy
 * (`/api/v1/client-ms/*` → `NEXT_PUBLIC_API_URL` + `/api/v1/*`).
 *
 * Prefer these paths over calling `NEXT_PUBLIC_API_URL` from the browser (avoids CORS).
 */
import { ENDPOINTS } from "@/lib/endpoints"

const jsonHeaders: HeadersInit = { Accept: "application/json", "Content-Type": "application/json" }

function withCredentials(init?: RequestInit): RequestInit {
  return { ...init, credentials: "include" }
}

function bearerHeaders(token?: string | null): HeadersInit {
  if (!token) return jsonHeaders
  return { ...jsonHeaders, Authorization: token.startsWith("Bearer") ? token : `Bearer ${token}` }
}

/** GET /api/v1/registration/forms */
export async function fetchRegistrationForms(init?: RequestInit) {
  const res = await fetch(`/api${ENDPOINTS.clientMs.registrationForms}`, withCredentials(init))
  return res
}

/** GET published FAQs — optional `q`, `includeUnpublished` (merchant/admin). */
export async function fetchFaqsList(search?: URLSearchParams, init?: RequestInit) {
  const q = search?.toString() ? `?${search.toString()}` : ""
  const res = await fetch(`/api${ENDPOINTS.clientMs.faqs}${q}`, withCredentials(init))
  return res
}

/** GET /api/v1/faqs/:id */
export async function fetchFaqById(id: string, init?: RequestInit) {
  const res = await fetch(`/api${ENDPOINTS.clientMs.faqById(id)}`, withCredentials(init))
  return res
}

/** GET support contacts list. */
export async function fetchSupportContactsList(search?: URLSearchParams, init?: RequestInit) {
  const q = search?.toString() ? `?${search.toString()}` : ""
  const res = await fetch(`/api${ENDPOINTS.clientMs.supportContacts}${q}`, withCredentials(init))
  return res
}

export async function fetchSupportContactById(id: string, init?: RequestInit) {
  const res = await fetch(`/api${ENDPOINTS.clientMs.supportContactById(id)}`, withCredentials(init))
  return res
}

/** GET legal documents — optional `document_type`, `q`, `includeUnpublished`. */
export async function fetchLegalDocumentsList(search?: URLSearchParams, init?: RequestInit) {
  const q = search?.toString() ? `?${search.toString()}` : ""
  const res = await fetch(`/api${ENDPOINTS.clientMs.legalDocuments}${q}`, withCredentials(init))
  return res
}

export async function fetchLegalDocumentById(id: string, init?: RequestInit) {
  const res = await fetch(`/api${ENDPOINTS.clientMs.legalDocumentById(id)}`, withCredentials(init))
  return res
}

/** GET invitation validate (public). */
export async function fetchInvitationValidate(token: string, init?: RequestInit) {
  const res = await fetch(`/api${ENDPOINTS.clientMs.invitationValidate(token)}`, withCredentials(init))
  return res
}

/** POST invitation accept (public). */
export async function postInvitationAccept(body: unknown, init?: RequestInit) {
  return fetch(`/api${ENDPOINTS.clientMs.invitationAccept}`, {
    ...withCredentials(init),
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(body),
  })
}

/** GET sessions (Bearer). */
export async function fetchSessions(accessToken?: string | null, init?: RequestInit) {
  return fetch(`/api${ENDPOINTS.clientMs.sessions}`, {
    ...withCredentials(init),
    headers: bearerHeaders(accessToken ?? undefined),
  })
}

/** DELETE session (Bearer). */
export async function deleteSession(sessionId: string, accessToken?: string | null, init?: RequestInit) {
  return fetch(`/api${ENDPOINTS.clientMs.sessionRevoke(sessionId)}`, {
    ...withCredentials(init),
    method: "DELETE",
    headers: bearerHeaders(accessToken ?? undefined),
  })
}

/** GET /api/v1/roles (Bearer). */
export async function fetchRoles(accessToken?: string | null, init?: RequestInit) {
  return fetch(`/api${ENDPOINTS.clientMs.roles}`, {
    ...withCredentials(init),
    headers: bearerHeaders(accessToken ?? undefined),
  })
}

export async function fetchRolePermissions(accessToken?: string | null, init?: RequestInit) {
  return fetch(`/api${ENDPOINTS.clientMs.rolesPermissions}`, {
    ...withCredentials(init),
    headers: bearerHeaders(accessToken ?? undefined),
  })
}
