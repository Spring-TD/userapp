
import { Router } from 'express';
import { RoleController } from '../controllers/roleController';
import { authenticate, merchantOnly } from '../middleware/auth';

const router = Router();

// Apply authentication to all role routes
router.use(authenticate);

// Get available permissions (can be accessed by any authenticated user, or restricted to merchant)
router.get('/permissions', RoleController.getPermissions);

// Create a new role (Merchant only)
router.post('/', merchantOnly, RoleController.createRole);

// Get all roles (Merchant only)
router.get('/', merchantOnly, RoleController.getRoles);

// Update a role (Merchant only)
router.put('/:roleId', merchantOnly, RoleController.updateRole);

// Delete a role (Merchant only)
router.delete('/:roleId', merchantOnly, RoleController.deleteRole);

export const roleRoutes = router;
