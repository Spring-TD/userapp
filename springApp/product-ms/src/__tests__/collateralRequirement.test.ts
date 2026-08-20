import { describe, expect, it } from '@jest/globals';
import {
  COLLATERAL_DOCUMENT_REQUIREMENT_TYPE,
  INSURANCE_DOCUMENT_REQUIREMENT_TYPE,
  applyCollateralRequirement,
  isCollateralRequired,
  isInsuranceRequired
} from '../utils/collateralRequirement';
import { validateRequirementSubmissions } from '../utils/productRequirementValidation';

describe('collateralRequirement', () => {
  it('treats metadata.securitySelection.collateral as required', () => {
    expect(
      isCollateralRequired({
        metadata: { securitySelection: { collateral: true } }
      })
    ).toBe(true);
  });

  it('injects a storefront document_upload row', () => {
    const requirements = applyCollateralRequirement({
      metadata: { securitySelection: { collateral: true } }
    });

    expect(requirements?.security?.realEstateProperties).toBe(true);
    expect(requirements?.otherRequirements?.[0]).toMatchObject({
      requirementType: COLLATERAL_DOCUMENT_REQUIREMENT_TYPE,
      contentType: 'document_upload',
      uploadRequired: true
    });
  });

  it('treats requirements.security.insurance as required', () => {
    expect(
      isInsuranceRequired({
        requirements: { security: { insurance: true } }
      })
    ).toBe(true);
  });

  it('treats metadata.securitySelection.insurance as required', () => {
    expect(
      isInsuranceRequired({
        metadata: { securitySelection: { insurance: true } }
      })
    ).toBe(true);
  });

  it('injects an Insurance document storefront upload row', () => {
    const requirements = applyCollateralRequirement({
      requirements: { security: { insurance: true } }
    });

    expect(requirements?.security?.insurance).toBe(true);
    expect(requirements?.otherRequirements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirementType: INSURANCE_DOCUMENT_REQUIREMENT_TYPE,
          contentType: 'document_upload',
          uploadRequired: true
        })
      ])
    );
  });

  it('injects insurance from synced metadata securitySelection', () => {
    const requirements = applyCollateralRequirement({
      metadata: { securitySelection: { insurance: true } },
      requirements: { security: { guarantor: false } }
    });

    expect(requirements?.security?.insurance).toBe(true);
    expect(requirements?.otherRequirements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirementType: INSURANCE_DOCUMENT_REQUIREMENT_TYPE,
          contentType: 'document_upload',
          uploadRequired: true
        })
      ])
    );
  });

  it('requires a Collateral document fileUrl on submit', () => {
    const requirements = applyCollateralRequirement({
      requirements: { security: { realEstateProperties: true } }
    });

    expect(() => validateRequirementSubmissions(requirements, [])).toThrow(
      /Collateral document/
    );
    expect(() =>
      validateRequirementSubmissions(requirements, [
        {
          requirementType: COLLATERAL_DOCUMENT_REQUIREMENT_TYPE,
          label: COLLATERAL_DOCUMENT_REQUIREMENT_TYPE,
          fileUrl: 'https://cdn.example/collateral.pdf'
        }
      ])
    ).not.toThrow();
  });

  it('requires an Insurance document fileUrl on submit', () => {
    const requirements = applyCollateralRequirement({
      requirements: { security: { insurance: true } }
    });

    expect(() => validateRequirementSubmissions(requirements, [])).toThrow(
      /Insurance document/
    );
    expect(() =>
      validateRequirementSubmissions(requirements, [
        {
          requirementType: INSURANCE_DOCUMENT_REQUIREMENT_TYPE,
          label: INSURANCE_DOCUMENT_REQUIREMENT_TYPE,
          fileUrl: 'https://cdn.example/insurance.pdf'
        }
      ])
    ).not.toThrow();
  });
});
