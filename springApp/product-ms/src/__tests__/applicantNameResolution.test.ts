import { ProductApplicationModel } from '../models/ProductApplicationModel';
import { ProductModel } from '../models/ProductModel';
import productApplicationService from '../services/productApplicationService';
import clientAuthUserService from '../services/clientAuthUserService';
import upstreamApplicationService from '../services/upstreamApplicationService';

jest.mock('../models/ProductApplicationModel', () => ({
  ProductApplicationModel: {
    create: jest.fn(),
    findOne: jest.fn()
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
    requirementsSnapshot: doc.requirementsSnapshot,
    contractSnapshot: doc.contractSnapshot,
    applicantName: doc.contractSnapshot?.applicantName,
    loanWorkflowStatus: doc.loanWorkflowStatus,
    requirementSubmissions: doc.requirementSubmissions,
    upstreamApplicationId: doc.upstreamApplicationId,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString()
  }))
}));

jest.mock('../models/ProductModel', () => ({
  ProductModel: {
    findById: jest.fn()
  },
  toProduct: jest.fn((doc) => doc)
}));

jest.mock('../services/upstreamApplicationService', () => ({
  __esModule: true,
  default: {
    submitExternalApplication: jest.fn()
  }
}));

jest.mock('../services/complianceBvnService', () => ({
  __esModule: true,
  default: {
    resolveUserBvn: jest.fn().mockResolvedValue('22345678901')
  }
}));

jest.mock('../services/clientAuthUserService', () => ({
  __esModule: true,
  default: {
    resolveApplicantName: jest.fn(),
    resolveUserPhone: jest.fn().mockResolvedValue('+2348012345678'),
    resolveMerchantOwner: jest.fn()
  }
}));

jest.mock('../services/merchantDisplayNameService', () => ({
  __esModule: true,
  default: {
    resolveOfferingMerchantName: jest.fn().mockResolvedValue(undefined),
    resolveProductCreatorDisplay: jest.fn().mockResolvedValue({
      merchantName: 'John Dave',
      poweredBy: 'ABC Business Solutions Ltd'
    })
  }
}));

jest.mock('../services/walletService', () => ({
  __esModule: true,
  default: {
    ensureProductWallet: jest.fn()
  }
}));

jest.mock('../services/applicationNotificationService', () => ({
  sendProductApplicationSubmittedNotification: jest.fn(),
  sendGuarantorKycApprovedNotification: jest.fn()
}));

describe('Applicant name resolution on application init', () => {
  const product = {
    id: 'product-1',
    referenceNumber: 'LOAN-1',
    name: 'Beta Loan',
    description: '',
    type: 'LOAN',
    appId: 'app-1',
    status: 'active',
    isActive: true,
    isFeatured: false,
    requirements: { security: { guarantor: false } },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (ProductModel.findById as jest.Mock).mockResolvedValue(product);
    (ProductApplicationModel.findOne as jest.Mock).mockReturnValue({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null)
      })
    });
    (upstreamApplicationService.submitExternalApplication as jest.Mock).mockResolvedValue({
      upstreamApplicationId: 'upstream-1',
      upstreamAccount: { accountNumber: '0123456789', bankName: 'Test Bank' }
    });
  });

  it('stores resolved applicantName when initializeApplication is called without client applicantName', async () => {
    (clientAuthUserService.resolveApplicantName as jest.Mock).mockResolvedValue('Jane Smith');
    (ProductApplicationModel.create as jest.Mock).mockImplementation(async (payload) => ({
      _id: { toString: () => 'app-record-1' },
      ...payload,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      save: jest.fn()
    }));

    const result = await productApplicationService.initializeApplication({
      userId: 'user-1',
      productId: 'product-1',
      amount: 250000,
      currency: 'NGN',
      email: 'jane.smith@example.com',
      merchantId: 'merchant-1'
    });

    expect(clientAuthUserService.resolveApplicantName).toHaveBeenCalledWith(
      'user-1',
      undefined,
      'jane.smith@example.com'
    );
    expect(ProductApplicationModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        contractSnapshot: expect.objectContaining({
          applicantName: 'Jane Smith'
        })
      })
    );
    expect(result.application.applicantName).toBe('Jane Smith');
  });
});
