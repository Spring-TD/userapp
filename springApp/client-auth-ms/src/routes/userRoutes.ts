/**
 * User routes (mounted at /api/v1/user).
 *
 * @openapi
 * /api/v1/user/list:
 *   get:
 *     summary: List users
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User list
 * /api/v1/user/profile:
 *   get:
 *     summary: Get profile
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
 *     responses:
 *       200:
 *         description: Profile updated
 * /api/v1/user/email:
 *   put:
 *     summary: Update email
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Email updated
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
 *         description: Deactivated
 * /api/v1/user/callbacks:
 *   put:
 *     summary: Update callback URLs
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
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
 *         description: Verified
 * /api/v1/user/suspend/{userId}:
 *   put:
 *     summary: Suspend user (admin)
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
 *         description: User suspended
 * /api/v1/user/activate/{userId}:
 *   put:
 *     summary: Activate user (admin)
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
 *         description: User activated
 */
import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authenticate } from '../middleware/auth';

const router = Router();

// User profile management routes
router.get('/list', authenticate, UserController.listUsers);
router.get('/profile', authenticate, UserController.getProfile);
router.put('/profile', authenticate, UserController.updateProfile);
router.put('/email', authenticate, UserController.updateEmail);
router.put('/:userId/status', authenticate, UserController.updateStatus);
router.post('/deactivate', authenticate, UserController.deactivate);
router.put('/callbacks', authenticate, UserController.updateCallbackUrls);

// Admin user management routes
router.get('/info/:userId', authenticate, UserController.getInfo);
router.post('/verify-info/:userId', authenticate, UserController.verifyInfo);
router.put('/suspend/:userId', authenticate, UserController.suspend);
router.put('/activate/:userId', authenticate, UserController.activate);

export { router as userRoutes };