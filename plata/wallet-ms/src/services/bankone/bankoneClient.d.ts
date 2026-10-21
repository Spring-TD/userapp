import type { BankOneMerchantSettings } from '../../models/MerchantBankingConfig';
import type { ApplicantProfile } from '../nuban/types';
export type BankOneClientResult<T> = {
    ok: true;
    data: T;
    raw: Record<string, unknown>;
} | {
    ok: false;
    errorMessage: string;
    raw?: Record<string, unknown>;
};
export interface BankOneAccountDetails {
    accountNumber: string;
    customerId?: string;
    accountName?: string;
    providerReference?: string;
}
export interface BankOneBalanceDetails {
    availableBalance?: number;
    ledgerBalance?: number;
    raw: Record<string, unknown>;
}
export interface BankOneTransaction {
    transactionReference: string;
    amount: number;
    narration?: string;
    transactionDate?: string;
    isCredit: boolean;
    raw: Record<string, unknown>;
}
export declare function createAccountQuick(settings: BankOneMerchantSettings, profile: ApplicantProfile, trackingRef: string): Promise<BankOneClientResult<BankOneAccountDetails>>;
export declare function getAccountByAccountNumber(settings: BankOneMerchantSettings, accountNumber: string): Promise<BankOneClientResult<BankOneAccountDetails>>;
export declare function getBalance(settings: BankOneMerchantSettings, accountNumber: string): Promise<BankOneClientResult<BankOneBalanceDetails>>;
export declare function getTransactions(settings: BankOneMerchantSettings, accountNumber: string, fromDate: Date, toDate: Date, numberOfItems?: number): Promise<BankOneClientResult<BankOneTransaction[]>>;
//# sourceMappingURL=bankoneClient.d.ts.map