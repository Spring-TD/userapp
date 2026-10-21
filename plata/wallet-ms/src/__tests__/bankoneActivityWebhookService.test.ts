import {
  extractBankOneWebhookToken,
  normalizeBankOneActivityEventType,
  processBankOneActivityWebhook,
  verifyBankOneWebhookToken
} from '../services/bankone/bankoneActivityWebhookService';
import { WalletService } from '../services/walletService';
import { processInboundFundingCredit } from '../services/inboundFundingService';
import { WebhookEventModel } from '../models/WebhookEventModel';

jest.mock('../services/walletService', () => ({
  WalletService: {
    getWalletByVirtualAccountNumber: jest.fn(),
    updateWalletBalance: jest.fn()
  }
}));
jest.mock('../services/inboundFundingService', () => ({
  processInboundFundingCredit: jest.fn()
}));
jest.mock('../models/WebhookEventModel', () => ({
  WebhookEventModel: {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    updateOne: jest.fn()
  }
}));

const mockedWallet = WalletService as jest.Mocked<typeof WalletService>;
const mockedCredit = processInboundFundingCredit as jest.MockedFunction<
  typeof processInboundFundingCredit
>;
const mockedWebhook = WebhookEventModel as jest.Mocked<typeof WebhookEventModel>;

describe('bankoneActivityWebhookService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockedWebhook.findOne as jest.Mock).mockReturnValue({ lean: () => Promise.resolve(null) });
    (mockedWebhook.findOneAndUpdate as jest.Mock).mockResolvedValue({});
    (mockedWebhook.updateOne as jest.Mock).mockResolvedValue({});
  });

  it('normalizes event types', () => {
    expect(normalizeBankOneActivityEventType('CreditAlert')).toBe('credit');
    expect(normalizeBankOneActivityEventType('account.created')).toBe('account.created');
    expect(normalizeBankOneActivityEventType('DEBIT')).toBe('debit');
    expect(normalizeBankOneActivityEventType('status.update')).toBe('other');
  });

  it('extracts token from headers and query', () => {
    expect(
      extractBankOneWebhookToken({
        headers: { 'x-bankone-webhook-token': 'abc' }
      })
    ).toBe('abc');
    expect(
      extractBankOneWebhookToken({
        headers: { authorization: 'Bearer xyz' }
      })
    ).toBe('xyz');
    expect(
      extractBankOneWebhookToken({
        headers: {},
        query: { authToken: 'qtok' }
      })
    ).toBe('qtok');
  });

  it('verifies webhook token', () => {
    expect(verifyBankOneWebhookToken('secret', 'secret', true)).toBe(true);
    expect(verifyBankOneWebhookToken('secret', 'wrong', true)).toBe(false);
    expect(verifyBankOneWebhookToken('', undefined, false)).toBe(true);
  });

  it('acknowledges account.created events', async () => {
    (mockedWallet.getWalletByVirtualAccountNumber as jest.Mock).mockResolvedValue({
      success: true,
      wallet: { id: 'w1', walletType: 'USER', userId: 'u1', merchantId: 'm1' }
    });
    const result = await processBankOneActivityWebhook({
      eventType: 'account.created',
      accountNumber: '1234567890',
      eventId: 'evt-1'
    });
    expect(result.success).toBe(true);
    expect(result.eventType).toBe('account.created');
    expect(result.acknowledged).toBe(true);
    expect(mockedCredit).not.toHaveBeenCalled();
  });

  it('routes credits through inbound funding', async () => {
    (mockedWallet.getWalletByVirtualAccountNumber as jest.Mock).mockResolvedValue({
      success: true,
      wallet: { id: 'w1', walletType: 'USER', userId: 'u1', merchantId: 'm1' }
    });
    mockedCredit.mockResolvedValue({ success: true, data: { walletId: 'w1' } });
    const result = await processBankOneActivityWebhook({
      EventType: 'Credit',
      AccountNumber: '1234567890',
      Amount: 2500,
      TransactionReference: 'TX-9'
    });
    expect(result.success).toBe(true);
    expect(result.eventType).toBe('credit');
    expect(mockedCredit).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'bankone',
        transactionId: 'TX-9',
        amount: 2500,
        walletId: 'w1'
      })
    );
  });

  it('debits wallets for debit events', async () => {
    (mockedWallet.getWalletByVirtualAccountNumber as jest.Mock).mockResolvedValue({
      success: true,
      wallet: { id: 'w1', walletType: 'USER', userId: 'u1', merchantId: 'm1' }
    });
    (mockedWallet.updateWalletBalance as jest.Mock).mockResolvedValue({
      success: true,
      wallet: { mainBalance: 500, ledgerBalance: 500 }
    });
    const result = await processBankOneActivityWebhook({
      eventType: 'debit',
      accountNumber: '1234567890',
      amount: 100,
      transactionId: 'DB-1'
    });
    expect(result.success).toBe(true);
    expect(result.eventType).toBe('debit');
    expect(mockedWallet.updateWalletBalance).toHaveBeenCalledWith('w1', -100, expect.any(String));
  });
});
