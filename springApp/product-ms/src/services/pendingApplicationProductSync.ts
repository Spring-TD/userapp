import type { Product } from '../types/product';
import {
  IProductApplicationDocument,
  ProductApplicationModel
} from '../models/ProductApplicationModel';
import { productDerivedContractSnapshotFields } from '../utils/lendingEquitySnapshot';

/** Workflow stages where the applicant is still filling the storefront apply form. */
export const IN_PROGRESS_LOAN_WORKFLOW_STATUSES = [
  'requested',
  'account_requested',
  'account_created',
  'requirements_submitted'
] as const;

function asPlainObjectRecord(value: unknown): Record<string, unknown> | undefined {
  if (value !== undefined && value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

export function isInProgressStorefrontApplication(application: {
  status?: string;
  loanWorkflowStatus?: string;
  contractSnapshot?: unknown;
}): boolean {
  if (application.status !== 'PENDING') {
    return false;
  }

  const snapshot = asPlainObjectRecord(application.contractSnapshot);
  if (snapshot?.finalSubmission) {
    return false;
  }

  const workflow = String(application.loanWorkflowStatus ?? '').trim();
  if (!workflow) {
    return true;
  }
  return (IN_PROGRESS_LOAN_WORKFLOW_STATUSES as readonly string[]).includes(workflow);
}

function applyCatalogSnapshotToApplication(
  application: IProductApplicationDocument,
  product: Product
): void {
  const existingSnapshot = asPlainObjectRecord(application.contractSnapshot) ?? {};
  application.productName = product.name;
  application.productType = product.type;
  application.requirementsSnapshot = product.requirements;
  application.contractSnapshot = {
    ...existingSnapshot,
    ...productDerivedContractSnapshotFields(product)
  };
}

/**
 * Refresh unfinished storefront apply drafts so they match a just-synced local product clone.
 * Skips submitted (`finalSubmission`), under-review, and approved applications so those snapshots stay frozen.
 */
export async function refreshInProgressApplicationsFromProduct(
  product: Product
): Promise<{ refreshed: number; applicationIds: string[] }> {
  const productId = String(product.id || '').trim();
  if (!productId) {
    return { refreshed: 0, applicationIds: [] };
  }

  const docs = await ProductApplicationModel.find({
    productId,
    status: 'PENDING'
  });

  const applicationIds: string[] = [];
  for (const application of docs) {
    if (!isInProgressStorefrontApplication(application)) {
      continue;
    }

    try {
      applyCatalogSnapshotToApplication(application, product);
      await application.save();
      applicationIds.push(application._id.toString());
    } catch (error) {
      console.error('Failed to refresh in-progress application from catalog product:', {
        applicationId: application._id?.toString?.(),
        productId,
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return { refreshed: applicationIds.length, applicationIds };
}
