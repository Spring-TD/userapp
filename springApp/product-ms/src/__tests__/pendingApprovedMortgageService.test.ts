import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import mongoose from 'mongoose';
import pendingApprovedMortgageService from '../services/pendingApprovedMortgageService';
import { ProductApplicationModel } from '../models/ProductApplicationModel';
import * as pendingApprovedMortgageClient from '../services/pendingApprovedMortgageClient';

jest.mock('../middleware/errorHandler', () => ({
  ApiError: class ApiError extends Error {
    statusCode: number;

    constructor(statusCode: number, message: string) {
      super(message);
      this.statusCode = statusCode;
      this.name = 'ApiError';
    }
  }
}));

jest.mock('../models/ProductApplicationModel', () => ({
  ProductApplicationModel: {
    findById: jest.fn()
  },
  toProductApplication: (doc: Record<string, unknown>) => ({
    id: String(doc._id),
    userId: doc.userId,
    productType: doc.productType,
    loanWorkflowStatus: doc.loanWorkflowStatus,
    postApprovalFulfillment: doc.postApprovalFulfillment
  })
}));

jest.mock('../services/pendingApprovedMortgageClient', () => ({
  proxyRespondToMortgageOffer: jest.fn(),
  proxyScheduleMortgageInspection: jest.fn(),
  proxyStartMortgageInspection: jest.fn(),
  proxyCompleteMortgageInspection: jest.fn(),
  proxyMortgageDownPayment: jest.fn(),
  fetchUpstreamPendingApprovedMortgage: jest.fn()
}));

const mockedFindById = ProductApplicationModel.findById as jest.MockedFunction<
  typeof ProductApplicationModel.findById
>;
const mockedProxyOffer = pendingApprovedMortgageClient.proxyRespondToMortgageOffer as jest.MockedFunction<
  typeof pendingApprovedMortgageClient.proxyRespondToMortgageOffer
>;

const applicationId = new mongoose.Types.ObjectId().toString();

describe('PendingApprovedMortgageService ownership', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects offer response when userId does not match application owner', async () => {
    mockedFindById.mockResolvedValue({
      _id: applicationId,
      userId: 'owner-1',
      productType: 'MORTGAGE',
      loanWorkflowStatus: 'approved',
      upstreamApplicationId: 'upstream-1',
      save: jest.fn()
    } as never);

    await expect(
      pendingApprovedMortgageService.respondToOffer(applicationId, 'other-user', {
        action: 'accept',
        acceptedTerms: true
      })
    ).rejects.toMatchObject({ statusCode: 403 });

    expect(mockedProxyOffer).not.toHaveBeenCalled();
  });
});
