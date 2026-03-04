/**
 * Email verification routes (mounted at /verify-email).
 *
 * @openapi
 * /verify-email/verify-email:
 *   get:
 *     summary: Verify email (token from link)
 *     tags: [Verify Email]
 *     responses:
 *       200:
 *         description: Email verified
 */
import { Router } from 'express';
import { AuthController } from '../controllers/authController';

const router = Router();

// Email verification route - forwards to service-auth-ms
router.get('/verify-email', AuthController.verifyEmail);

export { router as verifyEmailRoutes };