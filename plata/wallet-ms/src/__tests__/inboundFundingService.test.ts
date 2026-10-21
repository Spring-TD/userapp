import { processInboundFundingCredit } from '../services/inboundFundingService';
import { WalletService } from '../services/walletService';
import { WebhookEventModel } from '../models/WebhookEventModel';
import { forwardExternalEquityPaymentToProductMs } from '../services/productEquityWebhookService';

jest.mock('../services/walletService', () => ({
  WalletService: {
    updateWalletBalance: jest.fn()
  }
}));
jest.mock('../models/WebhookEventModel', () => ({
  WebhookEventModel: {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    updateOne: jest.fn()
  }
}));
jest.mock('../services/productEquityWebhookService', () => ({
  forwardExternalEquityPaymentToProductMs: jest.fn()
}));

const mockedWallet = WalletService as jest.Mocked<typeof WalletService>;
const mockedWebhook = WebhookEventModel as jest.Mocked<typeof WebhookEventModel>;
const mockedEquity = forwardExternalEquityPaymentToProductMs as jest.MockedFunction<
  typeof forwardExternalEquityPaymentToProductMs
>;

describe('processInboundFundingCredit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockedWebhook.findOne as jest.Mock).mockReturnValue({ lean: () => Promise.resolve(null) });
    (mockedWebhook.findOneAndUpdate as jest.Mock).mockResolvedValue({});
    (mockedWebhook.updateOne as jest.Mock).mockResolvedValue({});
  });

  it('returns duplicate when already processed', async () => {
    (mockedWebhook.findOne as jest.Mock).mockReturnValue({
      lean: () => Promise.resolve({ status: 'processed' })
    });
    const result = await processInboundFundingCredit({
      provider: 'bankone',
      transactionId: 'TX-1',
      amount: 100,
      walletId: 'w1'
    });
    expect(result.success).toBe(true);
    expect(result.duplicate).toBe(true);
    expect(mockedWallet.updateWalletBalance).not.toHaveBeenCalled();
  });

  it('credits wallet for normal inbound', async () => {
    (mockedWallet.updateWalletBalance as jest.Mock).mockResolvedValue({
      success: true,
      wallet: { mainBalance: 100, ledgerBalance: 100 }
    });
    const result = await processInboundFundingCredit({
      provider: 'bankone',
      transactionId: 'TX-2',
      amount: 100,
      walletId: 'w1',
      merchantId: 'm1'
    });
    expect(result.success).toBe(true);
    expect(mockedWallet.updateWalletBalance).toHaveBeenCalledWith('w1', 100, expect.any(String));
    expect(mockedWebhook.updateOne).toHaveBeenCalled();
  });

  it('routes equity-payment narration to product-ms', async () => {
    mockedEquity.mockResolvedValue({ success: true, duplicate: false });
    const result = await processInboundFundingCredit({
      provider: 'bankone',
      transactionId: 'TX-3',
      amount: 5000,
      walletId: 'w1',
      merchantId: 'm1',
      narration: 'equity-payment:app999'
    });
    expect(result.success).toBe(true);
    expect(mockedEquity).toHaveBeenCalledWith(
      expect.objectContaining({ applicationId: 'app999', providerReference: 'TX-3' })
    );
    expect(mockedWallet.updateWalletBalance).not.toHaveBeenCalled();
  });
});
