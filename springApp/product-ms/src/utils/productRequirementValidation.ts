import { ApiError } from '../middleware/errorHandler';
import type { LoanRequirements } from '../types/product';
import type { ProductRequirementSubmission } from '../types/productApplication';

type RequirementItem = {
  id?: string;
  name?: string;
  required?: boolean;
  uploadRequired?: boolean;
  contentType?: string;
};

type DownloadableDocumentItem = {
  id?: string;
  name?: string;
};

function requirementKey(item: RequirementItem, index: number): string {
  return String(item.id ?? item.name ?? index).trim();
}

function downloadableDocumentKey(item: DownloadableDocumentItem, index: number): string {
  return String(item.id ?? item.name ?? index).trim();
}

function submissionKeys(submission: ProductRequirementSubmission): string[] {
  return [submission.requirementId, submission.requirementType, submission.label]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.trim());
}

export function validateRequirementSubmissions(
  requirements: LoanRequirements | undefined,
  submissions: ProductRequirementSubmission[]
): void {
  const otherRequirements = requirements?.otherRequirements;
  const missing: string[] = [];
  if (Array.isArray(otherRequirements)) {
    for (const [index, requirement] of otherRequirements.entries()) {
      const item = requirement as RequirementItem;
      const key = requirementKey(item, index);
      const needsSubmission = item.uploadRequired === true || item.required === true;
      if (!needsSubmission) {
        continue;
      }

      const matchingSubmission = submissions.find((submission) =>
        submissionKeys(submission).includes(key)
      );
      if (!matchingSubmission) {
        missing.push(key);
        continue;
      }

      const contentType = String(item.contentType || '').trim().toLowerCase();
      const expectsUpload =
        item.uploadRequired === true ||
        contentType === 'document' ||
        contentType === 'document_upload';
      if (expectsUpload && !matchingSubmission.fileUrl) {
        missing.push(`${key} fileUrl`);
      }
    }
  }

  const downloadableDocuments = requirements?.documentsToDownload;
  if (Array.isArray(downloadableDocuments)) {
    for (const [index, document] of downloadableDocuments.entries()) {
      const item = document as DownloadableDocumentItem;
      const key = downloadableDocumentKey(item, index);
      if (!key) {
        continue;
      }

      const matchingSubmission = submissions.find((submission) =>
        submissionKeys(submission).includes(key)
      );
      if (!matchingSubmission) {
        missing.push(key);
        continue;
      }

      if (!matchingSubmission.fileUrl) {
        missing.push(`${key} fileUrl`);
      }
    }
  }

  if (missing.length > 0) {
    throw new ApiError(400, `Missing required product requirement submissions: ${missing.join(', ')}`);
  }
}
