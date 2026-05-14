import { Router } from 'express';
import { AuthController as ServiceAuthController } from '../controllers/authController';
import { authenticate, extractToken } from '../middleware/auth';

const router = Router();

// Registration routes
router.post('/register/user', ServiceAuthController.registerUser);
router.post('/register/merchant', ServiceAuthController.registerMerchant);
router.post('/register/admin', ServiceAuthController.registerAdmin);

// Account verification
router.post('/verify-account', ServiceAuthController.verifyAccount);

// Authentication routes
router.post('/login', ServiceAuthController.login);
router.post('/logout', extractToken, ServiceAuthController.logout);
router.post('/refresh', ServiceAuthController.refresh);

// Profile routes
router.get('/me', authenticate, ServiceAuthController.me);

// Token verification
router.post('/verify-token', extractToken, ServiceAuthController.verifyToken);

// Utility routes
router.get('/email-exists/:email', ServiceAuthController.checkEmailExists);

export { router as authRoutes };