import axiosDefault from "axios"
import type { IndividualKycRequest, BusinessKycRequest } from "@/app/types/kyc"
import { getAccessToken } from "@/lib/cookieAuth"

// dedicated client for compliance service
const kycApi = axiosDefault.create({
  baseURL: (process.env.NEXT_PUBLIC_API_URL || "https://account-ms.fly.dev") + "/api/v1",
  withCredentials: false,
})

// attach token from cookie/localStorage (client-side only)
try {
  if (typeof window !== "undefined") {
    kycApi.interceptors.request.use((config) => {
      const t = getAccessToken()
      if (t) {
        config.headers = config.headers || {}
        config.headers.Authorization = `Bearer ${t}`
      }
      return config
    })
  }
} catch (e) {
  // ignore in non-browser environments
}

function authHeader(token?: string) {
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function submitIndividualKyc(payload: IndividualKycRequest, token?: string) {
  const res = await kycApi.post("/kyc/individual/submit", payload, { headers: authHeader(token) })
  return res.data
}

export async function submitBusinessKyc(payload: BusinessKycRequest, token?: string) {
  const res = await kycApi.post("/kyc/business/submit", payload, { headers: authHeader(token) })
  return res.data
}

export async function getKycStatus(userId: string, token?: string) {
  const res = await kycApi.get(`/kyc/status/${userId}`, { headers: authHeader(token) })
  return res.data
}

export async function getAllKycUsers(token?: string) {
  const res = await kycApi.get("/kyc/admin/users", { headers: authHeader(token) })
  return res.data
}

export async function getAllKycDocuments(token?: string) {
  const res = await kycApi.get("/kyc/admin/documents", { headers: authHeader(token) })
  return res.data
}

// --- Helpers for shareholder APIs aligned with compliance-ms ---
function tokenOrLocal(token?: string): string | null {
  if (token) return token
  if (typeof window !== "undefined") return getAccessToken()
  return null
}

function decodeUserIdFromToken(t: string | null): string | null {
  try {
    if (!t) return null
    const [, payload] = t.split(".")
    if (!payload) return null
    const decoded = JSON.parse(
      typeof atob === "function" ? atob(payload) : Buffer.from(payload, "base64").toString("utf8"),
    )
    return decoded?.userId || decoded?.sub || decoded?.id || decoded?._id || null
  } catch {
    return null
  }
}

function extractDocMeta(docs: any[] = [], typeKey: string) {
  const d = docs.find((x) => x?.type === typeKey)
  if (!d) return undefined
  return {
    fileName: d.fileName || `${typeKey}.pdf`,
    fileType: d.fileType || "application/pdf",
    fileSize: d.fileSize || 0,
    fileUrl: d.fileUrl || `https://files.local/${encodeURIComponent(d.fileName || typeKey)}`,
    uploadDate: new Date().toISOString(),
  }
}

// Create a shareholder for the current merchant using compliance-ms route
export async function createShareholder(payload: any, token?: string) {
  const t = tokenOrLocal(token)
  if (!t) throw new Error("Missing access token. Please log in before submitting KYC.")

  const merchantId = decodeUserIdFromToken(t)
  if (!merchantId) throw new Error("Unable to resolve merchant ID from token")

  const beneficialOwner = payload?.beneficialOwner || {}
  const documents = payload?.documents || []

  // Map provided docs into expected fields
  const uboDocument = extractDocMeta(documents, "ubo")
  const bankStatement = extractDocMeta(documents, "bank_statement")

  const body = {
    fullName: beneficialOwner.fullName || "",
    email: beneficialOwner.email || "",
    phoneNumber: beneficialOwner.phone || beneficialOwner.phoneNumber || "",
    bvn: beneficialOwner.bvn || "",
    bankAccount: beneficialOwner.bankAccount || "",
    ownershipPercentage: beneficialOwner.ownershipPercentage || 0,
    submittedAt: new Date().toISOString(),
    uboDocument,
    bankStatement,
  }

  const res = await kycApi.post(`/kyc/business/${merchantId}/shareholders/create`, body, { headers: authHeader(t) })
  return res.data
}

// Fetch shareholders for current merchant using compliance-ms route
export async function getShareholders(token?: string) {
  const t = tokenOrLocal(token)
  const merchantId = decodeUserIdFromToken(t || null)
  if (!merchantId) return []

  try {
    const res = await kycApi.get(`/kyc/business/${merchantId}/shareholders`, { headers: authHeader(t || undefined) })
    // Controller returns { success, data: { merchantId, shareholders: [] } }
    const arr = res?.data?.data?.shareholders || []
    return Array.isArray(arr) ? arr : []
  } catch (e) {
    // Fall back to empty array if mocked endpoint returns nothing
    return []
  }
}
