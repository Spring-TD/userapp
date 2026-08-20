import { describe, expect, it, jest, beforeEach } from '@jest/globals';

jest.mock('../models/ProductApplicationModel', () => ({
  ProductApplicationModel: {
    find: jest.fn()
  }
}));

import { ProductApplicationModel } from '../models/ProductApplicationModel';
import {
  isInProgressStorefrontApplication,
  refreshInProgressApplicationsFromProduct
} from '../services/pendingApplicationProductSync';
import type { Product } from '../types/product';

const mockedFind = ProductApplicationModel.find as jest.MockedFunction<typeof ProductApplicationModel.find>;

const updatedProduct = {
  id: 'local-1',
  name: 'Parkview Court Updated',
  type: 'LOAN',
  requirements: {
    security: { guarantor: true, otherProperties: true }
  },
  structure: { interestRate: 18 },
  about: { duration: { value: 24, unit: 'month' } },
  feesAndCharges: { fees: [{ name: 'Management Fee', feeType: 'Flat', value: '500' }] },
  equityContribution: 0
} as unknown as Product;

function applicationDoc(overrides: Record<string, unknown> = {}) {
  const save = jest.fn(async function save(this: Record<string, unknown>) {
    return this;
  });
  return {
    _id: { toString: () => String(overrides.id ?? 'app-1') },
    productId: 'local-1',
    productName: 'Old Name',
    productType: 'LOAN',
    status: 'PENDING',
    loanWorkflowStatus: 'requested',
    requirementsSnapshot: { security: { guarantor: false } },
    contractSnapshot: {
      amount: 500000,
      currency: 'NGN',
      productId: 'local-1',
      productName: 'Old Name',
      applicantName: 'Ada',
      guarantors: [{ id: 'g-1' }],
      requirements: { security: { guarantor: false } }
    },
    ...overrides,
    save
  };
}

describe('pendingApplicationProductSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('treats unfinished PENDING apply drafts as in progress', () => {
    expect(
      isInProgressStorefrontApplication({ status: 'PENDING', loanWorkflowStatus: 'requested' })
    ).toBe(true);
    expect(
      isInProgressStorefrontApplication({
        status: 'PENDING',
        loanWorkflowStatus: 'account_requested'
      })
    ).toBe(true);
    expect(
      isInProgressStorefrontApplication({
        status: 'PENDING',
        loanWorkflowStatus: 'account_created'
      })
    ).toBe(true);
    expect(
      isInProgressStorefrontApplication({
        status: 'PENDING',
        loanWorkflowStatus: 'requirements_submitted'
      })
    ).toBe(true);
  });

  it('skips submitted, approved, and under-review applications', () => {
    expect(
      isInProgressStorefrontApplication({ status: 'PENDING', loanWorkflowStatus: 'under_review' })
    ).toBe(false);
    expect(isInProgressStorefrontApplication({ status: 'APPROVED', loanWorkflowStatus: 'requested' })).toBe(
      false
    );
    expect(
      isInProgressStorefrontApplication({
        status: 'PENDING',
        loanWorkflowStatus: 'requested',
        contractSnapshot: { finalSubmission: { submittedAt: '2026-08-17T00:00:00.000Z' } }
      })
    ).toBe(false);
    expect(
      isInProgressStorefrontApplication({
        status: 'PENDING',
        loanWorkflowStatus: 'account_created',
        contractSnapshot: { finalSubmission: { submittedAt: '2026-08-17T00:00:00.000Z' } }
      })
    ).toBe(false);
  });

  it('rewrites in-progress snapshots from the synced product and keeps applicant fields', async () => {
    const inProgress = applicationDoc({ id: 'app-in-progress' });
    const accountRequested = applicationDoc({
      id: 'app-account-requested',
      loanWorkflowStatus: 'account_requested'
    });
    const accountCreated = applicationDoc({
      id: 'app-account-created',
      loanWorkflowStatus: 'account_created'
    });
    const underReview = applicationDoc({
      id: 'app-submitted',
      loanWorkflowStatus: 'under_review'
    });
    const approved = applicationDoc({ id: 'app-approved', status: 'APPROVED' });

    mockedFind.mockResolvedValue([
      inProgress,
      accountRequested,
      accountCreated,
      underReview,
      approved
    ] as never);

    const result = await refreshInProgressApplicationsFromProduct(updatedProduct);

    expect(result).toEqual({
      refreshed: 3,
      applicationIds: ['app-in-progress', 'app-account-requested', 'app-account-created']
    });
    expect(inProgress.save).toHaveBeenCalledTimes(1);
    expect(accountRequested.save).toHaveBeenCalledTimes(1);
    expect(accountCreated.save).toHaveBeenCalledTimes(1);
    expect(underReview.save).not.toHaveBeenCalled();
    expect(approved.save).not.toHaveBeenCalled();
    expect(inProgress.productName).toBe('Parkview Court Updated');
    expect(inProgress.requirementsSnapshot).toEqual(updatedProduct.requirements);
    expect(inProgress.contractSnapshot).toMatchObject({
      amount: 500000,
      currency: 'NGN',
      applicantName: 'Ada',
      guarantors: [{ id: 'g-1' }],
      productName: 'Parkview Court Updated',
      requirements: updatedProduct.requirements,
      structure: updatedProduct.structure
    });
  });
});
