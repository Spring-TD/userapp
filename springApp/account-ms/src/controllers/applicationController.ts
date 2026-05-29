import { Request, Response } from 'express';
import applicationService from '../services/applicationService';
import { AuthRequest } from '../middleware/authMiddleware';

function errorStatus(error: any): number {
    if (typeof error?.statusCode === 'number') {
        return error.statusCode;
    }
    return 500;
}

class ApplicationController {
    // Apply for a product
    async applyForProduct(req: Request, res: Response) {
        try {
            const {
                userId,
                productId,
                amount,
                currency,
                email,
                applicantName,
                phone,
                bvn,
                offeringMerchantName,
                country,
                integratorMerchantId,
                integratorMerchantName,
                productCreatorMerchantName,
                subMerchant,
                subMerchantContactEmail,
                subMerchantContactPhone,
                requirementSubmissions
            } = req.body;

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
                email,
                applicantName,
                phone,
                bvn,
                offeringMerchantName,
                country,
                integratorMerchantId,
                integratorMerchantName,
                productCreatorMerchantName,
                subMerchant,
                subMerchantContactEmail,
                subMerchantContactPhone,
                requirementSubmissions
            });

            res.status(201).json(result);
            return;
        } catch (error: any) {
            console.error('Error in applyForProduct:', error);
            const isForbidden = error?.message?.includes('not active for this merchant');
            res.status(typeof error?.statusCode === 'number' ? error.statusCode : isForbidden ? 403 : 500).json({
                success: false,
                error: error.message || 'Internal server error'
            });
            return;
        }
    }

    // Approve application
    async approveApplication(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const adminId = (req as AuthRequest).adminId;

            if (!adminId) {
                // Should be caught by middleware, but safe check
                res.status(403).json({
                    success: false,
                    error: 'Admin ID is required'
                });
                return;
            }

            const result = await applicationService.approveApplication(id, adminId);
            res.status(200).json(result);
            return;
        } catch (error: any) {
            console.error('Error in approveApplication:', error);
            res.status(errorStatus(error)).json({
                success: false,
                error: error.message || 'Internal server error'
            });
            return;
        }
    }

    // Reject application
    async rejectApplication(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const adminId = (req as AuthRequest).adminId;

            if (!adminId) {
                res.status(403).json({
                    success: false,
                    error: 'Admin ID is required'
                });
                return;
            }

            if (!reason) {
                return res.status(400).json({
                    success: false,
                    error: 'Rejection reason is required'
                });
            }

            const result = await applicationService.rejectApplication(id, reason, adminId);
            res.status(200).json(result);
            return;
        } catch (error: any) {
            console.error('Error in rejectApplication:', error);
            res.status(errorStatus(error)).json({
                success: false,
                error: error.message || 'Internal server error'
            });
            return;
        }
    }

    // Get all applications (admin: all; merchant: scoped to token merchantId)
    async getAllApplications(req: Request, res: Response) {
        try {
            const authReq = req as AuthRequest;
            const applications = await applicationService.getAllApplications(authReq.applicationsMerchantIdFilter);
            res.status(200).json({
                success: true,
                data: applications
            });
            return;
        } catch (error: any) {
            console.error('Error in getAllApplications:', error);
            res.status(errorStatus(error)).json({
                success: false,
                error: error.message || 'Internal server error'
            });
            return;
        }
    }

    // Get pending applications (admin: all pending; merchant: pending for their apps only)
    async getPendingApplications(req: Request, res: Response) {
        try {
            const authReq = req as AuthRequest;
            const applications = await applicationService.getPendingApplications(authReq.applicationsMerchantIdFilter);
            res.status(200).json({
                success: true,
                data: applications
            });
            return;
        } catch (error: any) {
            console.error('Error in getPendingApplications:', error);
            res.status(errorStatus(error)).json({
                success: false,
                error: error.message || 'Internal server error'
            });
            return;
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
            return;
        } catch (error: any) {
            console.error('Error in getUserApplications:', error);
            res.status(errorStatus(error)).json({
                success: false,
                error: error.message || 'Internal server error'
            });
            return;
        }
    }

    // Get user loan applications
    async getUserLoanApplications(req: Request, res: Response) {
        try {
            const { userId } = req.params;
            const applications = await applicationService.getUserApplicationsByType(userId, 'Loan');
            res.status(200).json({
                success: true,
                data: applications
            });
            return;
        } catch (error: any) {
            console.error('Error in getUserLoanApplications:', error);
            res.status(errorStatus(error)).json({
                success: false,
                error: error.message || 'Internal server error'
            });
            return;
        }
    }

    // Get user mortgage applications
    async getUserMortgageApplications(req: Request, res: Response) {
        try {
            const { userId } = req.params;
            const applications = await applicationService.getUserApplicationsByType(userId, 'Mortgage');
            res.status(200).json({
                success: true,
                data: applications
            });
            return;
        } catch (error: any) {
            console.error('Error in getUserMortgageApplications:', error);
            res.status(errorStatus(error)).json({
                success: false,
                error: error.message || 'Internal server error'
            });
            return;
        }
    }

    // Get blacklisted mortgage applications (admin: all; merchant: scoped)
    async getBlacklistedMortgageApplications(req: Request, res: Response) {
        try {
            const authReq = req as AuthRequest;
            const applications = await applicationService.getBlacklistedMortgageApplications(authReq.applicationsMerchantIdFilter);
            res.status(200).json({
                success: true,
                data: applications
            });
            return;
        } catch (error: any) {
            console.error('Error in getBlacklistedMortgageApplications:', error);
            res.status(errorStatus(error)).json({
                success: false,
                error: error.message || 'Internal server error'
            });
            return;
        }
    }

    // Blacklist a mortgage application
    async blacklistMortgageApplication(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const adminId = (req as AuthRequest).adminId;

            if (!adminId) {
                res.status(403).json({
                    success: false,
                    error: 'Admin ID is required'
                });
                return;
            }

            if (!reason) {
                return res.status(400).json({
                    success: false,
                    error: 'Blacklist reason is required'
                });
            }

            const result = await applicationService.blacklistMortgageApplication(id, reason, adminId);
            res.status(200).json(result);
            return;
        } catch (error: any) {
            console.error('Error in blacklistMortgageApplication:', error);
            res.status(errorStatus(error)).json({
                success: false,
                error: error.message || 'Internal server error'
            });
            return;
        }
    }

    // Get application by ID
    async getApplicationById(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const application = await applicationService.getApplicationById(id);

            if (!application) {
                return res.status(404).json({
                    success: false,
                    error: 'Application not found'
                });
            }

            res.status(200).json({
                success: true,
                data: application
            });
            return;
        } catch (error: any) {
            console.error('Error in getApplicationById:', error);
            res.status(errorStatus(error)).json({
                success: false,
                error: error.message || 'Internal server error'
            });
            return;
        }
    }
}

export default new ApplicationController();
