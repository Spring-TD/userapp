import { railsFetchBanks, type RailsBank as PayonusBank } from './nubanRails';

export function normalizeBankName(name: string): string {
  return name.trim().toUpperCase().replace(/\s+/g, ' ');
}

function findBankByCode(banks: PayonusBank[], bankCode: string): PayonusBank | undefined {
  const code = bankCode.trim();
  return banks.find((bank) => bank.code === code);
}

function findBankByName(banks: PayonusBank[], bankName: string): PayonusBank | undefined {
  const normalized = normalizeBankName(bankName);
  return banks.find((bank) => normalizeBankName(bank.name) === normalized);
}

function bankListKeyForCurrency(currency?: string): string | undefined {
  const code = (currency || 'NGN').trim().toUpperCase();
  if (code === 'ZAR') return 'ZAR';
  return undefined;
}

/**
 * Resolve institution code + canonical bank name from the PayOnUs bank picker list.
 * Accepts either bankName (frontend picker label) or bankCode (legacy/direct).
 */
export async function resolveBankPickerSelection(params: {
  bankName?: string;
  bankCode?: string;
  currency?: string;
}): Promise<{ success: boolean; bankCode?: string; bankName?: string; error?: string }> {
  const bankName = params.bankName?.trim();
  const bankCode = params.bankCode?.trim();

  if (!bankName && !bankCode) {
    return { success: false, error: 'Either bankName or bankCode is required' };
  }

  const listKey = bankListKeyForCurrency(params.currency);
  const listResult = await railsFetchBanks(listKey ? { key: listKey } : undefined);
  if (!listResult.ok || listResult.banks.length === 0) {
    return { success: false, error: listResult.errorMessage || 'Unable to load bank list' };
  }

  if (bankCode) {
    const byCode = findBankByCode(listResult.banks, bankCode);
    if (!byCode) {
      return { success: false, error: 'Selected bank code was not found in the bank list' };
    }
    if (bankName && normalizeBankName(bankName) !== normalizeBankName(byCode.name)) {
      return {
        success: false,
        error: 'bankName does not match the selected bankCode'
      };
    }
    return { success: true, bankCode: byCode.code, bankName: byCode.name };
  }

  const byName = findBankByName(listResult.banks, bankName!);
  if (!byName) {
    return {
      success: false,
      error: `Bank "${bankName}" was not found. Pick a bank from GET /api/v1/wallets/banks.`
    };
  }

  return { success: true, bankCode: byName.code, bankName: byName.name };
}
