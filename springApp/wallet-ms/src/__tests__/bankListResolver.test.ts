import { normalizeBankName, resolveBankPickerSelection } from '../services/bankListResolver';
import { railsFetchBanks } from '../services/nubanRails';

jest.mock('../services/nubanRails', () => ({
  railsFetchBanks: jest.fn()
}));

const mockedFetchBanks = railsFetchBanks as jest.MockedFunction<typeof railsFetchBanks>;

describe('bankListResolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFetchBanks.mockResolvedValue({
      ok: true,
      banks: [
        { code: '058', name: 'GTBank' },
        { code: '100004', name: 'OPay' }
      ]
    });
  });

  it('normalizes bank names for comparison', () => {
    expect(normalizeBankName('  gt  bank ')).toBe('GT BANK');
  });

  it('resolves bankCode from bankName', async () => {
    const result = await resolveBankPickerSelection({ bankName: 'GTBank' });
    expect(result).toEqual({ success: true, bankCode: '058', bankName: 'GTBank' });
  });

  it('resolves bankName from bankCode', async () => {
    const result = await resolveBankPickerSelection({ bankCode: '100004' });
    expect(result).toEqual({ success: true, bankCode: '100004', bankName: 'OPay' });
  });

  it('rejects unknown bank names', async () => {
    const result = await resolveBankPickerSelection({ bankName: 'Unknown Bank' });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });
});
