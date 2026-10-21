import axios from 'axios';
import { createAccountQuick, getTransactions } from '../services/bankone/bankoneClient';
import type { BankOneMerchantSettings } from '../models/MerchantBankingConfig';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const settings: BankOneMerchantSettings = {
  coreBaseUrl: 'https://staging.mybankone.com/BankOneWebAPI',
  authToken: 'test-token',
  institutionCode: '1234',
  productCode: '101',
  accountOfficerCode: '3004',
  apiVersion: '2',
  bankName: 'Charis MFB'
};

describe('bankoneClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps CreateAccountQuick success payload', async () => {
    mockedAxios.post.mockResolvedValue({
      status: 200,
      data: {
        IsSuccessful: true,
        ResponseObject: {
          AccountNumber: '0123456789',
          CustomerID: '99',
          TransactionTrackingRef: 'ref-1'
        }
      }
    });

    const result = await createAccountQuick(
      settings,
      {
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        phone: '08031234567',
        bvn: '22123456789',
        gender: 'female',
        dateOfBirth: '1990-09-19'
      },
      'SPRTRACK1'
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.accountNumber).toBe('0123456789');
      expect(result.data.providerReference).toBe('ref-1');
    }
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('CreateAccountQuick/2?authToken=test-token'),
      expect.objectContaining({
        LastName: 'Doe',
        OtherNames: 'Jane',
        Gender: '2',
        BVN: '22123456789'
      }),
      expect.any(Object)
    );
  });

  it('maps CreateAccountQuick failure message', async () => {
    mockedAxios.post.mockResolvedValue({
      status: 200,
      data: { IsSuccessful: false, Message: 'AuthToken is expired' }
    });
    const result = await createAccountQuick(settings, { fullName: 'A B' }, 'ref');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorMessage).toContain('AuthToken is expired');
    }
  });

  it('parses GetTransactions credits', async () => {
    mockedAxios.get.mockResolvedValue({
      status: 200,
      data: {
        IsSuccessful: true,
        Transactions: [
          {
            Amount: '1500',
            DebitCredit: 'Credit',
            TransactionReference: 'TX-1',
            Narration: 'equity-payment:app123'
          },
          {
            Amount: '200',
            DebitCredit: 'Debit',
            TransactionReference: 'TX-2',
            Narration: 'fee'
          }
        ]
      }
    });

    const result = await getTransactions(settings, '0123456789', new Date('2026-01-01'), new Date('2026-01-31'));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0].isCredit).toBe(true);
      expect(result.data[0].amount).toBe(1500);
      expect(result.data[1].isCredit).toBe(false);
    }
  });
});
