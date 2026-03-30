/**
 * User routes (mounted at /api/v1/user)
 *
 * @openapi
 * /api/v1/user/list:
 *   get:
 *     summary: Get merchant users
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 * /api/v1/user/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *   put:
 *     summary: Update profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Profile updated
 * /api/v1/user/{userId}/status:
 *   put:
 *     summary: Update user status
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status updated
 * /api/v1/user/deactivate:
 *   post:
 *     summary: Deactivate account
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deactivated
 * /api/v1/user/callbacks:
 *   put:
 *     summary: Update callback URLs
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Callbacks updated
 * /api/v1/user/info/{userId}:
 *   get:
 *     summary: Get user info (admin)
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User info
 * /api/v1/user/verify-info/{userId}:
 *   post:
 *     summary: Verify user info (admin)
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Verification result
 * /api/v1/user/suspend/{userId}:
 *   put:
 *     summary: Suspend user (admin)
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User suspended
 * /api/v1/user/activate/{userId}:
 *   put:
 *     summary: Activate user (admin)
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User activated
 */

import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authenticate, adminOnly } from '../middleware/auth';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// User profile management routes
router.get('/list', UserController.getMerchantUsers);
router.get('/profile', UserController.getProfile);
router.put('/profile', UserController.updateProfile);
router.put('/:userId/status', UserController.updateStatus);
router.post('/deactivate', UserController.deactivate);
router.put('/callbacks', UserController.updateCallbackUrls);

// Admin user management routes
router.get('/info/:userId', adminOnly, UserController.getInfo);
router.post('/verify-info/:userId', adminOnly, UserController.verifyInfo);
router.put('/suspend/:userId', adminOnly, UserController.suspend);
router.put('/activate/:userId', adminOnly, UserController.activate);

export { router as userRoutes };