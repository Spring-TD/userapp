import { Request, Response, NextFunction } from 'express';
import { UserType } from '../types/kycTypes';
declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: string;
                userType: UserType;
                email?: string;
                token?: string;
            };
        }
    }
}
export declare const authenticate: (req: Request, res: Response, next: NextFunction) => any;
export declare const isAdmin: (req: Request, res: Response, next: NextFunction) => any;
export declare const isMerchant: (req: Request, res: Response, next: NextFunction) => any;
export declare const isIndividual: (req: Request, res: Response, next: NextFunction) => any;
//# sourceMappingURL=auth.d.ts.map