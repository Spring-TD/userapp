import { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Request {
            rawBody?: Buffer;
        }
    }
}
export declare class MonoDirectDebitController {
    static createMandate(req: Request, res: Response, next: NextFunction): Promise<void>;
    static balanceInquiry(req: Request, res: Response, next: NextFunction): Promise<void>;
    static initiateDebit(req: Request, res: Response, next: NextFunction): Promise<void>;
    static webhook(req: Request, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=monoDirectDebitController.d.ts.map