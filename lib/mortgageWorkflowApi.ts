import { apiClient } from "@/lib/api"
import type { MortgageWorkflowLocalState } from "@/lib/mortgageWorkflow"

export type MortgageWorkflowApiProgress = {
  virtualTourCompletedAt?: string
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
}

function parseApiError(data: unknown, status: number): string {
  if (data && typeof data === "object") {
    const d = data as ApiEnvelope
    if (d.error) return d.error
    if (d.message) return d.message
  }
  return status >= 500 ? "Server error" : "Request failed"
}

/** Map a local workflow patch to API timestamp fields (only fields changed in this patch). */
export function localPatchToApiProgress(
  patch: Partial<MortgageWorkflowLocalState>,
  stateAfterPatch?: MortgageWorkflowLocalState,
): MortgageWorkflowApiProgress | null {
  const now = new Date().toISOString()
  const progress: MortgageWorkflowApiProgress = {}

  if (patch.virtualTourCompleted === true) progress.virtualTourCompletedAt = now
  if (patch.offerAccepted === true || patch.signedOfferUploaded === true) progress.offerAcceptedAt = now
  if (patch.offerDeclined === true) {
    progress.offerDeclinedAt = now
    if (stateAfterPatch?.inspectionScheduled) progress.inspectionDeclined = true
  }
  if (patch.inspectionScheduled === true) progress.inspectionBookedAt = now
  if (patch.inspectionCompleted === true) progress.inspectionCompletedAt = now
  if (patch.downPaymentConfirmed === true) progress.downPaymentMadeAt = now
  if (patch.contractAccepted === true) progress.contractSignedAt = now

  return Object.keys(progress).length > 0 ? progress : null
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

export async function syncMortgageWorkflowPatchToApi(
  applicationId: string,
  patch: Partial<MortgageWorkflowLocalState>,
  stateAfterPatch?: MortgageWorkflowLocalState,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const progress = localPatchToApiProgress(patch, stateAfterPatch)
  if (!progress) return { ok: true }
  return patchMortgageWorkflowProgress(applicationId, progress)
}
