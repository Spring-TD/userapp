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
    email: doc.email,
    productName: doc.productName,
    productType: doc.productType,
    customerName: doc.customerName,
    applicantName: doc.applicantName,
    loanWorkflowStatus: doc.loanWorkflowStatus,
    postApprovalFulfillment: doc.postApprovalFulfillment,
    contractSnapshot: doc.contractSnapshot
  })
}));

jest.mock('../services/pendingApprovedMortgageClient', () => ({
  proxyRespondToMortgageOffer: jest.fn(),
  proxyScheduleMortgageInspection: jest.fn(),
  proxyStartMortgageInspection: jest.fn(),
  proxyCompleteMortgageInspection: jest.fn(),
  proxyCompleteMortgageVirtualInspection: jest.fn(),
  proxyMortgageDownPayment: jest.fn(),
  proxySignMortgageContract: jest.fn(),
  fetchUpstreamPendingApprovedMortgage: jest.fn()
}));

jest.mock('../services/settlement/settlementChargeService', () => ({
  collectMortgageDownPayment: jest.fn()
}));

jest.mock('../services/offerLetterPresentationService', () => ({
  buildOfferLetterForProductApplication: jest.fn(async () => ({
    html: '<p>offer</p>',
    text: 'offer',
    content: { reference: 'REF', offerValidUntil: '2026-12-31' }
  }))
}));

jest.mock('../services/productFlowNotificationService', () => ({
  notifyMortgageInspectionBookingFromSpring: jest.fn(),
  notifyMortgageOfferAcceptedFromSpring: jest.fn(),
  notifyMortgageVirtualInspectionCompletedFromSpring: jest.fn(),
  notifyMortgageInspectionOutcomeFromSpring: jest.fn(),
  notifyMortgageDownPaymentReceivedFromSpring: jest.fn(),
  notifyMortgageContractSignedFromSpring: jest.fn()
}));

const mockedFindById = ProductApplicationModel.findById as jest.MockedFunction<
  typeof ProductApplicationModel.findById
>;
const mockedProxyOffer = pendingApprovedMortgageClient.proxyRespondToMortgageOffer as jest.MockedFunction<
  typeof pendingApprovedMortgageClient.proxyRespondToMortgageOffer
>;
const mockedProxySchedule =
  pendingApprovedMortgageClient.proxyScheduleMortgageInspection as jest.MockedFunction<
    typeof pendingApprovedMortgageClient.proxyScheduleMortgageInspection
  >;
const mockedProxyDownPayment = pendingApprovedMortgageClient.proxyMortgageDownPayment as jest.MockedFunction<
  typeof pendingApprovedMortgageClient.proxyMortgageDownPayment
>;
const mockedFetchUpstream =
  pendingApprovedMortgageClient.fetchUpstreamPendingApprovedMortgage as jest.MockedFunction<
    typeof pendingApprovedMortgageClient.fetchUpstreamPendingApprovedMortgage
  >;

import { collectMortgageDownPayment } from '../services/settlement/settlementChargeService';
import { notifyMortgageInspectionBookingFromSpring } from '../services/productFlowNotificationService';

const mockedCollectDownPayment = collectMortgageDownPayment as jest.MockedFunction<
  typeof collectMortgageDownPayment
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

  it('debits Central Wallet and credits Plata creator before recording down payment', async () => {
    const now = new Date();
    const save = jest.fn(async function (this: Record<string, unknown>) {
      return this;
    });
    const applicationDoc = {
      _id: { toString: () => applicationId },
      id: applicationId,
      userId: 'owner-1',
      productType: 'MORTGAGE',
      productId: 'product-1',
      productName: 'Basquait Home',
      amount: 10,
      currency: 'NGN',
      email: 'owner@example.com',
      status: 'approved',
      merchantId: 'merchant-spring',
      appId: 'app-spring',
      loanWorkflowStatus: 'approved',
      upstreamApplicationId: 'upstream-1',
      postApprovalFulfillment: {
        status: 'down_payment_pending',
        downPayment: { requiredAmount: 2, currency: 'NGN' }
      },
      createdAt: now,
      updatedAt: now,
      save
    };

    mockedFindById.mockResolvedValue(applicationDoc as never);
    mockedFetchUpstream.mockResolvedValue({
      postApprovalFulfillment: {
        status: 'down_payment_pending',
        downPayment: { requiredAmount: 2, currency: 'NGN' }
      }
    } as never);
    mockedCollectDownPayment.mockResolvedValue({
      success: true,
      userTransactionId: 'user-tx-1',
      transactionId: 'plata-creator-tx-1',
      userWallet: { id: 'uw-1', mainBalance: 5283.9, currency: 'NGN' }
    } as never);
    mockedProxyDownPayment.mockResolvedValue({
      postApprovalFulfillment: {
        status: 'down_payment_paid',
        downPayment: {
          requiredAmount: 2,
          currency: 'NGN',
          paidAt: '2026-08-10T00:00:00.000Z',
          providerReference: 'user-tx-1'
        }
      }
    } as never);

    const detail = await pendingApprovedMortgageService.payDownPayment(applicationId, 'owner-1');

    expect(mockedCollectDownPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        merchantId: 'merchant-spring',
        appId: 'app-spring',
        userId: 'owner-1',
        amount: 2,
        referenceId: `mortgage-down-payment:${applicationId}`
      })
    );
    expect(mockedProxyDownPayment).toHaveBeenCalledWith(applicationId, {
      amount: 2,
      providerReference: 'user-tx-1',
      springUserId: 'owner-1'
    });
    expect(detail.payment).toMatchObject({
      method: 'wallet',
      amount: 2,
      userTransactionId: 'user-tx-1',
      repaymentTransactionId: 'plata-creator-tx-1'
    });
  });

  it('notifies the storefront user after they pick an inspection date', async () => {
    const save = jest.fn(async function (this: Record<string, unknown>) {
      return this;
    });
    const applicationDoc = {
      _id: { toString: () => applicationId },
      userId: 'owner-1',
      email: 'owner@example.com',
      productName: 'Parkview Court',
      productType: 'MORTGAGE',
      customerName: 'David Testimony',
      loanWorkflowStatus: 'approved',
      upstreamApplicationId: 'upstream-1',
      postApprovalFulfillment: { status: 'offer_accepted' },
      save
    };

    mockedFindById.mockResolvedValue(applicationDoc as never);
    mockedProxySchedule.mockResolvedValue({
      postApprovalFulfillment: {
        status: 'appointment_scheduled',
        appointment: {
          scheduledAt: '2026-08-14T09:00:00.000Z',
          scheduledFor: '2026-08-17T09:00:00.000Z',
          location: 'Parkview Estate, Ikoyi'
        }
      }
    } as never);

    const result = await pendingApprovedMortgageService.scheduleAppointment(applicationId, 'owner-1', {
      scheduledFor: '2026-08-17T09:00:00.000Z'
    });

    expect(mockedProxySchedule).toHaveBeenCalledWith(applicationId, {
      scheduledFor: '2026-08-17T09:00:00.000Z',
      springUserId: 'owner-1'
    });
    expect(result.postApprovalFulfillment?.appointment?.scheduledFor).toBe('2026-08-17T09:00:00.000Z');
    expect(notifyMortgageInspectionBookingFromSpring).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'owner-1',
        email: 'owner@example.com',
        productName: 'Parkview Court',
        postApprovalFulfillment: expect.objectContaining({
          status: 'appointment_scheduled',
          appointment: expect.objectContaining({
            scheduledFor: '2026-08-17T09:00:00.000Z',
            location: 'Parkview Estate, Ikoyi'
          })
        })
      })
    );
  });
});
