/**
 * Auth routes (mounted at /api/v1/auth).
 *
 * @openapi
 * /api/v1/auth/verify-account:
 *   post:
 *     summary: Verify account
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Account verified
 * /api/v1/auth/login:
 *   post:
 *     summary: Login
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Login success
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh token
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: New tokens
 * /api/v1/auth/me:
 *   get:
 *     summary: Get current user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user
 * /api/v1/auth/verify-token:
 *   post:
 *     summary: Verify token
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Token valid
 * /api/v1/auth/email-exists/{email}:
 *   get:
 *     summary: Check if email exists
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Email existence result
 */
import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { RegistrationController } from '../controllers/registrationController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Account verification (public - triggered from email link)
router.post('/verify-account', AuthController.verifyAccount);

// Retail signup alias used by tenant PWAs (same handler as POST /api/v1/registration/user)
router.post('/register', RegistrationController.registerUser);

// Authentication routes
// Login and refresh are public entry points
router.post('/login', AuthController.login);
router.post('/refresh', AuthController.refreshToken);

// Logout: revoke via Bearer access token and/or JSON body { refreshToken } (for expired access)
router.post('/logout', AuthController.logout);

// Profile routes - require authentication
router.get('/me', authenticate, AuthController.getMe);

// Token verification (public - used by other services)
router.post('/verify-token', AuthController.verifyToken);

// Utility routes (public)
router.get('/email-exists/:email', AuthController.checkEmailExists);

export { router as authRoutes };