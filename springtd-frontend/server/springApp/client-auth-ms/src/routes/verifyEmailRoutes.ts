import { Router } from 'express';
import { AuthController } from '../controllers/authController';

const router = Router();

// Email verification route - forwards to service-auth-ms
router.get('/verify-email', AuthController.verifyEmail);

export { router as verifyEmailRoutes };