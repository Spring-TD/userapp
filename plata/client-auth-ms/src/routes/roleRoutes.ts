
import { Router } from 'express';
import { RoleController } from '../controllers/roleController';

const router = Router();

// Routes for role management
router.post('/', RoleController.createRole);
router.get('/', RoleController.getRoles);
router.get('/permissions', RoleController.getPermissions);

export const roleRoutes = router;
