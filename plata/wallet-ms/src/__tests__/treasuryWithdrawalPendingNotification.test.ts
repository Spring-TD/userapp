import axios from 'axios';
import { notifyMerchantPendingTreasuryWithdrawal } from '../services/treasuryWithdrawalPendingNotificationService';
import { fetchMerchantOwner } from '../services/merchantOwnerClient';
import { TransactionStatus, TransactionType } from '../models/Wallet';

jest.mock('axios');
jest.mock('../services/merchantOwnerClient');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedFetchMerchantOwner = fetchMerchantOwner as jest.MockedFunction<typeof fetchMerchantOwner>;

describe('notifyMerchantPendingTreasuryWithdrawal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFetchMerchantOwner.mockResolvedValue({
      userId: 'owner_1',
      email: 'merchant@example.com',
      firstName: 'John',
      lastName: 'Dave'
    });
    mockedAxios.post.mockResolvedValue({ status: 200, data: { success: true } });
  });

  it('sends send-dual for pending savings withdrawal', async () => {
    await notifyMerchantPendingTreasuryWithdrawal({
      id: 'tx_1',
      walletId: 'wallet_1',
      amount: 100000,
      type: TransactionType.DEBIT,
      status: TransactionStatus.PENDING,
      description: 'Early withdrawal',
      referenceId: 'wd_ref_1',
      category: 'SAVINGS_EARLY_WITHDRAWAL',
      metadata: {
        appId: 'app_abc',
        merchantId: 'merchant_xyz',
        customerName: 'Jane Doe',
        productName: 'Rainy Day Savings'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });

    expect(mockedFetchMerchantOwner).toHaveBeenCalledWith('merchant_xyz');
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/notifications/send-dual'),
      expect.objectContaining({
        userId: 'owner_1',
        email: 'merchant@example.com',
        template: 'treasury-withdrawal-pending-merchant',
        priority: 'high',
        data: expect.objectContaining({
          customerName: 'Jane Doe',
          productName: 'Rainy Day Savings',
          reference: 'wd_ref_1'
        })
      }),
      expect.any(Object)
    );
  });

  it('skips non-withdrawal transactions', async () => {
    await notifyMerchantPendingTreasuryWithdrawal({
      id: 'tx_2',
      walletId: 'wallet_1',
      amount: 100000,
      type: TransactionType.CREDIT,
      status: TransactionStatus.PENDING,
      description: 'Deposit',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    expect(mockedAxios.post).not.toHaveBeenCalled();
  });
});
