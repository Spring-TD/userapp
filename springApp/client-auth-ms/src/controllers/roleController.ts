
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

    static async updateRole(req: Request, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
                return;
            }

            if (req.user.userType !== 'merchant' && req.user.userType !== 'admin') {
                res.status(403).json({
                    success: false,
                    error: 'Insufficient permissions to update roles'
                });
                return;
            }

            const roleId = req.params.roleId;
            if (!roleId) {
                res.status(400).json({ success: false, error: 'Role ID is required' });
                return;
            }

            const merchantId = req.user.userMerchantId || req.user.userId;
            const result = await RoleService.updateRole(merchantId, roleId, req.body);

            if (!result.success) {
                const err = result.error || 'Failed to update role';
                if (err === 'Role not found') {
                    res.status(404).json({ success: false, error: err });
                    return;
                }
                if (err.includes('permission')) {
                    res.status(403).json({ success: false, error: err });
                    return;
                }
                res.status(400).json({ success: false, error: err });
                return;
            }

            res.status(200).json({
                success: true,
                message: 'Role updated successfully',
                role: result.role
            });
        } catch (error) {
            console.error('Error in updateRole:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }

    static async deleteRole(req: Request, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
                return;
            }

            if (req.user.userType !== 'merchant' && req.user.userType !== 'admin') {
                res.status(403).json({
                    success: false,
                    error: 'Insufficient permissions to delete roles'
                });
                return;
            }

            const roleId = req.params.roleId;
            if (!roleId) {
                res.status(400).json({ success: false, error: 'Role ID is required' });
                return;
            }

            const merchantId = req.user.userMerchantId || req.user.userId;
            const result = await RoleService.deleteRole(merchantId, roleId);

            if (!result.success) {
                const err = result.error || 'Failed to delete role';
                if (err === 'Role not found') {
                    res.status(404).json({ success: false, error: err });
                    return;
                }
                if (err.includes('permission')) {
                    res.status(403).json({ success: false, error: err });
                    return;
                }
                res.status(400).json({ success: false, error: err });
                return;
            }

            res.status(200).json({
                success: true,
                message: 'Role deleted successfully'
            });
        } catch (error) {
            console.error('Error in deleteRole:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }
}
