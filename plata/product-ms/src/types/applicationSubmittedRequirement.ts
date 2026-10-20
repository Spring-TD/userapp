import type { LoanOtherRequirementContentType } from './productConfiguration';

export interface ApplicationSubmittedRequirement {
  otherRequirementIndex?: number;
  documentsToDownloadIndex?: number;
  requirementType?: string;
  contentType: LoanOtherRequirementContentType;
  templateFileUrl?: string;
  submittedFileUrl: string;
  submittedFileKey?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  uploadedAt?: string;
}
