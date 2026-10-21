import { Request, Response, NextFunction } from 'express';
export declare class BankingConfigController {
    /**
     * GET /internal/api/v1/banking-config/:merchantId
     */
    static get(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * PUT /internal/api/v1/banking-config/:merchantId
     */
    static upsert(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /internal/api/v1/banking-config/:merchantId/sync-credits
     * Ops/test: run BankOne inbound credit sync for one merchant immediately.
     */
    static syncCredits(req: Request, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=bankingConfigController.d.ts.map