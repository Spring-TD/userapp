import { Router } from 'express';
import { EmailVerificationController } from '../controllers/emailVerificationController';

const router = Router();

// Email verification route
router.get('/', EmailVerificationController.verifyEmail);

export { router as verifyEmailRoutes };