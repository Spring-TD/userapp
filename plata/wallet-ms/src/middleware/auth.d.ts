import { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: string;
                email: string;
                userType: string;
                merchantId?: string;
                userMerchantId?: string;
                isOwner?: boolean;
                permissions?: string[];
            };
        }
    }
}
export declare const authenticate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/** Merchant owner or invited staff with a merchant tenant id. */
export declare const authorizeMerchant: (req: Request, res: Response, next: NextFunction) => void;
export declare const authorizeUser: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map