import https from "node:https"

import axios, { type AxiosRequestConfig, isAxiosError } from "axios"
import { NextRequest, NextResponse } from "next/server"

import { getApiBaseUrl } from "@/lib/apiBaseUrl"
import {
  attachPlatformFieldsToApplyBody,
  baselinePlatformFieldsForEnrollment,
  type PlatformFields,
} from "@/lib/platformApplicationFields"
import { forwardStorefrontHeaders } from "@/lib/server/forwardStorefrontHeaders"

const UPSTREAM_TIMEOUT_MS = 60_000
const UPSTREAM_RETRIES = 2

const httpsAgent = new https.Agent({
  family: 4,
  keepAlive: true,
})

function isRetryableNetworkError(e: unknown): boolean {
  if (!isAxiosError(e)) return false
  const code = e.code
  return (
    code === "ETIMEDOUT" ||
    code === "ECONNABORTED" ||
    code === "ECONNRESET" ||
    code === "ECONNREFUSED" ||
    code === "EHOSTUNREACH" ||
    code === "ENETUNREACH"
  )
}

/** Resolve Bearer from Authorization header or accessToken cookie (same as applications/wallets). */
export function resolveBearerAuth(request: NextRequest): string | null {
  const cookieAccessToken = request.cookies.get("accessToken")?.value
  const auth =
    request.headers.get("authorization") ||
    request.headers.get("Authorization") ||
    (cookieAccessToken ? `Bearer ${cookieAccessToken}` : null)
  if (!auth) return null
  return auth.startsWith("Bearer ") ? auth : `Bearer ${auth}`
}

function buildHeaders(request: NextRequest): Record<string, string> {
  const out: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...forwardStorefrontHeaders(request),
  }
  const auth = resolveBearerAuth(request)
  if (auth) out.Authorization = auth
  return out
}

function readPep(row: Record<string, unknown>): boolean | undefined {
  if (typeof row.isPoliticallyExposedPerson === "boolean") {
    return row.isPoliticallyExposedPerson
  }
  const nested =
    row.platformFields && typeof row.platformFields === "object" && !Array.isArray(row.platformFields)
      ? (row.platformFields as Record<string, unknown>)
      : null
  if (typeof nested?.isPoliticallyExposedPerson === "boolean") {
    return nested.isPoliticallyExposedPerson
  }
  const meta =
    row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : null
  const metaFields =
    meta?.platformFields &&
    typeof meta.platformFields === "object" &&
    !Array.isArray(meta.platformFields)
      ? (meta.platformFields as Record<string, unknown>)
      : null
  if (typeof metaFields?.isPoliticallyExposedPerson === "boolean") {
    return metaFields.isPoliticallyExposedPerson
  }
  return undefined
}

function collectPlatformOverrides(row: Record<string, unknown>): PlatformFields {
  const nested =
    row.platformFields && typeof row.platformFields === "object" && !Array.isArray(row.platformFields)
      ? (row.platformFields as PlatformFields)
      : {}
  const meta =
    row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : null
  const metaFields =
    meta?.platformFields &&
    typeof meta.platformFields === "object" &&
    !Array.isArray(meta.platformFields)
      ? (meta.platformFields as PlatformFields)
      : {}
  const top: PlatformFields = {}
  if (typeof row.monthlyIncome === "number") top.monthlyIncome = row.monthlyIncome
  if (typeof row.repaymentSource === "string") top.repaymentSource = row.repaymentSource
  if (typeof row.maritalStatus === "string") top.maritalStatus = row.maritalStatus
  if (typeof row.repaymentSourceOther === "string") top.repaymentSourceOther = row.repaymentSourceOther
  if (typeof row.maritalStatusOther === "string") top.maritalStatusOther = row.maritalStatusOther
  return { ...metaFields, ...nested, ...top }
}

/** Normalize platform fields onto top-level + platformFields + metadata.platformFields. */
function normalizeApplyBody(data: unknown): unknown {
  if (!data || typeof data !== "object" || Array.isArray(data)) return data
  const row = { ...(data as Record<string, unknown>) }
  const pep = readPep(row)
  if (pep === undefined) return row
  const fields = baselinePlatformFieldsForEnrollment(pep, collectPlatformOverrides(row))
  return attachPlatformFieldsToApplyBody(row, fields)
}

/**
 * Proxy `/api/v1/savings-accounts/*`, `/api/v1/investment-accounts/*`,
 * and `/api/v1/commodity-accounts/*` through account-ms.
 */
export async function proxyAccountMsProductAccountsRequest(
  request: NextRequest,
  pathSegments: string[],
  logTag = "product-accounts",
): Promise<NextResponse> {
  const pathKey = pathSegments.map((s) => encodeURIComponent(s)).join("/")
  const base = getApiBaseUrl().replace(/\/+$/, "")
  const url = `${base}/api/v1/${pathKey}${request.nextUrl.search || ""}`
  const method = request.method.toUpperCase()
  const headers = buildHeaders(request)

  if (!headers.Authorization) {
    return NextResponse.json(
      { success: false, error: "Unauthorized — sign in again to continue." },
      { status: 401 },
    )
  }

  if (process.env.NODE_ENV === "development") {
    console.log(`[${logTag} proxy] → upstream`, {
      method,
      url,
      hasAuth: Boolean(headers.Authorization),
      tenantAppId: headers["x-tenant-app-id"] || null,
      tenantMerchantId: headers["x-tenant-merchant-id"] || null,
    })
  }

  /** Send a JSON string so axios cannot re-shape / drop platform fields. */
  let data: string | undefined
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const raw = await request.text()
    let parsed: unknown = {}
    if (raw.trim()) {
      try {
        parsed = JSON.parse(raw) as unknown
      } catch {
        return NextResponse.json(
          { success: false, error: "Invalid JSON body." },
          { status: 400 },
        )
      }
    }
    const normalized = normalizeApplyBody(parsed)
    data = JSON.stringify(normalized ?? {})
    if (process.env.NODE_ENV === "development" && normalized && typeof normalized === "object") {
      const row = normalized as Record<string, unknown>
      console.log(`[${logTag} proxy] body keys`, {
        keys: Object.keys(row),
        hasPep: typeof row.isPoliticallyExposedPerson === "boolean",
        pep: row.isPoliticallyExposedPerson,
        hasMetadataPlatformFields: Boolean(
          row.metadata &&
            typeof row.metadata === "object" &&
            (row.metadata as Record<string, unknown>).platformFields,
        ),
      })
    }
  }

  let lastError: unknown

  for (let attempt = 0; attempt <= UPSTREAM_RETRIES; attempt++) {
    const config: AxiosRequestConfig = {
      url,
      method,
      headers,
      data,
      httpsAgent,
      timeout: UPSTREAM_TIMEOUT_MS,
      validateStatus: () => true,
      maxRedirects: 0,
      // Body is already a JSON string — do not transform again.
      transformRequest: [(body) => body],
    }

    try {
      const res = await axios.request(config)
      if (process.env.NODE_ENV === "development" && res.status >= 400) {
        const row = res.data as Record<string, unknown> | null
        console.log(`[${logTag} proxy] ← upstream`, {
          status: res.status,
          error: row?.error ?? row?.message,
        })
      }
      return NextResponse.json(res.data ?? { success: false, error: "Empty upstream response" }, {
        status: res.status || 502,
      })
    } catch (e) {
      lastError = e
      if (!isRetryableNetworkError(e) || attempt >= UPSTREAM_RETRIES) break
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)))
    }
  }

  const timeout = isRetryableNetworkError(lastError)
  const msg = lastError instanceof Error ? lastError.message : "Upstream request failed"
  console.error(`[${logTag} proxy] FAILED`, { url, message: msg })
  return NextResponse.json(
    {
      success: false,
      error: timeout
        ? `Could not reach the account service (timed out after ${UPSTREAM_TIMEOUT_MS}ms). Try again.`
        : msg,
    },
    { status: timeout ? 504 : 502 },
  )
}
