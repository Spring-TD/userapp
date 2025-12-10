
import { v4 as uuidv4 } from 'uuid';
import { mockDb } from '../utils/mockDatabase';
import { Role, Permission, CreateRoleRequest } from '../models/Role';
import { logger } from '../utils/logger';

export class RoleService {
    /**
     * Create a new role
     */
    static async createRole(merchantId: string, roleData: CreateRoleRequest): Promise<{ success: boolean; role?: Role; error?: string }> {
        try {
            // Validate permissions
            const invalidPermissions = roleData.permissions.filter(p => !Object.values(Permission).includes(p));
            if (invalidPermissions.length > 0) {
                return {
                    success: false,
                    error: `Invalid permissions: ${invalidPermissions.join(', ')}`
                };
            }

            const now = new Date();
            const role: Role = {
                id: uuidv4(),
                merchant_id: merchantId,
                name: roleData.name,
                description: roleData.description,
                permissions: roleData.permissions,
                created_at: now,
                updated_at: now
            };

            const createdRole = await mockDb.createRole(role);

            logger.info('Role created successfully', {
                roleId: createdRole.id,
                merchantId: merchantId,
                roleName: createdRole.name
            });

            return {
                success: true,
                role: createdRole
            };
        } catch (error) {
            logger.error('Error creating role', { error: error instanceof Error ? error.message : 'Unknown error' });
            return {
                success: false,
                error: 'Internal server error while creating role'
            };
        }
    }

    /**
     * Get all roles for a merchant
     */
    static async getRoles(merchantId: string): Promise<{ success: boolean; roles?: Role[]; error?: string }> {
        try {
            const roles = await mockDb.findRolesByMerchantId(merchantId);
            return {
                success: true,
                roles
            };
        } catch (error) {
            logger.error('Error getting roles', { error: error instanceof Error ? error.message : 'Unknown error' });
            return {
                success: false,
                error: 'Internal server error while retrieving roles'
            };
        }
    }

    /**
     * Get all available permissions
     */
    static getPermissions(): { success: boolean; permissions: string[] } {
        return {
            success: true,
            permissions: Object.values(Permission)
        };
    }
}
