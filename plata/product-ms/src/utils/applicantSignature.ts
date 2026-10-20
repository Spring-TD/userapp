import { ApiError } from '../middleware/errorHandler';
import type { UserProductApplicationStatus } from '../types/userProductApplication';

export interface ApplicantSignatureInput {
  applicantSignatureUrl?: string;
  applicantSignatureKey?: string;
  applicantSignatureFileName?: string;
}

export function assertApplicantSignatureProvided(
  requireApplicantSignature: boolean | undefined,
  status: UserProductApplicationStatus | undefined,
  input: ApplicantSignatureInput
): ApplicantSignatureInput {
  const url = input.applicantSignatureUrl?.trim();
  const key = input.applicantSignatureKey?.trim();
  const fileName = input.applicantSignatureFileName?.trim();
  const normalized: ApplicantSignatureInput = {
    ...(url ? { applicantSignatureUrl: url } : {}),
    ...(key ? { applicantSignatureKey: key } : {}),
    ...(fileName ? { applicantSignatureFileName: fileName } : {})
  };
  const isDraft = (status ?? 'submitted') === 'draft';
  if (!requireApplicantSignature || isDraft) {
    return normalized;
  }
  if (!url) {
    throw new ApiError(
      400,
      'applicantSignatureUrl is required — this product requires the applicant to upload a signature'
    );
  }
  return normalized;
}
