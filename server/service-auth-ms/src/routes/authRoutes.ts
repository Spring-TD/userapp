import { Router } from 'express';
import { AuthController } from '../controllers/authController';

const router = Router();

// Authentication routes
router.post('/register/user', AuthController.registerUser);
router.post('/register/merchant', AuthController.registerMerchant);
router.post('/verify-account', AuthController.verifyAccount);
router.post('/login', AuthController.login);
router.post('/logout', AuthController.logout);
router.post('/refresh', AuthController.refresh);

export { router as authRoutes };