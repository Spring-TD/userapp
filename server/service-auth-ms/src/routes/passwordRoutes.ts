import { Router } from 'express';
import { PasswordController } from '../controllers/passwordController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Password management routes
router.post('/forgot', PasswordController.forgot);
router.post('/reset', PasswordController.reset);
router.put('/change', authenticate, PasswordController.change);

export { router as passwordRoutes };