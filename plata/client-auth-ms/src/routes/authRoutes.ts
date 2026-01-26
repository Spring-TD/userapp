import { Router } from 'express';
import { AuthController } from '../controllers/authController';

const router = Router();

// Account verification
router.post('/verify-account', AuthController.verifyAccount);

// Authentication routes
router.post('/login', AuthController.login);
router.post('/logout', AuthController.logout);
router.post('/refresh', AuthController.refreshToken);

// Profile routes
router.get('/me', AuthController.getMe);

// Token verification
router.post('/verify-token', AuthController.verifyToken);

// Utility routes
router.get('/email-exists/:email', AuthController.checkEmailExists);

export { router as authRoutes };