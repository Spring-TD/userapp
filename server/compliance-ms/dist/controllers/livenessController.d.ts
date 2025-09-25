import { Request, Response, NextFunction } from 'express';
export declare class LivenessController {
    static handleLivenessResult(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    static checkLivenessStatus(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    static generateLivenessTest(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
}
//# sourceMappingURL=livenessController.d.ts.map