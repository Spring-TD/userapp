import { apiClient } from "@/lib/api"

export type MortgageWorkflowApiProgress = {
  offerAcceptedAt?: string
  offerDeclinedAt?: string
  inspectionBookedAt?: string
  inspectionCompletedAt?: string
  inspectionDeclined?: boolean
  downPaymentMadeAt?: string
  contractSignedAt?: string
}

type ApiEnvelope = {
  success?: boolean
  error?: string
  message?: string
  data?: unknown
}

function parseApiError(data: unknown, status: number): string {
  if (data && typeof data === "object") {
    const d = data as ApiEnvelope
    if (d.error) return d.error
    if (d.message) return d.message
  }
  return status >= 500 ? "Server error" : "Request failed"
}

export async function patchMortgageWorkflowProgress(
  applicationId: string,
  progress: MortgageWorkflowApiProgress,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!applicationId) return { ok: false, error: "Missing application id" }

  try {
    const res = await apiClient.patch<ApiEnvelope>(
      `/v1/products/applications/${encodeURIComponent(applicationId)}/loan-workflow`,
      {
        loanDisbursement: {
          mortgageWorkflow: progress,
        },
      },
      { includeAuth: true, timeout: 30_000 },
    )

    const data = res.data
    if (res.status >= 400 || data?.success === false) {
      return { ok: false, error: parseApiError(data, res.status) }
    }

    return { ok: true }
  } catch (error: unknown) {
    const message =
      error && typeof error === "object" && "response" in error
        ? parseApiError((error as { response?: { data?: unknown; status?: number } }).response?.data, (error as { response?: { status?: number } }).response?.status ?? 500)
        : error instanceof Error
          ? error.message
          : "Failed to sync mortgage workflow"
    return { ok: false, error: message }
  }
}
