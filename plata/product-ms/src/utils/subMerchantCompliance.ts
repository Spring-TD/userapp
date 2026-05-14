import type {
  SubMerchantComplianceDocument,
  SubMerchantComplianceStatus
} from '../types/subMerchantProductActivation';

const COMPLIANCE_STATUSES: SubMerchantComplianceStatus[] = ['not_started', 'pending', 'completed'];

export function normalizeComplianceFields(doc: {
  complianceStatus?: SubMerchantComplianceStatus | null;
  complianceDocuments?: SubMerchantComplianceDocument[] | null;
}): { complianceStatus: SubMerchantComplianceStatus; complianceDocuments: SubMerchantComplianceDocument[] } {
  const complianceStatus =
    doc.complianceStatus != null && COMPLIANCE_STATUSES.includes(doc.complianceStatus)
      ? doc.complianceStatus
      : 'not_started';
  const complianceDocuments = Array.isArray(doc.complianceDocuments)
    ? doc.complianceDocuments.filter((d): d is SubMerchantComplianceDocument => Boolean(d?.url))
    : [];
  return { complianceStatus, complianceDocuments };
}
