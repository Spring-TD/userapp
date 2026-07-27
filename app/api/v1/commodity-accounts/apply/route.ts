import https from "node:https"

import axios from "axios"
import { NextRequest, NextResponse } from "next/server"

import { getApiBaseUrl } from "@/lib/apiBaseUrl"
import {
  attachPlatformFieldsToApplyBody,
  baselinePlatformFieldsForEnrollment,
  type PlatformFields,
} from "@/lib/platformApplicationFields"
import { resolveBearerAuth } from "@/lib/server/accountMsProductAccountsProxy"
import { forwardStorefrontHeaders } from "@/lib/server/forwardStorefrontHeaders"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const UPSTREAM_TIMEOUT_MS = 60_000

/** Force IPv4 — Node fetch to fly.dev often fails with "fetch failed" on IPv6. */
const httpsAgent = new https.Agent({
  family: 4,
  keepAlive: true,
})

function readPep(row: Record<string, unknown>): boolean | undefined {
  if (typeof row.isPoliticallyExposedPerson === "boolean") return row.isPoliticallyExposedPerson
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

function normalizeCommodityApplyBody(
  raw: Record<string, unknown>,
): { ok: true; body: Record<string, unknown> } | { ok: false; error: string } {
  const pep = readPep(raw)
  if (pep === undefined) {
    return {
      ok: false,
      error:
        'isPoliticallyExposedPerson is required — set true or false for "Are you a Politically Exposed Person?"',
    }
  }

  const fields = baselinePlatformFieldsForEnrollment(pep, {
    ...(typeof raw.monthlyIncome === "number" ? { monthlyIncome: raw.monthlyIncome } : {}),
    ...(typeof raw.repaymentSource === "string" ? { repaymentSource: raw.repaymentSource } : {}),
    ...(typeof raw.maritalStatus === "string" ? { maritalStatus: raw.maritalStatus } : {}),
    ...(raw.platformFields && typeof raw.platformFields === "object"
      ? (raw.platformFields as PlatformFields)
      : {}),
  })

  const base: Record<string, unknown> = {
    userId: raw.userId,
    productId: raw.productId,
    currency: raw.currency || "NGN",
    quantity: raw.quantity,
    ...(raw.email ? { email: raw.email } : {}),
    ...(raw.applicantName ? { applicantName: raw.applicantName } : {}),
    ...(raw.phone ? { phone: raw.phone } : {}),
    ...(raw.bvn ? { bvn: raw.bvn } : {}),
    ...(raw.merchantId ? { merchantId: raw.merchantId } : {}),
    ...(raw.appId ? { appId: raw.appId } : {}),
    ...(raw.country ? { country: raw.country } : {}),
    ...(Array.isArray(raw.requirementSubmissions)
      ? { requirementSubmissions: raw.requirementSubmissions }
      : {}),
  }

  const withPlatform = attachPlatformFieldsToApplyBody(base, fields)
  withPlatform.application = { ...fields }
  return { ok: true, body: withPlatform }
}

/** POST /api/v1/commodity-accounts/apply */
export async function POST(request: NextRequest) {
  const auth = resolveBearerAuth(request)
  if (!auth) {
    return NextResponse.json(
      { success: false, error: "Unauthorized — sign in again to continue." },
      { status: 401 },
    )
  }

  let raw: Record<string, unknown>
  try {
    raw = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 })
  }

  const normalized = normalizeCommodityApplyBody(raw)
  if (!normalized.ok) {
    return NextResponse.json({ success: false, error: normalized.error }, { status: 400 })
  }

  const url = `${getApiBaseUrl().replace(/\/+$/, "")}/api/v1/commodity-accounts/apply`
  const payload = JSON.stringify(normalized.body)

  if (process.env.NODE_ENV === "development") {
    console.log("[commodity-accounts-apply] → upstream", {
      url,
      bytes: payload.length,
      hasPep: typeof normalized.body.isPoliticallyExposedPerson === "boolean",
      pep: normalized.body.isPoliticallyExposedPerson,
      keys: Object.keys(normalized.body),
    })
  }

  try {
    const response = await axios.request({
      url,
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: auth,
        ...forwardStorefrontHeaders(request),
      },
      data: payload,
      httpsAgent,
      timeout: UPSTREAM_TIMEOUT_MS,
      validateStatus: () => true,
      maxRedirects: 0,
      transformRequest: [(body) => body],
    })

    const data = response.data ?? { success: false, error: "Empty upstream response" }
    if (process.env.NODE_ENV === "development" && response.status >= 400) {
      const row = data as Record<string, unknown>
      console.log("[commodity-accounts-apply] ← upstream", {
        status: response.status,
        error: row?.error ?? row?.message,
      })
    }
    return NextResponse.json(data, { status: response.status || 502 })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Commodity purchase failed"
    console.error("[commodity-accounts-apply] FAILED", msg)
    return NextResponse.json({ success: false, error: msg }, { status: 502 })
  }
}
