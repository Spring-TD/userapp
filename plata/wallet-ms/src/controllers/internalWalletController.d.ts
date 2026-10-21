import { Request, Response, NextFunction } from 'express';
export declare class InternalWalletController {
    /**
     * POST /internal/api/v1/wallets/user/provision
     * Idempotent: returns existing user wallet or creates one and provisions NUBAN
     * (BankOne when merchant banking config enabled, else PayOnUs).
     */
    static provisionUserWallet(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /internal/api/v1/wallets/user/credit
     * Idempotent loan disbursement credit for a user wallet under a product-creator merchant.
     */
    static creditUserWallet(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /internal/api/v1/wallets/treasury/disburse
     * Debit app-scoped Treasury and credit the user's wallet (loan / mortgage disbursement).
     */
    static disburseFromTreasury(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /internal/api/v1/wallets/treasury/debit-settlement
     * Debit app-scoped Treasury for outbound settlement (e.g. Spring Management Fee).
     */
    static debitTreasuryForSettlement(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /internal/api/v1/wallets/loan-repayment/collection
     * Idempotent repayment collection credit into the merchant settlement wallet.
     */
    static applyLoanRepaymentCollection(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /internal/api/v1/wallets/repayment/collect
     * Credit the app-scoped Repayment wallet (optionally debit user wallet first).
     */
    static collectToRepayment(req: Request, res: Response, next: NextFunction): Promise<void>;
    /** @deprecated Use collectToRepayment */
    static collectToSettlement(req: Request, res: Response, next: NextFunction): Promise<void>;
    static chargeMonthlyCustomerBilling(req: Request, res: Response, next: NextFunction): Promise<void>;
    static chargeBusinessKycFee(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * GET /internal/api/v1/wallets/merchant/:merchantId/type/:walletType?appId=
     * Service-to-service lookup of an app-scoped merchant wallet (includes virtual NUBAN).
     */
    static getMerchantWalletByType(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /internal/api/v1/wallets/savings/deposit-overview
     * Body: { appId: string, recentLimit?: number }
     * Recent completed SAVINGS_DEPOSIT credits for an app (REPAYMENT wallet ledger).
     */
    static savingsDepositOverview(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /internal/api/v1/wallets/savings/overview
     * Body: { appId: string, recentLimit?: number }
     * Full savings dashboard slice: activity deposits, withdrawals this month, pending requests.
     */
    static savingsOverview(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /internal/api/v1/wallets/investment/deposit-overview
     * Body: { appId: string, recentLimit?: number }
     * Recent completed INVESTMENT_DEPOSIT credits for an app (REPAYMENT wallet ledger).
     */
    static investmentDepositOverview(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /internal/api/v1/wallets/investment/overview
     * Body: { appId: string, recentLimit?: number }
     * Full investment dashboard slice: deposit activity, pending liquidations, paid-out liquidations.
     */
    static investmentOverview(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /internal/api/v1/wallets/commodity/deposit-overview
     * Body: { appId: string, recentLimit?: number }
     * Recent completed COMMODITY_DEPOSIT credits for an app (REPAYMENT wallet ledger).
     */
    static commodityDepositOverview(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /internal/api/v1/wallets/commodity/overview
     * Body: { appId: string, recentLimit?: number }
     * Full commodity dashboard slice: deposit activity, pending liquidations, paid-out liquidations.
     */
    static commodityOverview(req: Request, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=internalWalletController.d.ts.map