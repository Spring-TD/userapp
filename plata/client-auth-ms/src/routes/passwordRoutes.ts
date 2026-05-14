/**
 * Password routes (mounted at /api/v1/password).
 *
 * @openapi
 * /api/v1/password/forgot:
 *   post:
 *     summary: Send password reset OTP
 *     tags: [Password]
 *     responses:
 *       200:
 *         description: Password reset OTP sent
 * /api/v1/password/reset:
 *   post:
 *     summary: Reset password with OTP
 *     tags: [Password]
 *     responses:
 *       200:
 *         description: Password reset
 * /api/v1/password/change:
 *   put:
 *     summary: Change password
 *     tags: [Password]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Password changed
 */
import { Router } from 'express';
import { PasswordController } from '../controllers/passwordController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Password management routes
// Forgot/reset are public (no token yet)
router.post('/forgot', PasswordController.forgot);
router.post('/reset', PasswordController.reset);

// Change password requires authentication
router.put('/change', authenticate, PasswordController.change);

export { router as passwordRoutes };