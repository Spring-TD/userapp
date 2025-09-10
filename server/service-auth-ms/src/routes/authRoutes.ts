import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticate, extractToken } from '../middleware/auth';

const router = Router();

// Registration routes
router.post('/register/user', AuthController.registerUser);
router.post('/register/merchant', AuthController.registerMerchant);

// Account verification
router.post('/verify-account', AuthController.verifyAccount);

// Authentication routes
router.post('/login', AuthController.login);
router.post('/logout', extractToken, AuthController.logout);
router.post('/refresh', AuthController.refresh);

// Profile routes
router.get('/me', authenticate, AuthController.me);

// Token verification
router.post('/verify-token', extractToken, AuthController.verifyToken);

// Utility routes
router.get('/email-exists/:email', AuthController.checkEmailExists);

export { router as authRoutes };