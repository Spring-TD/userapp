import axios from 'axios';
import {
  notifyMerchantInsufficientTreasuryForDisbursement,
  notifyMerchantTreasuryLowBalance,
  _resetTreasuryBalanceAlertStateForTests
} from '../services/treasuryBalanceAlertNotificationService';
import { fetchMerchantOwner } from '../services/merchantOwnerClient';
import { config } from '../config/environment';
import type { MerchantWallet } from '../models/Wallet';
import { WalletStatus, MerchantWalletType } from '../models/Wallet';

jest.mock('axios');
jest.mock('../services/merchantOwnerClient');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedFetchMerchantOwner = fetchMerchantOwner as jest.MockedFunction<typeof fetchMerchantOwner>;

function fakeTreasury(overrides: Partial<MerchantWallet> = {}): MerchantWallet {
  return {
    id: 'tw_1',
    merchantId: 'merchant_xyz',
    appId: 'app_abc',
    type: MerchantWalletType.TREASURY,
    currency: 'NGN',
    mainBalance: 5_000_00,
    ledgerBalance: 5_000_00,
    balance: 5_000_00,
    status: WalletStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  } as MerchantWallet;
}

describe('treasuryBalanceAlertNotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    _resetTreasuryBalanceAlertStateForTests();
    mockedFetchMerchantOwner.mockResolvedValue({
      userId: 'owner_1',
      email: 'merchant@example.com',
      firstName: 'John',
      lastName: 'Dave'
    });
    mockedAxios.post.mockResolvedValue({ status: 200, data: { success: true } });
  });

  it('sends high-priority dual notify on insufficient Treasury for disbursement', async () => {
    await notifyMerchantInsufficientTreasuryForDisbursement({
      merchantId: 'merchant_xyz',
      appId: 'app_abc',
      referenceId: 'loan-disburse:app1',
      requiredAmountKobo: 1_000_000_00,
      treasuryWallet: fakeTreasury({ mainBalance: 5_000_00 }),
      productType: 'LOAN',
      applicationId: 'app1',
      userId: 'user_1'
    });

    expect(mockedFetchMerchantOwner).toHaveBeenCalledWith('merchant_xyz');
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/notifications/send-dual'),
      expect.objectContaining({
        userId: 'owner_1',
        email: 'merchant@example.com',
        template: 'treasury-insufficient-disbursement-merchant',
        priority: 'high',
        data: expect.objectContaining({
          productTypeLabel: 'loan',
          reference: 'loan-disburse:app1'
        })
      }),
      expect.any(Object)
    );
  });

  it('dedupes insufficient alerts for the same reference', async () => {
    const input = {
      merchantId: 'merchant_xyz',
      appId: 'app_abc',
      referenceId: 'loan-disburse:app1',
      requiredAmountKobo: 1_000_000_00,
      treasuryWallet: fakeTreasury()
    };
    await notifyMerchantInsufficientTreasuryForDisbursement(input);
    await notifyMerchantInsufficientTreasuryForDisbursement(input);
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
  });

  it('sends low-balance alert when balance is at/below threshold', async () => {
    const threshold = config.treasuryLowBalanceThresholdKobo;
    await notifyMerchantTreasuryLowBalance({
      merchantId: 'merchant_xyz',
      appId: 'app_abc',
      treasuryWallet: fakeTreasury({ mainBalance: threshold }),
      balanceAfterKobo: threshold
    });

    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/notifications/send-dual'),
      expect.objectContaining({
        template: 'treasury-low-balance-merchant',
        priority: 'high'
      }),
      expect.any(Object)
    );
  });

  it('skips low-balance alert when balance is above threshold', async () => {
    const threshold = config.treasuryLowBalanceThresholdKobo;
    await notifyMerchantTreasuryLowBalance({
      merchantId: 'merchant_xyz',
      appId: 'app_abc',
      treasuryWallet: fakeTreasury({ mainBalance: threshold + 1 }),
      balanceAfterKobo: threshold + 1
    });
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('respects low-balance cooldown for the same wallet', async () => {
    const threshold = config.treasuryLowBalanceThresholdKobo;
    const input = {
      merchantId: 'merchant_xyz',
      appId: 'app_abc',
      treasuryWallet: fakeTreasury({ mainBalance: 0 }),
      balanceAfterKobo: 0
    };
    await notifyMerchantTreasuryLowBalance(input);
    await notifyMerchantTreasuryLowBalance(input);
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
  });
});
