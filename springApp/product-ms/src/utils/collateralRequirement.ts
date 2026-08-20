import type { LoanRequirements } from '../types/product';

export const COLLATERAL_DOCUMENT_REQUIREMENT_ID = 'collateral-document';
export const COLLATERAL_DOCUMENT_REQUIREMENT_TYPE = 'Collateral document';
export const INSURANCE_DOCUMENT_REQUIREMENT_ID = 'insurance-document';
export const INSURANCE_DOCUMENT_REQUIREMENT_TYPE = 'Insurance document';

const COLLATERAL_DOCUMENT_REQUIREMENT = {
  requirementType: COLLATERAL_DOCUMENT_REQUIREMENT_TYPE,
  description: COLLATERAL_DOCUMENT_REQUIREMENT_TYPE,
  contentType: 'document_upload' as const,
  uploadRequired: true
};

const INSURANCE_DOCUMENT_REQUIREMENT = {
  requirementType: INSURANCE_DOCUMENT_REQUIREMENT_TYPE,
  description: INSURANCE_DOCUMENT_REQUIREMENT_TYPE,
  contentType: 'document_upload' as const,
  uploadRequired: true
};

type SecuritySelection = {
  collateral?: unknown;
  insurance?: unknown;
};

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value !== undefined && value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function securitySelectionFrom(metadata: Record<string, unknown> | undefined): SecuritySelection | undefined {
  return asRecord(metadata?.securitySelection) as SecuritySelection | undefined;
}

export function isCollateralRequired(input: {
  metadata?: Record<string, unknown>;
  requirements?: LoanRequirements;
}): boolean {
  if (input.requirements?.security?.realEstateProperties === true) {
    return true;
  }
  return securitySelectionFrom(input.metadata)?.collateral === true;
}

export function isInsuranceRequired(input: {
  metadata?: Record<string, unknown>;
  requirements?: LoanRequirements;
}): boolean {
  if (input.requirements?.security?.insurance === true) {
    return true;
  }
  return securitySelectionFrom(input.metadata)?.insurance === true;
}

function isInjectedRequirement(item: unknown, idToMatch: string, typeToMatch: string): boolean {
  const row = asRecord(item);
  if (!row) {
    return false;
  }
  const requirementType = String(row.requirementType ?? '').trim();
  const description = String(row.description ?? '').trim();
  const id = String(row.id ?? '').trim();
  return id === idToMatch || requirementType === typeToMatch || description === typeToMatch;
}

function isInjectedCollateralRequirement(item: unknown): boolean {
  return isInjectedRequirement(
    item,
    COLLATERAL_DOCUMENT_REQUIREMENT_ID,
    COLLATERAL_DOCUMENT_REQUIREMENT_TYPE
  );
}

function isInjectedInsuranceRequirement(item: unknown): boolean {
  return isInjectedRequirement(
    item,
    INSURANCE_DOCUMENT_REQUIREMENT_ID,
    INSURANCE_DOCUMENT_REQUIREMENT_TYPE
  );
}

/**
 * When Plata Collateral / Property collateral is on, expose a storefront upload row
 * (`otherRequirements` document_upload). Does not rewrite `metadata.securitySelection`.
 */
export function applyCollateralRequirement(input: {
  metadata?: Record<string, unknown>;
  requirements?: LoanRequirements;
}): LoanRequirements | undefined {
  const collateralRequired = isCollateralRequired(input);
  const insuranceRequired = isInsuranceRequired(input);
  const existing = input.requirements;
  const others = Array.isArray(existing?.otherRequirements) ? [...existing.otherRequirements] : [];
  const withoutInjected = others.filter(
    (item) => !isInjectedCollateralRequirement(item) && !isInjectedInsuranceRequirement(item)
  );

  const security = {
    ...(existing?.security ?? {}),
    ...(collateralRequired ? { realEstateProperties: true } : {}),
    ...(insuranceRequired ? { insurance: true } : {})
  };

  const injectedRequirements = [
    ...(collateralRequired ? [COLLATERAL_DOCUMENT_REQUIREMENT] : []),
    ...(insuranceRequired ? [INSURANCE_DOCUMENT_REQUIREMENT] : [])
  ];
  const otherRequirements = [...injectedRequirements, ...withoutInjected];

  if (!existing && !collateralRequired && !insuranceRequired) {
    return existing;
  }

  return {
    ...(existing ?? {}),
    ...(Object.keys(security).length > 0 ? { security } : {}),
    otherRequirements: otherRequirements.length > 0 ? otherRequirements : undefined
  };
}
