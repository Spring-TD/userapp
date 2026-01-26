
import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { invitationService } from '../services/invitationService';


export class InvitationController {

    static async createInvitation(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const schema = Joi.object({
                email: Joi.string().email().required(),
                roleId: Joi.string().required()
            });

            const validation = schema.validate(req.body);
            if (validation.error) {
                res.status(400).json({
                    success: false,
                    error: 'Validation error',
                    details: validation.error.details
                });
                return;
            }

            if (!req.user || !req.user.userMerchantId) {
                res.status(401).json({
                    success: false,
                    error: 'Unauthorized',
                    message: 'User authentication required'
                });
                return;
            }

            const invitation = await invitationService.createInvitation(req.user.userMerchantId, req.body);

            res.status(201).json({
                success: true,
                message: 'Invitation sent successfully',
                data: { invitation }
            });
        } catch (error: any) {
            next(error);
        }
    }

    static async getInvitations(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user || !req.user.userMerchantId) {
                res.status(401).json({
                    success: false,
                    error: 'Unauthorized',
                    message: 'User authentication required'
                });
                return;
            }

            const invitations = await invitationService.getInvitations(req.user.userMerchantId);

            res.status(200).json({
                success: true,
                data: { invitations }
            });
        } catch (error: any) {
            next(error);
        }
    }

    static async validateInvitation(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { token } = req.params;
            if (!token) {
                res.status(400).json({
                    success: false,
                    error: 'Token is required'
                });
                return;
            }
            const details = await invitationService.validateInvitationToken(token);

            if (!details) {
                res.status(404).json({
                    success: false,
                    error: 'Invalid or expired invitation token'
                });
                return;
            }

            res.status(200).json({
                success: true,
                data: details
            });
        } catch (error: any) {
            next(error);
        }
    }

    static async acceptInvitation(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const schema = Joi.object({
                token: Joi.string().required(),
                firstName: Joi.string().required(),
                lastName: Joi.string().required(),
                password: Joi.string().min(8).required(), // Add password complexity regex if needed
                phone: Joi.string().optional()
            });

            const validation = schema.validate(req.body);
            if (validation.error) {
                res.status(400).json({
                    success: false,
                    error: 'Validation error',
                    details: validation.error.details
                });
                return;
            }

            const { token, ...userData } = req.body;
            const user = await invitationService.acceptInvitation(token, userData);

            res.status(201).json({
                success: true,
                message: 'Invitation accepted and account created',
                data: {
                    user: {
                        id: user.id,
                        email: user.email,
                        first_name: user.first_name,
                        last_name: user.last_name
                    }
                }
            });
        } catch (error: any) {
            next(error);
        }
    }
}
