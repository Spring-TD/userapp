
import { Request, Response } from 'express';
import { RoleService } from '../services/RoleService';

export class RoleController {

    static async createRole(req: Request, res: Response): Promise<void> {
        try {
            // Check if user is authenticated and get merchant ID from user context
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
                return;
            }

            // Only merchants and admins should be able to create roles
            if (req.user.userType !== 'merchant' && req.user.userType !== 'admin') {
                res.status(403).json({
                    success: false,
                    error: 'Insufficient permissions to create roles'
                });
                return;
            }

            const roleData = req.body;
            const merchantId = req.user.userMerchantId || req.user.userId;

            const result = await RoleService.createRole(merchantId, roleData);

            res.status(result.success ? 201 : 400).json(result);
        } catch (error) {
            console.error('Error in createRole:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }

    static async getRoles(req: Request, res: Response): Promise<void> {
        try {
            // Check if user is authenticated and get merchant ID from user context
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
                return;
            }

            const merchantId = req.user.userMerchantId || req.user.userId;

            const result = await RoleService.getRoles(merchantId);
            res.status(result.success ? 200 : 400).json(result);
        } catch (error) {
            console.error('Error in getRoles:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }

    static async getPermissions(req: Request, res: Response): Promise<void> {
        try {
            const result = RoleService.getPermissions();
            res.status(result.success ? 200 : 400).json(result);
        } catch (error) {
            console.error('Error in getPermissions:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }
}
