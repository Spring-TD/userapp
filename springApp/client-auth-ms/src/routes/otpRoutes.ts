/**
 * OTP routes (mounted at /api/v1/otp).
 *
 * @openapi
 * /api/v1/otp/generate:
 *   post:
 *     summary: Generate OTP
 *     tags: [OTP]
 *     responses:
 *       200:
 *         description: OTP generated
 * /api/v1/otp/verify:
 *   post:
 *     summary: Verify OTP
 *     tags: [OTP]
 *     responses:
 *       200:
 *         description: OTP verified
 * /api/v1/otp/resend:
 *   post:
 *     summary: Resend OTP
 *     tags: [OTP]
 *     responses:
 *       200:
 *         description: OTP resent
 */
import { Router } from 'express';
import { OTPController } from '../controllers/otpController';

const router = Router();

// OTP routes (generate and verify are public; no auth required)
router.post('/generate', OTPController.generate);
router.post('/verify', OTPController.verify);

router.post('/resend', OTPController.resend);

export { router as otpRoutes };