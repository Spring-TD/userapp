import { Router } from 'express';
import { OTPController } from '../controllers/otpController';

const router = Router();

// OTP routes
router.post('/generate', OTPController.generate);
router.post('/verify', OTPController.verify);
router.post('/resend', OTPController.resend);

export { router as otpRoutes };