/**
 * Maps axios / fetch errors from client-auth-ms (and our Next proxy) into user-facing strings.
 */

type ErrShape = {
  response?: { data?: unknown; status?: number }
  message?: string
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v != null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

function pushMsg(messages: string[], value: unknown) {
  if (value == null) return
  if (typeof value === "string") {
    const t = value.trim()
    if (t) messages.push(t)
    return
  }
  if (typeof value === "number" || typeof value === "boolean") {
    messages.push(String(value))
  }
}

function collectFromErrorList(messages: string[], list: unknown) {
  if (!Array.isArray(list)) return
  for (const item of list) {
    if (typeof item === "string") {
      pushMsg(messages, item)
      continue
    }
    const row = asRecord(item)
    if (!row) continue
    const field = row.field ?? row.path ?? row.param ?? row.property
    const text = row.msg ?? row.message ?? row.error ?? row.detail
    if (field && text) {
      pushMsg(messages, `${String(field)}: ${String(text)}`)
    } else {
      pushMsg(messages, text ?? row.msg ?? row.message)
    }
  }
}

function collectFromDetails(messages: string[], details: unknown) {
  if (typeof details === "string") {
    pushMsg(messages, details)
    return
  }
  if (Array.isArray(details)) {
    for (const d of details) pushMsg(messages, typeof d === "string" ? d : JSON.stringify(d))
    return
  }
  const obj = asRecord(details)
  if (!obj) return
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === "string") pushMsg(messages, `${key}: ${val}`)
    else if (Array.isArray(val)) pushMsg(messages, `${key}: ${val.map(String).join(", ")}`)
    else if (val && typeof val === "object") pushMsg(messages, `${key}: ${JSON.stringify(val)}`)
  }
}

function collectMessages(data: Record<string, unknown>): string[] {
  const messages: string[] = []

  collectFromDetails(messages, data.details)
  collectFromErrorList(messages, data.errors)
  collectFromErrorList(messages, data.validationErrors)

  const validation = asRecord(data.validation)
  if (validation) {
    for (const [key, val] of Object.entries(validation)) {
      if (typeof val === "string") pushMsg(messages, `${key}: ${val}`)
      else if (Array.isArray(val)) pushMsg(messages, `${key}: ${val.map(String).join(", ")}`)
    }
  }

  const nested = asRecord(data.error)
  if (nested) {
    collectFromDetails(messages, nested.details)
    collectFromErrorList(messages, nested.errors)
    pushMsg(messages, nested.message)
  } else {
    pushMsg(messages, data.error)
  }

  if (data.message != null) {
    if (Array.isArray(data.message)) {
      for (const m of data.message) pushMsg(messages, m)
    } else {
      pushMsg(messages, data.message)
    }
  }

  return [...new Set(messages.filter(Boolean))]
}

/** Map backend validation keys to signup form field names. */
export function fieldErrorsFromApiPayload(data: unknown): Record<string, string> | null {
  const root = asRecord(data)
  if (!root) return null

  const out: Record<string, string> = {}
  const assign = (apiKey: string, formKey: string, text: string) => {
    const t = text.trim()
    if (t) out[formKey] = t
  }

  const absorb = (key: string, text: string) => {
    const k = key.toLowerCase().replace(/\s+/g, "_")
    if (k.includes("first")) assign(key, "first_name", text)
    else if (k.includes("last")) assign(key, "last_name", text)
    else if (k.includes("email")) assign(key, "email", text)
    else if (k.includes("phone")) assign(key, "phone", text)
    else if (k.includes("country")) assign(key, "country", text)
    else if (k.includes("password")) assign(key, "password", text)
    else if (k.includes("subdomain") || k.includes("merchant") || k.includes("tenant")) {
      assign(key, "user_merchant_id", text)
    }
  }

  const details = root.details
  const detailsObj = asRecord(details)
  if (detailsObj) {
    for (const [key, val] of Object.entries(detailsObj)) {
      if (typeof val === "string") absorb(key, val)
    }
  }

  const lists = [root.errors, root.validationErrors]
  for (const list of lists) {
    if (!Array.isArray(list)) continue
    for (const item of list) {
      if (typeof item === "string") continue
      const row = asRecord(item)
      if (!row) continue
      const field = String(row.field ?? row.path ?? row.param ?? row.property ?? "")
      const text = String(row.msg ?? row.message ?? row.error ?? "")
      if (field && text) absorb(field, text)
    }
  }

  return Object.keys(out).length ? out : null
}

export function clientAuthErrorFromAxios(error: unknown): {
  message: string
  fieldErrors: Record<string, string> | null
} {
  const err = error as ErrShape
  const data = err.response?.data
  return {
    message: normalizeClientAuthError(error),
    fieldErrors: fieldErrorsFromApiPayload(data),
  }
}

/** Proxy may return HTTP 200 with `{ success: false }` — treat as failure for thunks. */
export function clientAuthErrorFromResponse(
  data: unknown,
  status: number,
): { message: string; fieldErrors: Record<string, string> | null } | null {
  const root = asRecord(data)
  if (!root) return status >= 400 ? clientAuthErrorFromAxios({ response: { data, status } }) : null
  if (root.success === false || status >= 400) {
    return clientAuthErrorFromAxios({ response: { data, status: status >= 400 ? status : 400 } })
  }
  if (typeof root.error === "string" && root.error.trim() && !root.data && !root.user) {
    return clientAuthErrorFromAxios({ response: { data, status: 400 } })
  }
  return null
}

export function isRegistrationSuccess(data: unknown, status: number): boolean {
  if (status >= 400) return false
  const root = asRecord(data)
  if (!root) return status === 201 || (status >= 200 && status < 300)
  if (root.success === false) return false
  if (typeof root.error === "string" && root.error.trim() && !root.user) return false
  const user = asRecord(root.user)
  if (user?.id || user?.email) return true
  if (root.userId || root.id) return true
  if (root.success === true && status < 400) return true
  return status === 201
}

export function normalizeClientAuthError(error: unknown): string {
  const err = error as ErrShape
  const data = asRecord(err.response?.data)
  const status = err.response?.status

  if (status === 429) {
    return "Too many attempts. Please wait a moment and try again."
  }
  if (status === 503 || status === 502 || status === 504) {
    return "Service is temporarily unavailable. Please try again shortly."
  }
  if (status === 404) {
    return "This action is not available right now. Please try again later."
  }

  if (data) {
    const messages = collectMessages(data)
    const specific = messages.filter(
      (m) => m.toLowerCase() !== "validation failed" && m.toLowerCase() !== "validation error",
    )
    if (specific.length) return specific.join(" ")
    if (messages.length) return messages.join(" ")
  }

  if (!err.response) {
    return err.message || "Network error. Check your connection and try again."
  }

  if (status === 400) {
    return "Please check the highlighted fields and try again."
  }
  if (status === 401) {
    return "Invalid email or password."
  }
  if (status === 403) {
    return "You do not have permission to perform this action."
  }
  if (status === 409) {
    return "An account with this email already exists. Try signing in instead."
  }

  return "Something went wrong. Please try again."
}
