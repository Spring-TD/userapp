import { TransactionStatus, TransactionType } from '../models/Wallet';
import { handleTransactionRecorded } from '../services/transactionReceiptService';
import { AppTransactionMirrorService } from '../services/appTransactionMirrorService';
import { db } from '../db/database';
import axios from 'axios';

jest.mock('../db/database', () => ({
  db: {
    getWalletById: jest.fn()
  }
}));

jest.mock('../services/appTransactionMirrorService', () => ({
  AppTransactionMirrorService: {
    recordTransaction: jest.fn()
  }
}));

jest.mock('../services/authProfileClient', () => ({
  fetchRetailUserProfile: jest.fn(async () => ({
    userId: 'user_1',
    email: 'jane@example.com',
    firstName: 'Jane',
    lastName: 'Doe'
  })),
  fetchMerchantOwner: jest.fn(),
  formatPersonName: jest.fn((f?: string, l?: string, fb?: string) =>
    `${f || ''} ${l || ''}`.trim() || fb || 'Customer'
  )
}));

jest.mock('axios');
jest.mock('../config/environment', () => ({
  config: {
    jwtSecret: 'test-secret',
    notificationsServiceUrl: 'http://notifications.test',
    createAppServiceUrl: '',
    walletPublicBaseUrl: 'http://wallet.test'
  }
}));

const mockedDb = db as jest.Mocked<typeof db>;
const mockedMirror = AppTransactionMirrorService.recordTransaction as jest.Mock;
const mockedAxios = axios.post as jest.Mock;

const userWallet = {
  id: 'wallet_1',
  userId: 'user_1',
  appId: 'app_1',
  walletType: 'USER' as const,
  walletPurpose: 'PRIMARY' as const,
  name: 'Primary Wallet',
  currency: 'NGN',
  mainBalance: 7500,
  ledgerBalance: 7500,
  status: 'ACTIVE' as const
};

const completedTxn = {
  id: '665f1a2b3c4d5e6f70819200',
  walletId: 'wallet_1',
  amount: -2500,
  type: TransactionType.DEBIT,
  status: TransactionStatus.COMPLETED,
  description: 'Loan repayment',
  referenceId: 'REF-123',
  category: 'LOAN_REPAYMENT',
  source: 'BILLING_MS',
  balanceAfter: 7500,
  createdAt: new Date('2026-07-10T09:00:00.000Z'),
  updatedAt: new Date('2026-07-10T09:00:00.000Z')
};

describe('handleTransactionRecorded', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedDb.getWalletById.mockResolvedValue(userWallet as never);
    mockedMirror.mockResolvedValue(undefined);
    mockedAxios.mockResolvedValue({ status: 200 });
  });

  it('mirrors non-PAYONUS completed transactions to create-app-ms', async () => {
    await handleTransactionRecorded(completedTxn as never);

    expect(mockedMirror).toHaveBeenCalledWith(
      expect.objectContaining({
        appId: 'app_1',
        userId: 'user_1',
        type: 'debit',
        status: 'completed',
        provider: 'wallet-ms',
        providerReference: completedTxn.id
      })
    );
  });

  it('sends wallet-transaction-receipt notification for completed user wallet txns', async () => {
    await handleTransactionRecorded(completedTxn as never);

    expect(mockedAxios).toHaveBeenCalledWith(
      'http://notifications.test/api/v1/notifications/send-dual',
      expect.objectContaining({
        userId: 'user_1',
        email: 'jane@example.com',
        template: 'wallet-transaction-receipt'
      }),
      expect.any(Object)
    );
  });

  it('skips PAYONUS transactions (handled by dedicated payout/funding flows)', async () => {
    await handleTransactionRecorded({
      ...completedTxn,
      source: 'PAYONUS'
    } as never);

    expect(mockedMirror).not.toHaveBeenCalled();
    expect(mockedAxios).not.toHaveBeenCalled();
  });

  it('mirrors but does not notify for pending transactions', async () => {
    await handleTransactionRecorded({
      ...completedTxn,
      status: TransactionStatus.PENDING
    } as never);

    expect(mockedMirror).toHaveBeenCalled();
    expect(mockedAxios).not.toHaveBeenCalled();
  });
});
