import applicantProfileService from '../services/applicantProfileService';
import { ProductApplicationModel, toProductApplication } from '../models/ProductApplicationModel';

jest.mock('../models/ProductApplicationModel', () => ({
  ProductApplicationModel: {
    findById: jest.fn()
  },
  toProductApplication: jest.fn((doc) => ({
    id: doc._id.toString(),
    userId: doc.userId,
    productId: doc.productId,
    productName: doc.productName,
    productType: doc.productType,
    amount: doc.amount,
    currency: doc.currency,
    email: doc.email,
    status: doc.status,
    appId: doc.appId,
    merchantId: doc.merchantId,
    contractSnapshot: doc.contractSnapshot,
    loanWorkflowStatus: doc.loanWorkflowStatus,
    requirementSubmissions: doc.requirementSubmissions ?? [],
    upstreamApplicationId: doc.upstreamApplicationId,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString()
  }))
}));

jest.mock('../config/environment', () => ({
  config: {
    clientAuthServiceUrl: 'http://client-auth',
    clientAuthInternalToken: 'token',
    clientAuthUserTimeoutMs: 5000,
    complianceServiceUrl: 'http://compliance',
    complianceWalletInternalToken: 'token',
    complianceBvnTimeoutMs: 5000,
    jwtSecret: 'token'
  }
}));

jest.mock('axios', () => ({
  get: jest.fn()
}));

import axios from 'axios';

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ApplicantProfileService', () => {
  const baseDoc = {
    _id: { toString: () => 'local-app-1' },
    userId: 'user-1',
    productId: 'product-1',
    productName: 'Test Loan',
    productType: 'LOAN',
    amount: 100000,
    currency: 'NGN',
    email: 'jane@example.com',
    status: 'PENDING',
    appId: 'app-1',
    merchantId: 'merchant-offering',
    contractSnapshot: { guarantors: [{ id: 'g1', fullName: 'Guarantor One' }] },
    loanWorkflowStatus: 'under_review',
    requirementSubmissions: [],
    upstreamApplicationId: 'plata-app-1',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z')
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (ProductApplicationModel.findById as jest.Mock).mockResolvedValue(baseDoc);
    mockedAxios.get.mockImplementation(async (url: string) => {
      if (url.includes('/user/internal/profile/')) {
        return {
          status: 200,
          data: {
            success: true,
            data: {
              userId: 'user-1',
              email: 'jane@example.com',
              firstName: 'Jane',
              lastName: 'Smith',
              emailVerified: true,
              phoneVerified: false,
              userType: 'user',
              status: 'active',
              kycCompleted: true,
              kycStatus: 'approved'
            }
          }
        };
      }
      if (url.includes('/kyc/internal/applicant-profile/')) {
        return {
          status: 200,
          data: {
            success: true,
            data: {
              status: 'approved',
              completed: true,
              documents: [],
              personalInfo: { occupation: 'Engineer' }
            }
          }
        };
      }
      return { status: 404, data: { success: false } };
    });
  });

  it('rejects mismatched plataApplicationId', async () => {
    await expect(
      applicantProfileService.buildApplicantProfile({
        localApplicationId: 'local-app-1',
        plataApplicationId: 'wrong-id'
      })
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('returns aggregated profile when linkage matches', async () => {
    const profile = await applicantProfileService.buildApplicantProfile({
      localApplicationId: 'local-app-1',
      plataApplicationId: 'plata-app-1',
      offeringMerchantId: 'merchant-offering'
    });

    expect(profile.schemaVersion).toBe(1);
    expect(profile.userId).toBe('user-1');
    expect(profile.auth).toMatchObject({ email: 'jane@example.com' });
    expect(profile.kyc).toMatchObject({ status: 'approved' });
    expect(profile.application).toMatchObject({
      productType: 'LOAN',
      upstreamApplicationId: 'plata-app-1'
    });
    expect(toProductApplication).toHaveBeenCalled();
  });
});
