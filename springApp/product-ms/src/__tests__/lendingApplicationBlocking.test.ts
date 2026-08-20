import productApplicationService from '../services/productApplicationService';
import { ProductModel } from '../models/ProductModel';
import { ProductApplicationModel } from '../models/ProductApplicationModel';
import { ApiError } from '../middleware/errorHandler';

jest.mock('../models/ProductModel', () => ({
  ProductModel: {
    findById: jest.fn()
  },
  toProduct: jest.fn((doc) => doc)
}));

jest.mock('../models/ProductApplicationModel', () => ({
  ProductApplicationModel: {
    create: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findById: jest.fn()
  },
  toProductApplication: jest.fn((doc) => ({
    id: doc._id,
    userId: doc.userId,
    productId: doc.productId,
    merchantId: doc.merchantId,
    appId: doc.appId,
    status: doc.status,
    productType: doc.productType,
    amount: doc.amount,
    currency: doc.currency,
    productName: doc.productName,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
  }))
}));

jest.mock('../services/walletService', () => ({
  __esModule: true,
  default: {
    ensureProductWallet: jest.fn()
  }
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
    resolveApplicantName: jest.fn().mockResolvedValue('Jane Doe'),
    resolveUserPhone: jest.fn().mockResolvedValue('+2348012345678')
  }
}));

jest.mock('../services/merchantDisplayNameService', () => ({
  __esModule: true,
  default: {
    resolveOfferingMerchantName: jest.fn().mockResolvedValue('CRBC Store')
  }
}));

jest.mock('../services/applicationNotificationService', () => ({
  sendProductApplicationSubmittedNotification: jest.fn()
}));

const mockedFindById = ProductModel.findById as jest.MockedFunction<typeof ProductModel.findById>;
const mockedFindOne = ProductApplicationModel.findOne as jest.MockedFunction<typeof ProductApplicationModel.findOne>;

const loanProduct = {
  id: 'loan-product-1',
  name: 'Starter Loan',
  type: 'LOAN',
  appId: 'app-1',
  isActive: true,
  requirements: [],
  currency: 'NGN'
};

const baseInput = {
  userId: 'user-1',
  productId: 'loan-product-1',
  merchantId: 'merchant-1',
  amount: 1000,
  currency: 'NGN'
};

function mockFindOneChain(result: unknown) {
  mockedFindOne.mockReturnValue({
    sort: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(result)
    })
  } as never);
}

describe('productApplicationService lending duplicate guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFindById.mockResolvedValue(loanProduct as never);
  });

  it('returns existing pending application on init instead of creating a duplicate', async () => {
    const pendingApplication = {
      _id: 'app-pending-1',
      ...baseInput,
      appId: 'app-1',
      status: 'PENDING',
      productType: 'LOAN',
      productName: 'Starter Loan',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    mockFindOneChain(pendingApplication);

    const result = await productApplicationService.initializeApplication(baseInput);

    expect(result.created).toBe(false);
    expect(result.application.id).toBe('app-pending-1');
    expect(ProductApplicationModel.create).not.toHaveBeenCalled();
  });

  it('rejects init when user already has an approved application', async () => {
    mockFindOneChain({
      _id: 'app-approved-1',
      ...baseInput,
      appId: 'app-1',
      status: 'APPROVED',
      productType: 'LOAN'
    });

    await expect(productApplicationService.initializeApplication(baseInput)).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining('approved application')
    } satisfies Partial<ApiError>);
  });

  it('rejects one-shot apply when user already has a pending application', async () => {
    mockFindOneChain({
      _id: 'app-pending-1',
      ...baseInput,
      appId: 'app-1',
      status: 'PENDING',
      productType: 'LOAN'
    });

    await expect(productApplicationService.createApplication(baseInput)).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining('pending application')
    } satisfies Partial<ApiError>);
  });
});
