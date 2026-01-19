
import { Request, Response, NextFunction } from 'express';
import { authApiService } from '../services/authApiService';


export class InvitationController {

    static async createInvitation(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                res.status(401).json({ success: false, error: 'Authentication required' });
                return;
            }

            const response = await authApiService.createInvitation(token, req.body);

            if (response.success) {
                res.status(201).json(response);
            } else {
                res.status(400).json(response);
            }
        } catch (error: any) {
            next(error);
        }
    }

    static async getInvitations(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                res.status(401).json({ success: false, error: 'Authentication required' });
                return;
            }

            const response = await authApiService.getInvitations(token);

            if (response.success) {
                res.status(200).json(response);
            } else {
                res.status(400).json(response);
            }
        } catch (error: any) {
            next(error);
        }
    }

    static async validateInvitationToken(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { token } = req.params;
            const response = await authApiService.validateInvitationToken(token);

            if (response.success) {
                res.status(200).json(response);
            } else {
                res.status(404).json(response);
            }
        } catch (error: any) {
            next(error);
        }
    }

    static async acceptInvitation(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const response = await authApiService.acceptInvitation(req.body);

            if (response.success) {
                res.status(201).json(response);
            } else {
                res.status(400).json(response);
            }
        } catch (error: any) {
            next(error);
        }
    }
}
