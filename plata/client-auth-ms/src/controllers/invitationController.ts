
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';

export class InvitationController {

    static async createInvitation(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            // Check if user is authenticated
            if (!req.user || !req.user.userMerchantId) {
                res.status(401).json({ 
                    success: false, 
                    error: 'Unauthorized',
                    message: 'User authentication required'
                });
                return;
            }

            const schema = {
                email: req.body.email,
                roleId: req.body.roleId
            };

            // Basic validation
            if (!schema.email || !schema.roleId) {
                res.status(400).json({
                    success: false,
                    error: 'Validation error',
                    details: 'Email and roleId are required'
                });
                return;
            }

            const merchantId = req.user.userMerchantId || req.user.userId;
            const response = await AuthService.createInvitation(merchantId, req.body);

            if (response.success) {
                res.status(201).json({
                    success: true,
                    message: 'Invitation sent successfully',
                    data: { invitation: response.invitation }
                });
            } else {
                res.status(400).json(response);
            }
        } catch (error: any) {
            next(error);
        }
    }

    static async getInvitations(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            // Check if user is authenticated
            if (!req.user || !req.user.userMerchantId) {
                res.status(401).json({ 
                    success: false, 
                    error: 'Unauthorized',
                    message: 'User authentication required'
                });
                return;
            }

            const merchantId = req.user.userMerchantId || req.user.userId;
            const response = await AuthService.getInvitations(merchantId);

            if (response.success) {
                res.status(200).json({
                    success: true,
                    data: { invitations: response.invitations }
                });
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
            const response = await AuthService.validateInvitationToken(token);

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
            // Basic validation
            const schema = {
                token: req.body.token,
                firstName: req.body.firstName,
                lastName: req.body.lastName,
                password: req.body.password
            };

            if (!schema.token || !schema.firstName || !schema.lastName || !schema.password) {
                res.status(400).json({
                    success: false,
                    error: 'Validation error',
                    details: 'Token, firstName, lastName, and password are required'
                });
                return;
            }

            const response = await AuthService.acceptInvitation(req.body);

            if (response.success) {
                res.status(201).json({
                    success: true,
                    message: 'Invitation accepted and account created',
                    data: {
                        user: {
                            id: response.user?.id,
                            email: response.user?.email,
                            first_name: response.user?.first_name,
                            last_name: response.user?.last_name
                        }
                    }
                });
            } else {
                res.status(400).json(response);
            }
        } catch (error: any) {
            next(error);
        }
    }
}
