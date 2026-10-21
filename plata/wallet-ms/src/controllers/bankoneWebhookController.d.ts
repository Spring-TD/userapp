import { Request, Response, NextFunction } from 'express';
export declare class BankOneWebhookController {
    /**
     * GET /api/v1/wallets/bankone/webhook
     * Health / discovery for Charis BankOne activity webhook registration.
     */
    static getInfo(req: Request, res: Response): Promise<void>;
    /**
     * POST /api/v1/wallets/bankone/webhook
     * Charis pushes account activity for our applicants (NUBAN create, credit, debit, etc.).
     */
    static handleActivity(req: Request, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=bankoneWebhookController.d.ts.map