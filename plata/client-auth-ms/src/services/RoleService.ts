import { v4 as uuidv4 } from 'uuid';
import { db as mockDb } from '../utils/mongoDatabase';
import { Role, Permission, CreateRoleRequest } from '../models/User';

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

      return {
        success: true,
        role: createdRole
      };
    } catch (error) {
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
      return {
        success: false,
        error: 'Internal server error while retrieving roles'
      };
    }
  }

  /**
   * Update a role
   */
  static async updateRole(merchantId: string, roleId: string, roleData: CreateRoleRequest): Promise<{ success: boolean; role?: Role; error?: string }> {
    try {
      // First, verify the role exists and belongs to this merchant
      const existingRole = await mockDb.findRoleById(roleId);
      if (!existingRole) {
        return {
          success: false,
          error: 'Role not found'
        };
      }

      if (existingRole.merchant_id !== merchantId) {
        return {
          success: false,
          error: 'You do not have permission to update this role'
        };
      }

      // Validate permissions
      const invalidPermissions = roleData.permissions.filter(p => !Object.values(Permission).includes(p));
      if (invalidPermissions.length > 0) {
        return {
          success: false,
          error: `Invalid permissions: ${invalidPermissions.join(', ')}`
        };
      }

      // Update the role
      const updatedRole = await mockDb.updateRole(roleId, {
        name: roleData.name,
        description: roleData.description,
        permissions: roleData.permissions
      });

      if (!updatedRole) {
        return {
          success: false,
          error: 'Failed to update role'
        };
      }

      return {
        success: true,
        role: updatedRole
      };
    } catch (error) {
      return {
        success: false,
        error: 'Internal server error while updating role'
      };
    }
  }

  /**
   * Delete a role
   */
  static async deleteRole(merchantId: string, roleId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // First, verify the role exists and belongs to this merchant
      const existingRole = await mockDb.findRoleById(roleId);
      if (!existingRole) {
        return {
          success: false,
          error: 'Role not found'
        };
      }

      if (existingRole.merchant_id !== merchantId) {
        return {
          success: false,
          error: 'You do not have permission to delete this role'
        };
      }

      // Check if any users are assigned to this role
      const usersWithRole = await mockDb.findUsersByMerchantId(merchantId);
      const usersAssignedToRole = usersWithRole.filter(user =>
        user.user_type === 'user' && 'role_id' in user && user.role_id === roleId
      );

      if (usersAssignedToRole.length > 0) {
        return {
          success: false,
          error: `Cannot delete role: ${usersAssignedToRole.length} user(s) are currently assigned to this role`
        };
      }

      // Delete the role
      const deleted = await mockDb.deleteRole(roleId);

      if (!deleted) {
        return {
          success: false,
          error: 'Failed to delete role'
        };
      }

      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: 'Internal server error while deleting role'
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