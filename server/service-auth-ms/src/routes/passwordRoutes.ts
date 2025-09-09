import { Router } from 'express';
import { PasswordController } from '../controllers/passwordController';

const router = Router();

// Password management routes
router.post('/forgot', PasswordController.forgot);
router.post('/reset', PasswordController.reset);
router.put('/change', PasswordController.change);

export { router as passwordRoutes };