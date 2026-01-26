
import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { RoleService } from '../services/roleService';
import { CreateRoleRequest, Permission } from '../models/Role';
import { logger } from '../utils/logger';
import { validateInput } from '../utils/validation';

// Validation schemas
const createRoleSchema = Joi.object({
    name: Joi.string().required().min(3).max(50),
    description: Joi.string().required().max(255),
    permissions: Joi.array().items(
        Joi.string().valid(...Object.values(Permission))
    ).required().min(1)
});

export class RoleController {
    /**
     * POST /api/v1/roles
     * Create a new role
     */
    static async createRole(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user || req.user.userType !== 'merchant') {
                res.status(403).json({
                    success: false,
                    error: 'Only merchants can create roles'
                });
                return;
            }

            // Validate input
            const { error, value } = validateInput<CreateRoleRequest>(createRoleSchema, req.body);
            if (error) {
                res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: error
                });
                return;
            }

            // Create role
            // We use the merchant's userId as the owner of these roles
            const result = await RoleService.createRole(req.user.userId, value!);

            if (!result.success) {
                res.status(400).json({
                    success: false,
                    error: result.error
                });
                return;
            }

            res.status(201).json({
                success: true,
                message: 'Role created successfully',
                data: {
                    role: result.role
                }
            });
        } catch (error) {
            logger.error('Error in createRole controller', { error: error instanceof Error ? error.message : 'Unknown error' });
            next(error);
        }
    }

    /**
     * GET /api/v1/roles
     * Get all roles for the authenticated merchant
     */
    static async getRoles(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user || req.user.userType !== 'merchant') {
                res.status(403).json({
                    success: false,
                    error: 'Only merchants can view their roles'
                });
                return;
            }

            const result = await RoleService.getRoles(req.user.userId);

            if (!result.success) {
                res.status(400).json({
                    success: false,
                    error: result.error
                });
                return;
            }

            res.status(200).json({
                success: true,
                data: {
                    roles: result.roles
                }
            });
        } catch (error) {
            logger.error('Error in getRoles controller', { error: error instanceof Error ? error.message : 'Unknown error' });
            next(error);
        }
    }

    /**
     * PUT /api/v1/roles/:roleId
     * Update an existing role
     */
    static async updateRole(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user || req.user.userType !== 'merchant') {
                res.status(403).json({
                    success: false,
                    error: 'Only merchants can update roles'
                });
                return;
            }

            const roleId = req.params['roleId'];
            if (!roleId) {
                res.status(400).json({
                    success: false,
                    error: 'Role ID is required'
                });
                return;
            }

            // Validate input
            const { error, value } = validateInput<CreateRoleRequest>(createRoleSchema, req.body);
            if (error) {
                res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: error
                });
                return;
            }

            // Update role
            const result = await RoleService.updateRole(req.user.userId, roleId, value!);

            if (!result.success) {
                res.status(400).json({
                    success: false,
                    error: result.error
                });
                return;
            }

            res.status(200).json({
                success: true,
                message: 'Role updated successfully',
                data: {
                    role: result.role
                }
            });
        } catch (error) {
            logger.error('Error in updateRole controller', { error: error instanceof Error ? error.message : 'Unknown error' });
            next(error);
        }
    }

    /**
     * DELETE /api/v1/roles/:roleId
     * Delete a role
     */
    static async deleteRole(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user || req.user.userType !== 'merchant') {
                res.status(403).json({
                    success: false,
                    error: 'Only merchants can delete roles'
                });
                return;
            }

            const roleId = req.params['roleId'];
            if (!roleId) {
                res.status(400).json({
                    success: false,
                    error: 'Role ID is required'
                });
                return;
            }

            // Delete role
            const result = await RoleService.deleteRole(req.user.userId, roleId);

            if (!result.success) {
                res.status(400).json({
                    success: false,
                    error: result.error
                });
                return;
            }

            res.status(200).json({
                success: true,
                message: 'Role deleted successfully'
            });
        } catch (error) {
            logger.error('Error in deleteRole controller', { error: error instanceof Error ? error.message : 'Unknown error' });
            next(error);
        }
    }

    /**
     * GET /api/v1/roles/permissions
     * Get all available permissions
     */
    static async getPermissions(_req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const result = RoleService.getPermissions();

            res.status(200).json({
                success: true,
                data: {
                    permissions: result.permissions
                }
            });
        } catch (error) {
            logger.error('Error in getPermissions controller', { error: error instanceof Error ? error.message : 'Unknown error' });
            next(error);
        }
    }
}
