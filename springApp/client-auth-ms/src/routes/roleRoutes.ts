/**
 * Role routes (mounted at /api/v1/roles).
 *
 * @openapi
 * /api/v1/roles:
 *   post:
 *     summary: Create role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Role created
 *   get:
 *     summary: Get roles
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of roles
 * /api/v1/roles/permissions:
 *   get:
 *     summary: Get permissions
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of permissions
 */
import { Router } from 'express';
import { RoleController } from '../controllers/roleController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Routes for role management (protected)
router.post('/', authenticate, RoleController.createRole);
router.get('/', authenticate, RoleController.getRoles);
router.get('/permissions', authenticate, RoleController.getPermissions);
router.put('/:roleId', authenticate, RoleController.updateRole);
router.delete('/:roleId', authenticate, RoleController.deleteRole);

export const roleRoutes = router;
