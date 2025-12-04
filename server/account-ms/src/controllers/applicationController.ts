import { Request, Response } from 'express';
import applicationService from '../services/applicationService';

class ApplicationController {
    // Apply for a product
    async applyForProduct(req: Request, res: Response) {
        try {
            const { userId, productId, amount, currency, email } = req.body;

            if (!userId || !productId || !amount || !currency) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields: userId, productId, amount, currency'
                });
            }

            const result = await applicationService.applyForProduct({
                userId,
                productId,
                amount,
                currency,
                email
            });

            res.status(201).json(result);
        } catch (error: any) {
            console.error('Error in applyForProduct:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Internal server error'
            });
        }
    }

    // Approve application
    async approveApplication(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { adminId } = req.body; // In a real app, this would come from auth token

            if (!adminId) {
                return res.status(400).json({
                    success: false,
                    error: 'Admin ID is required'
                });
            }

            const result = await applicationService.approveApplication(id, adminId);
            res.status(200).json(result);
        } catch (error: any) {
            console.error('Error in approveApplication:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Internal server error'
            });
        }
    }

    // Reject application
    async rejectApplication(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { reason, adminId } = req.body;

            if (!adminId) {
                return res.status(400).json({
                    success: false,
                    error: 'Admin ID is required'
                });
            }

            if (!reason) {
                return res.status(400).json({
                    success: false,
                    error: 'Rejection reason is required'
                });
            }

            const result = await applicationService.rejectApplication(id, reason, adminId);
            res.status(200).json(result);
        } catch (error: any) {
            console.error('Error in rejectApplication:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Internal server error'
            });
        }
    }

    // Get all applications
    async getAllApplications(req: Request, res: Response) {
        try {
            const applications = await applicationService.getAllApplications();
            res.status(200).json({
                success: true,
                data: applications
            });
        } catch (error: any) {
            console.error('Error in getAllApplications:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Internal server error'
            });
        }
    }

    // Get pending applications
    async getPendingApplications(req: Request, res: Response) {
        try {
            const applications = await applicationService.getPendingApplications();
            res.status(200).json({
                success: true,
                data: applications
            });
        } catch (error: any) {
            console.error('Error in getPendingApplications:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Internal server error'
            });
        }
    }

    // Get user applications
    async getUserApplications(req: Request, res: Response) {
        try {
            const { userId } = req.params;
            const applications = await applicationService.getUserApplications(userId);
            res.status(200).json({
                success: true,
                data: applications
            });
        } catch (error: any) {
            console.error('Error in getUserApplications:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Internal server error'
            });
        }
    }
}

export default new ApplicationController();
