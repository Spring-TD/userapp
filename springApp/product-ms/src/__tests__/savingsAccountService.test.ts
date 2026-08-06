import savingsAccountService from '../services/savingsAccountService';
import { ProductModel } from '../models/ProductModel';
import { ProductApplicationModel } from '../models/ProductApplicationModel';
import upstreamApplicationService from '../services/upstreamApplicationService';
import createAppService from '../services/createAppService';
import complianceBvnService from '../services/complianceBvnService';
import clientAuthUserService from '../services/clientAuthUserService';
import merchantDisplayNameService from '../services/merchantDisplayNameService';

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
    findByIdAndDelete: jest.fn()
  }
}));

jest.mock('../services/upstreamApplicationService', () => ({
  __esModule: true,
  default: {
    submitSavingsEnrollment: jest.fn()
  }
}));

jest.mock('../services/createAppService', () => ({
  __esModule: true,
  default: {
    getAppInfo: jest.fn()
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

jest.mock('../services/walletService', () => ({
  __esModule: true,
  default: {
    ensureProductWallet: jest.fn().mockResolvedValue({
      wallet: {
        id: 'spring-product-wallet-1',
        walletPurpose: 'PRODUCT',
        virtualNuban: {
          accountNumber: '7582360692',
          bankName: 'Globus Bank',
          bankCode: '103',
          provisionStatus: 'active'
        }
      },
      reusedUpstreamAccount: true
    })
  }
}));

const mockedFindById = ProductModel.findById as jest.MockedFunction<typeof ProductModel.findById>;
const mockedFindOne = ProductApplicationModel.findOne as jest.MockedFunction<typeof ProductApplicationModel.findOne>;
const mockedCreate = ProductApplicationModel.create as jest.MockedFunction<typeof ProductApplicationModel.create>;
const mockedDelete = ProductApplicationModel.findByIdAndDelete as jest.MockedFunction<
  typeof ProductApplicationModel.findByIdAndDelete
>;
const mockedSubmitSavings = upstreamApplicationService.submitSavingsEnrollment as jest.MockedFunction<
  typeof upstreamApplicationService.submitSavingsEnrollment
>;
const mockedGetAppInfo = createAppService.getAppInfo as jest.MockedFunction<typeof createAppService.getAppInfo>;

describe('savingsAccountService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFindOne.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null)
      })
    } as never);
    mockedGetAppInfo.mockResolvedValue({
      id: 'app-1',
      name: 'CRBC',
      merchantId: 'offering-merchant-1',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z'
    });
    mockedSubmitSavings.mockResolvedValue({
      upstreamApplicationId: 'plata-app-1',
      applicationCreated: true,
      upstreamAccount: {
        accountNumber: '0123456789',
        bankName: 'Test Bank',
        provisionStatus: 'active',
        providerReference: 'wallet-plata-1'
      }
    });
    mockedDelete.mockReturnValue({
      exec: jest.fn().mockResolvedValue(undefined)
    } as never);
  });

  it('rejects products without upstreamProductId', async () => {
    mockedFindById.mockResolvedValue({
      id: 'prod-1',
      name: 'Target Savings',
      type: 'SAVINGS',
      isActive: true,
      appId: 'app-1'
    } as never);

    await expect(
      savingsAccountService.createSavingsAccount({
        userId: 'user-1',
        productId: 'prod-1',
        currency: 'NGN',
        email: 'jane@example.com'
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('upstreamProductId')
    });
  });

  it('syncs savings enrollment to Plata under the product creator', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    mockedFindById.mockResolvedValue({
      id: 'prod-1',
      name: 'Target Savings',
      type: 'SAVINGS',
      isActive: true,
      appId: 'app-1',
      upstreamProductId: 'plata-prod-1',
      upstreamAppId: 'plata-app-1'
    } as never);
    mockedCreate.mockResolvedValue({
      _id: { toString: () => 'local-app-1' },
      userId: 'user-1',
      productId: 'prod-1',
      productName: 'Target Savings',
      productType: 'SAVINGS',
      amount: 0,
      currency: 'NGN',
      status: 'APPROVED',
      appId: 'app-1',
      merchantId: 'offering-merchant-1',
      contractSnapshot: { savingsBalance: 0 },
      save
    } as never);

    const result = await savingsAccountService.createSavingsAccount({
      userId: 'user-1',
      productId: 'prod-1',
      currency: 'NGN',
      email: 'jane@example.com'
    });

    expect(result.created).toBe(true);
    expect(mockedSubmitSavings).toHaveBeenCalledWith(
      expect.objectContaining({
        localApplicationId: 'local-app-1',
        offeringMerchantId: 'offering-merchant-1',
        userId: 'user-1',
        bvn: '22345678901'
      })
    );
    expect(save).toHaveBeenCalled();
  });

  it('rolls back local application when Plata sync is skipped', async () => {
    mockedFindById.mockResolvedValue({
      id: 'prod-1',
      name: 'Target Savings',
      type: 'SAVINGS',
      isActive: true,
      appId: 'app-1',
      upstreamProductId: 'plata-prod-1'
    } as never);
    mockedCreate.mockResolvedValue({
      _id: { toString: () => 'local-app-1' },
      userId: 'user-1',
      productId: 'prod-1',
      productName: 'Target Savings',
      productType: 'SAVINGS',
      amount: 0,
      currency: 'NGN',
      status: 'APPROVED',
      appId: 'app-1',
      merchantId: 'offering-merchant-1',
      contractSnapshot: { savingsBalance: 0 },
      save: jest.fn()
    } as never);
    mockedSubmitSavings.mockResolvedValue({
      skipped: true,
      skipReason: 'Plata upstream keys not configured'
    });

    await expect(
      savingsAccountService.createSavingsAccount({
        userId: 'user-1',
        productId: 'prod-1',
        currency: 'NGN',
        email: 'jane@example.com'
      })
    ).rejects.toMatchObject({ statusCode: 502 });

    expect(mockedDelete).toHaveBeenCalled();
  });
});
