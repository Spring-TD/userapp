import { db } from '../db/database';
import type { UserExternalBankAccount } from '../models/UserExternalBankAccount';
import { railsNameEnquiry } from './nubanRails';
import { resolveBankPickerSelection } from './bankListResolver';
import { fetchRetailUserKycIdentity } from './complianceApplicantClient';
import { bankAccountNameMatchesKyc, bankAccountNamesCloselyMatch } from '../utils/bankAccountNameMatch';
import { logger } from '../utils/logger';

const MAX_SAVED_ACCOUNTS_PER_USER = 5;

export class UserExternalBankAccountService {
  static async assertBankAccountOwnership(
    userId: string,
    bankAccountName: string
  ): Promise<{ success: boolean; error?: string }> {
    const identityResult = await fetchRetailUserKycIdentity(userId);
    if (!identityResult.success || !identityResult.identity) {
      return { success: false, error: identityResult.error || 'KYC identity verification failed' };
    }

    if (!bankAccountNameMatchesKyc(bankAccountName, identityResult.identity.legalName)) {
      return {
        success: false,
        error:
          'Bank account name does not match your verified KYC identity. You can only save accounts registered in your name.'
      };
    }

    return { success: true };
  }

  static async list(userId: string): Promise<{ success: boolean; accounts?: UserExternalBankAccount[]; error?: string }> {
    try {
      const accounts = await db.listActiveUserExternalBankAccounts(userId);
      return { success: true, accounts };
    } catch (error) {
      logger.error('Failed to list user external bank accounts', { userId, error });
      return { success: false, error: 'Failed to list saved bank accounts' };
    }
  }

  static async add(params: {
    userId: string;
    accountNumber: string;
    bankName?: string;
    bankCode?: string;
    accountName?: string;
    label?: string;
    currency?: string;
  }): Promise<{ success: boolean; account?: UserExternalBankAccount; error?: string }> {
    try {
      const accountNumber = params.accountNumber.trim();
      const currency = (params.currency || 'NGN').trim().toUpperCase();

      const bankResolution = await resolveBankPickerSelection({
        bankName: params.bankName,
        bankCode: params.bankCode,
        currency
      });
      if (!bankResolution.success || !bankResolution.bankCode || !bankResolution.bankName) {
        return { success: false, error: bankResolution.error || 'Unable to resolve bank' };
      }

      const bankCode = bankResolution.bankCode;
      const bankName = bankResolution.bankName;

      const count = await db.countActiveUserExternalBankAccounts(params.userId);
      if (count >= MAX_SAVED_ACCOUNTS_PER_USER) {
        return {
          success: false,
          error: `You can save at most ${MAX_SAVED_ACCOUNTS_PER_USER} external bank accounts`
        };
      }

      const verification = await railsNameEnquiry({ accountNumber, bankCode, currency });
      if (!verification.ok || !verification.accountName) {
        return { success: false, error: verification.errorMessage || 'Bank account verification failed' };
      }

      const resolvedAccountName = verification.accountName.trim();
      const submittedAccountName = params.accountName?.trim();
      if (submittedAccountName && !bankAccountNamesCloselyMatch(submittedAccountName, resolvedAccountName)) {
        return {
          success: false,
          error:
            'Account name does not match the bank records for this account number. Confirm the account details and try again.'
        };
      }

      const ownership = await this.assertBankAccountOwnership(params.userId, resolvedAccountName);
      if (!ownership.success) {
        return { success: false, error: ownership.error };
      }

      const isDefault = count === 0;
      if (isDefault) {
        await db.clearDefaultUserExternalBankAccounts(params.userId);
      }

      const account = await db.createUserExternalBankAccount({
        userId: params.userId,
        accountNumber: verification.accountNumber || accountNumber,
        bankCode: verification.bankCode || bankCode,
        bankName: verification.bankName || bankName,
        accountName: resolvedAccountName,
        label: params.label?.trim() || undefined,
        currency,
        isDefault,
        verifiedAt: new Date()
      });

      logger.info('User external bank account saved', { userId: params.userId, accountId: account.id });
      return { success: true, account };
    } catch (error) {
      const mongo = error as { code?: number; message?: string };
      if (mongo?.code === 11000) {
        return { success: false, error: 'This bank account is already saved' };
      }
      logger.error('Failed to add user external bank account', { userId: params.userId, error });
      return { success: false, error: 'Failed to save bank account' };
    }
  }

  static async remove(
    userId: string,
    accountId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const deleted = await db.softDeleteUserExternalBankAccount(userId, accountId);
      if (!deleted) {
        return { success: false, error: 'Saved bank account not found' };
      }

      if (deleted.isDefault) {
        await db.promoteFirstActiveUserExternalBankAccountAsDefault(userId);
      }

      logger.info('User external bank account removed', { userId, accountId });
      return { success: true };
    } catch (error) {
      logger.error('Failed to remove user external bank account', { userId, accountId, error });
      return { success: false, error: 'Failed to remove saved bank account' };
    }
  }

  static async setDefault(
    userId: string,
    accountId: string
  ): Promise<{ success: boolean; account?: UserExternalBankAccount; error?: string }> {
    try {
      const account = await db.setDefaultUserExternalBankAccount(userId, accountId);
      if (!account) {
        return { success: false, error: 'Saved bank account not found' };
      }
      return { success: true, account };
    } catch (error) {
      logger.error('Failed to set default user external bank account', { userId, accountId, error });
      return { success: false, error: 'Failed to update default bank account' };
    }
  }

  static async resolveForPayout(
    userId: string,
    savedBankAccountId: string
  ): Promise<{ success: boolean; account?: UserExternalBankAccount; error?: string }> {
    const account = await db.getActiveUserExternalBankAccount(userId, savedBankAccountId.trim());
    if (!account) {
      return { success: false, error: 'Saved bank account not found. Add the account before paying out.' };
    }

    const ownership = await this.assertBankAccountOwnership(userId, account.accountName);
    if (!ownership.success) {
      return { success: false, error: ownership.error };
    }

    return { success: true, account };
  }
}
