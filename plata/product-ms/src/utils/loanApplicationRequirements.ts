import { ApiError } from '../middleware/errorHandler';
import type { LoanRequirements, ProductDiscriminator } from '../types/product';
import type { ApplicationSubmittedRequirement } from '../types/applicationSubmittedRequirement';

export const LENDING_PRODUCT_TYPES: ProductDiscriminator[] = ['LOAN', 'MORTGAGE'];

export function isLendingProductType(t: ProductDiscriminator): boolean {
  return LENDING_PRODUCT_TYPES.includes(t);
}

export interface MandatoryRequirementRef {
  otherRequirementIndex?: number;
  documentsToDownloadIndex?: number;
  label: string;
}

export function listMandatoryRequirementRefs(
  requirements: LoanRequirements | undefined
): MandatoryRequirementRef[] {
  const mandatory: MandatoryRequirementRef[] = [];
  (requirements?.otherRequirements ?? []).forEach((row, index) => {
    if (row.contentType === 'document_template') {
      mandatory.push({
        otherRequirementIndex: index,
        label: row.requirementType?.trim() || `otherRequirements[${index}]`
      });
      return;
    }
    if (row.contentType === 'document_upload' && row.uploadRequired === true) {
      mandatory.push({
        otherRequirementIndex: index,
        label: row.requirementType?.trim() || row.description?.trim() || `otherRequirements[${index}]`
      });
    }
  });
  (requirements?.documentsToDownload ?? []).forEach((row, index) => {
    if (row.fileUrl?.trim()) {
      mandatory.push({
        documentsToDownloadIndex: index,
        label: row.name?.trim() || `documentsToDownload[${index}]`
      });
    }
  });
  return mandatory;
}

function refKey(ref: MandatoryRequirementRef): string {
  if (ref.otherRequirementIndex !== undefined) {
    return `o:${ref.otherRequirementIndex}`;
  }
  if (ref.documentsToDownloadIndex !== undefined) {
    return `d:${ref.documentsToDownloadIndex}`;
  }
  return '?';
}

function submissionKey(item: ApplicationSubmittedRequirement): string {
  if (item.otherRequirementIndex !== undefined) {
    return `o:${item.otherRequirementIndex}`;
  }
  if (item.documentsToDownloadIndex !== undefined) {
    return `d:${item.documentsToDownloadIndex}`;
  }
  return '?';
}

export function enrichSubmittedRequirements(
  requirements: LoanRequirements | undefined,
  submitted: ApplicationSubmittedRequirement[]
): ApplicationSubmittedRequirement[] {
  return submitted.map((item) => {
    if (item.otherRequirementIndex !== undefined) {
      const row = requirements?.otherRequirements?.[item.otherRequirementIndex];
      if (!row) {
        throw new ApiError(
          400,
          `otherRequirementIndex ${item.otherRequirementIndex} is not defined on the product`
        );
      }
      if (item.contentType !== row.contentType) {
        throw new ApiError(
          400,
          `submittedRequirements[otherRequirementIndex=${item.otherRequirementIndex}] contentType must be ${row.contentType}`
        );
      }
      return {
        ...item,
        requirementType: item.requirementType ?? row.requirementType,
        templateFileUrl: item.templateFileUrl ?? row.templateFileUrl,
        contentType: row.contentType as ApplicationSubmittedRequirement['contentType']
      };
    }
    if (item.documentsToDownloadIndex !== undefined) {
      const row = requirements?.documentsToDownload?.[item.documentsToDownloadIndex];
      if (!row) {
        throw new ApiError(
          400,
          `documentsToDownloadIndex ${item.documentsToDownloadIndex} is not defined on the product`
        );
      }
      if (item.contentType !== 'document_template') {
        throw new ApiError(
          400,
          `submittedRequirements[documentsToDownloadIndex=${item.documentsToDownloadIndex}] contentType must be document_template`
        );
      }
      return {
        ...item,
        requirementType: item.requirementType ?? row.name,
        templateFileUrl: item.templateFileUrl ?? row.fileUrl,
        contentType: 'document_template' as const
      };
    }
    throw new ApiError(
      400,
      'Each submittedRequirements item must set otherRequirementIndex or documentsToDownloadIndex'
    );
  });
}

export function validateSubmittedRequirementsForLendingProduct(
  productType: ProductDiscriminator,
  requirements: LoanRequirements | undefined,
  submitted: ApplicationSubmittedRequirement[] | undefined,
  options: { allowMissingMandatory?: boolean } = {}
): ApplicationSubmittedRequirement[] {
  if (!isLendingProductType(productType)) {
    if (submitted && submitted.length > 0) {
      throw new ApiError(400, 'submittedRequirements applies only to LOAN and MORTGAGE applications');
    }
    return [];
  }
  const list = submitted ?? [];
  const seen = new Set<string>();
  for (const item of list) {
    const hasOther = item.otherRequirementIndex !== undefined;
    const hasDownload = item.documentsToDownloadIndex !== undefined;
    if (hasOther === hasDownload) {
      throw new ApiError(
        400,
        'Each submittedRequirements item must set exactly one of otherRequirementIndex or documentsToDownloadIndex'
      );
    }
    const key = submissionKey(item);
    if (seen.has(key)) {
      throw new ApiError(400, `Duplicate submittedRequirements entry for ${key}`);
    }
    seen.add(key);
    if (!item.submittedFileUrl?.trim()) {
      throw new ApiError(400, 'submittedFileUrl is required for each submittedRequirements item');
    }
  }
  const enriched = enrichSubmittedRequirements(requirements, list);
  const mandatory = listMandatoryRequirementRefs(requirements);
  if (!options.allowMissingMandatory) {
    for (const ref of mandatory) {
      if (!seen.has(refKey(ref))) {
        throw new ApiError(400, `Missing required document submission for "${ref.label}"`);
      }
    }
  }
  return enriched;
}
