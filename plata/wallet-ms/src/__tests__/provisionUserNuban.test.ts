import { provisionUserWalletNuban } from '../services/nuban/provisionUserNuban';
import * as bankingConfigRepo from '../repositories/merchantBankingConfigRepository';
import * as bankoneAdapter from '../services/nuban/bankoneNubanAdapter';
import * as payonusProvisioning from '../services/payonusNubanProvisioning';
import type { UserWallet } from '../models/Wallet';
import { WalletStatus } from '../models/Wallet';

jest.mock('../repositories/merchantBankingConfigRepository');
jest.mock('../services/nuban/bankoneNubanAdapter');
jest.mock('../services/payonusNubanProvisioning');

const mockedConfig = bankingConfigRepo as jest.Mocked<typeof bankingConfigRepo>;
const mockedBankone = bankoneAdapter as jest.Mocked<typeof bankoneAdapter>;
const mockedPayonus = payonusProvisioning as jest.Mocked<typeof payonusProvisioning>;

function baseWallet(overrides: Partial<UserWallet> = {}): UserWallet {
  return {
    id: 'w1',
    userId: 'u1',
    merchantId: 'merchant_charis',
    name: 'Applicant',
    currency: 'NGN',
    balance: 0,
    mainBalance: 0,
    ledgerBalance: 0,
    status: WalletStatus.ACTIVE,
    walletType: 'USER',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
}

describe('provisionUserWalletNuban', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedConfig.isBankOneEnabledForMerchant.mockImplementation((c) =>
      Boolean(c && c.enabled && c.provider === 'bankone' && c.bankone)
    );
  });

  it('uses PayOnUs when merchant has no BankOne config', async () => {
    mockedConfig.getDecryptedBankOneConfig.mockResolvedValue(null);
    const payonusWallet = baseWallet({
      virtualNuban: {
        accountType: 'reserved',
        provisionStatus: 'active',
        provider: 'payonus',
        accountNumber: '111'
      }
    });
    mockedPayonus.provisionPayonusNubanForWallet.mockResolvedValue(payonusWallet);

    const result = await provisionUserWalletNuban(baseWallet({ merchantId: 'merchant_other' }), {
      bvn: '22123456789'
    });

    expect(mockedBankone.provisionBankOneNubanForUserWallet).not.toHaveBeenCalled();
    expect(mockedPayonus.provisionPayonusNubanForWallet).toHaveBeenCalled();
    expect(result.virtualNuban?.provider).toBe('payonus');
  });

  it('uses BankOne when enabled for merchant', async () => {
    mockedConfig.getDecryptedBankOneConfig.mockResolvedValue({
      id: 'c1',
      merchantId: 'merchant_charis',
      provider: 'bankone',
      enabled: true,
      fallbackToPayonus: true,
      bankone: {
        coreBaseUrl: 'https://staging.mybankone.com/BankOneWebAPI',
        authToken: 'tok',
        institutionCode: '1',
        productCode: '101',
        accountOfficerCode: '3004',
        apiVersion: '2'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });
    const bankoneWallet = baseWallet({
      virtualNuban: {
        accountType: 'reserved',
        provisionStatus: 'active',
        provider: 'bankone',
        accountNumber: '999'
      }
    });
    mockedBankone.provisionBankOneNubanForUserWallet.mockResolvedValue(bankoneWallet);

    const result = await provisionUserWalletNuban(baseWallet(), { bvn: '22123456789' });
    expect(mockedBankone.provisionBankOneNubanForUserWallet).toHaveBeenCalled();
    expect(mockedPayonus.provisionPayonusNubanForWallet).not.toHaveBeenCalled();
    expect(result.virtualNuban?.provider).toBe('bankone');
  });

  it('falls back to PayOnUs when BankOne fails and fallback enabled', async () => {
    mockedConfig.getDecryptedBankOneConfig.mockResolvedValue({
      id: 'c1',
      merchantId: 'merchant_charis',
      provider: 'bankone',
      enabled: true,
      fallbackToPayonus: true,
      bankone: {
        coreBaseUrl: 'https://staging.mybankone.com/BankOneWebAPI',
        authToken: 'tok',
        institutionCode: '1',
        productCode: '101',
        accountOfficerCode: '3004',
        apiVersion: '2'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });
    mockedBankone.provisionBankOneNubanForUserWallet.mockResolvedValue(
      baseWallet({
        virtualNuban: {
          accountType: 'reserved',
          provisionStatus: 'failed',
          provider: 'bankone',
          provisionError: 'AuthToken is expired'
        }
      })
    );
    mockedPayonus.provisionPayonusNubanForWallet.mockResolvedValue(
      baseWallet({
        virtualNuban: {
          accountType: 'reserved',
          provisionStatus: 'active',
          provider: 'payonus',
          accountNumber: '222'
        }
      })
    );

    const result = await provisionUserWalletNuban(baseWallet(), { bvn: '22123456789' });
    expect(mockedPayonus.provisionPayonusNubanForWallet).toHaveBeenCalled();
    expect(result.virtualNuban?.provider).toBe('payonus');
  });
});
