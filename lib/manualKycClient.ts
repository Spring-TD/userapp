import { fetchWithAuth } from "@/lib/fetchWithAuth"

export type ManualKycStatus = {
  enabled: boolean
  complete: boolean
  status?: string
  fuspayAvailable?: boolean
  manualKyc?: {
    source?: string
    active?: boolean
    bvn?: string
    bvnNormalized?: string
    nin?: string
    ninNormalized?: string
    phone?: string
    email?: string
    phoneVerified?: boolean
    emailVerified?: boolean
    submittedAt?: string
    completedAt?: string
  }
}

export type ManualKycPayload = {
  bvn: string
  nin: string
  phone: string
  email: string
  phoneVerified: boolean
  emailVerified: boolean
}

type ManualKycEnvelope<T> = {
  success?: boolean
  message?: string
  data?: T
  error?: string
}

async function parseManualKycResponse<T>(res: Response, fallback: string): Promise<T> {
  const json = (await res.json().catch(() => ({}))) as ManualKycEnvelope<T>
  if (!res.ok || json.success === false) {
    throw new Error(json.error || json.message || fallback)
  }
  return json.data as T
}

export async function getManualKycStatus(): Promise<ManualKycStatus> {
  const res = await fetchWithAuth("/api/v1/kyc/manual/individual", {
    method: "GET",
  })
  return parseManualKycResponse<ManualKycStatus>(res, "KYC status failed")
}

export async function submitManualKyc(payload: ManualKycPayload) {
  const res = await fetchWithAuth("/api/v1/kyc/manual/individual", {
    method: "POST",
    body: JSON.stringify(payload),
  })
  return parseManualKycResponse<{
    status?: string
    manualKyc?: ManualKycStatus["manualKyc"]
    nubanProvision?: { success?: boolean; skipped?: boolean }
  }>(res, "KYC submit failed")
}

export function isManualKycComplete(status?: ManualKycStatus | null): boolean {
  return Boolean(status?.complete || status?.manualKyc?.active)
}
